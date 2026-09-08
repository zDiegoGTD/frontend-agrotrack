import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Adjunta el Bearer en modo DESARROLLO (token de infra/local/jwt/mint.mjs).
 *
 * <p>En modo Azure no hace nada: ahí el token lo pone el {@code MsalInterceptor}
 * oficial de @azure/msal-angular, que además renueva el access token de forma
 * silenciosa cuando expira y lanza la interacción si hace falta — cosas que
 * este interceptor simple no hace. Ver auth.providers.ts.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.auth.mode === 'msal' || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const auth = inject(AuthService);
  return from(auth.getToken()).pipe(
    switchMap((token) =>
      next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req),
    ),
  );
};
