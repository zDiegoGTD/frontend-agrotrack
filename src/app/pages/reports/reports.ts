import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { ETIQUETA } from '../../core/estados';
import { EstadoEntrega, Kpis, Problema, Producto, TopProducto } from '../../core/models';

/** /reports, seccion 6: entregas por hora, tiempo de ciclo, productos mas recibidos. Solo Admin. */
@Component({
  selector: 'app-reports',
  imports: [FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="cabecera"><h1>Reportería</h1>
      <label>Rango
        <select [(ngModel)]="range" (change)="cargar()">
          <option value="last24h">Últimas 24 h</option><option value="last7d">Últimos 7 días</option><option value="last30d">Últimos 30 días</option>
        </select></label></div>
    @if (error()) { <p class="alerta alerta--error">{{ error() }}</p> }

    @if (kpis(); as k) {
      <section class="tiles">
        <div class="tile"><span class="tile__n">{{ k.totalActivas }}</span><span>entregas activas ahora</span></div>
        <div class="tile"><span class="tile__n">{{ k.entregasCerradas }}</span><span>despachadas en el rango</span></div>
        <div class="tile"><span class="tile__n">{{ k.tiempoCicloPromedioMin ?? '–' }}<small> min</small></span><span>tiempo de ciclo promedio</span></div>
        <div class="tile"><span class="tile__n">{{ totales().recibidas }}</span><span>recibidas en el rango</span></div>
      </section>

      <section class="card">
        <h2>Entregas por hora</h2>
        @if (k.entregasPorHora.length) {
          <svg [attr.viewBox]="'0 0 ' + ancho + ' 160'" class="grafico" preserveAspectRatio="none">
            @for (h of k.entregasPorHora; track h.hora; let i = $index) {
              <g [attr.transform]="'translate(' + (i * paso) + ',0)'">
                <rect [attr.x]="1" [attr.y]="140 - alto(h.registradas)" [attr.width]="paso / 3 - 2" [attr.height]="alto(h.registradas)" class="b-reg"><title>{{ h.hora | date: 'dd/MM HH:mm' }} · registradas {{ h.registradas }}</title></rect>
                <rect [attr.x]="paso / 3 + 1" [attr.y]="140 - alto(h.recibidas)" [attr.width]="paso / 3 - 2" [attr.height]="alto(h.recibidas)" class="b-rec"><title>recibidas {{ h.recibidas }}</title></rect>
                <rect [attr.x]="(2 * paso) / 3 + 1" [attr.y]="140 - alto(h.despachadas)" [attr.width]="paso / 3 - 2" [attr.height]="alto(h.despachadas)" class="b-des"><title>despachadas {{ h.despachadas }}</title></rect>
              </g>
            }
            <line x1="0" y1="140" [attr.x2]="ancho" y2="140" class="eje" />
          </svg>
          <div class="leyenda"><span><i class="b-reg"></i> registradas</span><span><i class="b-rec"></i> recibidas</span><span><i class="b-des"></i> despachadas</span>
            <span class="rango">{{ k.entregasPorHora[0].hora | date: 'dd/MM HH:mm' }} → {{ k.entregasPorHora[k.entregasPorHora.length - 1].hora | date: 'dd/MM HH:mm' }}</span></div>
        } @else { <p class="vacio">Sin movimientos en el rango.</p> }
      </section>

      <div class="dos">
        <section class="card">
          <h2>Estados activos</h2>
          <table class="tabla"><tbody>
            @for (e of estadosActivos(); track e.estado) {
              <tr><td>{{ e.etiqueta }}</td><td class="num"><b>{{ e.n }}</b></td></tr>
            }
          </tbody></table>
        </section>
        <section class="card">
          <h2>Productos más recibidos</h2>
          <table class="tabla">
            <thead><tr><th>Producto</th><th class="num">Lotes</th><th class="num">Peso total</th></tr></thead>
            <tbody>
              @for (t of top(); track t.productoId) {
                <tr><td>{{ nombre(t.productoId) }}</td><td class="num">{{ t.entregas }}</td><td class="num">{{ t.pesoTotal | number }}</td></tr>
              } @empty { <tr><td colspan="3" class="vacio">Sin recepciones en el rango.</td></tr> }
            </tbody>
          </table>
        </section>
      </div>
    }
  `,
  styles: `
    .cabecera { display: flex; justify-content: space-between; align-items: center; }
    .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .tile { background: #fff; border-radius: 10px; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: .25rem; box-shadow: var(--sombra); color: var(--gris-600); font-size: .85rem; }
    .tile__n { font-size: 2rem; font-weight: 700; color: var(--verde-900); }
    .grafico { width: 100%; height: 200px; }
    .b-reg { fill: #a8c5ad; } .b-rec { fill: var(--verde-700); } .b-des { fill: var(--verde-900); } .eje { stroke: var(--gris-300); }
    .leyenda { display: flex; gap: 1rem; font-size: .8rem; color: var(--gris-600); } .leyenda i { display: inline-block; width: 10px; height: 10px; margin-right: .3rem; }
    .leyenda .rango { margin-left: auto; }
    .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; } @media (max-width: 900px) { .dos { grid-template-columns: 1fr; } }
    .num { text-align: right; }
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
  private get maximo() { return Math.max(1, ...(this.kpis()?.entregasPorHora ?? []).flatMap((h) => [h.registradas, h.recibidas, h.despachadas])); }
  alto = (v: number) => (v / this.maximo) * 130;

  readonly totales = computed(() => (this.kpis()?.entregasPorHora ?? []).reduce(
    (a, h) => ({ recibidas: a.recibidas + h.recibidas, registradas: a.registradas + h.registradas }), { recibidas: 0, registradas: 0 }));
  readonly estadosActivos = computed(() =>
    Object.entries(this.kpis()?.estadosActivos ?? {}).map(([estado, n]) => ({ estado, n, etiqueta: ETIQUETA[estado as EstadoEntrega] ?? estado })));

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
