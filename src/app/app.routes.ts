import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/guards';

/** Pantallas y roles de la seccion 6 del enunciado. */
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  {
    path: '',
    loadComponent: () => import('./shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard) },
      {
        path: 'deliveries',
        canActivate: [roleGuard('ADMIN', 'OPERADOR', 'CLIENTE')],
        loadComponent: () => import('./pages/deliveries/deliveries').then((m) => m.Deliveries),
      },
      {
        path: 'catalog',
        canActivate: [roleGuard('ADMIN', 'OPERADOR')],
        loadComponent: () => import('./pages/catalog/catalog').then((m) => m.Catalog),
      },
      {
        path: 'reports',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./pages/reports/reports').then((m) => m.Reports),
      },
      {
        path: 'audit',
        canActivate: [roleGuard('ADMIN', 'AUDITOR')],
        loadComponent: () => import('./pages/audit/audit').then((m) => m.Audit),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
