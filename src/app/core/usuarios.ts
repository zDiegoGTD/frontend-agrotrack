import { EstadoCuenta, PerfilProductor } from './models';

/**
 * Espejo del ciclo de vida de la cuenta (ms-agrotrack-users). La UI lo usa
 * para mostrar y habilitar botones; la verdad la tiene el backend.
 */
export const ETIQUETA_CUENTA: Record<EstadoCuenta, string> = {
  PENDIENTE: 'Pendiente',
  ACTIVO: 'Activa',
  RECHAZADO: 'Rechazada',
  INACTIVO: 'Desactivada',
};

/** Los mismos textos que el 403 del BFF. */
export const MENSAJE_CUENTA: Record<EstadoCuenta, string> = {
  PENDIENTE: 'Tu cuenta espera aprobación',
  ACTIVO: 'Tu cuenta está activa',
  RECHAZADO: 'Tu solicitud fue rechazada',
  INACTIVO: 'Tu cuenta fue desactivada',
};

/** Tabla de ms-agrotrack-users (MaquinaEstadosUsuario). */
export const SIGUIENTES_CUENTA: Record<EstadoCuenta, EstadoCuenta[]> = {
  PENDIENTE: ['ACTIVO', 'RECHAZADO'],
  ACTIVO: ['INACTIVO'],
  INACTIVO: ['ACTIVO'],
  RECHAZADO: ['ACTIVO'],
};

export interface AccionCuenta {
  destino: EstadoCuenta;
  texto: string;
  exigeMotivo: boolean;
  peligro: boolean;
}

const APROBAR: AccionCuenta = { destino: 'ACTIVO', texto: 'Aprobar', exigeMotivo: false, peligro: false };
const RECHAZAR: AccionCuenta = { destino: 'RECHAZADO', texto: 'Rechazar', exigeMotivo: true, peligro: true };
const DESACTIVAR: AccionCuenta = { destino: 'INACTIVO', texto: 'Desactivar', exigeMotivo: true, peligro: true };
const REACTIVAR: AccionCuenta = { destino: 'ACTIVO', texto: 'Reactivar', exigeMotivo: false, peligro: false };
const RECONSIDERAR: AccionCuenta = { destino: 'ACTIVO', texto: 'Reconsiderar', exigeMotivo: false, peligro: false };

/** Botones de cada fila. Mi propia cuenta activa no ofrece desactivarse: el backend daria 409. */
export function accionesPara(estado: EstadoCuenta, esUnoMismo: boolean): AccionCuenta[] {
  switch (estado) {
    case 'PENDIENTE':
      return [APROBAR, RECHAZAR];
    case 'ACTIVO':
      return esUnoMismo ? [] : [DESACTIVAR];
    case 'INACTIVO':
      return [REACTIVAR];
    case 'RECHAZADO':
      return [RECONSIDERAR];
  }
}

export type FichaForm = { rut: string; razonSocial: string; telefono: string; direccion: string; bodegaHabitualId: number | null };

export function fichaDesde(p: PerfilProductor | null): FichaForm {
  return {
    rut: p?.rut ?? '',
    razonSocial: p?.razonSocial ?? '',
    telefono: p?.telefono ?? '',
    direccion: p?.direccion ?? '',
    bodegaHabitualId: p?.bodegaHabitualId ?? null,
  };
}

/** El select entrega strings y los inputs espacios: se limpia aqui y no en cada pantalla. */
export function normalizarFicha(f: FichaForm): PerfilProductor {
  const texto = (v: string) => (v ?? '').trim() || null;
  return {
    rut: (f.rut ?? '').trim().toUpperCase(),
    razonSocial: (f.razonSocial ?? '').trim(),
    telefono: texto(f.telefono),
    direccion: texto(f.direccion),
    bodegaHabitualId: f.bodegaHabitualId ? Number(f.bodegaHabitualId) : null,
  };
}
