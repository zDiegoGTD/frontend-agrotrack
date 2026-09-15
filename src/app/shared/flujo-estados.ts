import { Component, input, output } from '@angular/core';
import { DESCRIPCION, ETAPAS, ETIQUETA } from '../core/estados';
import { EstadoEntrega } from '../core/models';

/**
 * La maquina de estados como tablero: una casilla por etapa con su conteo.
 * Hacer clic filtra; volver a hacer clic (o "Ver todos") quita el filtro.
 */
@Component({
  selector: 'app-flujo-estados',
  template: `
    <section class="panel">
      <div class="panel__cab">
        <div class="panel__titulo">
          <img src="img/nav-entregas.png" alt="" />
          <div><h2>Flujo de lotes</h2><p>Haz clic en una etapa para filtrar la tabla</p></div>
        </div>
        <div class="acciones">
          <button type="button" class="btn btn--chico" [class.btn--primario]="!seleccionado()" (click)="elegir.emit('')">Ver todos ({{ total() }})</button>
          <button type="button" class="btn btn--chico" [class.btn--peligro]="seleccionado() === 'RECHAZADA'" (click)="alternar('RECHAZADA')">
            <span class="punto"></span> Rechazados ({{ conteo()['RECHAZADA'] }})
          </button>
        </div>
      </div>
      <div class="etapas">
        @for (e of etapas; track e; let i = $index) {
          <button type="button" class="etapa" [class.etapa--activa]="seleccionado() === e" (click)="alternar(e)">
            <span class="etapa__cab"><span class="mono num">0{{ i + 1 }}</span><span class="cuenta">{{ conteo()[e] }}</span></span>
            <span class="etapa__nombre">{{ etiquetas[e] }}</span>
            <span class="etapa__desc">{{ descripciones[e] }}</span>
          </button>
        }
      </div>
    </section>
  `,
  styles: `
    .acciones { display: flex; gap: .5rem; flex-wrap: wrap; }
    .punto { width: 8px; height: 8px; border-radius: 50%; background: var(--granero); border: 1px solid var(--tierra); }
    .etapas { display: grid; grid-template-columns: repeat(5, 1fr); gap: .75rem; padding: 1.1rem 1.35rem; }
    @media (max-width: 900px) { .etapas { grid-template-columns: repeat(2, 1fr); } }
    .etapa { font: inherit; text-align: left; cursor: pointer; color: var(--tierra); padding: .8rem .9rem; border-radius: 16px;
      border: 2px solid var(--tierra-30); background: rgba(255, 248, 231, .5); transition: transform .12s, box-shadow .12s; display: flex; flex-direction: column; gap: .25rem; min-width: 0; }
    .etapa:hover { border-color: var(--tierra); }
    .etapa--activa { background: var(--pasto); border-color: var(--tierra); box-shadow: var(--sombra); transform: translateY(-3px); }
    .etapa__cab { display: flex; justify-content: space-between; align-items: center; }
    .num { font-size: .72rem; font-weight: 800; color: var(--tierra-50); }
    .cuenta { font-family: var(--fuente-titulo); font-size: 1.45rem; font-weight: 800; line-height: 1; }
    .etapa__nombre { font-family: var(--fuente-titulo); font-weight: 800; font-size: .85rem; }
    .etapa__desc { font-size: .72rem; font-weight: 600; color: var(--tierra-70); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `,
})
export class FlujoEstados {
  readonly conteo = input.required<Record<EstadoEntrega, number>>();
  readonly seleccionado = input<EstadoEntrega | ''>('');
  readonly elegir = output<EstadoEntrega | ''>();

  readonly etapas = ETAPAS;
  readonly etiquetas = ETIQUETA;
  readonly descripciones = DESCRIPCION;

  total = () => Object.values(this.conteo()).reduce((a, b) => a + b, 0);

  alternar(e: EstadoEntrega) {
    this.elegir.emit(this.seleccionado() === e ? '' : e);
  }
}
