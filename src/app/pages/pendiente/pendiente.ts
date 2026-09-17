import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CuentaService } from '../../core/auth/cuenta.service';
import { MENSAJE_CUENTA } from '../../core/usuarios';

/**
 * /pendiente: para quien entro con Microsoft pero no tiene la cuenta activa.
 * Sin menu a proposito: la unica salida es comprobar de nuevo o cerrar sesion.
 */
@Component({
  selector: 'app-pendiente',
  imports: [DatePipe],
  template: `
    <main class="pendiente">
      <section class="tarjeta">
        <div class="cab">
          <img class="logo" src="img/logo-circulo.png" alt="" />
          <h1>{{ titulo() }}</h1>
        </div>
        <div class="cuerpo">
          @if (cuenta.yo(); as yo) {
            <div class="datos">
              <span>Cuenta</span><b class="mono">{{ yo.email ?? yo.nombre }}</b>
              @if (yo.primerIngreso) { <span>Solicitud</span><b>{{ yo.primerIngreso | date: 'd MMM y, HH:mm' }}</b> }
            </div>
            @if (yo.estado === 'PENDIENTE') {
              <p>Un administrador de AgroTrack debe aprobar tu cuenta antes de que puedas usar el sistema. Cuando lo haga, pulsa <b>Volver a comprobar</b>.</p>
            }
            @if (yo.motivo) { <p class="alerta alerta--error">Motivo: {{ yo.motivo }}</p> }
          } @else {
            <p class="alerta alerta--error">{{ cuenta.error() ?? 'No se pudo verificar tu cuenta' }}</p>
          }
          <div class="acciones">
            <button class="btn btn--primario" (click)="comprobar()" [disabled]="comprobando()">
              {{ comprobando() ? 'Comprobando…' : 'Volver a comprobar' }}
            </button>
            <button class="btn btn--sec" (click)="salir()">Salir</button>
          </div>
        </div>
      </section>
      <img class="mascota" src="img/mascota-saluda.png" alt="" />
    </main>
  `,
  styles: `
    .pendiente { min-height: 100vh; display: grid; place-items: center; padding: 1.5rem; position: relative; overflow: hidden; background: var(--crema-fondo); }
    .tarjeta { width: min(500px, 100%); background: #fff; border: var(--trazo); border-radius: 22px; box-shadow: var(--sombra-lg); overflow: hidden; position: relative; z-index: 1; }
    .cab { background: var(--sol); border-bottom: var(--trazo); padding: 1rem 1.3rem; display: flex; gap: .9rem; align-items: center; }
    .logo { width: 56px; height: 56px; }
    h1 { margin: 0; font-size: 1.5rem; }
    .cuerpo { padding: 1.2rem 1.3rem 1.4rem; display: grid; gap: .8rem; }
    .cuerpo p { margin: 0; font-weight: 600; line-height: 1.5; }
    .datos { display: grid; grid-template-columns: auto 1fr; gap: .3rem .9rem; align-items: baseline; }
    .datos span { font-family: var(--fuente-titulo); font-weight: 800; font-size: .78rem; color: var(--tierra-70); }
    .acciones { display: flex; gap: .5rem; flex-wrap: wrap; }
    .mascota { position: absolute; right: max(2vw, calc(50% - 560px)); bottom: 2vh; width: min(260px, 26vw); transform: rotate(-4deg); pointer-events: none; }
    @media (max-width: 900px) { .mascota { display: none; } }
  `,
})
export class Pendiente implements OnInit {
  readonly cuenta = inject(CuentaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly comprobando = signal(false);
  readonly titulo = computed(() => {
    const yo = this.cuenta.yo();
    return yo ? MENSAJE_CUENTA[yo.estado] : 'No se pudo verificar tu cuenta';
  });

  async ngOnInit() {
    // Si llega aqui con la cuenta ya activa (p. ej. un marcador), no hay nada que esperar.
    const yo = await this.cuenta.cargar();
    if (yo?.estado === 'ACTIVO') this.router.navigate(['/dashboard'], { replaceUrl: true });
  }

  async comprobar() {
    this.comprobando.set(true);
    try {
      const yo = await this.cuenta.recargar();
      if (yo?.estado === 'ACTIVO') this.router.navigate(['/dashboard'], { replaceUrl: true });
    } finally {
      this.comprobando.set(false);
    }
  }

  async salir() {
    this.cuenta.limpiar();
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
