import { Injectable, signal, Signal } from '@angular/core';
import { Rol, Usuario } from '../models';

const PRIORIDAD: Rol[] = ['ADMIN', 'OPERADOR', 'CLIENTE', 'AUDITOR'];

/**
 * Contrato de autenticacion que usa toda la app. Hay dos implementaciones:
 * MsalAuthService (Azure AD, produccion) y DevTokenAuthService (token
 * pegado a mano, desarrollo). El resto de la app no sabe cual esta activa.
 */
export abstract class AuthService {
  abstract readonly user: Signal<Usuario | null>;

  /** Se llama una vez al arrancar (APP_INITIALIZER). */
  abstract init(): Promise<void>;

  /** Bearer para llamar al BFF; null si no hay sesion. */
  abstract getToken(): Promise<string | null>;

  abstract login(): Promise<void>;

  abstract logout(): Promise<void>;

  hasRole(...roles: Rol[]): boolean {
    const u = this.user();
    return !!u && roles.some((r) => u.roles.includes(r));
  }

  /** Si el token trae varios roles, se actua con el mas privilegiado (igual que el backend). */
  get rolPrincipal(): Rol | null {
    const u = this.user();
    if (!u) return null;
    return PRIORIDAD.find((r) => u.roles.includes(r)) ?? null;
  }
}

/** Decodifica el payload de un JWT sin verificarlo: la verificacion la hace el BFF. */
export function leerClaims(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export function usuarioDesdeClaims(c: Record<string, unknown>): Usuario {
  const roles = Array.isArray(c['roles']) ? (c['roles'] as string[]).map((r) => r.toUpperCase() as Rol) : [];
  return {
    userId: String(c['oid'] ?? c['sub'] ?? ''),
    nombre: String(c['name'] ?? c['preferred_username'] ?? 'Usuario'),
    email: (c['preferred_username'] as string | undefined) ?? (c['email'] as string | undefined),
    roles,
  };
}

/**
 * Desarrollo sin Azure: el token viene de infra/local/jwt/mint.mjs y se
 * guarda en localStorage. Misma forma que el de Azure AD.
 */
@Injectable()
export class DevTokenAuthService extends AuthService {
  static readonly CLAVE = 'agrotrack.devToken';

  private readonly _user = signal<Usuario | null>(null);
  readonly user = this._user.asReadonly();

  async init(): Promise<void> {
    const token = this.leer();
    if (token) this.aplicar(token);
  }

  /** Usado por la pantalla de login en modo dev. */
  establecerToken(token: string): boolean {
    const claims = leerClaims(token.trim());
    if (!claims) return false;
    const exp = Number(claims['exp'] ?? 0);
    if (exp && exp * 1000 < Date.now()) return false;
    localStorage.setItem(DevTokenAuthService.CLAVE, token.trim());
    this.aplicar(token.trim());
    return true;
  }

  async getToken(): Promise<string | null> {
    const t = this.leer();
    if (!t) return null;
    const claims = leerClaims(t);
    const exp = Number(claims?.['exp'] ?? 0);
    if (exp && exp * 1000 < Date.now()) {
      await this.logout();
      return null;
    }
    return t;
  }

  async login(): Promise<void> {
    /* en modo dev el login es pegar el token; lo maneja LoginPage */
  }

  async logout(): Promise<void> {
    localStorage.removeItem(DevTokenAuthService.CLAVE);
    this._user.set(null);
  }

  private leer(): string | null {
    try {
      return localStorage.getItem(DevTokenAuthService.CLAVE);
    } catch {
      return null;
    }
  }

  private aplicar(token: string) {
    const claims = leerClaims(token);
    this._user.set(claims ? usuarioDesdeClaims(claims) : null);
  }
}
