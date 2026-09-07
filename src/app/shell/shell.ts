import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { ROL_ETIQUETA } from '../core/estados';
import { Rol } from '../core/models';

interface Enlace {
  ruta: string;
  texto: string;
  roles: Rol[];
}

/** Marco comun: cabecera con navegacion segun rol (seccion 6 del enunciado). */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <a class="brand" routerLink="/dashboard">🌾 AgroTrack</a>
      <nav>
        @for (e of enlaces(); track e.ruta) {
          <a [routerLink]="e.ruta" routerLinkActive="activo">{{ e.texto }}</a>
        }
      </nav>
      <div class="usuario">
        <span class="nombre">{{ auth.user()?.nombre }}</span>
        <span class="rol">{{ rol() }}</span>
        <button class="btn btn--ghost" (click)="salir()">Salir</button>
      </div>
    </header>
    <main class="contenido"><router-outlet /></main>
  `,
  styles: `
    .topbar { display: flex; align-items: center; gap: 1.5rem; padding: 0 1.25rem; height: 56px;
      background: var(--verde-900); color: #fff; }
    .brand { color: #fff; font-weight: 700; text-decoration: none; font-size: 1.05rem; }
    nav { display: flex; gap: .25rem; flex: 1; }
    nav a { color: #d9f0dc; text-decoration: none; padding: .45rem .7rem; border-radius: 6px; font-size: .92rem; }
    nav a:hover { background: rgba(255,255,255,.08); }
    nav a.activo { background: rgba(255,255,255,.16); color: #fff; }
    .usuario { display: flex; align-items: center; gap: .6rem; font-size: .85rem; }
    .rol { background: var(--verde-700); padding: .15rem .5rem; border-radius: 999px; font-size: .75rem; }
    .contenido { max-width: 1200px; margin: 0 auto; padding: 1.5rem 1.25rem; }
    @media (max-width: 720px) { nav { overflow-x: auto; } .nombre { display: none; } }
  `,
})
export class Shell {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly todos: Enlace[] = [
    { ruta: '/dashboard', texto: 'Inicio', roles: ['ADMIN', 'OPERADOR', 'CLIENTE', 'AUDITOR'] },
    { ruta: '/deliveries', texto: 'Entregas', roles: ['ADMIN', 'OPERADOR', 'CLIENTE'] },
    { ruta: '/catalog', texto: 'Catálogo', roles: ['ADMIN', 'OPERADOR'] },
    { ruta: '/reports', texto: 'Reportería', roles: ['ADMIN'] },
    { ruta: '/audit', texto: 'Auditoría', roles: ['ADMIN', 'AUDITOR'] },
  ];

  readonly enlaces = computed(() => this.todos.filter((e) => this.auth.hasRole(...e.roles)));
  readonly rol = computed(() => (this.auth.rolPrincipal ? ROL_ETIQUETA[this.auth.rolPrincipal] : ''));

  async salir() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
