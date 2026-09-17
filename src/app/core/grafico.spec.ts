import { describe, expect, it } from 'vitest';
import { EntregasHora } from './models';
import { MAX_BARRAS, puntosDelGrafico } from './grafico';

const hora = (iso: string, n = 1): EntregasHora => ({ hora: iso, registradas: n, recibidas: n, despachadas: n, rechazadas: 0 });

describe('puntos del gráfico de reportería', () => {
  it('con pocas horas se grafica hora por hora', () => {
    const horas = [hora('2026-09-17T10:00:00Z'), hora('2026-09-17T11:00:00Z')];
    expect(puntosDelGrafico(horas)).toEqual(horas);
  });

  it('con más de MAX_BARRAS horas se agrupa por día local y se suman', () => {
    const horas = Array.from({ length: MAX_BARRAS + 24 }, (_, i) =>
      hora(new Date(new Date(2026, 8, 1, 0, 0).getTime() + i * 3600_000).toISOString(), 2));

    const puntos = puntosDelGrafico(horas);

    expect(puntos.length).toBe(3);
    expect(puntos[0].registradas).toBe(48);
    expect(puntos.reduce((s, p) => s + p.recibidas, 0)).toBe(2 * horas.length);
  });

  it('nunca devuelve más barras que MAX_BARRAS para 30 días', () => {
    const horas = Array.from({ length: 720 }, (_, i) => hora(new Date(Date.UTC(2026, 7, 1) + i * 3600_000).toISOString()));
    expect(puntosDelGrafico(horas).length).toBeLessThanOrEqual(MAX_BARRAS);
  });
});
