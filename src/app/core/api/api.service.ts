import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Bodega,
  Entrega,
  EstadoEntrega,
  EventoAuditoria,
  Kpis,
  Problema,
  Producto,
  TopProducto,
  Transiciones,
  CuentaUsuario,
  EstadoCuenta,
  PerfilProductor,
  Yo,
} from '../models';

/** Todas las llamadas al BFF. Una sola clase: el BFF ya es un solo host. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ---- identidad ----
  /** Ademas de decir quien soy, registra la cuenta la primera vez (lo hace el BFF). */
  me(): Promise<Yo> {
    return this.get<Yo>('/api/me');
  }

  // ---- usuarios ----
  usuarios(estado?: EstadoCuenta): Promise<CuentaUsuario[]> {
    return this.get<CuentaUsuario[]>('/api/users', { estado });
  }

  cambiarEstadoCuenta(id: number, body: { estado: EstadoCuenta; motivo?: string | null }): Promise<CuentaUsuario> {
    return this.put<CuentaUsuario>(`/api/users/${id}/estado`, body);
  }

  miCuenta(): Promise<CuentaUsuario> {
    return this.get<CuentaUsuario>('/api/users/me');
  }

  guardarFicha(id: number, ficha: PerfilProductor): Promise<PerfilProductor> {
    return this.put<PerfilProductor>(`/api/users/${id}/perfil`, ficha);
  }

  // ---- entregas ----
  listarEntregas(f: { status?: string; from?: string; to?: string } = {}): Promise<Entrega[]> {
    return this.get<Entrega[]>('/api/deliveries', f);
  }

  obtenerEntrega(id: number): Promise<Entrega> {
    return this.get<Entrega>(`/api/deliveries/${id}`);
  }

  registrarEntrega(body: { productoId: number; bodegaId: number; cantidad: number }): Promise<Entrega> {
    return this.post<Entrega>('/api/deliveries', body);
  }

  cambiarEstado(id: number, body: { status: EstadoEntrega; pesoRecibido?: number | null; motivo?: string | null }): Promise<Entrega> {
    return this.put<Entrega>(`/api/deliveries/${id}/status`, body);
  }

  transiciones(id: number): Promise<Transiciones> {
    return this.get<Transiciones>(`/api/deliveries/${id}/transiciones`);
  }

  // ---- catalogo ----
  productos(soloActivos = true): Promise<Producto[]> {
    return this.get<Producto[]>('/api/catalog/productos', { soloActivos: String(soloActivos) });
  }

  crearProducto(p: Omit<Producto, 'id'>): Promise<Producto> {
    return this.post<Producto>('/api/catalog/productos', p);
  }

  actualizarProducto(id: number, p: Omit<Producto, 'id'>): Promise<Producto> {
    return this.put<Producto>(`/api/catalog/productos/${id}`, p);
  }

  bodegas(): Promise<Bodega[]> {
    return this.get<Bodega[]>('/api/catalog/bodegas');
  }

  crearBodega(b: { nombre: string; ubicacion: string; capacidadTotal: number }): Promise<Bodega> {
    return this.post<Bodega>('/api/catalog/bodegas', b);
  }

  actualizarBodega(id: number, b: { nombre: string; ubicacion: string; capacidadTotal: number }): Promise<Bodega> {
    return this.put<Bodega>(`/api/catalog/bodegas/${id}`, b);
  }

  // ---- reporteria ----
  kpis(range: string): Promise<Kpis> {
    return this.get<Kpis>('/api/report/kpis', { range });
  }

  topProductos(range: string): Promise<TopProducto[]> {
    return this.get<TopProducto[]>('/api/report/top-services', { range });
  }

  // ---- auditoria ----
  timeline(codigo: string): Promise<EventoAuditoria[]> {
    return this.get<EventoAuditoria[]>(`/api/audit/deliveries/${encodeURIComponent(codigo)}/timeline`);
  }

  eventos(f: { usuario?: string; desde?: string; hasta?: string; tipo?: string; limite?: string }): Promise<EventoAuditoria[]> {
    return this.get<EventoAuditoria[]>('/api/audit/events', f);
  }

  // ---- helpers ----
  private get<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, v);
    }
    return this.envolver(firstValueFrom(this.http.get<T>(this.base + path, { params: p })));
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.envolver(firstValueFrom(this.http.post<T>(this.base + path, body)));
  }

  private put<T>(path: string, body: unknown): Promise<T> {
    return this.envolver(firstValueFrom(this.http.put<T>(this.base + path, body)));
  }

  /** Convierte el HttpErrorResponse en el Problema RFC 7807 que mandan los servicios. */
  private async envolver<T>(p: Promise<T>): Promise<T> {
    try {
      return await p;
    } catch (e) {
      throw ApiService.aProblema(e);
    }
  }

  /** Solo el codigo HTTP: para /sesion, que muestra 200 o 403 sin tratar el 403 como error. */
  async probarAcceso(path: string): Promise<number> {
    try {
      return (await firstValueFrom(this.http.get(this.base + path, { observe: 'response', responseType: 'text' }))).status;
    } catch (e) {
      return e instanceof HttpErrorResponse ? e.status : 0;
    }
  }

  static aProblema(e: unknown): Problema {
    if (e instanceof HttpErrorResponse) {
      const cuerpo = e.error && typeof e.error === 'object' ? (e.error as Partial<Problema>) : {};
      const texto = typeof e.error === 'string' ? e.error : '';
      return {
        status: e.status,
        title: cuerpo.title ?? e.statusText ?? 'Error',
        detail: cuerpo.detail ?? mensajePorEstado(e.status, e.headers?.get('WWW-Authenticate') ?? '', texto),
        campos: cuerpo.campos,
        motivo: cuerpo.motivo,
        codigo: cuerpo.codigo,
      };
    }
    return { status: 0, title: 'Error', detail: String(e) };
  }
}

/**
 * Mensaje para cuando el backend no manda problem+json. Distingue las causas
 * de un 403: antes todo 403 decia "tu rol no permite", y un origen rechazado
 * por CORS parecia un problema de permisos.
 */
export function mensajePorEstado(status: number, wwwAuthenticate: string, cuerpoTexto: string): string {
  switch (status) {
    case 0:
      return 'No se pudo conectar con el servidor. Revisa tu conexión o si el sistema está encendido.';
    case 401:
      return 'Tu sesión venció o no es válida. Cierra sesión y vuelve a entrar.';
    case 403:
      if (wwwAuthenticate.includes('insufficient_scope')) return 'Tu rol no permite esta acción.';
      if (/cors/i.test(cuerpoTexto)) return 'El servidor rechazó el origen de esta página (CORS). Es un problema de configuración, no de tu rol.';
      return 'Acceso denegado para esta acción.';
    case 404:
      return 'No se encontró lo que buscas.';
    case 409:
      return 'La operación choca con el estado actual. Recarga e intenta de nuevo.';
    case 429:
      return 'Demasiadas solicitudes seguidas. Espera un minuto e intenta de nuevo.';
    case 502:
    case 503:
    case 504:
      return 'Un servicio no está disponible en este momento. Intenta en unos segundos.';
    default:
      return status >= 500 ? 'Error interno del servidor.' : `Error ${status}.`;
  }
}
