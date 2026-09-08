import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { provideAuth } from './core/auth/auth.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Dos cadenas de interceptores: la funcional (authInterceptor, modo dev) y
    // la de DI, que es donde se engancha el MsalInterceptor oficial en modo Azure.
    provideHttpClient(withInterceptors([authInterceptor]), withInterceptorsFromDi()),
    ...provideAuth(),
  ],
};
