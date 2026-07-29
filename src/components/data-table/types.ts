import { z } from 'zod';

/** Operadores soportados por el filtro por columna. */
export const FILTER_OPERATORS = [
  'contiene',
  'noContiene',
  'igual',
  'distinto',
  'empiezaCon',
  'terminaCon',
  'mayor',
  'menor',
  'entre',
  'vacio',
  'noVacio',
  'en',
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contiene: 'contiene',
  noContiene: 'no contiene',
  igual: 'es igual a',
  distinto: 'es distinto de',
  empiezaCon: 'empieza con',
  terminaCon: 'termina con',
  mayor: 'mayor que',
  menor: 'menor que',
  entre: 'entre',
  vacio: 'está vacío',
  noVacio: 'no está vacío',
  en: 'es uno de',
};

export const columnFilterSchema = z.object({
  id: z.string(),
  operator: z.enum(FILTER_OPERATORS),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]).optional(),
  value2: z.union([z.string(), z.number()]).optional(),
});

export type ColumnFilter = z.infer<typeof columnFilterSchema>;

export const sortSchema = z.object({ id: z.string(), desc: z.boolean() });
export type SortRule = z.infer<typeof sortSchema>;

/**
 * Parámetros que viajan del cliente al servidor.
 * La paginación es SIEMPRE en servidor (§9): jamás se traen listados completos.
 */
export const tableQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
  sort: z.array(sortSchema).default([]),
  filters: z.array(columnFilterSchema).default([]),
  search: z.string().trim().max(200).default(''),
});

export type TableQuery = z.infer<typeof tableQuerySchema>;

export type TableResult<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type Density = 'compacta' | 'normal' | 'comoda';

/** Definición declarativa de columna: la pantalla genérica de catálogos la consume. */
export type ColumnMeta = {
  label: string;
  /** Tipo lógico: condiciona los operadores de filtro ofrecidos. */
  tipo?: 'texto' | 'numero' | 'fecha' | 'booleano' | 'enum' | 'moneda';
  /** Alineación; los números y las monedas van a la derecha. */
  align?: 'left' | 'right' | 'center';
  /** Oculta la columna por defecto pero la deja disponible en el selector. */
  ocultaPorDefecto?: boolean;
  /** Opciones para tipo enum. */
  opciones?: { value: string; label: string }[];
  /** Excluir de la exportación. */
  noExportar?: boolean;
};

export function parseTableQuery(searchParams: Record<string, string | string[] | undefined>): TableQuery {
  const safeJson = <T,>(raw: string | undefined, fallback: T): T => {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  return tableQuerySchema.parse({
    page: first(searchParams.page) ?? 1,
    pageSize: first(searchParams.pageSize) ?? 50,
    sort: safeJson(first(searchParams.sort), []),
    filters: safeJson(first(searchParams.filters), []),
    search: first(searchParams.search) ?? '',
  });
}
