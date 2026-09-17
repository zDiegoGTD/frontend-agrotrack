import { describe, expect, it } from 'vitest';
import { pesoReal, productorCorto } from './deliveries';

describe('tabla de entregas', () => {
  it('un lote recibido sin peso escrito muestra lo declarado como recibido', () => {
    expect(pesoReal({ pesoRecibido: null, fechaRecepcion: '2026-09-16T23:33:29Z', cantidad: 50000 })).toBe(50000);
  });

  it('si se escribió el peso en romana, manda ese', () => {
    expect(pesoReal({ pesoRecibido: 48750, fechaRecepcion: '2026-09-16T23:33:29Z', cantidad: 50000 })).toBe(48750);
  });

  it('un lote aún no recibido no tiene peso real', () => {
    expect(pesoReal({ pesoRecibido: null, fechaRecepcion: null, cantidad: 50000 })).toBeNull();
  });

  it('acorta el oid de Azure y deja intactos los ids cortos', () => {
    expect(productorCorto('57096cda-1c10-46ad-a9ad-45d8d6d7cefe')).toBe('57096cda…');
    expect(productorCorto('prod-1')).toBe('prod-1');
  });
});
