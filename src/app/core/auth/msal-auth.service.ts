import { Injectable, inject, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo, BrowserAuthError, InteractionRequiredAuthError } from '@azure/msal-browser';
import { environment } from '../../../environments/environment';
import { AuthService, usuarioDesdeClaims } from './auth.service';
import { Usuario } from '../models';

/**
 * Login corporativo con Azure AD (MSAL). El access token que se pide es
 * el del API (scope api://<API_CLIENT_ID>/access_as_user): ese es el que
 * el API Gateway y los servicios validan, y el que trae el claim roles.
 */
@Injectable()
export class MsalAuthService extends AuthService {
  private readonly msal = inject(MsalService);
  private readonly scopes = [environment.auth.msal.apiScope];

  private readonly _user = signal<Usuario | null>(null);
  readonly user = this._user.asReadonly();

  private readonly _error = signal<string | null>(null);
  /** Ultimo fallo de autenticacion, para mostrarlo en pantalla. */
  readonly error = this._error.asReadonly();

  async init(): Promise<void> {
    await this.msal.instance.initialize();
    let respuesta = null;
    try {
      // Si venimos de vuelta del login de Microsoft, aqui llega la respuesta.
      respuesta = await this.msal.instance.handleRedirectPromise();
    } catch (e) {
      // Un error al volver de Azure (consentimiento denegado, URI mal
      // registrada) no puede impedir que la app arranque: si dejamos que
      // suba, el APP_INITIALIZER falla y la pantalla queda en blanco, sin
      // ninguna pista de lo ocurrido.
      this._error.set(mensajeDeError(e));
      console.error('[MSAL] fallo al procesar la vuelta del login', e);
    }
    const cuenta = respuesta?.account ?? this.msal.instance.getAllAccounts()[0] ?? null;
    if (cuenta) {
      this.msal.instance.setActiveAccount(cuenta);
      await this.refrescarUsuario(cuenta);
    }
  }

  async getToken(): Promise<string | null> {
    const cuenta = this.msal.instance.getActiveAccount();
    if (!cuenta) return null;
    try {
      const r = await this.msal.instance.acquireTokenSilent({ scopes: this.scopes, account: cuenta });
      return r.accessToken;
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        await this.msal.instance.acquireTokenRedirect({ scopes: this.scopes });
      }
      return null;
    }
  }

  /**
   * Lanza el login por redireccion.
   *
   * <p>Si un intento anterior se interrumpio a medias (se cerro la pestana,
   * Azure devolvio un error), MSAL deja marcado "interaction_in_progress" en
   * el almacenamiento del navegador y **rechaza en silencio** todo intento
   * posterior: el usuario pulsa el boton y no pasa absolutamente nada. Aqui
   * se detecta ese caso, se limpia la marca y se reintenta una vez.
   */
  async login(): Promise<void> {
    this._error.set(null);
    try {
      await this.msal.instance.loginRedirect({ scopes: this.scopes });
    } catch (e) {
      if (esInteraccionEnCurso(e)) {
        limpiarInteraccionPendiente();
        await this.msal.instance.loginRedirect({ scopes: this.scopes });
        return;
      }
      this._error.set(mensajeDeError(e));
      console.error('[MSAL] loginRedirect fallo', e);
      throw e;
    }
  }

  async logout(): Promise<void> {
    this._user.set(null);
    await this.msal.instance.logoutRedirect();
  }

  /** Los roles vienen en el ACCESS token del API, no en el id token: se leen de ahi. */
  private async refrescarUsuario(cuenta: AccountInfo) {
    try {
      const r = await this.msal.instance.acquireTokenSilent({ scopes: this.scopes, account: cuenta });
      const claims = (r.idTokenClaims ?? {}) as Record<string, unknown>;
      const accessClaims = JSON.parse(atob(r.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      this._user.set(usuarioDesdeClaims({ ...claims, ...accessClaims }));
    } catch {
      this._user.set({
        userId: cuenta.localAccountId,
        nombre: cuenta.name ?? cuenta.username,
        email: cuenta.username,
        roles: [],
      });
    }
  }
}

/** MSAL rechaza un login nuevo mientras cree que hay otro a medias. */
export function esInteraccionEnCurso(e: unknown): boolean {
  return e instanceof BrowserAuthError && e.errorCode === 'interaction_in_progress';
}

/**
 * Borra la marca de interaccion pendiente que MSAL deja en el navegador.
 * No hay API publica para esto; la clave sigue el patron
 * `msal.<clientId>.interaction.status`, asi que se limpia por prefijo.
 */
export function limpiarInteraccionPendiente(): void {
  for (const almacen of [localStorage, sessionStorage]) {
    for (const clave of Object.keys(almacen)) {
      if (clave.startsWith('msal.') && clave.includes('interaction.status')) {
        almacen.removeItem(clave);
      }
    }
  }
}

/** Mensaje legible para el usuario, sin perder el codigo AADSTS/MSAL. */
export function mensajeDeError(e: unknown): string {
  if (e instanceof BrowserAuthError) {
    return `${e.errorCode}: ${e.errorMessage}`;
  }
  if (e && typeof e === 'object' && 'errorCode' in e) {
    const err = e as { errorCode?: string; errorMessage?: string };
    return `${err.errorCode ?? 'error'}: ${err.errorMessage ?? ''}`.trim();
  }
  return e instanceof Error ? e.message : String(e);
}
