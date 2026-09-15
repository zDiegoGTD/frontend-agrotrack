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

/** Que significa cada estado en la planta. Se muestra al elegir la siguiente etapa. */
export const DESCRIPCION: Record<EstadoEntrega, string> = {
  REGISTRADA: 'Declarada por el productor; espera llegar a la bodega.',
  RECIBIDA: 'Ingresó a bodega y pesada: descuenta capacidad.',
  EN_CLASIFICACION: 'Control de calidad y calibre del lote.',
  EN_DESPACHO: 'Asignada a un camión de salida.',
  DESPACHADA: 'Salió de la planta con su guía de despacho.',
  RECHAZADA: 'No apta. Si ocupaba bodega, se devuelve la capacidad.',
};

/** El flujo feliz, en orden. RECHAZADA queda fuera: es una salida, no una etapa. */
export const ETAPAS: EstadoEntrega[] = ['REGISTRADA', 'RECIBIDA', 'EN_CLASIFICACION', 'EN_DESPACHO', 'DESPACHADA'];

export function contarPorEstado(entregas: readonly { estado: EstadoEntrega }[]): Record<EstadoEntrega, number> {
  const conteo = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<EstadoEntrega, number>;
  for (const e of entregas) conteo[e.estado]++;
  return conteo;
}

/** Tipo de evento de Kafka -> estado al que lleva, para colorear la auditoria. */
export const ESTADO_DE_EVENTO: Record<string, EstadoEntrega> = {
  'delivery.registered': 'REGISTRADA',
  'delivery.received': 'RECIBIDA',
  'delivery.classifying': 'EN_CLASIFICACION',
  'delivery.dispatching': 'EN_DESPACHO',
  'delivery.dispatched': 'DESPACHADA',
  'delivery.rejected': 'RECHAZADA',
};

export type NivelCapacidad = 'normal' | 'alerta' | 'critico';

/** Semaforo de una bodega: critico con 15 % libre o menos, alerta con 30 % o menos. */
export function nivelCapacidad(total: number, disponible: number): { usado: number; nivel: NivelCapacidad } {
  const usado = total > 0 ? Math.min(100, Math.max(0, Math.round(((total - disponible) / total) * 100))) : 0;
  const libre = 100 - usado;
  return { usado, nivel: libre <= 15 ? 'critico' : libre <= 30 ? 'alerta' : 'normal' };
}

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
