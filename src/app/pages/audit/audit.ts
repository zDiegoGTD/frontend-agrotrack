import { DatePipe, JsonPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { EventoAuditoria, Problema } from '../../core/models';

/** /audit, seccion 6: trazabilidad de la entrega. Filtros: usuario, fechas, tipo de evento. */
@Component({
  selector: 'app-audit',
  imports: [FormsModule, DatePipe, JsonPipe],
  template: `
    <h1>Auditoría</h1>
    <section class="card filtros">
      <label>Código de entrega <input [(ngModel)]="codigo" placeholder="DEL-2026-000001" (keyup.enter)="verTimeline()" /></label>
      <button class="btn btn--primario" (click)="verTimeline()" [disabled]="!codigo.trim()">Ver timeline</button>
      <span class="sep"></span>
      <label>Usuario <input [(ngModel)]="f.usuario" placeholder="oid" /></label>
      <label>Tipo
        <select [(ngModel)]="f.tipo"><option value="">Todos</option>
          @for (t of tipos; track t) { <option [value]="t">{{ t }}</option> }</select></label>
      <label>Desde <input type="date" [(ngModel)]="f.desde" /></label>
      <label>Hasta <input type="date" [(ngModel)]="f.hasta" /></label>
      <button class="btn btn--sec" (click)="buscar()">Buscar eventos</button>
    </section>
    @if (error()) { <p class="alerta alerta--error">{{ error() }}</p> }

    @if (timeline().length) {
      <section class="card">
        <h2>Timeline de {{ codigoMostrado }}</h2>
        <ol class="timeline">
          @for (ev of timeline(); track ev.eventId) {
            <li>
              <div class="punto"></div>
              <div class="cuerpo">
                <div class="linea1"><b>{{ ev.tipo }}</b> <span class="cuando">{{ ev.ocurridoEn | date: 'dd/MM/yyyy HH:mm:ss' }}</span></div>
                <div class="quien">{{ ev.actorNombre || ev.actorId }} <small>({{ ev.actorRol }})</small> · desde {{ ev.source }}</div>
                <details><summary>datos</summary><pre>{{ ev.data | json }}</pre>
                  <small>eventId {{ ev.eventId }} · trace {{ ev.traceId }}</small></details>
              </div>
            </li>
          }
        </ol>
      </section>
    }

    @if (buscados()) {
      <section class="card">
        <h2>Eventos <small>{{ eventos().length }}</small></h2>
        <div class="tabla-wrap"><table class="tabla">
          <thead><tr><th>Cuándo</th><th>Entrega</th><th>Evento</th><th>Quién</th><th>Rol</th><th></th></tr></thead>
          <tbody>
            @for (ev of eventos(); track ev.eventId) {
              <tr><td>{{ ev.ocurridoEn | date: 'dd/MM HH:mm:ss' }}</td>
                <td><a href="#" (click)="$event.preventDefault(); codigo = ev.entregaCodigo; verTimeline()">{{ ev.entregaCodigo }}</a></td>
                <td>{{ ev.tipo }}</td><td>{{ ev.actorNombre || ev.actorId }}</td><td>{{ ev.actorRol }}</td>
                <td><small>{{ ev.eventId.slice(0, 8) }}…</small></td></tr>
            } @empty { <tr><td colspan="6" class="vacio">Sin eventos para ese filtro.</td></tr> }
          </tbody>
        </table></div>
      </section>
    }
  `,
  styles: `
    .filtros { display: flex; gap: .75rem; align-items: end; flex-wrap: wrap; margin-bottom: 1rem; } .sep { flex-basis: 100%; height: 0; }
    .timeline { list-style: none; padding: 0; margin: 0; }
    .timeline li { display: grid; grid-template-columns: 20px 1fr; gap: .75rem; position: relative; padding-bottom: 1rem; }
    .timeline li::before { content: ''; position: absolute; left: 9px; top: 14px; bottom: 0; width: 2px; background: var(--gris-100); }
    .punto { width: 12px; height: 12px; border-radius: 50%; background: var(--verde-700); margin: 4px; }
    .cuando { color: var(--gris-600); font-size: .85rem; margin-left: .5rem; } .quien { font-size: .88rem; color: var(--gris-600); }
    pre { background: var(--gris-50); padding: .5rem; font-size: .75rem; overflow-x: auto; }
  `,
})
export class Audit implements OnInit {
  private readonly api = inject(ApiService);
  readonly tipos = ['delivery.registered', 'delivery.received', 'delivery.classifying', 'delivery.dispatching', 'delivery.dispatched', 'delivery.rejected'];

  codigo = '';
  codigoMostrado = '';
  f = { usuario: '', tipo: '', desde: '', hasta: '' };
  readonly timeline = signal<EventoAuditoria[]>([]);
  readonly eventos = signal<EventoAuditoria[]>([]);
  readonly buscados = signal(false);
  readonly error = signal('');

  async ngOnInit() {
    await this.buscar();
  }

  async verTimeline() {
    if (!this.codigo.trim()) return;
    this.error.set('');
    try {
      this.timeline.set(await this.api.timeline(this.codigo.trim()));
      this.codigoMostrado = this.codigo.trim();
      if (!this.timeline().length) this.error.set(`No hay eventos para ${this.codigoMostrado}.`);
    } catch (e) {
      this.error.set((e as Problema).detail);
    }
  }

  async buscar() {
    this.error.set('');
    try {
      this.eventos.set(await this.api.eventos({
        usuario: this.f.usuario || undefined, tipo: this.f.tipo || undefined,
        desde: this.f.desde ? `${this.f.desde}T00:00:00Z` : undefined,
        hasta: this.f.hasta ? `${this.f.hasta}T23:59:59Z` : undefined, limite: '200',
      }));
      this.buscados.set(true);
    } catch (e) {
      this.error.set((e as Problema).detail);
    }
  }
}
