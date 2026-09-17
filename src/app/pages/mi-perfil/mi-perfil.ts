import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { Bodega, CuentaUsuario, Problema } from '../../core/models';
import { FichaForm, fichaDesde, normalizarFicha } from '../../core/usuarios';

/** /mi-perfil (CLIENTE): el productor mantiene su propia ficha. */
@Component({
  selector: 'app-mi-perfil',
  imports: [FormsModule],
  template: `
    <div class="pagina-cab">
      <div><h1>Mi ficha de productor</h1>
        @if (cuenta(); as c) { <p>{{ c.nombre }} · {{ c.email }}</p> } @else { <p>Tus datos como productor agrícola</p> }</div>
    </div>

    <section class="panel ficha">
      <div class="panel__cab"><div class="panel__titulo"><img src="img/ico-trigo.png" alt="" />
        <div><h2>Datos del productor</h2><p>El RUT va con guion y sin puntos: 12345678-9</p></div></div></div>
    <form class="panel__cuerpo form" (ngSubmit)="guardar()">
      <label>RUT <input [ngModel]="form().rut" (ngModelChange)="campo('rut', $event)" name="rut" required placeholder="12345678-9" maxlength="15" /></label>
      <label>Razón social <input [ngModel]="form().razonSocial" (ngModelChange)="campo('razonSocial', $event)" name="rs" required maxlength="200" /></label>
      <label>Teléfono <input [ngModel]="form().telefono" (ngModelChange)="campo('telefono', $event)" name="tel" maxlength="30" /></label>
      <label>Dirección <input [ngModel]="form().direccion" (ngModelChange)="campo('direccion', $event)" name="dir" maxlength="300" /></label>
      <label>Bodega habitual
        <select [ngModel]="form().bodegaHabitualId" (ngModelChange)="campo('bodegaHabitualId', $event)" name="bod">
          <option [ngValue]="null">— Sin bodega —</option>
          @for (b of bodegas(); track b.id) { <option [ngValue]="b.id">{{ b.nombre }}</option> }
        </select>
      </label>
      @if (error()) { <p class="alerta alerta--error">{{ error() }}</p> }
      @if (guardado()) { <p class="alerta">Ficha guardada.</p> }
      <div><button class="btn btn--primario" type="submit" [disabled]="!cuenta() || guardando()">{{ guardando() ? 'Guardando…' : 'Guardar ficha' }}</button></div>
    </form>
    </section>
  `,
  styles: `
    .ficha { max-width: 640px; }
    .form { display: grid; gap: .7rem; }
  `,
})
export class MiPerfil implements OnInit {
  private readonly api = inject(ApiService);

  readonly cuenta = signal<CuentaUsuario | null>(null);
  readonly bodegas = signal<Bodega[]>([]);
  readonly form = signal<FichaForm>(fichaDesde(null));
  readonly error = signal('');
  readonly guardado = signal(false);
  readonly guardando = signal(false);

  async ngOnInit() {
    try {
      const [c, b] = await Promise.all([this.api.miCuenta(), this.api.bodegas().catch(() => [] as Bodega[])]);
      this.cuenta.set(c);
      this.bodegas.set(b);
      this.form.set(fichaDesde(c.perfil));
    } catch (e) {
      this.error.set((e as Problema).detail);
    }
  }

  campo<K extends keyof FichaForm>(k: K, v: FichaForm[K]) {
    this.guardado.set(false);
    this.form.update((f) => ({ ...f, [k]: v }));
  }

  async guardar() {
    const c = this.cuenta();
    // Doble clic o conexion lenta: una sola peticion a la vez
    if (!c || this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.guardado.set(false);
    try {
      await this.api.guardarFicha(c.id, normalizarFicha(this.form()));
      this.guardado.set(true);
    } catch (e) {
      const p = e as Problema;
      this.error.set(p.campos ? Object.entries(p.campos).map(([k, v]) => `${k}: ${v}`).join(' · ') : p.detail);
    } finally {
      this.guardando.set(false);
    }
  }
}
