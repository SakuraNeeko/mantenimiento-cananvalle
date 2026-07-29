import { describe, expect, it } from 'vitest';
import { applyMask } from '@/lib/sequences';

describe('applyMask', () => {
  it('rellena el contador con ceros según la cantidad de almohadillas', () => {
    expect(applyMask('OT-{YYYY}-{######}', 451, 2026)).toBe('OT-2026-000451');
  });

  it('admite año corto', () => {
    expect(applyMask('SS-{YY}-{####}', 7, 2026)).toBe('SS-26-0007');
  });

  it('no trunca cuando el valor excede la máscara', () => {
    expect(applyMask('PA-{###}', 12345, 2026)).toBe('PA-12345');
  });

  it('funciona sin marcador de año', () => {
    expect(applyMask('KX-{#####}', 42, 2026)).toBe('KX-00042');
  });
});
