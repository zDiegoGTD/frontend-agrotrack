import { Component, computed, input } from '@angular/core';
import { ETIQUETA, claseBadge } from '../core/estados';
import { EstadoEntrega } from '../core/models';

/** Insignia de estado de una entrega, con el color del semaforo de planta. */
@Component({
  selector: 'app-estado-badge',
  template: `<span [class]="clase()">{{ etiqueta() }}</span>`,
})
export class EstadoBadge {
  readonly estado = input.required<EstadoEntrega>();
  readonly clase = computed(() => claseBadge(this.estado()));
  readonly etiqueta = computed(() => ETIQUETA[this.estado()] ?? this.estado());
}
