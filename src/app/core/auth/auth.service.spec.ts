import { beforeEach, describe, expect, it } from 'vitest';
import { DevTokenAuthService, leerClaims, usuarioDesdeClaims } from './auth.service';

/** JWT sin firma valida (la firma la verifica el BFF, no el front). */
function tokenCon(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'RS256' })}.${b64(payload)}.firma`;
}

describe('DevTokenAuthService', () => {
  let auth: DevTokenAuthService;
  const futuro = Math.floor(Date.now() / 1000) + 3600;

  beforeEach(() => {
    localStorage.clear();
    auth = new DevTokenAuthService();
  });

  it('lee identidad y roles del token, con el rol mas privilegiado como principal', async () => {
    const ok = auth.establecerToken(tokenCon({ oid: 'u-1', name: 'Diego', roles: ['CLIENTE', 'OPERADOR'], exp: futuro }));

    expect(ok).toBe(true);
    expect(auth.user()?.userId).toBe('u-1');
    expect(auth.user()?.roles).toEqual(['CLIENTE', 'OPERADOR']);
    expect(auth.rolPrincipal).toBe('OPERADOR');
    expect(auth.hasRole('ADMIN')).toBe(false);
    expect(await auth.getToken()).toContain('.');
  });

  it('rechaza un token vencido o mal formado', () => {
    expect(auth.establecerToken(tokenCon({ oid: 'u-1', roles: ['ADMIN'], exp: 1 }))).toBe(false);
    expect(auth.establecerToken('no-es-un-jwt')).toBe(false);
    expect(auth.user()).toBeNull();
  });

  it('logout borra la sesion', async () => {
    auth.establecerToken(tokenCon({ oid: 'u-1', roles: ['ADMIN'], exp: futuro }));
    await auth.logout();
    expect(auth.user()).toBeNull();
    expect(await auth.getToken()).toBeNull();
  });

  it('usuarioDesdeClaims tolera claims incompletos', () => {
    expect(usuarioDesdeClaims({ sub: 'x' })).toEqual({ userId: 'x', nombre: 'Usuario', email: undefined, roles: [] });
    expect(leerClaims('')).toBeNull();
  });
});
