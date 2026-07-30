import { describe, expect, it } from 'vitest';
import { KardexError, elegirLotesFEFO } from '@/app/(app)/almacen/kardex/kardex-engine';

describe('elegirLotesFEFO', () => {
  it('toma todo de un solo lote cuando alcanza', () => {
    const candidatos = [{ lote: 'L1', cantidad: 10 }, { lote: 'L2', cantidad: 5 }];
    expect(elegirLotesFEFO(candidatos, 8)).toEqual([{ lote: 'L1', cantidad: 8 }]);
  });

  it('reparte entre varios lotes en orden FEFO cuando ninguno alcanza solo', () => {
    const candidatos = [{ lote: 'L1', cantidad: 3 }, { lote: 'L2', cantidad: 4 }, { lote: 'L3', cantidad: 10 }];
    expect(elegirLotesFEFO(candidatos, 8)).toEqual([
      { lote: 'L1', cantidad: 3 },
      { lote: 'L2', cantidad: 4 },
      { lote: 'L3', cantidad: 1 },
    ]);
  });

  it('ignora lotes con saldo cero o negativo en la lista', () => {
    const candidatos = [{ lote: 'L1', cantidad: 0 }, { lote: 'L2', cantidad: 6 }];
    expect(elegirLotesFEFO(candidatos, 6)).toEqual([{ lote: 'L2', cantidad: 6 }]);
  });

  it('lanza KardexError si la suma de todos los lotes no alcanza', () => {
    const candidatos = [{ lote: 'L1', cantidad: 3 }, { lote: 'L2', cantidad: 4 }];
    expect(() => elegirLotesFEFO(candidatos, 10)).toThrow(KardexError);
    expect(() => elegirLotesFEFO(candidatos, 10)).toThrow(/faltan 3/);
  });

  it('sin candidatos y cantidad necesaria en 0 no lanza y devuelve vacío', () => {
    expect(elegirLotesFEFO([], 0)).toEqual([]);
  });
});
