import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService, DevTokenAuthService } from '../../core/auth/auth.service';
import {
  MsalAuthService,
  limpiarInteraccionPendiente,
  mensajeDeError,
} from '../../core/auth/msal-auth.service';

/** /login: boton de Microsoft (MSAL) o, en desarrollo, pegar un token de mint.mjs. */
@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login">
      <div class="tarjeta">
        <div class="cab">
          <img class="logo" src="img/logo-circulo.png" alt="" />
          <div>
            <h1>AgroTrack</h1>
            <p>Acopio y despacho de producción agrícola</p>
          </div>
        </div>

        <div class="cuerpo">
          @if (modoMsal) {
            <p class="bienvenida">¡Hola! Entra con tu cuenta de la organización para ver lo que pasa hoy en la planta.</p>
            <button class="btn btn-ms" (click)="entrarConMicrosoft()" [disabled]="entrando()">
              <span class="logo-ms"></span>
              {{ entrando() ? 'Redirigiendo…' : 'Iniciar sesión con Microsoft' }}
            </button>
            @if (errorMsal()) {
              <p class="alerta alerta--error">{{ errorMsal() }}</p>
              <button class="btn btn--sec ancho" (click)="reintentarLimpio()">Limpiar sesión y reintentar</button>
            }
          } @else {
            <p class="bienvenida">
              <b>Modo desarrollo.</b> Emite un token con
              <code>node infra/local/jwt/mint.mjs OPERADOR</code>
              (o ADMIN, CLIENTE, AUDITOR) y pégalo aquí.
            </p>
            <textarea [(ngModel)]="token" rows="5" placeholder="eyJhbGciOi..."></textarea>
            @if (error()) { <p class="alerta alerta--error">{{ error() }}</p> }
            <button class="btn btn--primario ancho" (click)="entrar()" [disabled]="!token.trim()">Entrar</button>
          }
        </div>
      </div>
      <img class="mascota" src="img/mascota-saluda.png" alt="" />
    </div>
  `,
  styles: `
    .login { min-height: 100vh; display: grid; place-items: center; padding: 1.5rem; position: relative; overflow: hidden;
      background: radial-gradient(circle at 20% 15%, #fff 0, transparent 40%), var(--crema-fondo); }
    .tarjeta { width: min(460px, 100%); background: #fff; border: var(--trazo); border-radius: 22px; box-shadow: var(--sombra-lg); overflow: hidden; position: relative; z-index: 1; }
    .cab { background: var(--pasto-claro); border-bottom: var(--trazo); padding: 1.1rem 1.4rem; display: flex; gap: 1rem; align-items: center; }
    .logo { width: 72px; height: 72px; }
    h1 { margin: 0; font-size: 2rem; }
    .cab p { margin: 0; font-weight: 700; color: var(--tierra-70); }
    .cuerpo { padding: 1.3rem 1.4rem 1.5rem; display: grid; gap: .8rem; }
    .bienvenida { margin: 0; font-weight: 600; line-height: 1.5; }
    code { font-family: var(--fuente-mono); font-size: .78rem; background: var(--crema); border: 1px solid var(--tierra-30); padding: .05rem .3rem; border-radius: 6px; }
    textarea { width: 100%; font-family: var(--fuente-mono); font-size: .72rem; }
    .ancho { width: 100%; }
    .btn-ms { width: 100%; padding: .75rem 1rem; font-size: 1rem; background: var(--tierra); color: #fff; }
    .btn-ms:hover { background: #3f2a1f; }
    .logo-ms { width: 18px; height: 18px; background:
      linear-gradient(90deg, #f25022 50%, #7fba00 50%) top / 100% 50% no-repeat,
      linear-gradient(90deg, #00a4ef 50%, #ffb900 50%) bottom / 100% 50% no-repeat; }
    .alerta { word-break: break-word; }
    .mascota { position: absolute; right: max(2vw, calc(50% - 560px)); bottom: 2vh; width: min(300px, 30vw); transform: rotate(-4deg); pointer-events: none; }
    @media (max-width: 900px) { .mascota { display: none; } }
  `,
})
export class Login {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly modoMsal = environment.auth.mode === 'msal';
  token = '';
  readonly error = signal('');
  readonly entrando = signal(false);

  constructor() {
    // Al volver de Microsoft, MSAL devuelve al usuario a la pagina desde la
    // que empezo el login: esta misma. Para entonces ya hay sesion, pero sin
    // esto la pantalla se queda igual y parece que el login no funciono.
    effect(() => {
      if (this.auth.user()) {
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      }
    });
  }

  /** Error de MSAL: el que trae el servicio (de la vuelta de Azure) o el del último clic. */
  private readonly errorClic = signal<string | null>(null);
  readonly errorMsal = computed(
    () => this.errorClic() ?? (this.auth as Partial<MsalAuthService>).error?.() ?? null,
  );

  /**
   * El login redirige fuera de la página, así que en el camino feliz este
   * método nunca termina. Si termina, es que algo falló — y sin este catch
   * el fallo sería una promesa rechazada que nadie ve: el usuario pulsa y
   * no ocurre nada.
   */
  async entrarConMicrosoft() {
    this.entrando.set(true);
    this.errorClic.set(null);
    try {
      await this.auth.login();
    } catch (e) {
      this.errorClic.set(mensajeDeError(e));
    } finally {
      this.entrando.set(false);
    }
  }

  /** Para cuando queda basura de un intento anterior en el navegador. */
  async reintentarLimpio() {
    limpiarInteraccionPendiente();
    await this.entrarConMicrosoft();
  }

  entrar() {
    // No navega: al fijar el token cambia auth.user() y el effect de arriba
    // lleva al panel. Un solo camino de entrada para los dos modos.
    const dev = this.auth as DevTokenAuthService;
    if (!dev.establecerToken(this.token)) {
      this.error.set('El token no es válido o está vencido.');
    }
  }
}
