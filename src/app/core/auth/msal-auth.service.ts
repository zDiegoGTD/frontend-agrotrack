import { Injectable, inject, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo, InteractionRequiredAuthError } from '@azure/msal-browser';
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

  async init(): Promise<void> {
    await this.msal.instance.initialize();
    // Si venimos de vuelta del login de Microsoft, aqui llega la respuesta.
    const respuesta = await this.msal.instance.handleRedirectPromise();
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

  async login(): Promise<void> {
    await this.msal.instance.loginRedirect({ scopes: this.scopes });
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
