import type { CampoDefPublico } from '@/lib/catalogs/registry';

/**
 * El Excel de import/export siempre usa el texto legible en las columnas de
 * tipo 'referencia' y 'enum' (es lo que exporta `exportarFilas` y lo que
 * puede teclear un usuario) — nunca el id/código interno. Antes de validar
 * con Zod (que exige un UUID para 'referencia' y el código exacto para
 * 'enum') hay que resolver cada texto contra las opciones vigentes. Sin este
 * paso, cualquier fila con una de estas columnas rellena falla siempre la
 * validación.
 */
export function resolverReferencias(
  campos: Pick<CampoDefPublico, 'name' | 'tipo' | 'opciones'>[],
  opciones: Record<string, { value: string; label: string }[]>,
  fila: Record<string, unknown>,
): { valores: Record<string, unknown>; errores: string[] } {
  const valores = { ...fila };
  const errores: string[] = [];

  for (const campo of campos) {
    if (campo.tipo !== 'referencia' && campo.tipo !== 'enum') continue;
    const lista = campo.tipo === 'referencia' ? (opciones[campo.name] ?? []) : (campo.opciones ?? []);
    const texto = String(valores[campo.name] ?? '').trim();
    if (!texto) {
      valores[campo.name] = '';
      continue;
    }
    const match = lista.find((o) => o.label.trim().toLowerCase() === texto.toLowerCase() || o.value.trim().toLowerCase() === texto.toLowerCase());
    if (!match) {
      errores.push(`"${texto}" no es un valor válido.`);
      continue;
    }
    valores[campo.name] = match.value;
  }

  return { valores, errores };
}
