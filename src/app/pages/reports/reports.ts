import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { EstadoEntrega, Kpis, Problema, Producto, TopProducto } from '../../core/models';
import { EstadoBadge } from '../../shared/estado-badge';

/** /reports, seccion 6: entregas por hora, tiempo de ciclo, productos mas recibidos. Solo Admin. */
@Component({
  selector: 'app-reports',
  imports: [FormsModule, DatePipe, DecimalPipe, EstadoBadge],
  template: `
    <div class="pagina-cab">
      <div><h1>Reportería</h1><p>Indicadores calculados por ms-agrotrack-report a partir de los eventos de Kafka</p></div>
      <label class="rango">Rango
        <select [(ngModel)]="range" (change)="cargar()">
          <option value="last24h">Últimas 24 h</option><option value="last7d">Últimos 7 días</option><option value="last30d">Últimos 30 días</option>
        </select></label>
    </div>
    @if (error()) { <p class="alerta alerta--error">⚠️ {{ error() }}</p> }

    @if (kpis(); as k) {
      <section class="kpis">
        <div class="kpi"><div class="kpi__cab"><span class="kpi__titulo">Activas ahora</span><span class="kpi__ico"><img src="img/ico-cajon.png" alt="" /></span></div>
          <div class="kpi__valor">{{ k.totalActivas }}</div><div class="kpi__pie">lotes aún en planta</div></div>
        <div class="kpi"><div class="kpi__cab"><span class="kpi__titulo">Despachadas</span><span class="kpi__ico"><img src="img/ico-camion.png" alt="" /></span></div>
          <div class="kpi__valor">{{ k.entregasCerradas }}</div><div class="kpi__pie">en el rango elegido</div></div>
        <div class="kpi"><div class="kpi__cab"><span class="kpi__titulo">Tiempo de ciclo</span><span class="kpi__ico"><img src="img/ico-checklist.png" alt="" /></span></div>
          <div class="kpi__valor">{{ k.tiempoCicloPromedioMin == null ? '–' : (k.tiempoCicloPromedioMin | number: '1.0-0') }} <small>min</small></div><div class="kpi__pie">promedio de registro a despacho</div></div>
        <div class="kpi"><div class="kpi__cab"><span class="kpi__titulo">Recibidas</span><span class="kpi__ico"><img src="img/ico-balanza.png" alt="" /></span></div>
          <div class="kpi__valor">{{ totales().recibidas }}</div><div class="kpi__pie">pesadas en romana en el rango</div></div>
      </section>

      <section class="panel">
        <div class="panel__cab"><div class="panel__titulo"><img src="img/nav-reporteria.png" alt="" /><div><h2>Entregas por hora</h2><p>Registradas, recibidas y despachadas</p></div></div></div>
        <div class="panel__cuerpo">
          @if (k.entregasPorHora.length) {
            <svg [attr.viewBox]="'0 0 ' + ancho + ' 160'" class="grafico" preserveAspectRatio="none">
              @for (h of k.entregasPorHora; track h.hora; let i = $index) {
                <g [attr.transform]="'translate(' + (i * paso + margen) + ',0)'">
                  <rect [attr.x]="0" [attr.y]="140 - alto(h.registradas)" [attr.width]="barra" [attr.height]="alto(h.registradas)" class="b-reg"><title>{{ h.hora | date: 'dd/MM HH:mm' }} · registradas {{ h.registradas }}</title></rect>
                  <rect [attr.x]="barra + 3" [attr.y]="140 - alto(h.recibidas)" [attr.width]="barra" [attr.height]="alto(h.recibidas)" class="b-rec"><title>recibidas {{ h.recibidas }}</title></rect>
                  <rect [attr.x]="2 * (barra + 3)" [attr.y]="140 - alto(h.despachadas)" [attr.width]="barra" [attr.height]="alto(h.despachadas)" class="b-des"><title>despachadas {{ h.despachadas }}</title></rect>
                </g>
              }
              <line x1="0" y1="140" [attr.x2]="ancho" y2="140" class="eje" />
            </svg>
            <div class="leyenda"><span><i class="b-reg"></i> registradas</span><span><i class="b-rec"></i> recibidas</span><span><i class="b-des"></i> despachadas</span>
              <span class="mono rango-txt">{{ k.entregasPorHora[0].hora | date: 'dd/MM HH:mm' }} → {{ k.entregasPorHora[k.entregasPorHora.length - 1].hora | date: 'dd/MM HH:mm' }}</span></div>
          } @else { <p class="vacio">Sin movimientos en el rango.</p> }
        </div>
      </section>

      <div class="dos">
        <section class="panel">
          <div class="panel__cab"><div class="panel__titulo"><img src="img/nav-entregas.png" alt="" /><div><h2>Estados activos</h2><p>Dónde están hoy los lotes</p></div></div></div>
          <div class="panel__cuerpo">
            @for (e of estadosActivos(); track e.estado) {
              <div class="fila"><app-estado-badge [estado]="e.estado" /><b class="cuenta">{{ e.n }}</b></div>
            } @empty { <p class="vacio">No hay lotes activos.</p> }
          </div>
        </section>
        <section class="panel">
          <div class="panel__cab"><div class="panel__titulo"><img src="img/ico-trigo.png" alt="" /><div><h2>Productos más recibidos</h2><p>Por peso total en el rango</p></div></div></div>
          <table class="tabla">
            <thead><tr><th>Producto</th><th class="num">Lotes</th><th class="num">Peso total</th></tr></thead>
            <tbody>
              @for (t of top(); track t.productoId) {
                <tr><td>{{ nombre(t.productoId) }}</td><td class="num">{{ t.entregas }}</td><td class="num carga">{{ t.pesoTotal | number: '1.0-0' }} kg</td></tr>
              } @empty { <tr><td colspan="3" class="vacio">Sin recepciones en el rango.</td></tr> }
            </tbody>
          </table>
        </section>
      </div>
    }
  `,
  styles: `
    .rango { flex-direction: row; align-items: center; gap: .5rem; }
    .grafico { width: 100%; height: 220px; }
    .b-reg { fill: var(--sol); } .b-rec { fill: var(--pasto); } .b-des { fill: var(--pasto-oscuro); }
    rect { stroke: var(--tierra); stroke-width: 1.5; }
    .eje { stroke: var(--tierra); stroke-width: 2; }
    .leyenda { display: flex; gap: 1rem; flex-wrap: wrap; font-family: var(--fuente-titulo); font-weight: 700; font-size: .8rem; margin-top: .5rem; }
    .leyenda i { display: inline-block; width: 12px; height: 12px; margin-right: .3rem; border: 1.5px solid var(--tierra); border-radius: 3px; vertical-align: -1px; }
    .leyenda i.b-reg { background: var(--sol); } .leyenda i.b-rec { background: var(--pasto); } .leyenda i.b-des { background: var(--pasto-oscuro); }
    .rango-txt { margin-left: auto; font-size: .72rem; color: var(--tierra-70); }
    .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; } @media (max-width: 900px) { .dos { grid-template-columns: 1fr; } }
    .fila { display: flex; justify-content: space-between; align-items: center; padding: .45rem 0; border-bottom: 2px dashed var(--tierra-15); }
    .fila:last-child { border-bottom: none; }
    .cuenta, .carga { font-family: var(--fuente-titulo); font-weight: 800; font-size: 1.05rem; color: var(--pasto-oscuro); }
  `,
})
export class Reports implements OnInit {
  private readonly api = inject(ApiService);
  range = 'last24h';
  readonly kpis = signal<Kpis | null>(null);
  readonly top = signal<TopProducto[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly error = signal('');

  readonly ancho = 720;
  get paso() { return this.ancho / Math.max(1, this.kpis()?.entregasPorHora.length ?? 1); }
  /** Con pocas horas de datos las barras serian bloques gigantes: se limitan y se centran en su hora. */
  get barra() { return Math.max(2, Math.min(28, this.paso / 3 - 3)); }
  get margen() { return (this.paso - 3 * this.barra - 6) / 2; }
  private get maximo() { return Math.max(1, ...(this.kpis()?.entregasPorHora ?? []).flatMap((h) => [h.registradas, h.recibidas, h.despachadas])); }
  alto = (v: number) => (v / this.maximo) * 130;

  readonly totales = computed(() => (this.kpis()?.entregasPorHora ?? []).reduce(
    (a, h) => ({ recibidas: a.recibidas + h.recibidas, registradas: a.registradas + h.registradas }), { recibidas: 0, registradas: 0 }));
  readonly estadosActivos = computed(() =>
    Object.entries(this.kpis()?.estadosActivos ?? {}).map(([estado, n]) => ({ estado: estado as EstadoEntrega, n })));

  nombre = (id: number) => this.productos().find((p) => p.id === id)?.nombre ?? `Producto #${id}`;

  async ngOnInit() {
    this.api.productos(false).then((p) => this.productos.set(p)).catch(() => undefined);
    await this.cargar();
  }

  async cargar() {
    this.error.set('');
    try {
      const [k, t] = await Promise.all([this.api.kpis(this.range), this.api.topProductos(this.range)]);
      this.kpis.set(k);
      this.top.set(t);
    } catch (e) {
      this.error.set((e as Problema).detail);
    }
  }
}
