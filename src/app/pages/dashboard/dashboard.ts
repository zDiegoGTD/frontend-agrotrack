import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ETIQUETA, claseBadge } from '../../core/estados';
import { Entrega, EventoAuditoria, Kpis } from '../../core/models';

/**
 * /dashboard, seccion 6: Admin ve KPIs de la red; Jefe de acopio, lo que
 * tiene por recibir y en clasificacion; Productor, sus ultimas entregas;
 * Auditor, los ultimos eventos.
 */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, DecimalPipe],
  template: `
    <h1>Hola, {{ auth.user()?.nombre }}</h1>
    @if (error()) { <p class="alerta alerta--error">{{ error() }}</p> }

    @if (auth.hasRole('ADMIN')) {
      <section class="tiles">
        <div class="tile"><span class="tile__n">{{ kpis()?.totalActivas ?? '–' }}</span><span>entregas activas</span></div>
        <div class="tile"><span class="tile__n">{{ kpis()?.entregasCerradas ?? '–' }}</span><span>despachadas (24 h)</span></div>
        <div class="tile"><span class="tile__n">{{ kpis()?.tiempoCicloPromedioMin | number: '1.0-0' }}<small> min</small></span><span>tiempo de ciclo promedio</span></div>
        <div class="tile"><span class="tile__n">{{ recibidasHoy() }}</span><span>recibidas (24 h)</span></div>
      </section>
      <p><a routerLink="/reports" class="btn btn--primario">Ver reportería completa</a></p>
    }

    @if (auth.hasRole('OPERADOR') && !auth.hasRole('ADMIN')) {
      <div class="dos">
        <section class="card">
          <h2>Por recibir <span class="contador">{{ porRecibir().length }}</span></h2>
          @for (e of porRecibir(); track e.id) {
            <div class="fila"><a [routerLink]="['/deliveries']" [queryParams]="{ codigo: e.codigo }">{{ e.codigo }}</a>
              <span>{{ e.cantidad | number }} · {{ e.fechaRegistro | date: 'short' }}</span></div>
          } @empty { <p class="vacio">Nada pendiente de recibir.</p> }
        </section>
        <section class="card">
          <h2>En clasificación <span class="contador">{{ enClasificacion().length }}</span></h2>
          @for (e of enClasificacion(); track e.id) {
            <div class="fila"><a [routerLink]="['/deliveries']" [queryParams]="{ codigo: e.codigo }">{{ e.codigo }}</a>
              <span>{{ e.pesoRecibido ?? e.cantidad | number }} · {{ e.fechaRecepcion | date: 'short' }}</span></div>
          } @empty { <p class="vacio">Nada en clasificación.</p> }
        </section>
      </div>
    }

    @if (auth.hasRole('CLIENTE') && !auth.hasRole('ADMIN', 'OPERADOR')) {
      <section class="card">
        <h2>Tus últimas entregas</h2>
        <table class="tabla">
          <thead><tr><th>Código</th><th>Cantidad</th><th>Estado</th><th>Registrada</th></tr></thead>
          <tbody>
            @for (e of misEntregas(); track e.id) {
              <tr><td>{{ e.codigo }}</td><td>{{ e.cantidad | number }}</td>
                <td><span [class]="badge(e)">{{ etiqueta(e) }}</span></td><td>{{ e.fechaRegistro | date: 'short' }}</td></tr>
            } @empty { <tr><td colspan="4" class="vacio">Aún no registras entregas.</td></tr> }
          </tbody>
        </table>
        <p><a routerLink="/deliveries" class="btn btn--primario">Registrar una entrega</a></p>
      </section>
    }

    @if (auth.hasRole('AUDITOR') && !auth.hasRole('ADMIN')) {
      <section class="card">
        <h2>Últimos eventos</h2>
        @for (ev of eventos(); track ev.eventId) {
          <div class="fila"><span><b>{{ ev.tipo }}</b> · {{ ev.entregaCodigo }}</span><span>{{ ev.actorNombre }} · {{ ev.ocurridoEn | date: 'short' }}</span></div>
        } @empty { <p class="vacio">Sin eventos todavía.</p> }
        <p><a routerLink="/audit" class="btn btn--primario">Ir a auditoría</a></p>
      </section>
    }
  `,
  styles: `
    .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .tile { background: #fff; border-radius: 10px; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: .25rem;
      box-shadow: var(--sombra); color: var(--gris-600); font-size: .85rem; }
    .tile__n { font-size: 2rem; font-weight: 700; color: var(--verde-900); }
    .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; } @media (max-width: 800px) { .dos { grid-template-columns: 1fr; } }
    .fila { display: flex; justify-content: space-between; padding: .5rem 0; border-bottom: 1px solid var(--gris-100); font-size: .9rem; }
    .contador { background: var(--verde-100); color: var(--verde-900); border-radius: 999px; padding: 0 .55rem; font-size: .8rem; margin-left: .4rem; }
  `,
})
export class Dashboard implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly kpis = signal<Kpis | null>(null);
  readonly porRecibir = signal<Entrega[]>([]);
  readonly enClasificacion = signal<Entrega[]>([]);
  readonly misEntregas = signal<Entrega[]>([]);
  readonly eventos = signal<EventoAuditoria[]>([]);
  readonly error = signal('');

  etiqueta = (e: Entrega) => ETIQUETA[e.estado];
  badge = (e: Entrega) => claseBadge(e.estado);
  recibidasHoy = () => this.kpis()?.entregasPorHora.reduce((s, h) => s + h.recibidas, 0) ?? '–';

  async ngOnInit() {
    try {
      if (this.auth.hasRole('ADMIN')) {
        this.kpis.set(await this.api.kpis('last24h'));
      } else if (this.auth.hasRole('OPERADOR')) {
        this.porRecibir.set(await this.api.listarEntregas({ status: 'REGISTRADA' }));
        this.enClasificacion.set(await this.api.listarEntregas({ status: 'EN_CLASIFICACION' }));
      } else if (this.auth.hasRole('CLIENTE')) {
        this.misEntregas.set((await this.api.listarEntregas()).slice(0, 10));
      } else if (this.auth.hasRole('AUDITOR')) {
        this.eventos.set(await this.api.eventos({ limite: '10' }));
      }
    } catch (e) {
      this.error.set((e as { detail?: string }).detail ?? 'No se pudo cargar el panel');
    }
  }
}
