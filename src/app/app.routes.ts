import { Routes } from '@angular/router';
import { authGuard, estadoGuard, roleGuard } from './core/auth/guards';

/** Pantallas y roles de la seccion 6 del enunciado. */
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  // Con sesion pero sin cuenta activa. Fuera del shell: sin menu.
  { path: 'pendiente', canActivate: [authGuard], loadComponent: () => import('./pages/pendiente/pendiente').then((m) => m.Pendiente) },
  {
    path: '',
    loadComponent: () => import('./shell/shell').then((m) => m.Shell),
    canActivate: [authGuard, estadoGuard],
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
      {
        path: 'usuarios',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./pages/usuarios/usuarios').then((m) => m.Usuarios),
      },
      {
        path: 'mi-perfil',
        canActivate: [roleGuard('CLIENTE')],
        loadComponent: () => import('./pages/mi-perfil/mi-perfil').then((m) => m.MiPerfil),
      },
      { path: 'sesion', loadComponent: () => import('./pages/sesion/sesion').then((m) => m.Sesion) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
