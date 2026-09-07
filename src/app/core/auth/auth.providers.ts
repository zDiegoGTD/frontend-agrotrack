import { EnvironmentProviders, Provider, inject, provideAppInitializer } from '@angular/core';
import { MSAL_INSTANCE, MsalService } from '@azure/msal-angular';
import { PublicClientApplication } from '@azure/msal-browser';
import { environment } from '../../../environments/environment';
import { AuthService, DevTokenAuthService } from './auth.service';
import { MsalAuthService } from './msal-auth.service';

/**
 * Elige la implementacion de AuthService segun environment.auth.mode y la
 * inicializa antes de que arranque el router (asi las guardas ya saben
 * quien es el usuario).
 */
export function provideAuth(): (Provider | EnvironmentProviders)[] {
  const base: (Provider | EnvironmentProviders)[] = [
    provideAppInitializer(() => inject(AuthService).init()),
  ];

  if (environment.auth.mode === 'msal') {
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
            cache: { cacheLocation: 'localStorage' },
          }),
      },
      MsalService,
      { provide: AuthService, useClass: MsalAuthService },
    ];
  }
  return [...base, { provide: AuthService, useClass: DevTokenAuthService }];
}
