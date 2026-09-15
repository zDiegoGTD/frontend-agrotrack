import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ESTADO_DE_EVENTO, ROL_ETIQUETA, contarPorEstado, nivelCapacidad } from '../../core/estados';
import { Bodega, Entrega, EstadoEntrega, EventoAuditoria, Kpis, Producto } from '../../core/models';
import { BarraCapacidad } from '../../shared/barra-capacidad';
import { EstadoBadge } from '../../shared/estado-badge';
import { FlujoEstados } from '../../shared/flujo-estados';

/**
 * /dashboard, seccion 6: lo que pasa hoy en la planta. Todos ven el flujo de
 * lotes; Admin suma los KPIs de report, Jefe de acopio y Admin la capacidad
 * de bodegas, y el Auditor los ultimos eventos.
 */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, DecimalPipe, BarraCapacidad, EstadoBadge, FlujoEstados],
  template: `
    <section class="bienvenida">
      <div class="saludo">
        <div class="avatar">{{ iniciales() }}</div>
        <div>
          <div class="linea"><h1>{{ saludo() }}, {{ primerNombre() }}!</h1><span class="pildora">{{ rol() }}</span></div>
          <p>{{ bajada() }}</p>
          <div class="chips">
            <span class="chip"><img src="img/ico-cajon.png" alt="" /> <b>{{ activas() }}</b> lotes en curso</span>
            @if (verCapacidad()) { <span class="chip"><img src="img/ico-bodega.png" alt="" /> <b>{{ ocupacion().usado }}%</b> capacidad usada</span> }
            <span class="chip"><img src="img/ico-balanza.png" alt="" /> <b>{{ volumen24h() | number: '1.0-0' }}</b> kg declarados en 24 h</span>
          </div>
        </div>
      </div>
      <img class="mascota" src="img/mascota-carga.png" alt="" />
    </section>

    @if (error()) { <p class="alerta alerta--error">⚠️ {{ error() }}</p> }

    <section class="kpis" aria-label="Indicadores">
      <div class="kpi">
        <div class="kpi__cab"><span class="kpi__titulo">Volumen declarado 24 h</span><span class="kpi__ico"><img src="img/ico-balanza.png" alt="" /></span></div>
        <div class="kpi__valor">{{ volumen24h() | number: '1.0-0' }} <small>kg</small></div>
        <div class="kpi__pie"><span class="pildora">{{ registradas24h() }} lotes</span> registrados en el día</div>
      </div>
      <div class="kpi">
        <div class="kpi__cab"><span class="kpi__titulo">Entregas activas</span><span class="kpi__ico"><img src="img/ico-cajon.png" alt="" /></span></div>
        <div class="kpi__valor">{{ admin() && kpis() ? kpis()!.totalActivas : activas() }}</div>
        <div class="kpi__pie"><span class="pildora pildora--sol">en planta</span> registradas, en bodega o clasificación</div>
      </div>
      @if (verCapacidad()) {
        <div class="kpi">
          <div class="kpi__cab"><span class="kpi__titulo">Ocupación de bodegas</span><span class="kpi__ico"><img src="img/ico-bodega.png" alt="" /></span></div>
          <div class="kpi__valor">{{ ocupacion().usado }}<small>%</small></div>
          <div class="kpi__pie">
            <span class="pildora" [class.pildora--sol]="ocupacion().nivel === 'alerta'" [class.pildora--granero]="ocupacion().nivel === 'critico'">
              {{ ocupacion().nivel === 'normal' ? 'Operación normal' : ocupacion().nivel === 'alerta' ? 'Capacidad alta' : 'Casi llena' }}</span>
            {{ bodegas().length }} bodegas
          </div>
        </div>
      }
      @if (admin() && kpis()) {
        <div class="kpi">
          <div class="kpi__cab"><span class="kpi__titulo">Tiempo de ciclo</span><span class="kpi__ico"><img src="img/ico-camion.png" alt="" /></span></div>
          <div class="kpi__valor">{{ kpis()!.tiempoCicloPromedioMin == null ? '–' : (kpis()!.tiempoCicloPromedioMin | number: '1.0-0') }} <small>min</small></div>
          <div class="kpi__pie"><span class="pildora">{{ kpis()!.entregasCerradas }} despachadas</span> de registro a despacho</div>
        </div>
      } @else {
        <div class="kpi">
          <div class="kpi__cab"><span class="kpi__titulo">Tasa de rechazo</span><span class="kpi__ico"><img src="img/ico-checklist.png" alt="" /></span></div>
          <div class="kpi__valor">{{ tasaRechazo() }}<small>%</small></div>
          <div class="kpi__pie"><span class="pildora" [class.pildora--granero]="tasaRechazo() > 5">{{ tasaRechazo() > 5 ? 'Revisar calidad' : 'Bajo umbral' }}</span> de {{ entregas().length }} lotes</div>
        </div>
      }
    </section>

    @if (verCapacidad()) {
      <section class="panel">
        <div class="panel__cab">
          <div class="panel__titulo"><img src="img/nav-catalogo.png" alt="" />
            <div><h2>Capacidad de acopio</h2><p>Ocupación de cada bodega en este momento</p></div></div>
          <div class="resumen">
            <div><small>Ocupación</small><b>{{ ocupacion().usado }}%</b></div>
            <div><small>Libre</small><b class="mono">{{ libreTotal() | number: '1.0-0' }} kg</b></div>
          </div>
        </div>
        <div class="panel__cuerpo">
          <app-barra-capacidad [total]="capacidadTotal()" [disponible]="libreTotal()" />
        </div>
        <div class="panel__cuerpo bodegas">
          @for (b of bodegas(); track b.id) {
            <div class="bodega" [class.bodega--critica]="critica(b)">
              <div class="bodega__cab"><b>{{ b.nombre }}</b><span class="mono id">{{ b.ubicacion || '#' + b.id }}</span></div>
              <app-barra-capacidad [total]="b.capacidadTotal" [disponible]="b.capacidadDisponible" [compacta]="true" />
              @if (critica(b)) { <p class="aviso">⚠️ Casi sin espacio para nuevas recepciones</p> }
            </div>
          } @empty { <p class="vacio">Aún no hay bodegas en el catálogo.</p> }
        </div>
      </section>
    }

    <app-flujo-estados [conteo]="conteo()" [seleccionado]="filtro()" (elegir)="filtro.set($event)" />

    <section class="panel">
      <div class="panel__cab">
        <div class="panel__titulo"><img src="img/ico-checklist.png" alt="" />
          <div><h2>{{ cliente() ? 'Tus entregas' : 'Entregas recientes' }}</h2><p>{{ recientes().length }} de {{ filtradas().length }} lotes · los más nuevos primero</p></div></div>
        <a class="btn btn--sec btn--chico" routerLink="/deliveries">Ver todas →</a>
      </div>
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Lote</th><th>Producto</th><th>Bodega</th><th class="num">Carga</th><th>Estado</th><th>Registro</th><th></th></tr></thead>
          <tbody>
            @for (e of recientes(); track e.id) {
              <tr>
                <td class="mono"><b>{{ e.codigo }}</b></td>
                <td>{{ nombreProducto(e.productoId) }}</td>
                <td>{{ nombreBodega(e.bodegaId) }}</td>
                <td class="num carga">{{ (e.pesoRecibido ?? e.cantidad) | number: '1.0-0' }} kg</td>
                <td><app-estado-badge [estado]="e.estado" /></td>
                <td class="mono fecha">{{ e.fechaRegistro | date: 'dd MMM HH:mm' }}</td>
                <td class="num">
                  @if (gestiona() && !e.terminal) {
                    <a class="btn btn--sol btn--chico" routerLink="/deliveries" [queryParams]="{ codigo: e.codigo }">Avanzar →</a>
                  } @else { <small><i>{{ e.terminal ? 'Completado' : 'Solo lectura' }}</i></small> }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7"><div class="vacio"><img src="img/mascota-saluda.png" alt="" class="vacio-img" /><br />No hay lotes con este filtro.</div></td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (auditor()) {
      <section class="panel">
        <div class="panel__cab"><div class="panel__titulo"><img src="img/nav-auditoria.png" alt="" /><div><h2>Últimos eventos</h2><p>Lo que registró Kafka en la trazabilidad</p></div></div>
          <a class="btn btn--sec btn--chico" routerLink="/audit">Ir a auditoría →</a></div>
        <div class="panel__cuerpo">
          @for (ev of eventos(); track ev.eventId) {
            <div class="evento">
              @if (estadoDeEvento(ev); as est) { <app-estado-badge [estado]="est" /> } @else { <span class="badge">{{ ev.tipo }}</span> }
              <span class="mono"><b>{{ ev.entregaCodigo }}</b></span>
              <span class="quien">{{ ev.actorNombre || ev.actorId }}</span>
              <small class="mono">{{ ev.ocurridoEn | date: 'dd/MM HH:mm' }}</small>
            </div>
          } @empty { <p class="vacio">Sin eventos todavía.</p> }
        </div>
      </section>
    }
  `,
  styles: `
    .bienvenida { background: #fff; border: var(--trazo); border-radius: 20px; box-shadow: var(--sombra); padding: 1.3rem 1.5rem; margin-bottom: 1.25rem;
      display: flex; align-items: center; justify-content: space-between; gap: 1rem; overflow: hidden; }
    .saludo { display: flex; gap: 1rem; align-items: center; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; background: var(--sol); border: var(--trazo); box-shadow: var(--sombra-sm); display: grid; place-items: center;
      font-family: var(--fuente-titulo); font-size: 1.5rem; font-weight: 800; flex-shrink: 0; }
    .linea { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
    .linea h1 { margin: 0; }
    .saludo p { margin: .2rem 0 0; font-weight: 600; color: var(--tierra-70); }
    .chips { display: flex; flex-wrap: wrap; gap: .45rem; margin-top: .7rem; }
    .chip img { width: 18px; height: 18px; object-fit: contain; }
    .mascota { width: 150px; transform: rotate(2deg); flex-shrink: 0; }
    @media (max-width: 760px) {
      .mascota { display: none; }
      .bienvenida { padding: 1rem; }
      .saludo { flex-direction: column; align-items: flex-start; gap: .6rem; }
      .avatar { width: 48px; height: 48px; font-size: 1.1rem; }
      .linea h1 { font-size: 1.45rem; }
    }
    .resumen { display: flex; gap: 1rem; background: rgba(255,255,255,.85); border: var(--trazo-fino); border-radius: 12px; box-shadow: var(--sombra-sm); padding: .35rem .9rem; }
    .resumen div { display: flex; flex-direction: column; }
    .resumen small { font-family: var(--fuente-titulo); font-size: .66rem; font-weight: 800; text-transform: uppercase; }
    .resumen b { font-family: var(--fuente-titulo); color: var(--pasto-oscuro); }
    .bodegas { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: .9rem; }
    .bodega { padding: .85rem; border-radius: 14px; border: 2px solid var(--tierra-30); background: rgba(255,248,231,.5); }
    .bodega--critica { border-color: var(--granero); background: rgba(232,84,62,.06); box-shadow: var(--sombra-sm); }
    .bodega__cab { display: flex; justify-content: space-between; gap: .5rem; margin-bottom: .45rem; font-family: var(--fuente-titulo); }
    .id { font-size: .7rem; border: 1px solid var(--tierra-30); border-radius: 6px; padding: 0 .35rem; background: #fff; }
    .aviso { margin: .45rem 0 0; color: var(--granero); font-family: var(--fuente-titulo); font-weight: 800; font-size: .8rem; }
    .carga { font-family: var(--fuente-titulo); font-weight: 800; color: var(--pasto-oscuro); }
    .fecha { font-size: .74rem; color: var(--tierra-70); }
    .vacio-img { width: 110px; }
    .evento { display: grid; grid-template-columns: auto auto 1fr auto; gap: .7rem; align-items: center; padding: .5rem 0; border-bottom: 2px dashed var(--tierra-15); }
    .evento:last-child { border-bottom: none; }
    .quien { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `,
})
export class Dashboard implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly entregas = signal<Entrega[]>([]);
  readonly bodegas = signal<Bodega[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly kpis = signal<Kpis | null>(null);
  readonly eventos = signal<EventoAuditoria[]>([]);
  readonly filtro = signal<EstadoEntrega | ''>('');
  readonly error = signal('');

  readonly admin = computed(() => this.auth.hasRole('ADMIN'));
  readonly gestiona = computed(() => this.auth.hasRole('ADMIN', 'OPERADOR'));
  readonly verCapacidad = this.gestiona;
  readonly cliente = computed(() => this.auth.hasRole('CLIENTE') && !this.gestiona());
  readonly auditor = computed(() => this.auth.hasRole('AUDITOR') && !this.admin());

  readonly rol = computed(() => (this.auth.rolPrincipal ? ROL_ETIQUETA[this.auth.rolPrincipal] : 'Sin rol'));
  readonly primerNombre = computed(() => (this.auth.user()?.nombre ?? '').split(/\s+/)[0] || 'hola');
  readonly iniciales = computed(() =>
    (this.auth.user()?.nombre ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join(''));

  readonly saludo = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? '¡Buenos días' : h < 20 ? '¡Buenas tardes' : '¡Buenas noches';
  });
  readonly bajada = computed(() =>
    this.admin() ? 'Esto es lo que está pasando hoy en la red de acopio.'
      : this.gestiona() ? 'Tienes lotes por recibir y clasificar. Vamos con todo.'
      : this.cliente() ? 'Aquí puedes seguir tus cosechas entregadas en planta.'
      : 'Vista de solo lectura para revisar la trazabilidad.');

  readonly conteo = computed(() => contarPorEstado(this.entregas()));
  readonly activas = computed(() => this.entregas().filter((e) => !e.terminal).length);
  private readonly ultimas24h = computed(() => {
    const desde = Date.now() - 24 * 3600 * 1000;
    return this.entregas().filter((e) => new Date(e.fechaRegistro).getTime() >= desde);
  });
  readonly volumen24h = computed(() => this.ultimas24h().reduce((s, e) => s + e.cantidad, 0));
  readonly registradas24h = computed(() => this.ultimas24h().length);
  readonly tasaRechazo = computed(() => {
    const total = this.entregas().length;
    return total ? Math.round((this.conteo().RECHAZADA / total) * 100) : 0;
  });

  readonly capacidadTotal = computed(() => this.bodegas().reduce((s, b) => s + b.capacidadTotal, 0));
  readonly libreTotal = computed(() => this.bodegas().reduce((s, b) => s + b.capacidadDisponible, 0));
  readonly ocupacion = computed(() => nivelCapacidad(this.capacidadTotal(), this.libreTotal()));

  readonly filtradas = computed(() => {
    const f = this.filtro();
    const lista = f ? this.entregas().filter((e) => e.estado === f) : this.entregas();
    return [...lista].sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro));
  });
  readonly recientes = computed(() => this.filtradas().slice(0, 8));

  critica = (b: Bodega) => nivelCapacidad(b.capacidadTotal, b.capacidadDisponible).nivel === 'critico';
  nombreProducto = (id: number) => this.productos().find((p) => p.id === id)?.nombre ?? `Producto #${id}`;
  nombreBodega = (id: number) => this.bodegas().find((b) => b.id === id)?.nombre ?? `Bodega #${id}`;
  estadoDeEvento = (ev: EventoAuditoria) => ESTADO_DE_EVENTO[ev.tipo] ?? null;

  async ngOnInit() {
    // Cada bloque carga por su cuenta: si report esta caido, el resto del panel igual se ve.
    const tareas: Promise<unknown>[] = [
      this.api.listarEntregas().then((v) => this.entregas.set(v)),
      this.api.productos(false).then((v) => this.productos.set(v)),
      this.api.bodegas().then((v) => this.bodegas.set(v)),
    ];
    if (this.admin()) tareas.push(this.api.kpis('last24h').then((v) => this.kpis.set(v)));
    if (this.auditor()) tareas.push(this.api.eventos({ limite: '8' }).then((v) => this.eventos.set(v)));

    const fallos = (await Promise.allSettled(tareas)).filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (fallos.length) {
      this.error.set((fallos[0].reason as { detail?: string })?.detail ?? 'Parte del panel no se pudo cargar');
    }
  }
}
