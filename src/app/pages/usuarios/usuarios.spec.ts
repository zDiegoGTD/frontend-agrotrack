import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { CuentaUsuario, EstadoCuenta } from '../../core/models';
import { Usuarios } from './usuarios';

const fila = (id: number, oid: string, estado: EstadoCuenta, nombre: string): CuentaUsuario => ({
  id, azureOid: oid, email: `${oid}@mish.cl`, nombre, estado, rolUltimoToken: 'CLIENTE', motivo: null,
  primerIngreso: '2026-09-15T10:00:00Z', ultimoIngreso: '2026-09-15T10:00:00Z', aprobadoPor: null, aprobadoEn: null, perfil: null,
});

describe('Usuarios (administración)', () => {
  const api = { usuarios: vi.fn(), cambiarEstadoCuenta: vi.fn(), guardarFicha: vi.fn(), bodegas: vi.fn() };

  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset());
    api.bodegas.mockResolvedValue([]);
    api.usuarios.mockResolvedValue([fila(1, 'yo', 'ACTIVO', 'Diego'), fila(2, 'p', 'PENDIENTE', 'Productor Demo')]);
    api.cambiarEstadoCuenta.mockResolvedValue(fila(2, 'p', 'ACTIVO', 'Productor Demo'));
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: { user: signal({ userId: 'yo', nombre: 'Diego', roles: ['ADMIN'] }), hasRole: () => true } },
      ],
    });
  });

  async function montar() {
    const f = TestBed.createComponent(Usuarios);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return f;
  }

  const botones = (el: HTMLElement) => Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());

  it('empieza mostrando las pendientes', async () => {
    await montar();
    expect(api.usuarios).toHaveBeenCalledWith('PENDIENTE');
  });

  it('una pendiente ofrece Aprobar y Rechazar; mi cuenta activa no ofrece Desactivar', async () => {
    const f = await montar();
    const b = botones(f.nativeElement);
    expect(b).toContain('Aprobar');
    expect(b).toContain('Rechazar');
    expect(b).not.toContain('Desactivar');
  });

  it('aprobar llama al backend sin motivo y recarga', async () => {
    const f = await montar();
    await f.componentInstance.ejecutar(f.componentInstance.lista()[1], { destino: 'ACTIVO', texto: 'Aprobar', exigeMotivo: false, peligro: false });
    expect(api.cambiarEstadoCuenta).toHaveBeenCalledWith(2, { estado: 'ACTIVO', motivo: null });
    expect(api.usuarios).toHaveBeenCalledTimes(2);
  });

  it('rechazar sin escribir motivo no llama al backend', async () => {
    const f = await montar();
    const c = f.componentInstance;
    c.iniciar(c.lista()[1], { destino: 'RECHAZADO', texto: 'Rechazar', exigeMotivo: true, peligro: true });
    await c.confirmar();
    expect(api.cambiarEstadoCuenta).not.toHaveBeenCalled();
    expect(c.errorAccion()).toBe('Escribe el motivo');
  });
});
