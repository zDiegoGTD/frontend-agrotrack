import { DatePipe, JsonPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../core/api/api.service';
import { AuthService, leerClaims } from '../../core/auth/auth.service';
import { ROL_ETIQUETA } from '../../core/estados';
import { Rol } from '../../core/models';
import { PRUEBAS_ACCESO, PruebaAcceso, estadoEsperado, resumirToken } from '../../core/token';

type Resultado = { estado: number | null; cargando: boolean };

/**
 * /sesion: lo que trae el access token de Azure AD y como lo usa AgroTrack.
 * Hace visible lo que pide la pauta: los roles y scopes se leen de los
 * claims del token, y el backend acepta o rechaza segun ellos.
 */
@Component({
  selector: 'app-sesion',
  imports: [DatePipe, JsonPipe],
  template: `
    <div class="pagina-cab">
      <div><h1>Mi sesión</h1><p>Lo que dice tu token de {{ modoMsal ? 'Azure AD' : 'desarrollo' }} y cómo lo usa AgroTrack</p></div>
      <button class="btn btn--sec" (click)="cargar()">↻ Leer token de nuevo</button>
    </div>
    @if (error()) { <p class="alerta alerta--error">⚠️ {{ error() }}</p> }

    @if (resumen(); as t) {
      <div class="dos">
        <section class="panel">
          <div class="panel__cab"><div class="panel__titulo"><img src="img/logo-circulo.png" alt="" />
            <div><h2>Identidad</h2><p>Quién eres para el backend</p></div></div></div>
          <div class="panel__cuerpo datos">
            <span>Nombre</span><b>{{ t.nombre ?? '—' }}</b>
            <span>Usuario</span><b class="mono">{{ t.usuario ?? '—' }}</b>
            <span>oid</span><b class="mono corto" [title]="t.oid ?? ''">{{ t.oid ?? '—' }}</b>
            <span>Tenant</span><b class="mono corto" [title]="t.tenant ?? ''">{{ t.tenant ?? '—' }}</b>
          </div>
          <div class="panel__cuerpo">
            <p class="etiqueta">Roles <small>(claim <code>roles</code>)</small></p>
            <div class="chips">
              @for (r of t.roles; track r) { <span class="badge badge--despachada">{{ r }} · {{ etiquetaRol(r) }}</span> }
              @empty { <span class="alerta alerta--aviso">El token no trae roles: el backend negará todo lo que exija uno.</span> }
            </div>
            <p class="etiqueta">Scopes <small>(claim <code>scp</code>)</small></p>
            <div class="chips">
              @for (s of t.scopes; track s) { <span class="chip mono">{{ s }}</span> }
              @empty { <small>Sin scopes delegados{{ modoMsal ? '' : ' (el token de desarrollo no los trae)' }}.</small> }
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel__cab"><div class="panel__titulo"><img src="img/ico-checklist.png" alt="" />
            <div><h2>Validez</h2><p>Lo que se comprueba antes de dejarte pasar</p></div></div>
            <span class="pildora" [class.pildora--granero]="t.vencido" [class.pildora--sol]="!t.vencido && (t.minutosRestantes ?? 99) < 10">
              {{ t.vencido ? 'Vencido' : t.minutosRestantes === null ? 'Sin vencimiento' : 'Vence en ' + t.minutosRestantes + ' min' }}</span>
          </div>
          <div class="panel__cuerpo datos">
            <span>Emisor <code>iss</code></span><b class="mono corto" [title]="t.emisor ?? ''">{{ t.emisor ?? '—' }}</b>
            <span>Audiencia <code>aud</code></span><b class="mono corto" [title]="t.audiencia ?? ''">{{ t.audiencia ?? '—' }}</b>
            <span>Versión <code>ver</code></span><b class="mono">{{ t.version ?? '—' }}</b>
            <span>Emitido <code>iat</code></span><b class="mono">{{ t.emitido ? (t.emitido | date: 'dd/MM/yyyy HH:mm:ss') : '—' }}</b>
            <span>Vence <code>exp</code></span><b class="mono">{{ t.vence ? (t.vence | date: 'dd/MM/yyyy HH:mm:ss') : '—' }}</b>
          </div>
          <div class="panel__cuerpo">
            <ol class="cadena">
              <li><b>API Gateway</b> valida firma, emisor, audiencia y vencimiento. Sin token válido: <span class="pildora pildora--granero">401</span></li>
              <li><b>BFF</b> vuelve a validarlo y cruza tus roles con su matriz de rutas. Rol sin permiso: <span class="pildora pildora--granero">403</span></li>
              <li><b>Cada microservicio</b> lo valida otra vez y revisa el rol en el endpoint.</li>
            </ol>
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel__cab">
          <div class="panel__titulo"><img src="img/nav-auditoria.png" alt="" />
            <div><h2>Probar la autorización</h2><p>Llamadas reales al backend con tu token; lo esperado sale de la matriz del BFF</p></div></div>
          <button class="btn btn--sol" (click)="probarTodo()">Probar todo</button>
        </div>
        <div class="tabla-wrap">
          <table class="tabla">
            <thead><tr><th>Endpoint</th><th>Roles permitidos</th><th class="num">Esperado</th><th class="num">Respuesta</th><th></th></tr></thead>
            <tbody>
              @for (p of pruebas; track p.ruta) {
                <tr>
                  <td><b>{{ p.nombre }}</b><br /><small class="mono">GET {{ p.ruta }}</small></td>
                  <td><div class="chips">@for (r of p.roles; track r) { <span class="pildora">{{ r }}</span> }</div></td>
                  <td class="num"><span class="pildora" [class.pildora--granero]="esperado(p) === 403">{{ esperado(p) }}</span></td>
                  <td class="num">
                    @if (resultados()[p.ruta]; as res) {
                      @if (res.cargando) { <small>…</small> }
                      @else { <span class="pildora" [class.pildora--granero]="res.estado !== 200">{{ res.estado || 'sin respuesta' }}</span> }
                    } @else { <small>—</small> }
                  </td>
                  <td class="num">
                    @if (resultados()[p.ruta]?.estado; as est) {
                      <span [title]="est === esperado(p) ? 'Coincide con la matriz' : 'No coincide con lo esperado'">{{ est === esperado(p) ? '✅' : '⚠️' }}</span>
                    } @else { <button class="btn btn--chico" (click)="probar(p)">Probar</button> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <details class="card">
        <summary>Ver todos los claims del token</summary>
        <pre>{{ claims() | json }}</pre>
        <small>Se muestran los claims, no el token: el token completo nunca se imprime en pantalla.</small>
      </details>
    }
  `,
  styles: `
    .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; } @media (max-width: 1000px) { .dos { grid-template-columns: 1fr; } }
    .datos { display: grid; grid-template-columns: auto 1fr; gap: .45rem 1rem; align-items: baseline; }
    .datos span { font-family: var(--fuente-titulo); font-weight: 700; font-size: .8rem; color: var(--tierra-70); white-space: nowrap; }
    .datos b { font-size: .84rem; min-width: 0; }
    .corto { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    code { font-family: var(--fuente-mono); font-size: .72rem; background: var(--crema); border: 1px solid var(--tierra-30); border-radius: 5px; padding: 0 .25rem; }
    .etiqueta { margin: 0 0 .4rem; font-family: var(--fuente-titulo); font-weight: 800; font-size: .8rem; }
    .etiqueta + .chips { margin-bottom: .9rem; }
    .chips { display: flex; flex-wrap: wrap; gap: .35rem; }
    .cadena { margin: 0; padding-left: 1.2rem; display: grid; gap: .45rem; font-size: .85rem; }
    details summary { cursor: pointer; font-family: var(--fuente-titulo); font-weight: 800; }
    pre { background: var(--crema); border: 2px solid var(--tierra-15); border-radius: 10px; padding: .75rem; font-size: .74rem; overflow-x: auto; }
  `,
})
export class Sesion implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly modoMsal = environment.auth.mode === 'msal';
  readonly pruebas = PRUEBAS_ACCESO;
  readonly claims = signal<Record<string, unknown> | null>(null);
  readonly resultados = signal<Record<string, Resultado>>({});
  readonly error = signal('');

  readonly resumen = computed(() => {
    const c = this.claims();
    return c ? resumirToken(c) : null;
  });

  etiquetaRol = (r: string) => ROL_ETIQUETA[r.toUpperCase() as Rol] ?? r;
  esperado = (p: PruebaAcceso) => estadoEsperado(this.resumen()?.roles.map((r) => r.toUpperCase()) ?? [], p);

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.error.set('');
    const token = await this.auth.getToken();
    const claims = token ? leerClaims(token) : null;
    if (!claims) {
      this.error.set('No se pudo leer el access token de la sesión. Cierra sesión y vuelve a entrar.');
      return;
    }
    this.claims.set(claims);
    this.resultados.set({});
  }

  async probar(p: PruebaAcceso) {
    this.resultados.update((r) => ({ ...r, [p.ruta]: { estado: null, cargando: true } }));
    const estado = await this.api.probarAcceso(p.ruta);
    this.resultados.update((r) => ({ ...r, [p.ruta]: { estado, cargando: false } }));
  }

  async probarTodo() {
    // En serie y no en paralelo: son pocas y asi no tientan al limite de peticiones del BFF
    for (const p of this.pruebas) await this.probar(p);
  }
}
