import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Bodega, Problema, Producto } from '../../core/models';

type ProductoForm = { id: number | null; codigo: string; nombre: string; unidadMedida: string; tarifa: number | null; activo: boolean };
type BodegaForm = { id: number | null; nombre: string; ubicacion: string; capacidadTotal: number | null };

/** /catalog, seccion 6: productos, bodegas y capacidad. Admin y Jefe de acopio ven; solo Admin edita. */
@Component({
  selector: 'app-catalog',
  imports: [FormsModule, DecimalPipe],
  template: `
    <h1>Catálogo</h1>
    @if (error()) { <p class="alerta alerta--error">{{ error() }}</p> }

    <div class="dos">
      <section class="card">
        <div class="cabecera"><h2>Bodegas</h2>
          @if (esAdmin) { <button class="btn btn--sec" (click)="nuevaBodega()">+ Bodega</button> }</div>
        @for (b of bodegas(); track b.id) {
          <div class="bodega">
            <div class="bodega__cab"><b>{{ b.nombre }}</b> <small>{{ b.ubicacion }}</small>
              @if (esAdmin) { <button class="btn btn--ghost" (click)="editarBodega(b)">Editar</button> }</div>
            <div class="barra"><div class="barra__uso" [style.width.%]="ocupacion(b)"></div></div>
            <small>{{ b.capacidadDisponible | number }} disponible de {{ b.capacidadTotal | number }} ({{ ocupacion(b) | number: '1.0-0' }}% ocupado)</small>
          </div>
        } @empty { <p class="vacio">Sin bodegas.</p> }

        @if (formBodega()) {
          <form class="form" (ngSubmit)="guardarBodega()">
            <h3>{{ formBodega()!.id ? 'Editar' : 'Nueva' }} bodega</h3>
            <label>Nombre <input [(ngModel)]="formBodega()!.nombre" name="bn" required maxlength="120" /></label>
            <label>Ubicación <input [(ngModel)]="formBodega()!.ubicacion" name="bu" maxlength="200" /></label>
            <label>Capacidad total <input type="number" min="0.01" step="0.01" [(ngModel)]="formBodega()!.capacidadTotal" name="bc" required /></label>
            @if (errorBodega()) { <p class="alerta alerta--error">{{ errorBodega() }}</p> }
            <div><button class="btn btn--primario" type="submit">Guardar</button>
              <button class="btn btn--ghost" type="button" (click)="formBodega.set(null)">Cancelar</button></div>
          </form>
        }
      </section>

      <section class="card">
        <div class="cabecera"><h2>Productos</h2>
          @if (esAdmin) { <button class="btn btn--sec" (click)="nuevoProducto()">+ Producto</button> }</div>
        <table class="tabla">
          <thead><tr><th>Código</th><th>Nombre</th><th>Unidad</th><th class="num">Tarifa</th><th></th></tr></thead>
          <tbody>
            @for (p of productos(); track p.id) {
              <tr [class.inactivo]="!p.activo">
                <td>{{ p.codigo }}</td><td>{{ p.nombre }} @if (!p.activo) { <small>(inactivo)</small> }</td>
                <td>{{ p.unidadMedida }}</td><td class="num">{{ p.tarifa | number: '1.2-2' }}</td>
                <td>@if (esAdmin) { <button class="btn btn--ghost" (click)="editarProducto(p)">Editar</button> }</td>
              </tr>
            } @empty { <tr><td colspan="5" class="vacio">Sin productos.</td></tr> }
          </tbody>
        </table>

        @if (formProducto()) {
          <form class="form" (ngSubmit)="guardarProducto()">
            <h3>{{ formProducto()!.id ? 'Editar' : 'Nuevo' }} producto</h3>
            <label>Código <input [(ngModel)]="formProducto()!.codigo" name="pc" required maxlength="30" /></label>
            <label>Nombre <input [(ngModel)]="formProducto()!.nombre" name="pn" required maxlength="120" /></label>
            <label>Unidad <input [(ngModel)]="formProducto()!.unidadMedida" name="pu" required maxlength="10" placeholder="KG" /></label>
            <label>Tarifa <input type="number" min="0" step="0.01" [(ngModel)]="formProducto()!.tarifa" name="pt" required /></label>
            <label class="check"><input type="checkbox" [(ngModel)]="formProducto()!.activo" name="pa" /> Activo</label>
            @if (errorProducto()) { <p class="alerta alerta--error">{{ errorProducto() }}</p> }
            <div><button class="btn btn--primario" type="submit">Guardar</button>
              <button class="btn btn--ghost" type="button" (click)="formProducto.set(null)">Cancelar</button></div>
          </form>
        }
      </section>
    </div>
  `,
  styles: `
    .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; } @media (max-width: 900px) { .dos { grid-template-columns: 1fr; } }
    .cabecera { display: flex; justify-content: space-between; align-items: center; }
    .bodega { padding: .6rem 0; border-bottom: 1px solid var(--gris-100); }
    .bodega__cab { display: flex; gap: .5rem; align-items: baseline; } .bodega__cab button { margin-left: auto; }
    .barra { height: 8px; background: var(--gris-100); border-radius: 999px; margin: .35rem 0; overflow: hidden; }
    .barra__uso { height: 100%; background: var(--verde-700); }
    .form { display: grid; gap: .5rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--gris-300); }
    .check { display: flex; gap: .4rem; align-items: center; }
    .num { text-align: right; } tr.inactivo td { color: var(--gris-600); }
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

  async ngOnInit() {
    await this.cargar();
  }

  ocupacion = (b: Bodega) => (b.capacidadTotal > 0 ? ((b.capacidadTotal - b.capacidadDisponible) / b.capacidadTotal) * 100 : 0);

  async cargar() {
    try {
      const [p, b] = await Promise.all([this.api.productos(false), this.api.bodegas()]);
      this.productos.set(p);
      this.bodegas.set(b);
    } catch (e) {
      this.error.set((e as Problema).detail);
    }
  }

  nuevoProducto() { this.formProducto.set({ id: null, codigo: '', nombre: '', unidadMedida: 'KG', tarifa: null, activo: true }); }
  editarProducto(p: Producto) { this.formProducto.set({ ...p }); }
  nuevaBodega() { this.formBodega.set({ id: null, nombre: '', ubicacion: '', capacidadTotal: null }); }
  editarBodega(b: Bodega) { this.formBodega.set({ id: b.id, nombre: b.nombre, ubicacion: b.ubicacion ?? '', capacidadTotal: b.capacidadTotal }); }

  async guardarProducto() {
    const f = this.formProducto()!;
    this.errorProducto.set('');
    try {
      const body = { codigo: f.codigo, nombre: f.nombre, unidadMedida: f.unidadMedida, tarifa: f.tarifa ?? 0, activo: f.activo };
      if (f.id) await this.api.actualizarProducto(f.id, body); else await this.api.crearProducto(body);
      this.formProducto.set(null);
      await this.cargar();
    } catch (e) {
      this.errorProducto.set(this.texto(e as Problema));
    }
  }

  async guardarBodega() {
    const f = this.formBodega()!;
    this.errorBodega.set('');
    try {
      const body = { nombre: f.nombre, ubicacion: f.ubicacion, capacidadTotal: f.capacidadTotal ?? 0 };
      if (f.id) await this.api.actualizarBodega(f.id, body); else await this.api.crearBodega(body);
      this.formBodega.set(null);
      await this.cargar();
    } catch (e) {
      this.errorBodega.set(this.texto(e as Problema));
    }
  }

  private texto(p: Problema) {
    return p.campos ? Object.entries(p.campos).map(([k, v]) => `${k}: ${v}`).join(' · ') : p.detail;
  }
}
