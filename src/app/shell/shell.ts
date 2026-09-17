import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth/auth.service';
import { CuentaService } from '../core/auth/cuenta.service';
import { ROL_ETIQUETA } from '../core/estados';
import { Rol } from '../core/models';

interface Enlace {
  ruta: string;
  texto: string;
  icono: string;
  roles: Rol[];
}

/**
 * Marco comun: barra lateral con la navegacion que permite el rol del token
 * (seccion 6 del enunciado) y barra superior con las acciones rapidas.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="marco" [class.marco--menu]="menuAbierto()">
      <aside class="lateral">
        <a class="marca" routerLink="/dashboard"><img src="img/marca.png" alt="AgroTrack" /></a>

        <nav aria-label="Navegación principal">
          <p class="seccion">Operaciones de planta</p>
          @for (e of enlaces(); track e.ruta) {
            <a class="enlace" [routerLink]="e.ruta" routerLinkActive="enlace--activo" #rla="routerLinkActive">
              <img [src]="e.icono" alt="" />
              <span>{{ e.texto }}</span>
              @if (rla.isActive) { <img class="brote" src="img/brote.png" alt="" /> }
            </a>
          }
        </nav>

        <div class="sesion">
          <div class="avatar">{{ iniciales() }}</div>
          <div class="datos">
            <b>{{ auth.user()?.nombre }}</b>
            <span class="pildora">{{ rol() }}</span>
            <small class="mono">{{ auth.user()?.email }}</small>
          </div>
          <button type="button" class="btn btn--chico salir" (click)="salir()">Salir</button>
        </div>
      </aside>

      <div class="velo" (click)="menuAbierto.set(false)"></div>

      <div class="principal">
        <header class="superior">
          <button type="button" class="btn btn--chico hamburguesa" aria-label="Abrir menú" (click)="menuAbierto.set(!menuAbierto())">☰</button>
          <div class="contexto">
            <img src="img/ico-bodega.png" alt="" />
            <b>Centro de acopio</b>
            <span class="pildora estado-conexion"><i></i>{{ modo }}</span>
          </div>
          @if (auth.hasRole('ADMIN', 'OPERADOR', 'CLIENTE')) {
            <a class="btn btn--primario" routerLink="/deliveries" [queryParams]="{ nueva: 1 }">
              <img src="img/ico-cajon.png" alt="" class="ico-btn" /> <span class="txt">Nueva entrega</span>
            </a>
          }
        </header>
        <main class="contenido"><router-outlet /></main>
      </div>
    </div>
  `,
  styles: `
    .marco { display: grid; grid-template-columns: 256px 1fr; height: 100vh; overflow: hidden; }
    .lateral { background: var(--crema); border-right: var(--trazo);
      display: flex; flex-direction: column; min-height: 0; z-index: 40; }
    .marca { display: block; padding: .9rem 1rem; border-bottom: var(--trazo); background: rgba(255,255,255,.6); }
    .marca img { width: 100%; max-width: 200px; display: block; margin: 0 auto; }
    nav { padding: .75rem; display: flex; flex-direction: column; gap: .35rem; overflow-y: auto; flex: 1; }
    .seccion { margin: .5rem .6rem .25rem; font-family: var(--fuente-titulo); font-size: .68rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: var(--tierra-50); }
    .enlace { display: flex; align-items: center; gap: .6rem; padding: .45rem .7rem; border-radius: 14px; border: 2px solid transparent;
      font-family: var(--fuente-titulo); font-weight: 700; font-size: .95rem; color: var(--tierra-70); text-decoration: none; transition: background .15s; }
    .enlace img { width: 30px; height: 30px; object-fit: contain; border-radius: 8px; }
    .enlace:hover { background: rgba(111, 207, 151, .25); color: var(--tierra); border-color: var(--tierra-30); }
    .enlace--activo { background: var(--pasto); color: var(--tierra); border-color: var(--tierra); box-shadow: var(--sombra-sm); }
    .enlace .brote { width: 20px; height: 20px; margin-left: auto; }
    .sesion { border-top: var(--trazo); background: rgba(255,255,255,.7); padding: .8rem; display: grid; grid-template-columns: auto 1fr; gap: .6rem; align-items: center; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--sol); border: var(--trazo-fino); box-shadow: var(--sombra-sm);
      display: grid; place-items: center; font-family: var(--fuente-titulo); font-weight: 800; }
    .datos { display: flex; flex-direction: column; gap: .15rem; min-width: 0; align-items: flex-start; }
    .datos b { font-family: var(--fuente-titulo); font-size: .85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .datos small { font-size: .66rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .salir { grid-column: 1 / -1; }
    .principal { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
    .superior { height: 64px; flex-shrink: 0; border-bottom: var(--trazo); background: rgba(255,255,255,.95); display: flex; align-items: center; gap: .9rem; padding: 0 1.5rem; }
    .contexto { display: flex; align-items: center; gap: .55rem; flex: 1; min-width: 0; font-family: var(--fuente-titulo); font-size: 1rem; }
    .contexto img { width: 32px; height: 32px; object-fit: contain; }
    .estado-conexion { display: inline-flex; align-items: center; gap: .35rem; }
    .estado-conexion i { width: 8px; height: 8px; border-radius: 50%; background: var(--pasto-oscuro); animation: latido 2s infinite; }
    .ico-btn { width: 22px; height: 22px; object-fit: contain; border-radius: 6px; }
    .contenido { flex: 1; overflow-y: auto; padding: 1.5rem 2rem 3rem; }
    .contenido > * { display: block; max-width: 1280px; margin: 0 auto; }
    .hamburguesa, .velo { display: none; }
    @media (max-width: 960px) {
      .marco { grid-template-columns: 1fr; }
      .lateral { position: fixed; inset: 0 auto 0 0; width: 264px; transform: translateX(-105%); transition: transform .2s; }
      .marco--menu .lateral { transform: none; }
      .marco--menu .velo { display: block; position: fixed; inset: 0; background: rgba(45,30,22,.45); z-index: 30; }
      .hamburguesa { display: inline-flex; }
      .superior { padding: 0 1rem; }
      .contenido { padding: 1rem; }
      .estado-conexion, .txt { display: none; }
    }
  `,
})
export class Shell {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cuenta = inject(CuentaService);

  readonly menuAbierto = signal(false);
  readonly modo = environment.auth.mode === 'msal' ? 'Azure AD' : 'Modo desarrollo';

  private readonly todos: Enlace[] = [
    { ruta: '/dashboard', texto: 'Inicio', icono: 'img/nav-dashboard.png', roles: ['ADMIN', 'OPERADOR', 'CLIENTE', 'AUDITOR'] },
    { ruta: '/deliveries', texto: 'Entregas', icono: 'img/nav-entregas.png', roles: ['ADMIN', 'OPERADOR', 'CLIENTE'] },
    { ruta: '/catalog', texto: 'Catálogo', icono: 'img/nav-catalogo.png', roles: ['ADMIN', 'OPERADOR'] },
    { ruta: '/reports', texto: 'Reportería', icono: 'img/nav-reporteria.png', roles: ['ADMIN'] },
    { ruta: '/audit', texto: 'Auditoría', icono: 'img/nav-auditoria.png', roles: ['ADMIN', 'AUDITOR'] },
    { ruta: '/usuarios', texto: 'Usuarios', icono: 'img/nav-dashboard.png', roles: ['ADMIN'] },
    { ruta: '/mi-perfil', texto: 'Mi ficha', icono: 'img/ico-trigo.png', roles: ['CLIENTE'] },
    { ruta: '/sesion', texto: 'Mi sesión', icono: 'img/ico-checklist.png', roles: ['ADMIN', 'OPERADOR', 'CLIENTE', 'AUDITOR'] },
  ];

  readonly enlaces = computed(() => this.todos.filter((e) => this.auth.hasRole(...e.roles)));
  readonly rol = computed(() => (this.auth.rolPrincipal ? ROL_ETIQUETA[this.auth.rolPrincipal] : 'Sin rol'));
  readonly iniciales = computed(() =>
    (this.auth.user()?.nombre ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join(''),
  );

  constructor() {
    // En movil el menu es un cajon: se cierra solo al navegar.
    // takeUntilDestroyed: el shell se destruye al ir a /login o /pendiente y la suscripcion no debe quedar viva
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.menuAbierto.set(false));
  }

  async salir() {
    // Si otra persona entra en este navegador, no debe heredar el estado de esta cuenta.
    this.cuenta.limpiar();
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
