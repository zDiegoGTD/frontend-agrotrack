import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ROL_ETIQUETA } from '../../core/estados';
import { Bodega, CuentaUsuario, EstadoCuenta, Problema } from '../../core/models';
import { AccionCuenta, ETIQUETA_CUENTA, FichaForm, accionesPara, fichaDesde, normalizarFicha } from '../../core/usuarios';
import { Modal } from '../../shared/modal';

type Filtro = EstadoCuenta | '';

/**
 * /usuarios (ADMIN): aprobar, rechazar, desactivar y reactivar cuentas, y
 * editar la ficha del productor. El rol no se cambia aqui: vive en Azure AD.
 */
@Component({
  selector: 'app-usuarios',
  imports: [FormsModule, DatePipe, Modal],
  template: `
    <div class="pagina-cab">
      <div><h1>Usuarios</h1><p>El rol lo asigna Azure AD; aquí se decide si la cuenta puede usar AgroTrack</p></div>
    </div>
    @if (error()) { <p class="alerta alerta--error">⚠️ {{ error() }}</p> }

    <section class="panel">
      <div class="panel__cab">
        <div class="panel__titulo"><img src="img/nav-dashboard.png" alt="" />
          <div><h2>Cuentas</h2><p>{{ lista().length }} {{ lista().length === 1 ? 'cuenta' : 'cuentas' }} en este filtro</p></div></div>
        <div class="filtros">
          @for (f of filtros; track f.valor) {
            <button class="btn btn--chico" [class.btn--primario]="filtro() === f.valor" (click)="filtrar(f.valor)">{{ f.texto }}</button>
          }
        </div>
      </div>
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Persona</th><th>Rol (último ingreso)</th><th>Estado</th><th>Solicitó</th><th></th></tr></thead>
          <tbody>
            @for (u of lista(); track u.id) {
              <tr>
                <td><b>{{ u.nombre ?? '—' }}</b><br /><small class="mono">{{ u.email ?? '—' }}</small></td>
                <td><span class="pildora">{{ rol(u) }}</span></td>
                <td><span class="estado estado--{{ u.estado.toLowerCase() }}">{{ etiqueta[u.estado] }}</span>
                  @if (u.motivo) { <small class="motivo">{{ u.motivo }}</small> }</td>
                <td class="mono fecha">{{ u.primerIngreso | date: 'dd MMM HH:mm' }}</td>
                <td class="acciones">
                  @for (a of acciones(u); track a.texto) {
                    <button class="btn btn--chico" [class.btn--peligro]="a.peligro" [class.btn--primario]="!a.peligro" (click)="iniciar(u, a)">{{ a.texto }}</button>
                  }
                  @if (u.rolUltimoToken === 'CLIENTE' || u.perfil) {
                    <button class="btn btn--chico" (click)="abrirFicha(u)">Ficha</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5"><div class="vacio"><img src="img/mascota-saluda.png" alt="" class="vacio-img" /><br />No hay cuentas en este estado.</div></td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (enCurso(); as ac) {
      <app-modal [titulo]="ac.accion.texto + ' cuenta'" [subtitulo]="(ac.usuario.nombre ?? '') + ' · ' + (ac.usuario.email ?? '')" (cerrar)="enCurso.set(null)">
        <label>Motivo (lo verá la persona) <textarea [(ngModel)]="motivo" name="motivo" maxlength="500" rows="3"></textarea></label>
        @if (errorAccion()) { <p class="alerta alerta--error">{{ errorAccion() }}</p> }
        <ng-container pie>
          <button class="btn btn--ghost" (click)="enCurso.set(null)">Cancelar</button>
          <button class="btn btn--peligro" (click)="confirmar()">{{ ac.accion.texto }}</button>
        </ng-container>
      </app-modal>
    }

    @if (ficha(); as fi) {
      <app-modal titulo="Ficha del productor" [subtitulo]="(fi.usuario.nombre ?? '') + ' · ' + (fi.usuario.email ?? '')" (cerrar)="ficha.set(null)">
        <div class="dos">
          <label>RUT <input class="mono" [(ngModel)]="fi.form.rut" name="rut" placeholder="12345678-9" maxlength="15" /></label>
          <label>Teléfono <input [(ngModel)]="fi.form.telefono" name="tel" maxlength="30" /></label>
        </div>
        <label>Razón social <input [(ngModel)]="fi.form.razonSocial" name="rs" maxlength="200" /></label>
        <label>Dirección <input [(ngModel)]="fi.form.direccion" name="dir" maxlength="300" /></label>
        <label>Bodega habitual
          <select [(ngModel)]="fi.form.bodegaHabitualId" name="bod">
            <option [ngValue]="null">— Sin bodega —</option>
            @for (b of bodegas(); track b.id) { <option [ngValue]="b.id">{{ b.nombre }}</option> }
          </select>
        </label>
        @if (errorFicha()) { <p class="alerta alerta--error">{{ errorFicha() }}</p> }
        <ng-container pie>
          <button class="btn btn--ghost" (click)="ficha.set(null)">Cancelar</button>
          <button class="btn btn--primario" (click)="guardarFicha()">Guardar</button>
        </ng-container>
      </app-modal>
    }
  `,
  styles: `
    .filtros { display: flex; gap: .4rem; flex-wrap: wrap; }
    .acciones { display: flex; gap: .35rem; flex-wrap: wrap; justify-content: flex-end; }
    .estado { display: inline-block; padding: .1rem .6rem; border-radius: 999px; border: var(--trazo-fino); box-shadow: var(--sombra-sm);
      font-family: var(--fuente-titulo); font-size: .76rem; font-weight: 800; white-space: nowrap; }
    .estado--pendiente { background: var(--sol); }
    .estado--activo { background: var(--pasto-oscuro); color: #fff; }
    .estado--rechazado { background: var(--granero); color: #fff; }
    .estado--inactivo { background: #fff; color: var(--tierra-70); }
    .motivo { display: block; margin-top: .3rem; font-weight: 600; }
    .fecha { font-size: .74rem; color: var(--tierra-70); white-space: nowrap; }
    .vacio-img { width: 110px; }
    .dos { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
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
