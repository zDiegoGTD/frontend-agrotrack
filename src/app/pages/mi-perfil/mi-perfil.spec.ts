import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../../core/api/api.service';
import { CuentaUsuario } from '../../core/models';
import { MiPerfil } from './mi-perfil';

const cuenta: CuentaUsuario = {
  id: 4, azureOid: 'p', email: 'productor@mish.cl', nombre: 'Productor Demo', estado: 'ACTIVO', rolUltimoToken: 'CLIENTE',
  motivo: null, primerIngreso: '2026-09-15T10:00:00Z', ultimoIngreso: '2026-09-15T10:00:00Z', aprobadoPor: 'sistema', aprobadoEn: null,
  perfil: { rut: '12345678-9', razonSocial: 'Agrícola Sur', telefono: null, direccion: null, bodegaHabitualId: null },
};

describe('MiPerfil', () => {
  const api = { miCuenta: vi.fn(), guardarFicha: vi.fn(), bodegas: vi.fn() };

  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset());
    api.miCuenta.mockResolvedValue(cuenta);
    api.bodegas.mockResolvedValue([]);
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
  });

  it('carga la ficha existente en el formulario', async () => {
    const f = TestBed.createComponent(MiPerfil);
    f.detectChanges();
    // La carga es una promesa suelta: whenStable no la espera en Angular sin zone.js
    await vi.waitFor(() => expect(f.componentInstance.cuenta()).not.toBeNull());
    expect(f.componentInstance.form().rut).toBe('12345678-9');
  });

  it('un doble clic en Guardar envía la ficha una sola vez', async () => {
    let terminar!: (v: unknown) => void;
    api.guardarFicha.mockReturnValue(new Promise((r) => (terminar = r)));
    const f = TestBed.createComponent(MiPerfil);
    f.detectChanges();
    await vi.waitFor(() => expect(f.componentInstance.cuenta()).not.toBeNull());

    const primero = f.componentInstance.guardar();
    const segundo = f.componentInstance.guardar();
    terminar(cuenta.perfil);
    await Promise.all([primero, segundo]);

    expect(api.guardarFicha).toHaveBeenCalledTimes(1);
  });

  it('guarda sobre SU id con la ficha normalizada y avisa', async () => {
    api.guardarFicha.mockResolvedValue(cuenta.perfil);
    const f = TestBed.createComponent(MiPerfil);
    f.detectChanges();
    // La carga es una promesa suelta: whenStable no la espera en Angular sin zone.js
    await vi.waitFor(() => expect(f.componentInstance.cuenta()).not.toBeNull());
    f.componentInstance.form.update((x) => ({ ...x, telefono: ' +56 9 1111 2222 ' }));

    await f.componentInstance.guardar();

    expect(api.guardarFicha).toHaveBeenCalledWith(4, expect.objectContaining({ telefono: '+56 9 1111 2222', direccion: null }));
    expect(f.componentInstance.guardado()).toBe(true);
  });

  it('muestra el error de campo que devuelve el backend', async () => {
    api.guardarFicha.mockRejectedValue({ status: 400, detail: 'Datos invalidos', campos: { rut: 'RUT con guion, sin puntos: 12345678-9' } });
    const f = TestBed.createComponent(MiPerfil);
    f.detectChanges();
    // La carga es una promesa suelta: whenStable no la espera en Angular sin zone.js
    await vi.waitFor(() => expect(f.componentInstance.cuenta()).not.toBeNull());

    await f.componentInstance.guardar();

    expect(f.componentInstance.error()).toContain('rut: RUT con guion');
  });
});
