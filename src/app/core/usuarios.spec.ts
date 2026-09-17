import { describe, expect, it } from 'vitest';
import { EstadoCuenta } from './models';
import { SIGUIENTES_CUENTA, accionesPara, fichaDesde, normalizarFicha } from './usuarios';

const destinos = (estado: EstadoCuenta, yo = false) => accionesPara(estado, yo).map((a) => a.destino);

describe('acciones sobre una cuenta', () => {
  it('pendiente: aprobar o rechazar (rechazar exige motivo)', () => {
    const a = accionesPara('PENDIENTE', false);
    expect(a.map((x) => [x.texto, x.destino, x.exigeMotivo])).toEqual([
      ['Aprobar', 'ACTIVO', false],
      ['Rechazar', 'RECHAZADO', true],
    ]);
  });

  it('activa de otro: desactivar con motivo', () => {
    expect(accionesPara('ACTIVO', false).map((x) => [x.texto, x.exigeMotivo])).toEqual([['Desactivar', true]]);
  });

  it('mi propia cuenta activa: ninguna acción (no me puedo desactivar)', () => {
    expect(accionesPara('ACTIVO', true)).toEqual([]);
  });

  it('desactivada: reactivar; rechazada: reconsiderar', () => {
    expect(accionesPara('INACTIVO', false).map((x) => x.texto)).toEqual(['Reactivar']);
    expect(accionesPara('RECHAZADO', false).map((x) => x.texto)).toEqual(['Reconsiderar']);
  });

  it('ningún botón ofrece una transición que el backend rechazaría', () => {
    for (const estado of Object.keys(SIGUIENTES_CUENTA) as EstadoCuenta[]) {
      for (const d of destinos(estado)) expect(SIGUIENTES_CUENTA[estado]).toContain(d);
    }
  });
});

describe('ficha del productor', () => {
  it('normaliza antes de enviar: recorta, RUT en mayúscula y vacíos a null', () => {
    expect(
      normalizarFicha({ rut: ' 12345678-k ', razonSocial: ' Agrícola Sur ', telefono: '  ', direccion: '', bodegaHabitualId: null }),
    ).toEqual({ rut: '12345678-K', razonSocial: 'Agrícola Sur', telefono: null, direccion: null, bodegaHabitualId: null });
  });

  it('una bodega elegida en el select llega como número', () => {
    const f = { ...fichaDesde(null), rut: '1-9', razonSocial: 'X', bodegaHabitualId: '3' as unknown as number };
    expect(normalizarFicha(f).bodegaHabitualId).toBe(3);
  });

  it('fichaDesde(null) da un formulario vacío editable', () => {
    expect(fichaDesde(null)).toEqual({ rut: '', razonSocial: '', telefono: '', direccion: '', bodegaHabitualId: null });
  });
});
