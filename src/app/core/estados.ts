import { EstadoEntrega, Rol } from './models';

/**
 * Espejo de la maquina de estados del backend (docs/01-maquina-de-estados.md).
 * La UI la usa solo para mostrar bien (etiquetas, colores, orden); la
 * verdad la tiene ms-agrotrack-deliveries, que expone /transiciones.
 */
export const ESTADOS: EstadoEntrega[] = [
  'REGISTRADA',
  'RECIBIDA',
  'EN_CLASIFICACION',
  'EN_DESPACHO',
  'DESPACHADA',
  'RECHAZADA',
];

export const ETIQUETA: Record<EstadoEntrega, string> = {
  REGISTRADA: 'Registrada',
  RECIBIDA: 'Recibida',
  EN_CLASIFICACION: 'En clasificación',
  EN_DESPACHO: 'En despacho',
  DESPACHADA: 'Despachada',
  RECHAZADA: 'Rechazada',
};

/** Verbo del boton que lleva a cada estado. */
export const ACCION: Record<EstadoEntrega, string> = {
  REGISTRADA: 'Registrar',
  RECIBIDA: 'Recibir',
  EN_CLASIFICACION: 'Pasar a clasificación',
  EN_DESPACHO: 'Pasar a despacho',
  DESPACHADA: 'Despachar',
  RECHAZADA: 'Rechazar',
};

export const TERMINALES: EstadoEntrega[] = ['DESPACHADA', 'RECHAZADA'];

/** Tabla T2..T8 del enunciado. Solo para habilitar botones antes de consultar al backend. */
export const SIGUIENTES: Record<EstadoEntrega, EstadoEntrega[]> = {
  REGISTRADA: ['RECIBIDA', 'RECHAZADA'],
  RECIBIDA: ['EN_CLASIFICACION', 'RECHAZADA'],
  EN_CLASIFICACION: ['EN_DESPACHO', 'RECHAZADA'],
  EN_DESPACHO: ['DESPACHADA'],
  DESPACHADA: [],
  RECHAZADA: [],
};

export const ROLES_QUE_TRANSICIONAN: Rol[] = ['ADMIN', 'OPERADOR'];

export function puedeTransicionar(roles: Rol[]): boolean {
  return roles.some((r) => ROLES_QUE_TRANSICIONAN.includes(r));
}

export function claseBadge(estado: EstadoEntrega): string {
  return `badge badge--${estado.toLowerCase()}`;
}

export const ROL_ETIQUETA: Record<Rol, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Jefe de acopio',
  CLIENTE: 'Productor',
  AUDITOR: 'Auditor',
};
