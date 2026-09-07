import { describe, expect, it } from 'vitest';
import { ESTADOS, SIGUIENTES, TERMINALES, puedeTransicionar } from './estados';

describe('espejo de la maquina de estados', () => {
  it('no se llega a EN_DESPACHO sin pasar por EN_CLASIFICACION', () => {
    const origenes = ESTADOS.filter((e) => SIGUIENTES[e].includes('EN_DESPACHO'));
    expect(origenes).toEqual(['EN_CLASIFICACION']);
  });

  it('los terminales no tienen salidas', () => {
    for (const t of TERMINALES) {
      expect(SIGUIENTES[t]).toEqual([]);
    }
  });

  it('solo admin y jefe de acopio cambian estados', () => {
    expect(puedeTransicionar(['OPERADOR'])).toBe(true);
    expect(puedeTransicionar(['ADMIN'])).toBe(true);
    expect(puedeTransicionar(['CLIENTE'])).toBe(false);
    expect(puedeTransicionar(['AUDITOR'])).toBe(false);
    expect(puedeTransicionar([])).toBe(false);
  });
});
