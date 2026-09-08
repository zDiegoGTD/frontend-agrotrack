import { InteractionType } from '@azure/msal-browser';
import { describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { configuracionInterceptor } from './auth.providers';

/**
 * El MsalInterceptor solo adjunta el token a las URLs que estén en el
 * protectedResourceMap. Si el mapa no coincide con el API Gateway, la app
 * autentica pero las llamadas salen sin Authorization y todo da 401.
 */
describe('configuración del MsalInterceptor', () => {
  it('protege /api/* del API Gateway con el scope del API', () => {
    const cfg = configuracionInterceptor();
    const entradas = [...cfg.protectedResourceMap.entries()];

    expect(entradas).toHaveLength(1);
    const [url, scopes] = entradas[0];
    expect(url).toBe(`${environment.apiUrl}/api/*`);
    expect(scopes).toEqual([environment.auth.msal.apiScope]);
  });

  it('usa redirect, no popup (el popup lo bloquean los navegadores)', () => {
    expect(configuracionInterceptor().interactionType).toBe(InteractionType.Redirect);
  });

  it('el scope apunta al API expuesto, no a Microsoft Graph', () => {
    const [[, scopes]] = [...configuracionInterceptor().protectedResourceMap.entries()];
    expect(scopes?.[0]).toMatch(/^api:\/\/.+\/access_as_user$/);
  });
});
