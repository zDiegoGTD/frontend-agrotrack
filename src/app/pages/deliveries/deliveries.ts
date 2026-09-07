import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ACCION, ESTADOS, ETIQUETA, claseBadge, puedeTransicionar } from '../../core/estados';
import { Bodega, Entrega, EstadoEntrega, Problema, Producto } from '../../core/models';

/**
 * /deliveries, seccion 6: listar, crear (productor o jefe de acopio) y
 * cambiar estado (jefe de acopio / admin). Los botones de transicion salen
 * de GET /transiciones: la UI nunca adivina que puede hacer el usuario.
 */
@Component({
  selector: 'app-deliveries',
  imports: [FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="cabecera">
      <h1>Entregas</h1>
      @if (puedeRegistrar()) {
        <button class="btn btn--primario" (click)="mostrarForm.set(!mostrarForm())">
          {{ mostrarForm() ? 'Cancelar' : '+ Registrar entrega' }}
        </button>
      }
    </div>

    @if (mostrarForm()) {
      <form class="card form" (ngSubmit)="registrar()">
        <h2>Nueva entrega</h2>
        <label>Producto
          <select [(ngModel)]="nueva.productoId" name="productoId" required>
            <option [ngValue]="null" disabled>Elige un producto</option>
            @for (p of productos(); track p.id) { <option [ngValue]="p.id">{{ p.codigo }} · {{ p.nombre }} ({{ p.unidadMedida }})</option> }
          </select></label>
        <label>Bodega
          <select [(ngModel)]="nueva.bodegaId" name="bodegaId" required>
            <option [ngValue]="null" disabled>Elige una bodega</option>
            @for (b of bodegas(); track b.id) { <option [ngValue]="b.id">{{ b.nombre }} · disponible {{ b.capacidadDisponible | number }}</option> }
          </select></label>
        <label>Cantidad declarada
          <input type="number" min="0.01" step="0.01" [(ngModel)]="nueva.cantidad" name="cantidad" required /></label>
        @if (errorForm()) { <p class="alerta alerta--error">{{ errorForm() }}</p> }
        <button class="btn btn--primario" type="submit" [disabled]="guardando()">Registrar</button>
      </form>
    }

    <section class="card filtros">
      <label>Estado
        <select [(ngModel)]="filtro.status" (change)="cargar()">
          <option value="">Todos</option>
          @for (s of estados; track s) { <option [value]="s">{{ etiquetas[s] }}</option> }
        </select></label>
      <label>Desde <input type="date" [(ngModel)]="filtro.from" (change)="cargar()" /></label>
      <label>Hasta <input type="date" [(ngModel)]="filtro.to" (change)="cargar()" /></label>
      <span class="total">{{ entregas().length }} entregas</span>
    </section>

    @if (error()) { <p class="alerta alerta--error">{{ error() }}</p> }

    <div class="tabla-wrap">
      <table class="tabla">
        <thead><tr><th>Código</th><th>Producto</th><th>Bodega</th><th class="num">Cantidad</th><th class="num">Peso</th><th>Estado</th><th>Registrada</th><th></th></tr></thead>
        <tbody>
          @for (e of entregas(); track e.id) {
            <tr [class.resaltada]="e.codigo === resaltar">
              <td><b>{{ e.codigo }}</b><br /><small>{{ e.productorId }}</small></td>
              <td>{{ nombreProducto(e.productoId) }}</td>
              <td>{{ nombreBodega(e.bodegaId) }}</td>
              <td class="num">{{ e.cantidad | number }}</td>
              <td class="num">{{ e.pesoRecibido | number }}</td>
              <td><span [class]="badge(e.estado)">{{ etiquetas[e.estado] }}</span>
                @if (e.motivoRechazo) { <br /><small class="motivo">{{ e.motivoRechazo }}</small> }</td>
              <td>{{ e.fechaRegistro | date: 'dd/MM HH:mm' }}</td>
              <td>@if (puedeCambiar() && !e.terminal) {
                <button class="btn btn--sec" (click)="abrir(e)">Cambiar estado</button> }</td>
            </tr>
            @if (abierta()?.id === e.id) {
              <tr class="panel"><td colspan="8">
                <div class="acciones">
                  <span>Desde <b>{{ etiquetas[e.estado] }}</b> puedes:</span>
                  @for (d of permitidas(); track d) {
                    <button class="btn" [class.btn--peligro]="d === 'RECHAZADA'" [class.btn--primario]="d !== 'RECHAZADA'"
                      (click)="destino.set(d)" [class.elegido]="destino() === d">{{ acciones[d] }}</button>
                  } @empty { <em>Ninguna transición disponible para tu rol.</em> }
                </div>
                @if (destino() === 'RECIBIDA') {
                  <label>Peso recibido (kg) <input type="number" step="0.01" min="0.01" [(ngModel)]="pesoRecibido" placeholder="deja vacío para usar lo declarado" /></label>
                }
                @if (destino() === 'RECHAZADA') {
                  <label>Motivo del rechazo <input type="text" [(ngModel)]="motivo" maxlength="500" required /></label>
                }
                @if (errorCambio()) { <p class="alerta alerta--error">{{ errorCambio() }}</p> }
                @if (destino()) {
                  <button class="btn btn--primario" (click)="confirmar(e)" [disabled]="guardando()">Confirmar: {{ acciones[destino()!] }}</button>
                }
                <button class="btn btn--ghost" (click)="cerrar()">Cerrar</button>
              </td></tr>
            }
          } @empty { <tr><td colspan="8" class="vacio">No hay entregas con ese filtro.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .cabecera { display: flex; justify-content: space-between; align-items: center; }
    .form { display: grid; gap: .75rem; max-width: 520px; margin-bottom: 1rem; }
    .filtros { display: flex; gap: 1rem; align-items: end; flex-wrap: wrap; margin-bottom: 1rem; }
    .total { margin-left: auto; color: var(--gris-600); font-size: .85rem; }
    .num { text-align: right; } .motivo { color: var(--rojo-600); }
    tr.resaltada td { background: #fff8dc; }
    tr.panel td { background: var(--gris-50); }
    .acciones { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; margin-bottom: .6rem; }
    .btn.elegido { outline: 3px solid var(--verde-100); }
    label { display: block; margin: .5rem 0; }
  `,
})
export class Deliveries implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly ruta = inject(ActivatedRoute);

  readonly estados = ESTADOS;
  readonly etiquetas = ETIQUETA;
  readonly acciones = ACCION;
  readonly badge = claseBadge;

  readonly entregas = signal<Entrega[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly bodegas = signal<Bodega[]>([]);
  readonly error = signal('');
  readonly guardando = signal(false);

  readonly mostrarForm = signal(false);
  nueva: { productoId: number | null; bodegaId: number | null; cantidad: number | null } = { productoId: null, bodegaId: null, cantidad: null };
  readonly errorForm = signal('');

  filtro = { status: '', from: '', to: '' };
  resaltar = '';

  readonly abierta = signal<Entrega | null>(null);
  readonly permitidas = signal<EstadoEntrega[]>([]);
  readonly destino = signal<EstadoEntrega | null>(null);
  pesoRecibido: number | null = null;
  motivo = '';
  readonly errorCambio = signal('');

  readonly puedeRegistrar = computed(() => this.auth.hasRole('ADMIN', 'OPERADOR', 'CLIENTE'));
  readonly puedeCambiar = computed(() => puedeTransicionar(this.auth.user()?.roles ?? []));

  async ngOnInit() {
    this.resaltar = this.ruta.snapshot.queryParamMap.get('codigo') ?? '';
    await Promise.all([this.cargar(), this.cargarCatalogo()]);
  }

  async cargar() {
    this.error.set('');
    try {
      this.entregas.set(
        await this.api.listarEntregas({
          status: this.filtro.status || undefined,
          from: this.filtro.from ? `${this.filtro.from}T00:00:00Z` : undefined,
          to: this.filtro.to ? `${this.filtro.to}T23:59:59Z` : undefined,
        }),
      );
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

  nombreProducto = (id: number) => this.productos().find((p) => p.id === id)?.nombre ?? `#${id}`;
  nombreBodega = (id: number) => this.bodegas().find((b) => b.id === id)?.nombre ?? `#${id}`;

  async registrar() {
    this.errorForm.set('');
    if (!this.nueva.productoId || !this.nueva.bodegaId || !this.nueva.cantidad) {
      this.errorForm.set('Completa producto, bodega y cantidad.');
      return;
    }
    this.guardando.set(true);
    try {
      await this.api.registrarEntrega({ productoId: this.nueva.productoId, bodegaId: this.nueva.bodegaId, cantidad: this.nueva.cantidad });
      this.mostrarForm.set(false);
      this.nueva = { productoId: null, bodegaId: null, cantidad: null };
      await this.cargar();
    } catch (e) {
      const p = e as Problema;
      this.errorForm.set(p.campos ? Object.entries(p.campos).map(([k, v]) => `${k}: ${v}`).join(' · ') : p.detail);
    } finally {
      this.guardando.set(false);
    }
  }

  async abrir(e: Entrega) {
    this.abierta.set(e);
    this.destino.set(null);
    this.pesoRecibido = null;
    this.motivo = '';
    this.errorCambio.set('');
    try {
      this.permitidas.set((await this.api.transiciones(e.id)).permitidas);
    } catch (err) {
      this.errorCambio.set((err as Problema).detail);
    }
  }

  cerrar() {
    this.abierta.set(null);
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
      this.cerrar();
      await Promise.all([this.cargar(), this.cargarCatalogo()]);
    } catch (err) {
      this.errorCambio.set((err as Problema).detail);
    } finally {
      this.guardando.set(false);
    }
  }
}
