import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { EstadoCuenta, Yo } from '../models';
import { CuentaService } from './cuenta.service';
import { estadoGuard } from './guards';

describe('estadoGuard', () => {
  let respuesta: Yo | null;

  beforeEach(() => {
    respuesta = null;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CuentaService, useValue: { cargar: async () => respuesta } }],
    });
  });

  const ejecutar = () =>
    TestBed.runInInjectionContext(() => estadoGuard({} as never, {} as never)) as Promise<boolean | UrlTree>;

  const conEstado = (estado: EstadoCuenta): Yo => ({
    userId: 'u1', nombre: 'Diego', roles: ['CLIENTE'], usuarioId: 1, estado, motivo: null, primerIngreso: null,
  });

  it('deja pasar una cuenta ACTIVA', async () => {
    respuesta = conEstado('ACTIVO');
    expect(await ejecutar()).toBe(true);
  });

  it.each(['PENDIENTE', 'RECHAZADO', 'INACTIVO'] as EstadoCuenta[])('manda una cuenta %s a /pendiente', async (estado) => {
    respuesta = conEstado(estado);
    const r = await ejecutar();
    expect(TestBed.inject(Router).serializeUrl(r as UrlTree)).toBe('/pendiente');
  });

  it('si no se pudo verificar la cuenta, tampoco deja pasar', async () => {
    const r = await ejecutar();
    expect(TestBed.inject(Router).serializeUrl(r as UrlTree)).toBe('/pendiente');
  });
});
