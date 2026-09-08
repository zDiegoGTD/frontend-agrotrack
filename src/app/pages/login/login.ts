import { Component, computed, inject, signal } from '@angular/core';
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
      <div class="card">
        <h1>🌾 AgroTrack</h1>
        <p class="sub">Acopio y despacho de producción agrícola</p>

        @if (modoMsal) {
          <button class="btn btn--ms" (click)="entrarConMicrosoft()" [disabled]="entrando()">
            <span class="logo-ms"></span>
            {{ entrando() ? 'Redirigiendo…' : 'Iniciar sesión con Microsoft' }}
          </button>
          @if (errorMsal()) {
            <p class="error">{{ errorMsal() }}</p>
            <button class="btn btn--secundario" (click)="reintentarLimpio()">
              Limpiar sesión y reintentar
            </button>
          }
        } @else {
          <p class="hint">
            Modo desarrollo. Emite un token con<br />
            <code>node infra/local/jwt/mint.mjs OPERADOR</code><br />
            (o ADMIN, CLIENTE, AUDITOR) y pégalo aquí.
          </p>
          <textarea [(ngModel)]="token" rows="5" placeholder="eyJhbGciOi..."></textarea>
          @if (error()) { <p class="error">{{ error() }}</p> }
          <button class="btn btn--primario" (click)="entrar()" [disabled]="!token.trim()">Entrar</button>
        }
      </div>
    </div>
  `,
  styles: `
    .login { min-height: 100vh; display: grid; place-items: center; background: linear-gradient(160deg, var(--verde-900), var(--verde-700)); }
    .card { background: #fff; padding: 2rem; border-radius: 12px; width: min(440px, 92vw); box-shadow: 0 20px 60px rgba(0,0,0,.25); }
    h1 { margin: 0 0 .25rem; } .sub { color: var(--gris-600); margin: 0 0 1.5rem; }
    .hint { font-size: .85rem; color: var(--gris-600); } code { background: var(--gris-100); padding: .1rem .3rem; border-radius: 4px; }
    textarea { width: 100%; font-family: monospace; font-size: .75rem; margin: .5rem 0; }
    .btn--ms { width: 100%; background: #2f2f2f; color: #fff; display: flex; gap: .6rem; justify-content: center; }
    .logo-ms { width: 16px; height: 16px; background:
      linear-gradient(90deg, #f25022 50%, #7fba00 50%) top / 100% 50% no-repeat,
      linear-gradient(90deg, #00a4ef 50%, #ffb900 50%) bottom / 100% 50% no-repeat; }
    .btn--secundario { width: 100%; margin-top: .5rem; background: var(--gris-100); }
    .error { color: var(--rojo-600); font-size: .85rem; word-break: break-word; }
  `,
})
export class Login {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly modoMsal = environment.auth.mode === 'msal';
  token = '';
  readonly error = signal('');
  readonly entrando = signal(false);

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
    const dev = this.auth as DevTokenAuthService;
    if (dev.establecerToken(this.token)) {
      this.router.navigate(['/dashboard']);
    } else {
      this.error.set('El token no es válido o está vencido.');
    }
  }
}
