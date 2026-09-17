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
  /** Codigo de negocio cuando el backend lo manda, p. ej. CUENTA_PENDIENTE. */
  codigo?: string;
}

/** Estado de la cuenta en ms-agrotrack-users. Solo ACTIVO usa el sistema. */
export type EstadoCuenta = 'PENDIENTE' | 'ACTIVO' | 'RECHAZADO' | 'INACTIVO';

/** Respuesta de /api/me: identidad del token + estado de la cuenta. */
export interface Yo extends Usuario {
  usuarioId: number | null;
  estado: EstadoCuenta;
  motivo: string | null;
  primerIngreso: string | null;
}

export interface PerfilProductor {
  rut: string;
  razonSocial: string;
  telefono: string | null;
  direccion: string | null;
  bodegaHabitualId: number | null;
}

export interface CuentaUsuario {
  id: number;
  azureOid: string;
  email: string | null;
  nombre: string | null;
  estado: EstadoCuenta;
  /** Informativo: el rol con el que entro la ultima vez. */
  rolUltimoToken: Rol | null;
  motivo: string | null;
  primerIngreso: string;
  ultimoIngreso: string;
  aprobadoPor: string | null;
  aprobadoEn: string | null;
  perfil: PerfilProductor | null;
}
