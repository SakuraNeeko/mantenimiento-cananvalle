'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { DataTableToolbar } from './toolbar';
import { DataTablePagination } from './pagination';
import type { ColumnFilter, Density, SortRule, TableResult } from './types';

export type DataTableProps<TData> = {
  /** Identificador del módulo: se usa para las vistas guardadas. */
  modulo: string;
  columns: ColumnDef<TData, unknown>[];
  data: TableResult<TData>;
  /** Estado actual, ya parseado en el Server Component padre. */
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
  /** Acciones primarias del encabezado (ej. "Nuevo activo"). */
  acciones?: React.ReactNode;
  /** Acciones masivas que aparecen al seleccionar filas. */
  accionesMasivas?: (seleccion: TData[]) => React.ReactNode;
  seleccionable?: boolean;
  onRowClick?: (row: TData) => void;
  vacio?: { titulo: string; descripcion: string; accion?: React.ReactNode };
  loading?: boolean;
};

/**
 * Tabla genérica reutilizable de toda la aplicación.
 *
 * El estado (página, orden, filtros, búsqueda) vive en la URL, de modo que
 * cualquier vista es enlazable y compartible, y el Server Component padre
 * puede leerlo con `parseTableQuery(searchParams)`.
 *
 * Paginación, orden y filtrado son SIEMPRE en servidor.
 */
export function DataTable<TData>({
  modulo,
  columns,
  data,
  sort,
  filters,
  search,
  acciones,
  accionesMasivas,
  seleccionable = false,
  onRowClick,
  vacio,
  loading = false,
}: DataTableProps<TData>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [density, setDensity] = React.useState<Density>('compacta');

  const push = React.useCallback(
    (mutar: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutar(params);
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const setSort = React.useCallback(
    (columnId: string, aditivo: boolean) => {
      push((params) => {
        const actual = [...sort];
        const idx = actual.findIndex((s) => s.id === columnId);
        if (idx === -1) {
          const nuevo = aditivo ? [...actual, { id: columnId, desc: false }] : [{ id: columnId, desc: false }];
          params.set('sort', JSON.stringify(nuevo));
        } else if (!actual[idx]!.desc) {
          const copia = aditivo ? [...actual] : [actual[idx]!];
          const j = copia.findIndex((s) => s.id === columnId);
          copia[j] = { id: columnId, desc: true };
          params.set('sort', JSON.stringify(copia));
        } else {
          const copia = actual.filter((s) => s.id !== columnId);
          if (copia.length === 0) params.delete('sort');
          else params.set('sort', JSON.stringify(copia));
        }
        params.delete('page');
      });
    },
    [push, sort],
  );

  const setPage = React.useCallback((page: number) => push((p) => p.set('page', String(page))), [push]);

  const setPageSize = React.useCallback(
    (size: number) =>
      push((p) => {
        p.set('pageSize', String(size));
        p.delete('page');
      }),
    [push],
  );

  const setSearch = React.useCallback(
    (valor: string) =>
      push((p) => {
        if (valor) p.set('search', valor);
        else p.delete('search');
        p.delete('page');
      }),
    [push],
  );

  const setFilters = React.useCallback(
    (nuevos: ColumnFilter[]) =>
      push((p) => {
        if (nuevos.length > 0) p.set('filters', JSON.stringify(nuevos));
        else p.delete('filters');
        p.delete('page');
      }),
    [push],
  );

  const columnasFinales = React.useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!seleccionable) return columns;
    const columnaSeleccion: ColumnDef<TData, unknown> = {
      id: '__select',
      size: 32,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(Boolean(v))}
          aria-label="Seleccionar todas las filas de la página"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(Boolean(v))}
          onClick={(e) => e.stopPropagation()}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
    };
    return [columnaSeleccion, ...columns];
  }, [columns, seleccionable]);

  const table = useReactTable({
    data: data.rows,
    columns: columnasFinales,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.max(1, Math.ceil(data.total / data.pageSize)),
    state: { rowSelection, columnVisibility },
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    enableRowSelection: seleccionable,
  });

  const seleccionadas = table.getSelectedRowModel().rows.map((r) => r.original);
  const ocupado = loading || isPending;

  return (
    <div className="flex h-full flex-col gap-2">
      <DataTableToolbar
        modulo={modulo}
        table={table}
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
        density={density}
        onDensityChange={setDensity}
        acciones={acciones}
        accionesMasivas={seleccionadas.length > 0 ? accionesMasivas?.(seleccionadas) : undefined}
        seleccionadas={seleccionadas.length}
      />

      <div className={cn('min-h-0 flex-1 overflow-auto rounded-[8px] border', `densidad-${density}`)}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((grupo) => (
              <TableRow key={grupo.id}>
                {grupo.headers.map((header) => {
                  const puedeOrdenar = header.column.getCanSort() && header.column.id !== '__select';
                  const regla = sort.find((s) => s.id === header.column.id);
                  const posicion = sort.findIndex((s) => s.id === header.column.id);
                  return (
                    <TableHead key={header.id} style={{ width: header.getSize() || undefined }}>
                      {header.isPlaceholder ? null : puedeOrdenar ? (
                        <button
                          type="button"
                          onClick={(e) => setSort(header.column.id, e.shiftKey)}
                          className="inline-flex items-center gap-1 rounded-[4px] px-1 py-0.5 hover:text-foreground"
                          title="Clic para ordenar · Mayús + clic para ordenar por varias columnas"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {regla ? (
                            <span className="inline-flex items-center gap-0.5">
                              {regla.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                              {sort.length > 1 ? <span className="text-2xs">{posicion + 1}</span> : null}
                            </span>
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {ocupado ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {table.getVisibleFlatColumns().map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={table.getVisibleFlatColumns().length}>
                  <EmptyState
                    icon={Inbox}
                    titulo={vacio?.titulo ?? 'No hay registros'}
                    descripcion={vacio?.descripcion ?? 'Cuando existan datos aparecerán en este listado.'}
                    accion={vacio?.accion}
                  />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
