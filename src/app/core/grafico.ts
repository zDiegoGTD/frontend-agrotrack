import { EntregasHora } from './models';

/** Mas barras que esto no caben legibles en el grafico de reporteria. */
export const MAX_BARRAS = 48;

/**
 * Report entrega un punto por hora con movimiento. Para 7 o 30 dias eso son
 * cientos de horas: las barras se encimaban y el primer grupo quedaba fuera
 * del grafico. Pasado el limite se suma por dia (dia de Chile).
 */
export function puntosDelGrafico(horas: readonly EntregasHora[]): EntregasHora[] {
  if (horas.length <= MAX_BARRAS) return [...horas];

  const porDia = new Map<string, EntregasHora>();
  for (const h of horas) {
    const d = new Date(h.hora);
    const clave = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    const acumulado = porDia.get(clave) ?? { hora: clave, registradas: 0, recibidas: 0, despachadas: 0, rechazadas: 0 };
    acumulado.registradas += h.registradas;
    acumulado.recibidas += h.recibidas;
    acumulado.despachadas += h.despachadas;
    acumulado.rechazadas += h.rechazadas;
    porDia.set(clave, acumulado);
  }
  return [...porDia.values()].sort((a, b) => a.hora.localeCompare(b.hora));
}
