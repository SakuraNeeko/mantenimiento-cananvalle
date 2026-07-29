import type { CampoDef, CatalogoDef } from './registry';

/**
 * Traduce una fila cruda de SheetJS (claves = encabezado tal como viene en el
 * Excel) a un registro `{ campo.name: valor }` con el tipo que cada campo
 * espera, para que `buildCatalogoSchema` lo valide sin sorpresas.
 */
export function mapearFilaExcel(def: CatalogoDef, filaCruda: Record<string, unknown>): Record<string, unknown> {
  // Los encabezados del Excel son las `label` de cada campo (mismas que exporta `exportarFilas`).
  const porLabel = new Map(def.campos.map((c) => [c.label.trim().toLowerCase(), c]));
  const salida: Record<string, unknown> = {};

  for (const [encabezado, valor] of Object.entries(filaCruda)) {
    const campo = porLabel.get(encabezado.trim().toLowerCase());
    if (!campo) continue;
    salida[campo.name] = coaccionar(campo, valor);
  }

  return salida;
}

function coaccionar(campo: CampoDef, valor: unknown): unknown {
  if (valor === undefined || valor === null) return campo.tipo === 'booleano' ? false : '';

  switch (campo.tipo) {
    case 'booleano':
      if (typeof valor === 'boolean') return valor;
      return /^(s[ií]|true|1|x|yes)$/i.test(String(valor).trim());
    case 'fecha':
      if (valor instanceof Date) return valor.toISOString().slice(0, 10);
      return String(valor).trim();
    case 'numero':
      return typeof valor === 'number' ? valor : String(valor).trim();
    case 'decimal':
      return typeof valor === 'number' ? String(valor) : String(valor).trim();
    default:
      return String(valor).trim();
  }
}
