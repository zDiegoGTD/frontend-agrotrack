import { DatePipe, JsonPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { ESTADO_DE_EVENTO } from '../../core/estados';
import { EventoAuditoria, Problema } from '../../core/models';
import { finDelDiaLocal, inicioDelDiaLocal } from '../../core/fechas';
import { EstadoBadge } from '../../shared/estado-badge';

/** /audit, seccion 6: trazabilidad de la entrega. Filtros: usuario, fechas, tipo de evento. */
@Component({
  selector: 'app-audit',
  imports: [FormsModule, DatePipe, JsonPipe, EstadoBadge],
  template: `
    <div class="pagina-cab">
      <div><h1>Auditoría</h1><p>Trazabilidad inmutable: cada cambio de estado que pasó por Kafka</p></div>
    </div>

    <section class="panel">
      <div class="panel__cab"><div class="panel__titulo"><img src="img/nav-auditoria.png" alt="" /><div><h2>Buscar</h2><p>Por lote, o filtrando todos los eventos</p></div></div></div>
      <div class="panel__cuerpo filtros">
        <label>Código de lote <input class="mono" [(ngModel)]="codigo" placeholder="DEL-2026-000001" (keyup.enter)="verTimeline()" /></label>
        <button class="btn btn--primario" (click)="verTimeline()" [disabled]="!codigo.trim()">Ver línea de tiempo</button>
      </div>
      <div class="panel__cuerpo filtros">
        <label>Usuario (oid) <input class="mono" [(ngModel)]="f.usuario" placeholder="oid" /></label>
        <label>Tipo
          <select [(ngModel)]="f.tipo"><option value="">Todos</option>
            @for (t of tipos; track t) { <option [value]="t">{{ t }}</option> }</select></label>
        <label>Desde <input type="date" [(ngModel)]="f.desde" /></label>
        <label>Hasta <input type="date" [(ngModel)]="f.hasta" /></label>
        <button class="btn btn--sol" (click)="buscar()">Buscar eventos</button>
      </div>
    </section>
    @if (error()) { <p class="alerta alerta--error">⚠️ {{ error() }}</p> }

    @if (timeline().length) {
      <section class="panel">
        <div class="panel__cab"><div class="panel__titulo"><img src="img/ico-checklist.png" alt="" /><div><h2>Línea de tiempo de <span class="mono">{{ codigoMostrado }}</span></h2><p>{{ timeline().length }} eventos, del más antiguo al más nuevo</p></div></div></div>
        <ol class="timeline">
          @for (ev of timeline(); track ev.eventId) {
            <li [class]="'paso paso--' + (estadoDe(ev) ?? 'otro').toLowerCase()">
              <span class="punto"></span>
              <div class="cuerpo">
                <div class="linea1">
                  @if (estadoDe(ev); as est) { <app-estado-badge [estado]="est" /> }
                  <b class="mono tipo">{{ ev.tipo }}</b>
                  <span class="mono cuando">{{ ev.ocurridoEn | date: 'dd/MM/yyyy HH:mm:ss' }}</span>
                </div>
                <div class="quien">{{ ev.actorNombre || ev.actorId }} <span class="pildora">{{ ev.actorRol }}</span> · desde {{ ev.source }}</div>
                <details><summary>Ver datos del evento</summary><pre>{{ ev.data | json }}</pre>
                  <small class="mono">eventId {{ ev.eventId }} · trace {{ ev.traceId }}</small></details>
              </div>
            </li>
          }
        </ol>
      </section>
    }

    @if (buscados()) {
      <section class="panel">
        <div class="panel__cab"><div class="panel__titulo"><img src="img/nav-reporteria.png" alt="" /><div><h2>Eventos</h2><p>{{ eventos().length }} resultados (máx. 200)</p></div></div></div>
        <div class="tabla-wrap"><table class="tabla">
          <thead><tr><th>Cuándo</th><th>Lote</th><th>Evento</th><th>Quién</th><th>Rol</th><th>Id</th></tr></thead>
          <tbody>
            @for (ev of eventos(); track ev.eventId) {
              <tr><td class="mono fecha">{{ ev.ocurridoEn | date: 'dd/MM HH:mm:ss' }}</td>
                <td><a href="#" class="mono" (click)="$event.preventDefault(); codigo = ev.entregaCodigo; verTimeline()">{{ ev.entregaCodigo }}</a></td>
                <td>@if (estadoDe(ev); as est) { <app-estado-badge [estado]="est" /> } @else { <span class="mono">{{ ev.tipo }}</span> }</td>
                <td>{{ ev.actorNombre || ev.actorId }}</td><td><span class="pildora">{{ ev.actorRol }}</span></td>
                <td><small class="mono">{{ ev.eventId.slice(0, 8) }}…</small></td></tr>
            } @empty { <tr><td colspan="6" class="vacio">Sin eventos para ese filtro.</td></tr> }
          </tbody>
        </table></div>
      </section>
    }
  `,
  styles: `
    .filtros { display: flex; gap: .75rem; align-items: end; flex-wrap: wrap; }
    .timeline { list-style: none; margin: 0; padding: 1.2rem 1.35rem; }
    .paso { display: grid; grid-template-columns: 22px 1fr; gap: .9rem; position: relative; padding-bottom: 1.1rem; }
    .paso::before { content: ''; position: absolute; left: 10px; top: 20px; bottom: 0; border-left: 3px dashed var(--tierra-30); }
    .paso:last-child::before { display: none; }
    .punto { width: 22px; height: 22px; border-radius: 50%; border: var(--trazo-fino); box-shadow: var(--sombra-sm); background: #fff; margin-top: 2px; }
    .paso--recibida .punto { background: var(--sol); } .paso--en_clasificacion .punto { background: var(--cielo); }
    .paso--en_despacho .punto { background: var(--pasto-claro); } .paso--despachada .punto { background: var(--pasto-oscuro); } .paso--rechazada .punto { background: var(--granero); }
    .linea1 { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
    .tipo { font-size: .8rem; } .cuando, .fecha { font-size: .74rem; color: var(--tierra-70); }
    .quien { font-size: .86rem; font-weight: 600; margin-top: .3rem; }
    details { margin-top: .35rem; } summary { cursor: pointer; font-family: var(--fuente-titulo); font-weight: 700; font-size: .8rem; }
    pre { background: var(--crema); border: 2px solid var(--tierra-15); border-radius: 10px; padding: .6rem; font-size: .74rem; overflow-x: auto; }
  `,
})
export class Audit implements OnInit {
  private readonly api = inject(ApiService);
  readonly tipos = Object.keys(ESTADO_DE_EVENTO);

  codigo = '';
  codigoMostrado = '';
  f = { usuario: '', tipo: '', desde: '', hasta: '' };
  readonly timeline = signal<EventoAuditoria[]>([]);
  readonly eventos = signal<EventoAuditoria[]>([]);
  readonly buscados = signal(false);
  readonly error = signal('');

  estadoDe = (ev: EventoAuditoria) => ESTADO_DE_EVENTO[ev.tipo] ?? null;

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
        desde: inicioDelDiaLocal(this.f.desde),
        hasta: finDelDiaLocal(this.f.hasta), limite: '200',
      }));
      this.buscados.set(true);
    } catch (e) {
      this.error.set((e as Problema).detail);
    }
  }
}
