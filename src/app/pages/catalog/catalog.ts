import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { nivelCapacidad } from '../../core/estados';
import { Bodega, Problema, Producto } from '../../core/models';
import { BarraCapacidad } from '../../shared/barra-capacidad';
import { Modal } from '../../shared/modal';

type ProductoForm = { id: number | null; codigo: string; nombre: string; unidadMedida: string; tarifa: number | null; activo: boolean };
type BodegaForm = { id: number | null; nombre: string; ubicacion: string; capacidadTotal: number | null };

/** /catalog, seccion 6: productos, bodegas y capacidad. Admin y Jefe de acopio ven; solo Admin edita. */
@Component({
  selector: 'app-catalog',
  imports: [FormsModule, DecimalPipe, BarraCapacidad, Modal],
  template: `
    <div class="pagina-cab">
      <div><h1>Catálogo</h1><p>Bodegas, capacidad de almacenaje y productos que se reciben</p></div>
      @if (esAdmin) {
        <div class="acciones">
          <button class="btn btn--sec" (click)="nuevaBodega()"><img src="img/ico-bodega.png" alt="" class="ico" /> Nueva bodega</button>
          <button class="btn btn--primario" (click)="nuevoProducto()"><img src="img/ico-trigo.png" alt="" class="ico" /> Nuevo producto</button>
        </div>
      }
    </div>
    @if (error()) { <p class="alerta alerta--error">⚠️ {{ error() }}</p> }

    <section class="panel">
      <div class="panel__cab">
        <div class="panel__titulo"><img src="img/nav-catalogo.png" alt="" />
          <div><h2>Bodegas y capacidad</h2><p>La capacidad baja al recibir un lote y vuelve si se rechaza</p></div></div>
        <div class="resumen">
          <div><small>Ocupación</small><b>{{ global().usado }}%</b></div>
          <div><small>Libre</small><b class="mono">{{ libre() | number: '1.0-0' }}</b></div>
          <div><small>Nominal</small><b class="mono">{{ total() | number: '1.0-0' }}</b></div>
        </div>
      </div>
      <div class="panel__cuerpo"><app-barra-capacidad [total]="total()" [disponible]="libre()" /></div>
      <div class="panel__cuerpo bodegas">
        @for (b of bodegas(); track b.id) {
          <div class="bodega" [class.bodega--critica]="critica(b)">
            <div class="bodega__cab">
              <div><b>{{ b.nombre }}</b><br /><small>{{ b.ubicacion || 'Sin ubicación' }}</small></div>
              @if (esAdmin) { <button class="btn btn--chico" (click)="editarBodega(b)">Editar</button> }
            </div>
            <app-barra-capacidad [total]="b.capacidadTotal" [disponible]="b.capacidadDisponible" [compacta]="true" />
            @if (critica(b)) { <p class="aviso">⚠️ Alerta de sobrecupo para nuevas recepciones</p> }
          </div>
        } @empty { <p class="vacio">Sin bodegas todavía.</p> }
      </div>
    </section>

    <section class="panel">
      <div class="panel__cab">
        <div class="panel__titulo"><img src="img/ico-trigo.png" alt="" />
          <div><h2>Productos</h2><p>{{ productos().length }} en catálogo · {{ activos() }} activos</p></div></div>
      </div>
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Código</th><th>Nombre</th><th>Unidad</th><th class="num">Tarifa</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (p of productos(); track p.id) {
              <tr [class.inactivo]="!p.activo">
                <td class="mono"><b>{{ p.codigo }}</b></td><td>{{ p.nombre }}</td>
                <td><span class="chip">{{ p.unidadMedida }}</span></td>
                <td class="num carga">$ {{ p.tarifa | number: '1.2-2' }}</td>
                <td><span class="pildora" [class.pildora--sol]="!p.activo">{{ p.activo ? 'Activo' : 'Inactivo' }}</span></td>
                <td class="num">@if (esAdmin) { <button class="btn btn--chico" (click)="editarProducto(p)">Editar</button> }</td>
              </tr>
            } @empty { <tr><td colspan="6" class="vacio">Sin productos.</td></tr> }
          </tbody>
        </table>
      </div>
    </section>

    @if (formBodega(); as f) {
      <app-modal [titulo]="f.id ? 'Editar bodega' : 'Nueva bodega'" subtitulo="La capacidad disponible se ajusta sola al cambiar el total" (cerrar)="formBodega.set(null)">
        <label>Nombre <input [(ngModel)]="f.nombre" name="bn" maxlength="120" /></label>
        <label>Ubicación <input [(ngModel)]="f.ubicacion" name="bu" maxlength="200" placeholder="Ej: Curicó" /></label>
        <label>Capacidad total (kg) <input type="number" min="0.01" step="0.01" [(ngModel)]="f.capacidadTotal" name="bc" /></label>
        @if (errorBodega()) { <p class="alerta alerta--error">{{ errorBodega() }}</p> }
        <ng-container pie>
          <button class="btn btn--ghost" (click)="formBodega.set(null)">Cancelar</button>
          <button class="btn btn--primario" (click)="guardarBodega()" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar' }}</button>
        </ng-container>
      </app-modal>
    }

    @if (formProducto(); as f) {
      <app-modal [titulo]="f.id ? 'Editar producto' : 'Nuevo producto'" (cerrar)="formProducto.set(null)">
        <div class="dos">
          <label>Código <input [(ngModel)]="f.codigo" name="pc" maxlength="30" placeholder="TRIGO-01" /></label>
          <label>Unidad <input [(ngModel)]="f.unidadMedida" name="pu" maxlength="10" placeholder="KG" /></label>
        </div>
        <label>Nombre <input [(ngModel)]="f.nombre" name="pn" maxlength="120" /></label>
        <label>Tarifa <input type="number" min="0" step="0.01" [(ngModel)]="f.tarifa" name="pt" /></label>
        <label class="check"><input type="checkbox" [(ngModel)]="f.activo" name="pa" /> Activo (visible al registrar entregas)</label>
        @if (errorProducto()) { <p class="alerta alerta--error">{{ errorProducto() }}</p> }
        <ng-container pie>
          <button class="btn btn--ghost" (click)="formProducto.set(null)">Cancelar</button>
          <button class="btn btn--primario" (click)="guardarProducto()" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar' }}</button>
        </ng-container>
      </app-modal>
    }
  `,
  styles: `
    .acciones { display: flex; gap: .6rem; flex-wrap: wrap; }
    .ico { width: 22px; height: 22px; object-fit: contain; border-radius: 6px; }
    .resumen { display: flex; gap: 1rem; background: rgba(255,255,255,.85); border: var(--trazo-fino); border-radius: 12px; box-shadow: var(--sombra-sm); padding: .35rem .9rem; }
    .resumen div { display: flex; flex-direction: column; }
    .resumen small { font-family: var(--fuente-titulo); font-size: .66rem; font-weight: 800; text-transform: uppercase; }
    .resumen b { font-family: var(--fuente-titulo); color: var(--pasto-oscuro); }
    .bodegas { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: .9rem; }
    .bodega { padding: .85rem; border-radius: 14px; border: 2px solid var(--tierra-30); background: rgba(255,248,231,.5); }
    .bodega--critica { border-color: var(--granero); background: rgba(232,84,62,.06); box-shadow: var(--sombra-sm); }
    .bodega__cab { display: flex; justify-content: space-between; align-items: flex-start; gap: .5rem; margin-bottom: .5rem; font-family: var(--fuente-titulo); }
    .aviso { margin: .45rem 0 0; color: var(--granero); font-family: var(--fuente-titulo); font-weight: 800; font-size: .8rem; }
    .carga { font-family: var(--fuente-titulo); font-weight: 800; color: var(--pasto-oscuro); }
    tr.inactivo td { color: var(--tierra-50); }
    .dos { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
    .check { flex-direction: row; align-items: center; gap: .5rem; }
  `,
})
export class Catalog implements OnInit {
  private readonly api = inject(ApiService);
  readonly esAdmin = inject(AuthService).hasRole('ADMIN');

