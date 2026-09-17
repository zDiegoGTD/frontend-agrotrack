import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../api/api.service';
import { Yo } from '../models';
import { CuentaService } from './cuenta.service';

const yo = (estado: Yo['estado']): Yo => ({
  userId: 'u1', nombre: 'Diego', roles: ['CLIENTE'], usuarioId: 1, estado, motivo: null, primerIngreso: '2026-09-15T10:00:00Z',
});

describe('CuentaService', () => {
  const me = vi.fn();
  let cuenta: CuentaService;

  beforeEach(() => {
    me.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: { me } }] });
    cuenta = TestBed.inject(CuentaService);
  });

  it('dos guardas pidiendo a la vez hacen UNA sola llamada a /api/me', async () => {
    me.mockResolvedValue(yo('ACTIVO'));
    const [a, b] = await Promise.all([cuenta.cargar(), cuenta.cargar()]);
    expect(me).toHaveBeenCalledTimes(1);
    expect(a?.estado).toBe('ACTIVO');
    expect(b).toBe(a);
  });

  it('una vez cargada no vuelve a preguntar', async () => {
    me.mockResolvedValue(yo('PENDIENTE'));
    await cuenta.cargar();
    await cuenta.cargar();
    expect(me).toHaveBeenCalledTimes(1);
    expect(cuenta.yo()?.estado).toBe('PENDIENTE');
  });

  it('recargar pregunta de nuevo (botón "Volver a comprobar")', async () => {
    me.mockResolvedValueOnce(yo('PENDIENTE')).mockResolvedValueOnce(yo('ACTIVO'));
    await cuenta.cargar();
    expect((await cuenta.recargar())?.estado).toBe('ACTIVO');
  });

  it('si el BFF falla deja el error y null, y el siguiente intento reintenta', async () => {
    me.mockRejectedValueOnce({ status: 503, detail: 'No se pudo verificar tu cuenta' }).mockResolvedValueOnce(yo('ACTIVO'));
    expect(await cuenta.cargar()).toBeNull();
    expect(cuenta.error()).toBe('No se pudo verificar tu cuenta');
    expect((await cuenta.cargar())?.estado).toBe('ACTIVO');
    expect(cuenta.error()).toBeNull();
  });

  it('limpiar olvida la cuenta (al cerrar sesión)', async () => {
    me.mockResolvedValue(yo('ACTIVO'));
    await cuenta.cargar();
    cuenta.limpiar();
    expect(cuenta.yo()).toBeNull();
  });
});
