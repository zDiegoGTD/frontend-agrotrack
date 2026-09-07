import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models';
import { AuthService } from './auth.service';

/** Sin sesion -> /login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.user() ? true : inject(Router).createUrlTree(['/login']);
};

/** Con sesion pero sin el rol -> /dashboard. Espejo de la matriz del BFF. */
export function roleGuard(...roles: Rol[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.user()) return router.createUrlTree(['/login']);
    return auth.hasRole(...roles) ? true : router.createUrlTree(['/dashboard']);
  };
}
