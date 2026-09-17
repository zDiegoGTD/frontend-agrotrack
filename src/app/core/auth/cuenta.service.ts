import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Problema, Yo } from '../models';

/**
 * Estado de la cuenta del usuario en AgroTrack. El rol lo trae el token;
 * si puede usar el sistema lo decide ms-agrotrack-users, y se sabe
 * preguntando a /api/me (que ademas registra la cuenta la primera vez).
 */
@Injectable({ providedIn: 'root' })
export class CuentaService {
  private readonly api = inject(ApiService);

  private readonly _yo = signal<Yo | null>(null);
  readonly yo = this._yo.asReadonly();

  private readonly _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  private enCurso: Promise<Yo | null> | null = null;

  /** Una sola llamada aunque varias guardas pregunten a la vez. */
  cargar(): Promise<Yo | null> {
    const actual = this._yo();
    if (actual) return Promise.resolve(actual);
    if (!this.enCurso) {
      this.enCurso = this.api
        .me()
        .then((yo) => {
          this._yo.set(yo);
          this._error.set(null);
          return yo;
        })
        .catch((e: Problema) => {
          this._error.set(e?.detail ?? 'No se pudo verificar tu cuenta');
          return null;
        })
        .finally(() => (this.enCurso = null));
    }
    return this.enCurso;
  }

  recargar(): Promise<Yo | null> {
    this._yo.set(null);
    return this.cargar();
  }

  limpiar(): void {
    this._yo.set(null);
    this._error.set(null);
  }
}
