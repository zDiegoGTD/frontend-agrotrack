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
  Usuario,
} from '../models';

/** Todas las llamadas al BFF. Una sola clase: el BFF ya es un solo host. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ---- identidad ----
  me(): Promise<Usuario> {
    return this.get<Usuario>('/api/me');
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

  static aProblema(e: unknown): Problema {
    if (e instanceof HttpErrorResponse) {
      const cuerpo = e.error && typeof e.error === 'object' ? (e.error as Partial<Problema>) : {};
      return {
        status: e.status,
        title: cuerpo.title ?? e.statusText ?? 'Error',
        detail:
          cuerpo.detail ??
          (e.status === 0 ? 'No se pudo conectar con el servidor' : e.status === 401 ? 'Sesión vencida' : e.status === 403 ? 'Tu rol no permite esta acción' : e.message),
        campos: cuerpo.campos,
        motivo: cuerpo.motivo,
      };
    }
    return { status: 0, title: 'Error', detail: String(e) };
  }
}
