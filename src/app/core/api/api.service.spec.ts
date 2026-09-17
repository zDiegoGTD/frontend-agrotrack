import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { ApiService } from './api.service';

const error = (status: number, error: unknown = null, headers: Record<string, string> = {}) =>
  new HttpErrorResponse({ status, error, headers: new HttpHeaders(headers) });

describe('traducción de errores HTTP', () => {
  it('un 403 de la matriz de roles (insufficient_scope) habla del rol', () => {
    const p = ApiService.aProblema(error(403, null, { 'WWW-Authenticate': 'Bearer error="insufficient_scope"' }));
    expect(p.detail).toBe('Tu rol no permite esta acción.');
  });

  it('un 403 por CORS no culpa al rol', () => {
    const p = ApiService.aProblema(error(403, 'Invalid CORS request'));
    expect(p.detail).toContain('CORS');
    expect(p.detail).not.toContain('Tu rol');
  });

  it('el detalle que manda el backend en problem+json tiene prioridad', () => {
    const p = ApiService.aProblema(error(409, { detail: 'Bodega sin capacidad', codigo: 'CAPACIDAD' }));
    expect(p).toMatchObject({ status: 409, detail: 'Bodega sin capacidad', codigo: 'CAPACIDAD' });
  });

  it('429 y 503 tienen mensaje propio', () => {
    expect(ApiService.aProblema(error(429)).detail).toContain('Demasiadas solicitudes');
    expect(ApiService.aProblema(error(503)).detail).toContain('no está disponible');
  });

  it('401 pide volver a entrar y 0 habla de conexión', () => {
    expect(ApiService.aProblema(error(401)).detail).toContain('vuelve a entrar');
    expect(ApiService.aProblema(error(0)).detail).toContain('conectar');
  });
});
