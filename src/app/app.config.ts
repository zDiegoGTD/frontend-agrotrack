import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import localeEsCl from '@angular/common/locales/es-CL';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { provideAuth } from './core/auth/auth.providers';

// Kilos con punto de miles y meses en castellano: 59.600 kg, 15 sept.
registerLocaleData(localeEsCl);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'es-CL' },
    provideRouter(routes, withComponentInputBinding()),
    // Dos cadenas de interceptores: la funcional (authInterceptor, modo dev) y
    // la de DI, que es donde se engancha el MsalInterceptor oficial en modo Azure.
    provideHttpClient(withInterceptors([authInterceptor]), withInterceptorsFromDi()),
    ...provideAuth(),
  ],
};