  readonly productos = signal<Producto[]>([]);
  readonly bodegas = signal<Bodega[]>([]);
  readonly error = signal('');
  readonly formProducto = signal<ProductoForm | null>(null);
  readonly formBodega = signal<BodegaForm | null>(null);
  readonly errorProducto = signal('');
  readonly errorBodega = signal('');
  /** Doble clic o conexion lenta: evita crear el mismo producto o bodega dos veces. */
  readonly guardando = signal(false);

  readonly total = computed(() => this.bodegas().reduce((s, b) => s + b.capacidadTotal, 0));
  readonly libre = computed(() => this.bodegas().reduce((s, b) => s + b.capacidadDisponible, 0));
  readonly global = computed(() => nivelCapacidad(this.total(), this.libre()));
  readonly activos = computed(() => this.productos().filter((p) => p.activo).length);
  critica = (b: Bodega) => nivelCapacidad(b.capacidadTotal, b.capacidadDisponible).nivel === 'critico';

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    try {
      const [p, b] = await Promise.all([this.api.productos(false), this.api.bodegas()]);
      this.productos.set(p);
      this.bodegas.set(b);
    } catch (e) {
      this.error.set((e as Problema).detail);
    }
  }

  nuevoProducto() { this.errorProducto.set(''); this.formProducto.set({ id: null, codigo: '', nombre: '', unidadMedida: 'KG', tarifa: null, activo: true }); }
  editarProducto(p: Producto) { this.errorProducto.set(''); this.formProducto.set({ ...p }); }
  nuevaBodega() { this.errorBodega.set(''); this.formBodega.set({ id: null, nombre: '', ubicacion: '', capacidadTotal: null }); }
  editarBodega(b: Bodega) { this.errorBodega.set(''); this.formBodega.set({ id: b.id, nombre: b.nombre, ubicacion: b.ubicacion ?? '', capacidadTotal: b.capacidadTotal }); }

  async guardarProducto() {
    const f = this.formProducto()!;
    if (this.guardando()) return;
    this.guardando.set(true);
    this.errorProducto.set('');
    try {
      const body = { codigo: f.codigo, nombre: f.nombre, unidadMedida: f.unidadMedida, tarifa: f.tarifa ?? 0, activo: f.activo };
      if (f.id) await this.api.actualizarProducto(f.id, body); else await this.api.crearProducto(body);
      this.formProducto.set(null);
      await this.cargar();
    } catch (e) {
      this.errorProducto.set(this.texto(e as Problema));
    } finally {
      this.guardando.set(false);
    }
  }

  async guardarBodega() {
    const f = this.formBodega()!;
    if (this.guardando()) return;
    this.guardando.set(true);
    this.errorBodega.set('');
    try {
      const body = { nombre: f.nombre, ubicacion: f.ubicacion, capacidadTotal: f.capacidadTotal ?? 0 };
      if (f.id) await this.api.actualizarBodega(f.id, body); else await this.api.crearBodega(body);
      this.formBodega.set(null);
      await this.cargar();
    } catch (e) {
      this.errorBodega.set(this.texto(e as Problema));
    } finally {
      this.guardando.set(false);
    }
  }

  private texto(p: Problema) {
    return p.campos ? Object.entries(p.campos).map(([k, v]) => `${k}: ${v}`).join(' · ') : p.detail;
  }
}
