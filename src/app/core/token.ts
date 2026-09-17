import { Rol } from './models';

/**
 * Lectura de los claims del access token para mostrarlos en /sesion. Solo
 * se muestran: quien valida el token (firma, emisor, audiencia, vencimiento)
 * es el API Gateway y despues el BFF, nunca el navegador.
 */
export interface ResumenToken {
  nombre: string | null;
  usuario: string | null;
  oid: string | null;
  tenant: string | null;
  emisor: string | null;
  audiencia: string | null;
  version: string | null;
  roles: string[];
  scopes: string[];
  emitido: Date | null;
  vence: Date | null;
  minutosRestantes: number | null;
  vencido: boolean;
}

const texto = (v: unknown) => (typeof v === 'string' && v ? v : null);
const fecha = (v: unknown) => (typeof v === 'number' ? new Date(v * 1000) : null);

export function resumirToken(c: Record<string, unknown>, ahora = Date.now()): ResumenToken {
  const vence = fecha(c['exp']);
  const aud = c['aud'];
  return {
    nombre: texto(c['name']),
    usuario: texto(c['preferred_username']) ?? texto(c['upn']) ?? texto(c['email']),
    oid: texto(c['oid']) ?? texto(c['sub']),
    tenant: texto(c['tid']),
    emisor: texto(c['iss']),
    audiencia: Array.isArray(aud) ? aud.join(', ') : texto(aud),
    version: texto(c['ver']),
    roles: Array.isArray(c['roles']) ? (c['roles'] as unknown[]).map(String) : [],
    // Azure entrega los scopes delegados como un solo string separado por espacios
    scopes: typeof c['scp'] === 'string' ? c['scp'].split(' ').filter(Boolean) : [],
    emitido: fecha(c['iat']),
    vence,
    minutosRestantes: vence ? Math.max(0, Math.floor((vence.getTime() - ahora) / 60000)) : null,
    vencido: vence ? vence.getTime() <= ahora : false,
  };
}

export interface PruebaAcceso {
  nombre: string;
  ruta: string;
  roles: Rol[];
}

const TODOS: Rol[] = ['ADMIN', 'OPERADOR', 'CLIENTE', 'AUDITOR'];

/** Una lectura por cada fila de la matriz del BFF (SecurityConfig). */
export const PRUEBAS_ACCESO: PruebaAcceso[] = [
  { nombre: 'Quién soy', ruta: '/api/me', roles: TODOS },
  { nombre: 'Listar entregas', ruta: '/api/deliveries', roles: TODOS },
  { nombre: 'Ver bodegas', ruta: '/api/catalog/bodegas', roles: TODOS },
  { nombre: 'KPIs de reportería', ruta: '/api/report/kpis?range=last24h', roles: ['ADMIN'] },
  { nombre: 'Eventos de auditoría', ruta: '/api/audit/events?limite=1', roles: ['ADMIN', 'AUDITOR'] },
  { nombre: 'Topología de RabbitMQ', ruta: '/api/mq/topology', roles: ['ADMIN', 'OPERADOR'] },
];

/** Lo que deberia responder el backend para estos roles: 200 si alguno calza, 403 si no. */
export function estadoEsperado(roles: readonly string[], prueba: PruebaAcceso): 200 | 403 {
  return prueba.roles.some((r) => roles.includes(r)) ? 200 : 403;
}
