import { describe, expect, it } from 'vitest';
import { evaluarCondiciones, type CondicionesRegla } from '@/lib/automatizador/reglas';

describe('evaluarCondiciones', () => {
  it('sin reglas siempre dispara (disparador sin filtro)', () => {
    expect(evaluarCondiciones({ prioridad: 'BAJA' }, { operador: 'AND', reglas: [] })).toBe(true);
  });

  it('AND exige que todas las condiciones se cumplan', () => {
    const condiciones: CondicionesRegla = {
      operador: 'AND',
      reglas: [
        { campo: 'prioridad', operador: '=', valor: 'URGENTE' },
        { campo: 'criticidad', operador: '=', valor: 'A' },
      ],
    };
    expect(evaluarCondiciones({ prioridad: 'URGENTE', criticidad: 'A' }, condiciones)).toBe(true);
    expect(evaluarCondiciones({ prioridad: 'URGENTE', criticidad: 'B' }, condiciones)).toBe(false);
  });

  it('OR exige que al menos una condición se cumpla', () => {
    const condiciones: CondicionesRegla = {
      operador: 'OR',
      reglas: [
        { campo: 'prioridad', operador: '=', valor: 'URGENTE' },
        { campo: 'criticidad', operador: '=', valor: 'A' },
      ],
    };
    expect(evaluarCondiciones({ prioridad: 'BAJA', criticidad: 'A' }, condiciones)).toBe(true);
    expect(evaluarCondiciones({ prioridad: 'BAJA', criticidad: 'C' }, condiciones)).toBe(false);
  });

  it('compara numéricamente con > y <, como en "días de vencida" o "horas abierto"', () => {
    const condiciones: CondicionesRegla = { operador: 'AND', reglas: [{ campo: 'diasVencida', operador: '>', valor: '5' }] };
    expect(evaluarCondiciones({ diasVencida: 10 }, condiciones)).toBe(true);
    expect(evaluarCondiciones({ diasVencida: 3 }, condiciones)).toBe(false);
  });

  it('"contiene" no distingue mayúsculas/minúsculas', () => {
    const condiciones: CondicionesRegla = { operador: 'AND', reglas: [{ campo: 'tipo', operador: 'contiene', valor: 'programado' }] };
    expect(evaluarCondiciones({ tipo: 'NO_PROGRAMADO' }, condiciones)).toBe(true);
  });

  it('un campo ausente en la fila no cumple "="', () => {
    const condiciones: CondicionesRegla = { operador: 'AND', reglas: [{ campo: 'campoQueNoExiste', operador: '=', valor: 'x' }] };
    expect(evaluarCondiciones({ prioridad: 'ALTA' }, condiciones)).toBe(false);
  });
});
