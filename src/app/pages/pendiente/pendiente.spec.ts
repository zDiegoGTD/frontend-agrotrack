import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { CuentaService } from '../../core/auth/cuenta.service';
import { Yo } from '../../core/models';
import { Pendiente } from './pendiente';

describe('Pendiente', () => {
  const yo = signal<Yo | null>(null);
  const navigate = vi.fn();
  const recargar = vi.fn();
  const logout = vi.fn(async () => {});

  const cuenta = (estado: Yo['estado'], motivo: string | null = null): Yo => ({
    userId: 'u1', nombre: 'Productor Demo', email: 'productor@mish.cl', roles: ['CLIENTE'],
    usuarioId: 4, estado, motivo, primerIngreso: '2026-09-15T10:00:00Z',
  });

  beforeEach(() => {
    navigate.mockClear();
    recargar.mockReset();
    yo.set(cuenta('PENDIENTE'));
    TestBed.configureTestingModule({
      providers: [
        { provide: CuentaService, useValue: { yo, error: signal(null), cargar: async () => yo(), recargar, limpiar: vi.fn() } },
        { provide: AuthService, useValue: { logout } },
        { provide: Router, useValue: { navigate } },
      ],
    });
  });

  it('muestra el mensaje del estado y el correo', async () => {
    const f = TestBed.createComponent(Pendiente);
    f.detectChanges();
    await f.whenStable();
    const texto = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Tu cuenta espera aprobación');
    expect(texto).toContain('productor@mish.cl');
  });

  it('muestra el motivo de un rechazo', async () => {
    yo.set(cuenta('RECHAZADO', 'RUT no coincide'));
    const f = TestBed.createComponent(Pendiente);
    f.detectChanges();
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).textContent).toContain('RUT no coincide');
  });

  it('"Volver a comprobar" entra al panel si ya fue aprobada', async () => {
    recargar.mockResolvedValue(cuenta('ACTIVO'));
    const f = TestBed.createComponent(Pendiente);
    f.detectChanges();
    await f.componentInstance.comprobar();
    expect(navigate).toHaveBeenCalledWith(['/dashboard'], { replaceUrl: true });
  });

  it('"Volver a comprobar" se queda si sigue pendiente', async () => {
    recargar.mockResolvedValue(cuenta('PENDIENTE'));
    const f = TestBed.createComponent(Pendiente);
    f.detectChanges();
    await f.componentInstance.comprobar();
    expect(navigate).not.toHaveBeenCalledWith(['/dashboard'], { replaceUrl: true });
  });
});
