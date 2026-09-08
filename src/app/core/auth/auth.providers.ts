import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { EnvironmentProviders, Provider, inject, provideAppInitializer } from '@angular/core';
import {
  MSAL_INSTANCE,
  MSAL_INTERCEPTOR_CONFIG,
  MsalBroadcastService,
  MsalInterceptor,
  MsalInterceptorConfiguration,
  MsalService,
} from '@azure/msal-angular';
import { InteractionType, PublicClientApplication } from '@azure/msal-browser';
import { environment } from '../../../environments/environment';
import { AuthService, DevTokenAuthService } from './auth.service';
import { MsalAuthService } from './msal-auth.service';

/**
 * Elige la implementación de AuthService según environment.auth.mode y la
 * inicializa antes de que arranque el router (así las guardas ya saben quién
 * es el usuario).
 *
 * - `msal`: login corporativo con Azure AD. El Bearer lo pone el
 *   **MsalInterceptor** oficial, que renueva el access token silenciosamente
 *   y dispara la interacción cuando el refresh ya no alcanza.
 * - `dev`: token pegado a mano (infra/local/jwt/mint.mjs), para trabajar sin
 *   Azure. Ahí el Bearer lo pone `authInterceptor`.
 */
/**
 * Qué scope pide el MsalInterceptor para cada URL. Solo `/api/**` del API
 * Gateway lleva token; cualquier otra petición (assets, etc.) sale sin
 * cabecera Authorization.
 */
export function configuracionInterceptor(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string> | null>([
    [`${environment.apiUrl}/api/*`, [environment.auth.msal.apiScope]],
  ]);
  return { interactionType: InteractionType.Redirect, protectedResourceMap };
}

export function provideAuth(): (Provider | EnvironmentProviders)[] {
  const base: (Provider | EnvironmentProviders)[] = [
    provideAppInitializer(() => inject(AuthService).init()),
  ];

  if (environment.auth.mode !== 'msal') {
    return [...base, { provide: AuthService, useClass: DevTokenAuthService }];
  }

  const m = environment.auth.msal;
  return [
    ...base,
    {
      provide: MSAL_INSTANCE,
      useFactory: () =>
        new PublicClientApplication({
          auth: {
            clientId: m.clientId,
            authority: `https://login.microsoftonline.com/${m.tenantId}/`,
            redirectUri: m.redirectUri,
            postLogoutRedirectUri: m.redirectUri,
          },
          // localStorage para que la sesión sobreviva a recargar la pestaña.
          cache: { cacheLocation: 'localStorage' },
        }),
    },
    { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: configuracionInterceptor },
    MsalService,
    MsalBroadcastService,
    { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },
    { provide: AuthService, useClass: MsalAuthService },
  ];
}
