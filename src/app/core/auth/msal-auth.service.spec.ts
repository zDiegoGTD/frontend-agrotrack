import { TestBed } from '@angular/core/testing';
import { MsalService } from '@azure/msal-angular';
import { describe, expect, it } from 'vitest';
import { MsalAuthService } from './msal-auth.service';

/** Codifica como lo hace Azure: UTF-8 y base64url sin relleno. */
function tokenCon(payload: Record<string, unknown>): string {
  const b64url = (o: unknown) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
      .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64url({ alg: 'RS256' })}.${b64url(payload)}.firma`;
}

describe('MsalAuthService: usuario desde el access token', () => {
  async function iniciarCon(accessToken: string) {
    const cuenta = { localAccountId: 'u-1', name: 'Cuenta', username: 'cuenta@mish.cl' };
    const instancia = {
      initialize: async () => {},
      handleRedirectPromise: async () => null,
      getAllAccounts: () => [cuenta],
      setActiveAccount: () => {},
      acquireTokenSilent: async () => ({ accessToken, idTokenClaims: { name: 'Id Token' } }),
    };
    TestBed.configureTestingModule({
      providers: [MsalAuthService, { provide: MsalService, useValue: { instance: instancia } }],
    });
    const auth = TestBed.inject(MsalAuthService);
    await auth.init();
    return auth;
  }

  it('respeta tildes y eñes del nombre (UTF-8)', async () => {
    const auth = await iniciarCon(tokenCon({ name: 'Hernán Muñoz', oid: 'u-1', roles: ['ADMIN'] }));
    expect(auth.user()?.nombre).toBe('Hernán Muñoz');
  });

  it('lee los roles del access token aunque su base64 no traiga relleno', async () => {
    const auth = await iniciarCon(tokenCon({ name: 'Ana', oid: 'u-2', roles: ['OPERADOR', 'AUDITOR'] }));
    expect(auth.user()?.roles).toEqual(['OPERADOR', 'AUDITOR']);
  });
});
