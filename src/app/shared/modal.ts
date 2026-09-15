import { Component, HostListener, input, output } from '@angular/core';

/**
 * Ventana modal de historieta. El contenido va dentro; los botones, en un
 * elemento con el atributo `pie`. Se cierra con Escape o clic en el fondo.
 */
@Component({
  selector: 'app-modal',
  template: `
    <div class="modal-fondo" (click)="cerrar.emit()">
      <div class="modal" role="dialog" aria-modal="true" [attr.aria-label]="titulo()" (click)="$event.stopPropagation()">
        <div class="modal__cab">
          <div><h2>{{ titulo() }}</h2>@if (subtitulo()) { <p>{{ subtitulo() }}</p> }</div>
          <button type="button" class="btn btn--ghost btn--chico" aria-label="Cerrar" (click)="cerrar.emit()">✕</button>
        </div>
        <div class="modal__cuerpo"><ng-content /></div>
        <div class="modal__pie"><ng-content select="[pie]" /></div>
      </div>
    </div>
  `,
})
export class Modal {
  readonly titulo = input.required<string>();
  readonly subtitulo = input('');
  readonly cerrar = output<void>();

  @HostListener('document:keydown.escape')
  alEscape() {
    this.cerrar.emit();
  }
}
