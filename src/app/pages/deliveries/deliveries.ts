import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { DESCRIPCION, ETIQUETA, contarPorEstado, puedeTransicionar } from '../../core/estados';
import { Bodega, Entrega, EstadoEntrega, Problema, Producto } from '../../core/models';
import { finDelDiaLocal, inicioDelDiaLocal } from '../../core/fechas';
import { EstadoBadge } from '../../shared/estado-badge';
import { FlujoEstados } from '../../shared/flujo-estados';
import { Modal } from '../../shared/modal';

/** El oid de Azure es un UUID: en la tabla basta el comienzo; el completo va en el title. */
export function productorCorto(oid: string): string {
  return oid.length > 12 ? `${oid.slice(0, 8)}…` : oid;
}

/**
 * Peso que de verdad entro a bodega. Si al recibir no se escribio peso, el
 * backend toma el declarado y deja pesoRecibido vacio: la fecha de recepcion
 * es la que dice que el lote si se recibio.
 */
export function pesoReal(e: Pick<Entrega, 'pesoRecibido' | 'fechaRecepcion' | 'cantidad'>): number | null {
  if (e.pesoRecibido != null) return e.pesoRecibido;
  return e.fechaRecepcion ? e.cantidad : null;
}

/**
 * /deliveries, seccion 6: listar, crear (productor o jefe de acopio) y
 * cambiar estado (jefe de acopio / admin). Las etapas que se ofrecen salen
 * de GET /transiciones: la UI nunca adivina que puede hacer el usuario.
 */
