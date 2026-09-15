import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { nivelCapacidad } from '../core/estados';

const TEXTO_NIVEL = { normal: 'Normal', alerta: 'Alerta (<30%)', critico: 'Crítico (<15%)' } as const;

/** Barra de ocupacion de una bodega: verde, amarilla o roja segun lo que queda libre. */
@Component({
  selector: 'app-barra-capacidad',
  imports: [DecimalPipe],
  template: `
    @if (detalles()) {
      <div class="fila">
        <b>{{ estado().usado }}% ocupado</b>
        <span class="der">
          <span class="pildora" [class.pildora--sol]="estado().nivel === 'alerta'" [class.pildora--granero]="estado().nivel === 'critico'">{{ textoNivel() }}</span>
          <span class="mono cifras">{{ disponible() | number: '1.0-0' }} / {{ total() | number: '1.0-0' }} {{ unidad() }}</span>
        </span>
      </div>
    }
    <div class="barra" [class.barra--compacta]="compacta()" role="progressbar"
      [attr.aria-valuenow]="estado().usado" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="'Ocupación ' + estado().usado + '%'">
      <div class="barra__uso" [class]="'barra__uso barra__uso--' + estado().nivel" [style.width.%]="estado().usado"></div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .fila { display: flex; justify-content: space-between; align-items: center; gap: .5rem; font-family: var(--fuente-titulo); font-size: .82rem; margin-bottom: .35rem; flex-wrap: wrap; }
    .der { display: flex; align-items: center; gap: .5rem; }
    .cifras { font-size: .72rem; color: var(--tierra-70); }
    .barra { height: 14px; background: #fff; border: var(--trazo-fino); border-radius: 999px; box-shadow: var(--sombra-sm); overflow: hidden; }
    .barra--compacta { height: 10px; }
    .barra__uso { height: 100%; border-right: 1px solid var(--tierra); transition: width .5s; }
    .barra__uso--normal { background: var(--pasto); }
    .barra__uso--alerta { background: var(--sol); }
    .barra__uso--critico { background: var(--granero); }
    .pildora--granero { animation: latido 1.6s infinite; }
  `,
})
export class BarraCapacidad {
  readonly total = input.required<number>();
  readonly disponible = input.required<number>();
  readonly unidad = input('kg');
  readonly compacta = input(false);
  readonly detalles = input(true);

  readonly estado = computed(() => nivelCapacidad(this.total(), this.disponible()));
  readonly textoNivel = computed(() => TEXTO_NIVEL[this.estado().nivel]);
}
