import { and, asc, desc, eq, gt, ilike, inArray, isNotNull, isNull, lt, ne, not, or, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { ColumnFilter, SortRule, TableQuery } from '@/components/data-table/types';

export type ColumnMap = Record<string, PgColumn>;

/**
 * Traduce los filtros de la tabla genérica a predicados Drizzle.
 *
 * Todas las consultas van parametrizadas: NUNCA se concatena SQL (§8).
 * Las columnas se resuelven contra un mapa explícito, así que un `id` de
 * filtro manipulado desde el cliente no puede alcanzar una columna arbitraria.
 */
export function buildWhere(
  columns: ColumnMap,
  filters: ColumnFilter[],
  search: string,
  searchableColumns: string[] = [],
): SQL | undefined {
  const predicados: (SQL | undefined)[] = [];

  for (const filtro of filters) {
    const col = columns[filtro.id];
    if (!col) continue; // columna desconocida → se ignora en silencio
    predicados.push(buildPredicate(col, filtro));
  }

  if (search && searchableColumns.length > 0) {
    const patrones = searchableColumns
      .map((id) => columns[id])
      .filter((c): c is PgColumn => Boolean(c))
      .map((c) => ilike(c, `%${search}%`));
    if (patrones.length > 0) predicados.push(or(...patrones));
  }

  const limpios = predicados.filter((p): p is SQL => p !== undefined);
  return limpios.length > 0 ? and(...limpios) : undefined;
}

function buildPredicate(col: PgColumn, filtro: ColumnFilter): SQL | undefined {
  const v = filtro.value;

  switch (filtro.operator) {
    case 'contiene':
      return typeof v === 'string' ? ilike(col, `%${v}%`) : undefined;
    case 'noContiene':
      return typeof v === 'string' ? not(ilike(col, `%${v}%`)) : undefined;
    case 'empiezaCon':
      return typeof v === 'string' ? ilike(col, `${v}%`) : undefined;
    case 'terminaCon':
      return typeof v === 'string' ? ilike(col, `%${v}`) : undefined;
    case 'igual':
      return v === null || v === undefined ? undefined : eq(col, v);
    case 'distinto':
      return v === null || v === undefined ? undefined : ne(col, v);
    case 'mayor':
      return v === null || v === undefined ? undefined : gt(col, v);
    case 'menor':
      return v === null || v === undefined ? undefined : lt(col, v);
    case 'entre':
      if (v === null || v === undefined || filtro.value2 === undefined) return undefined;
      return and(gt(col, v), lt(col, filtro.value2));
    case 'vacio':
      return isNull(col);
    case 'noVacio':
      return isNotNull(col);
    case 'en':
      return Array.isArray(v) && v.length > 0 ? inArray(col, v) : undefined;
    default:
      return undefined;
  }
}

/** Orden multi-columna. Si no llega ninguno, se aplica el orden por defecto. */
export function buildOrderBy(columns: ColumnMap, sort: SortRule[], fallback?: PgColumn): SQL[] {
  const orden = sort
    .map((s) => {
      const col = columns[s.id];
      if (!col) return undefined;
      return s.desc ? desc(col) : asc(col);
    })
    .filter((s): s is SQL => s !== undefined);

  if (orden.length > 0) return orden;
  return fallback ? [asc(fallback)] : [];
}

export function buildLimitOffset(query: TableQuery): { limit: number; offset: number } {
  return {
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  };
}
