import { describe, expect, it } from 'vitest';
import { contarPorEstado, nivelCapacidad } from './estados';

describe('semáforo de capacidad de bodega', () => {
  it('con más de 30 % libre es normal', () => {
    expect(nivelCapacidad(1000, 500)).toEqual({ usado: 50, nivel: 'normal' });
  });

  it('con 30 % libre o menos es alerta', () => {
    expect(nivelCapacidad(1000, 300).nivel).toBe('alerta');
  });

  it('con 15 % libre o menos es crítico', () => {
    expect(nivelCapacidad(1000, 150).nivel).toBe('critico');
    expect(nivelCapacidad(1000, 0)).toEqual({ usado: 100, nivel: 'critico' });
  });

  it('una bodega sin capacidad total no divide por cero', () => {
    expect(nivelCapacidad(0, 0).usado).toBe(0);
  });
});

describe('conteo por estado', () => {
  it('cuenta cada estado y deja en cero los que no aparecen', () => {
    const c = contarPorEstado([{ estado: 'RECIBIDA' }, { estado: 'RECIBIDA' }, { estado: 'RECHAZADA' }]);
    expect(c.RECIBIDA).toBe(2);
    expect(c.RECHAZADA).toBe(1);
    expect(c.REGISTRADA).toBe(0);
    expect(c.DESPACHADA).toBe(0);
  });
});
