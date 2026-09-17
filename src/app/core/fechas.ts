/**
 * Un input type="date" entrega el dia como lo ve el usuario ("2026-09-17",
 * hora de Chile). Pegarle "T00:00:00Z" lo interpreta en UTC y corre el rango
 * 3 o 4 horas: entregas de la noche quedaban fuera o se colaban del dia
 * anterior. Aqui se arma la hora local y se convierte a UTC para el backend.
 */
export function inicioDelDiaLocal(fecha: string): string | undefined {
  return fecha ? new Date(`${fecha}T00:00:00`).toISOString() : undefined;
}

export function finDelDiaLocal(fecha: string): string | undefined {
  return fecha ? new Date(`${fecha}T23:59:59.999`).toISOString() : undefined;
}
