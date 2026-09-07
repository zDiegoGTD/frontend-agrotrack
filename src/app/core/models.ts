export type Rol = 'ADMIN' | 'OPERADOR' | 'CLIENTE' | 'AUDITOR';

export type EstadoEntrega =
  | 'REGISTRADA'
  | 'RECIBIDA'
  | 'EN_CLASIFICACION'
  | 'EN_DESPACHO'
  | 'DESPACHADA'
  | 'RECHAZADA';

export interface Usuario {
  userId: string;
  nombre: string;
  email?: string;
  roles: Rol[];
}

export interface Entrega {
  id: number;
  codigo: string;
  productorId: string;
  productoId: number;
  bodegaId: number;
  cantidad: number;
  pesoRecibido: number | null;
  estado: EstadoEntrega;
  estadoEtiqueta: string;
  terminal: boolean;
  motivoRechazo: string | null;
  fechaRegistro: string;
  fechaRecepcion: string | null;
  fechaDespacho: string | null;
}

export interface Transiciones {
  actual: EstadoEntrega;
  permitidas: EstadoEntrega[];
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  tarifa: number;
  activo: boolean;
}

export interface Bodega {
  id: number;
  nombre: string;
  ubicacion: string | null;
  capacidadTotal: number;
  capacidadDisponible: number;
}

export interface EntregasHora {
  hora: string;
  registradas: number;
  recibidas: number;
  despachadas: number;
  rechazadas: number;
}

export interface Kpis {
  range: string;
  desde: string;
  hasta: string;
  entregasPorHora: EntregasHora[];
  tiempoCicloPromedioMin: number | null;
  entregasCerradas: number;
  estadosActivos: Record<string, number>;
  totalActivas: number;
}

export interface TopProducto {
  productoId: number;
  entregas: number;
  pesoTotal: number;
}

export interface EventoAuditoria {
  eventId: string;
  entregaCodigo: string;
  tipo: string;
  actorId: string | null;
  actorNombre: string | null;
  actorRol: string | null;
  ocurridoEn: string;
  recibidoEn: string;
  traceId: string | null;
  correlationId: string | null;
  source: string | null;
  data: Record<string, unknown>;
}

/** Error RFC 7807 que devuelven todos los servicios. */
export interface Problema {
  status: number;
  title: string;
  detail: string;
  campos?: Record<string, string>;
  motivo?: string;
}