@Component({
  selector: 'app-deliveries',
  imports: [FormsModule, DatePipe, DecimalPipe, EstadoBadge, FlujoEstados, Modal],
  template: `
    <div class="pagina-cab">
      <div><h1>Entregas</h1><p>Registro, recepción y avance de cada lote en la planta</p></div>
      @if (puedeRegistrar()) {
        <button class="btn btn--primario" (click)="abrirNueva()"><img src="img/ico-cajon.png" alt="" class="ico" /> Nueva entrega</button>
      }
    </div>

    @if (aviso()) { <p class="alerta">✅ {{ aviso() }} <button class="btn btn--ghost btn--chico cerrar" (click)="aviso.set('')">Cerrar</button></p> }
    @if (error()) { <p class="alerta alerta--error">⚠️ {{ error() }}</p> }

    <app-flujo-estados [conteo]="conteo()" [seleccionado]="estado()" (elegir)="estado.set($event)" />

    <section class="panel">
      <div class="panel__cab">
        <div class="panel__titulo"><img src="img/ico-checklist.png" alt="" />
          <div><h2>Registro de entregas</h2><p>Mostrando {{ visibles().length }} de {{ entregas().length }} lotes</p></div></div>
        <div class="filtros">
          <input class="buscar" [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)" placeholder="🔍 Buscar código, producto o bodega" />
          <label>Desde <input type="date" [(ngModel)]="desde" (change)="cargar()" /></label>
          <label>Hasta <input type="date" [(ngModel)]="hasta" (change)="cargar()" /></label>
        </div>
      </div>
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Lote</th><th>Producto · Bodega</th><th class="num">Carga (kg)</th><th>Estado</th><th>Registro</th><th></th></tr></thead>
          <tbody>
            @for (e of visibles(); track e.id) {
              <tr [class.resaltada]="e.codigo === resaltar()">
                <td><b class="mono">{{ e.codigo }}</b><br /><small class="mono" [title]="'Productor ' + e.productorId">{{ productorCorto(e.productorId) }}</small></td>
                <td>{{ nombreProducto(e.productoId) }}<br /><small>{{ nombreBodega(e.bodegaId) }}</small></td>
                <td class="num">
                  @if (pesoReal(e); as peso) {
                    <span class="carga">{{ peso | number: '1.0-2' }}</span><br /><small>recibido · declaró {{ e.cantidad | number: '1.0-0' }}</small>
                  } @else {
                    <span class="carga">{{ e.cantidad | number: '1.0-2' }}</span><br /><small>declarado</small>
                  }
                </td>
                <td><app-estado-badge [estado]="e.estado" />
                  @if (e.motivoRechazo) { <br /><small class="motivo">{{ e.motivoRechazo }}</small> }</td>
                <td class="mono fecha">{{ e.fechaRegistro | date: 'dd MMM HH:mm' }}</td>
                <td class="num">
                  @if (puedeCambiar() && !e.terminal) {
                    <button class="btn btn--sol btn--chico" (click)="abrirCambio(e)">Avanzar →</button>
                  } @else { <small><i>{{ e.terminal ? 'Completado' : 'Solo lectura' }}</i></small> }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6"><div class="vacio"><img src="img/mascota-saluda.png" alt="" class="vacio-img" /><br />No hay lotes con estos criterios. Prueba otro filtro.</div></td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (nuevaAbierta()) {
      <app-modal titulo="Recepción de nueva carga" subtitulo="El lote queda REGISTRADO hasta que llegue a bodega" (cerrar)="nuevaAbierta.set(false)">
        <label>Producto
          <select [(ngModel)]="nueva.productoId" name="productoId">
            <option [ngValue]="null" disabled>Elige un producto</option>
            @for (p of productos(); track p.id) { <option [ngValue]="p.id">{{ p.codigo }} · {{ p.nombre }} ({{ p.unidadMedida }})</option> }
          </select></label>
        <label>Bodega de destino
          <select [(ngModel)]="nueva.bodegaId" name="bodegaId">
            <option [ngValue]="null" disabled>Elige una bodega</option>
            @for (b of bodegas(); track b.id) { <option [ngValue]="b.id">{{ b.nombre }} · libre {{ b.capacidadDisponible | number: '1.0-0' }}</option> }
          </select></label>
        <label>Peso neto declarado (kg)
          <input type="number" min="0.01" step="0.01" [(ngModel)]="nueva.cantidad" name="cantidad" placeholder="Ej: 3500" /></label>
        @if (bodegaElegida(); as b) {
          <p class="pista" [class.pista--mal]="excede()">
            Espacio libre en {{ b.nombre }}: <b class="mono">{{ b.capacidadDisponible | number: '1.0-0' }} kg</b>
            @if (excede()) { — hoy no cabría: la capacidad se descuenta al recibirlo. }
          </p>
        }
        @if (errorForm()) { <p class="alerta alerta--error">{{ errorForm() }}</p> }
        <ng-container pie>
          <button class="btn btn--ghost" (click)="nuevaAbierta.set(false)">Cancelar</button>
          <button class="btn btn--primario" (click)="registrar()" [disabled]="guardando()">{{ guardando() ? 'Registrando…' : 'Registrar entrega' }}</button>
        </ng-container>
      </app-modal>
    }

    @if (enCambio(); as e) {
      <app-modal titulo="Avanzar estado del lote" [subtitulo]="e.codigo + ' · ' + nombreProducto(e.productoId)" (cerrar)="cerrarCambio()">
        <div class="actual">
          <div><small>Estado actual</small><app-estado-badge [estado]="e.estado" /></div>
          <div class="der"><small>Carga declarada</small><b class="mono">{{ e.cantidad | number: '1.0-2' }} kg</b></div>
        </div>
        @if (cargandoPermitidas()) { <p class="vacio">Consultando etapas permitidas…</p> }
        @else {
          <p class="subtitulo">Siguiente etapa válida</p>
          @for (d of permitidas(); track d) {
            <label class="opcion" [class.opcion--elegida]="destino() === d" [class.opcion--rechazo]="d === 'RECHAZADA'">
              <input type="radio" name="destino" [checked]="destino() === d" (change)="destino.set(d)" />
              <span class="opcion__txt"><b>{{ etiquetas[d] }}</b><small>{{ descripciones[d] }}</small></span>
              <app-estado-badge [estado]="d" />
            </label>
          } @empty { <p class="vacio">Tu rol no tiene etapas disponibles desde {{ etiquetas[e.estado] }}.</p> }
        }
        @if (destino() === 'RECIBIDA') {
          <label>Peso recibido en romana (kg)
            <input type="number" step="0.01" min="0.01" [(ngModel)]="pesoRecibido" placeholder="Vacío = usar lo declarado" /></label>
        }
        @if (destino() === 'RECHAZADA') {
          <label>Motivo del rechazo <textarea rows="2" [(ngModel)]="motivo" maxlength="500"></textarea></label>
        }
        @if (errorCambio()) { <p class="alerta alerta--error">⚠️ {{ errorCambio() }}</p> }
        <small class="regla">La máquina de estados no permite saltarse etapas: por ejemplo, no se despacha sin clasificar.</small>
        <ng-container pie>
          <button class="btn btn--ghost" (click)="cerrarCambio()">Cancelar</button>
          <button class="btn" [class.btn--peligro]="destino() === 'RECHAZADA'" [class.btn--primario]="destino() !== 'RECHAZADA'"
            (click)="confirmar(e)" [disabled]="!destino() || guardando()">{{ guardando() ? 'Guardando…' : 'Confirmar' }}</button>
        </ng-container>
      </app-modal>
    }
  `,
  styles: `
    .ico { width: 22px; height: 22px; object-fit: contain; border-radius: 6px; }
    .cerrar { margin-left: auto; }
    .filtros { display: flex; gap: .6rem; align-items: end; flex-wrap: wrap; }
    .filtros label { flex-direction: row; align-items: center; gap: .35rem; }
    .buscar { width: 270px; box-shadow: var(--sombra-sm); }
    .carga { font-family: var(--fuente-titulo); font-weight: 800; color: var(--pasto-oscuro); }
    .fecha { font-size: .74rem; color: var(--tierra-70); white-space: nowrap; }
    td b.mono { white-space: nowrap; }
    .motivo { color: var(--granero); font-weight: 700; }
    tr.resaltada td { background: #fff1c9 !important; }
    .vacio-img { width: 110px; }
    .pista { margin: 0; font-size: .82rem; font-weight: 600; }
    .pista--mal { color: var(--granero); }
    .actual { display: flex; justify-content: space-between; gap: 1rem; padding: .7rem .9rem; border-radius: 14px; background: var(--crema); border: 2px solid var(--tierra-30); }
    .actual div { display: flex; flex-direction: column; gap: .3rem; align-items: flex-start; }
    .actual .der { align-items: flex-end; }
    .subtitulo { margin: .2rem 0 0; font-family: var(--fuente-titulo); font-weight: 800; font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; color: var(--tierra-70); }
    .opcion { flex-direction: row; align-items: center; gap: .7rem; padding: .65rem .8rem; border: 2px solid var(--tierra-30); border-radius: 14px; cursor: pointer; color: var(--tierra); }
    .opcion:hover { border-color: var(--tierra); }
    .opcion--elegida { border-color: var(--tierra); background: var(--pasto-claro); box-shadow: var(--sombra-sm); }
    .opcion--rechazo.opcion--elegida { background: #fde4df; }
    .opcion__txt { display: flex; flex-direction: column; flex: 1; font-family: var(--fuente); font-size: .9rem; }
    .opcion__txt small { font-weight: 600; }
    .regla { font-style: italic; }
  `,
})
export class Deliveries implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly etiquetas = ETIQUETA;
  readonly descripciones = DESCRIPCION;

  readonly entregas = signal<Entrega[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly bodegas = signal<Bodega[]>([]);
  readonly error = signal('');
  readonly aviso = signal('');
  readonly guardando = signal(false);

  readonly estado = signal<EstadoEntrega | ''>('');
  readonly busqueda = signal('');
  readonly resaltar = signal('');
  desde = '';
  hasta = '';

  readonly nuevaAbierta = signal(false);
  nueva: { productoId: number | null; bodegaId: number | null; cantidad: number | null } = { productoId: null, bodegaId: null, cantidad: null };
  readonly errorForm = signal('');

  readonly enCambio = signal<Entrega | null>(null);
  readonly permitidas = signal<EstadoEntrega[]>([]);
  readonly cargandoPermitidas = signal(false);
  readonly destino = signal<EstadoEntrega | null>(null);
  pesoRecibido: number | null = null;
  motivo = '';
  readonly errorCambio = signal('');

  readonly puedeRegistrar = computed(() => this.auth.hasRole('ADMIN', 'OPERADOR', 'CLIENTE'));
  readonly puedeCambiar = computed(() => puedeTransicionar(this.auth.user()?.roles ?? []));

  readonly conteo = computed(() => contarPorEstado(this.entregas()));
  readonly visibles = computed(() => {
    const est = this.estado();
    const q = this.busqueda().trim().toLowerCase();
    return this.entregas()
      .filter((e) => !est || e.estado === est)
      .filter((e) => !q || [e.codigo, this.nombreProducto(e.productoId), this.nombreBodega(e.bodegaId)].some((t) => t.toLowerCase().includes(q)))
      .sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro));
  });

  bodegaElegida = () => this.bodegas().find((b) => b.id === this.nueva.bodegaId) ?? null;
  excede = () => {
    const b = this.bodegaElegida();
    return !!b && !!this.nueva.cantidad && this.nueva.cantidad > b.capacidadDisponible;
  };

  async ngOnInit() {
    const q = this.ruta.snapshot.queryParamMap;
    this.resaltar.set(q.get('codigo') ?? '');
    await Promise.all([this.cargar(), this.cargarCatalogo()]);
    if (q.get('nueva') && this.puedeRegistrar()) this.abrirNueva();
    const aResaltar = this.entregas().find((e) => e.codigo === this.resaltar());
    if (aResaltar && this.puedeCambiar() && !aResaltar.terminal) this.abrirCambio(aResaltar);
  }

  async cargar() {
    this.error.set('');
    try {
      this.entregas.set(await this.api.listarEntregas({
        from: inicioDelDiaLocal(this.desde),
        to: finDelDiaLocal(this.hasta),
      }));
    } catch (e) {
      this.error.set((e as Problema).detail);
    }
  }

  private async cargarCatalogo() {
    try {
      const [p, b] = await Promise.all([this.api.productos(), this.api.bodegas()]);
      this.productos.set(p);
      this.bodegas.set(b);
    } catch {
      /* el catalogo es auxiliar aqui: si falla, se muestran ids */
    }
  }

  nombreProducto = (id: number) => this.productos().find((p) => p.id === id)?.nombre ?? `Producto #${id}`;
  nombreBodega = (id: number) => this.bodegas().find((b) => b.id === id)?.nombre ?? `Bodega #${id}`;
  productorCorto = productorCorto;
  pesoReal = pesoReal;

  abrirNueva() {
    this.errorForm.set('');
    this.nuevaAbierta.set(true);
    // Que "Nueva entrega" desde otra pantalla no vuelva a abrir el modal al recargar
    this.router.navigate([], { queryParams: { nueva: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  async registrar() {
    this.errorForm.set('');
    if (!this.nueva.productoId || !this.nueva.bodegaId || !this.nueva.cantidad) {
      this.errorForm.set('Completa producto, bodega y cantidad.');
      return;
    }
    this.guardando.set(true);
    try {
      const creada = await this.api.registrarEntrega({ productoId: this.nueva.productoId, bodegaId: this.nueva.bodegaId, cantidad: this.nueva.cantidad });
      this.nuevaAbierta.set(false);
      this.nueva = { productoId: null, bodegaId: null, cantidad: null };
      this.resaltar.set(creada.codigo);
      this.aviso.set(`Lote ${creada.codigo} registrado.`);
      await this.cargar();
    } catch (e) {
      const p = e as Problema;
      this.errorForm.set(p.campos ? Object.entries(p.campos).map(([k, v]) => `${k}: ${v}`).join(' · ') : p.detail);
    } finally {
      this.guardando.set(false);
    }
  }

  async abrirCambio(e: Entrega) {
    this.enCambio.set(e);
    this.destino.set(null);
    this.pesoRecibido = null;
    this.motivo = '';
    this.errorCambio.set('');
    this.permitidas.set([]);
    this.cargandoPermitidas.set(true);
    try {
      this.permitidas.set((await this.api.transiciones(e.id)).permitidas);
    } catch (err) {
      this.errorCambio.set((err as Problema).detail);
    } finally {
      this.cargandoPermitidas.set(false);
    }
  }

  cerrarCambio() {
    this.enCambio.set(null);
  }

  async confirmar(e: Entrega) {
    const d = this.destino();
    if (!d) return;
    if (d === 'RECHAZADA' && !this.motivo.trim()) {
      this.errorCambio.set('Indica el motivo del rechazo.');
      return;
    }
    this.guardando.set(true);
    this.errorCambio.set('');
    try {
      await this.api.cambiarEstado(e.id, { status: d, pesoRecibido: d === 'RECIBIDA' ? this.pesoRecibido : null, motivo: d === 'RECHAZADA' ? this.motivo : null });
      this.cerrarCambio();
      this.resaltar.set(e.codigo);
      this.aviso.set(`Lote ${e.codigo} pasó a ${ETIQUETA[d]}.`);
      await Promise.all([this.cargar(), this.cargarCatalogo()]);
    } catch (err) {
      // Un 409 (salto invalido o bodega sin espacio) trae el motivo exacto del backend
      this.errorCambio.set((err as Problema).detail);
    } finally {
      this.guardando.set(false);
    }
  }
}
