import { describe, expect, it } from 'vitest';
import { finDelDiaLocal, inicioDelDiaLocal } from './fechas';

describe('filtros de fecha en hora local', () => {
  it('el día elegido empieza a medianoche de Chile, no de Greenwich', () => {
    expect(inicioDelDiaLocal('2026-09-17')).toBe(new Date(2026, 8, 17, 0, 0, 0, 0).toISOString());
  });

  it('y termina en el último milisegundo del mismo día local', () => {
    expect(finDelDiaLocal('2026-09-17')).toBe(new Date(2026, 8, 17, 23, 59, 59, 999).toISOString());
  });

  it('sin fecha no filtra', () => {
    expect(inicioDelDiaLocal('')).toBeUndefined();
    expect(finDelDiaLocal('')).toBeUndefined();
  });
});
