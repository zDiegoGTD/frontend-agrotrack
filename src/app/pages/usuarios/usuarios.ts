import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ROL_ETIQUETA } from '../../core/estados';
import { Bodega, CuentaUsuario, EstadoCuenta, Problema } from '../../core/models';
import { AccionCuenta, ETIQUETA_CUENTA, FichaForm, accionesPara, fichaDesde, normalizarFicha } from '../../core/usuarios';

type Filtro = EstadoCuenta | '';

/**
 * /usuarios (ADMIN): aprobar, rechazar, desactivar y reactivar cuentas, y
 * editar la ficha del productor. El rol no se cambia aqui: vive en Azure AD.
 */
@Component({
  selector: 'app-usuarios',
  imports: [FormsModule, DatePipe],
  template: `
    <h1>Usuarios</h1>
    <p class="nota">El rol lo asigna Azure AD; aquí se decide si la cuenta puede usar AgroTrack.</p>
    @if (error()) { <p class="alerta alerta--error">{{ error() }}</p> }

    <div class="filtros">
      @for (f of filtros; track f.valor) {
        <button class="btn" [class.btn--primario]="filtro() === f.valor" [class.btn--ghost]="filtro() !== f.valor"
          (click)="filtrar(f.valor)">{{ f.texto }}</button>
      }
    </div>

    <section class="card tabla-wrap">
      <table class="tabla">
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol (último ingreso)</th><th>Estado</th><th>Solicitó</th><th></th></tr></thead>
        <tbody>
          @for (u of lista(); track u.id) {
            <tr>
              <td>{{ u.nombre ?? '—' }}</td>
              <td>{{ u.email ?? '—' }}</td>
              <td>{{ rol(u) }}</td>
              <td><span class="estado estado--{{ u.estado.toLowerCase() }}">{{ etiqueta[u.estado] }}</span>
                @if (u.motivo) { <small class="motivo">{{ u.motivo }}</small> }</td>
              <td>{{ u.primerIngreso | date: 'short' }}</td>
              <td class="acciones">
                @for (a of acciones(u); track a.texto) {
                  <button class="btn" [class.btn--peligro]="a.peligro" [class.btn--sec]="!a.peligro" (click)="iniciar(u, a)">{{ a.texto }}</button>
                }
                @if (u.rolUltimoToken === 'CLIENTE' || u.perfil) {
                  <button class="btn btn--ghost" (click)="abrirFicha(u)">Ficha</button>
                }
              </td>
            </tr>
          } @empty { <tr><td colspan="6" class="vacio">No hay cuentas en este estado.</td></tr> }
        </tbody>
      </table>
    </section>

    @if (enCurso(); as ac) {
      <section class="card form">
        <h3>{{ ac.accion.texto }} a {{ ac.usuario.nombre ?? ac.usuario.email }}</h3>
        <label>Motivo <textarea [(ngModel)]="motivo" name="motivo" maxlength="500" rows="3"></textarea></label>
        @if (errorAccion()) { <p class="alerta alerta--error">{{ errorAccion() }}</p> }
        <div><button class="btn btn--peligro" (click)="confirmar()">{{ ac.accion.texto }}</button>
          <button class="btn btn--ghost" (click)="enCurso.set(null)">Cancelar</button></div>
      </section>
    }

    @if (ficha(); as fi) {
      <form class="card form" (ngSubmit)="guardarFicha()">
        <h3>Ficha de {{ fi.usuario.nombre ?? fi.usuario.email }}</h3>
        <label>RUT <input [(ngModel)]="fi.form.rut" name="rut" required placeholder="12345678-9" maxlength="15" /></label>
        <label>Razón social <input [(ngModel)]="fi.form.razonSocial" name="rs" required maxlength="200" /></label>
        <label>Teléfono <input [(ngModel)]="fi.form.telefono" name="tel" maxlength="30" /></label>
        <label>Dirección <input [(ngModel)]="fi.form.direccion" name="dir" maxlength="300" /></label>
        <label>Bodega habitual
          <select [(ngModel)]="fi.form.bodegaHabitualId" name="bod">
            <option [ngValue]="null">— Sin bodega —</option>
            @for (b of bodegas(); track b.id) { <option [ngValue]="b.id">{{ b.nombre }}</option> }
          </select>
        </label>
        @if (errorFicha()) { <p class="alerta alerta--error">{{ errorFicha() }}</p> }
        <div><button class="btn btn--primario" type="submit">Guardar</button>
          <button class="btn btn--ghost" type="button" (click)="ficha.set(null)">Cancelar</button></div>
      </form>
    }
  `,
  styles: `
    .nota { color: var(--gris-600); margin-top: -.5rem; }
    .filtros { display: flex; gap: .4rem; flex-wrap: wrap; margin: 1rem 0; }
    .acciones { display: flex; gap: .35rem; flex-wrap: wrap; justify-content: flex-end; }
    .estado { padding: .15rem .55rem; border-radius: 999px; font-size: .78rem; font-weight: 600; }
    .estado--pendiente { background: #fff4d6; color: #7a5600; }
    .estado--activo { background: var(--verde-100); color: var(--verde-900); }
    .estado--rechazado { background: #fde2e1; color: #8a1c14; }
    .estado--inactivo { background: var(--gris-100); color: var(--gris-600); }
    .motivo { display: block; color: var(--gris-600); margin-top: .2rem; }
    .form { display: grid; gap: .5rem; margin-top: 1rem; max-width: 520px; }
  `,
})
export class Usuarios implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly etiqueta = ETIQUETA_CUENTA;
  readonly filtros: { valor: Filtro; texto: string }[] = [
    { valor: 'PENDIENTE', texto: 'Pendientes' },
    { valor: 'ACTIVO', texto: 'Activas' },
    { valor: 'RECHAZADO', texto: 'Rechazadas' },
    { valor: 'INACTIVO', texto: 'Desactivadas' },
    { valor: '', texto: 'Todas' },
  ];

  readonly filtro = signal<Filtro>('PENDIENTE');
  readonly lista = signal<CuentaUsuario[]>([]);
  readonly bodegas = signal<Bodega[]>([]);
  readonly error = signal('');
  readonly enCurso = signal<{ usuario: CuentaUsuario; accion: AccionCuenta } | null>(null);
  readonly errorAccion = signal('');
  readonly ficha = signal<{ usuario: CuentaUsuario; form: FichaForm } | null>(null);
  readonly errorFicha = signal('');
  motivo = '';

  async ngOnInit() {
    await Promise.all([this.cargar(), this.api.bodegas().then((b) => this.bodegas.set(b)).catch(() => {})]);
  }

  async cargar() {
    this.error.set('');
    try {
      this.lista.set(await this.api.usuarios(this.filtro() || undefined));
    } catch (e) {
      this.error.set((e as Problema).detail);
    }
  }

  async filtrar(f: Filtro) {
    this.filtro.set(f);
    await this.cargar();
  }

  rol = (u: CuentaUsuario) => (u.rolUltimoToken ? ROL_ETIQUETA[u.rolUltimoToken] : 'Sin rol');
  acciones = (u: CuentaUsuario) => accionesPara(u.estado, u.azureOid === this.auth.user()?.userId);

  /** Las acciones sin motivo se ejecutan al tiro; las otras abren el formulario. */
  iniciar(u: CuentaUsuario, a: AccionCuenta) {
    this.errorAccion.set('');
    if (!a.exigeMotivo) {
      void this.ejecutar(u, a);
      return;
    }
    this.motivo = '';
    this.enCurso.set({ usuario: u, accion: a });
  }

  async confirmar() {
    const ac = this.enCurso();
    if (!ac) return;
    if (!this.motivo.trim()) {
      this.errorAccion.set('Escribe el motivo');
      return;
    }
    await this.ejecutar(ac.usuario, ac.accion, this.motivo.trim());
  }

  async ejecutar(u: CuentaUsuario, a: AccionCuenta, motivo: string | null = null) {
    try {
      await this.api.cambiarEstadoCuenta(u.id, { estado: a.destino, motivo });
      this.enCurso.set(null);
      await this.cargar();
    } catch (e) {
      const p = e as Problema;
      if (this.enCurso()) this.errorAccion.set(p.detail);
      else this.error.set(p.detail);
    }
  }

  abrirFicha(u: CuentaUsuario) {
    this.errorFicha.set('');
    this.ficha.set({ usuario: u, form: fichaDesde(u.perfil) });
  }

  async guardarFicha() {
    const fi = this.ficha();
    if (!fi) return;
    this.errorFicha.set('');
    try {
      await this.api.guardarFicha(fi.usuario.id, normalizarFicha(fi.form));
      this.ficha.set(null);
      await this.cargar();
    } catch (e) {
      const p = e as Problema;
      this.errorFicha.set(p.campos ? Object.entries(p.campos).map(([k, v]) => `${k}: ${v}`).join(' · ') : p.detail);
    }
  }
}
