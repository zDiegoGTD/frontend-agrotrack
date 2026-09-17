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
      <section class="card">
        <h1>{{ titulo() }}</h1>
        @if (cuenta.yo(); as yo) {
          <p>Entraste como <b>{{ yo.email ?? yo.nombre }}</b>@if (yo.primerIngreso) {, solicitud del {{ yo.primerIngreso | date: 'medium' }}}.</p>
          @if (yo.estado === 'PENDIENTE') {
            <p>Un administrador de AgroTrack debe aprobar tu cuenta antes de que puedas usar el sistema.</p>
          }
          @if (yo.motivo) { <p class="alerta alerta--error">Motivo: {{ yo.motivo }}</p> }
        } @else {
          <p class="alerta alerta--error">{{ cuenta.error() ?? 'No se pudo verificar tu cuenta' }}</p>
        }
        <div class="acciones">
          <button class="btn btn--primario" (click)="comprobar()" [disabled]="comprobando()">
            {{ comprobando() ? 'Comprobando…' : 'Volver a comprobar' }}
          </button>
          <button class="btn btn--ghost" (click)="salir()">Salir</button>
        </div>
      </section>
    </main>
  `,
  styles: `
    .pendiente { min-height: 100vh; display: grid; place-items: center; padding: 1rem; background: var(--gris-100); }
    .card { max-width: 480px; width: 100%; }
    .acciones { display: flex; gap: .5rem; margin-top: 1rem; }
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
