'use client';

import * as React from 'react';
import type { Table as TanstackTable } from '@tanstack/react-table';
import { Columns3, Download, Filter, Rows3, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ColumnFilter, ColumnMeta, Density } from './types';
import { OPERATOR_LABELS } from './types';

export function DataTableToolbar<TData>({
  modulo,
  table,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  density,
  onDensityChange,
  acciones,
  accionesMasivas,
  seleccionadas,
}: {
  modulo: string;
  table: TanstackTable<TData>;
  search: string;
  onSearchChange: (v: string) => void;
  filters: ColumnFilter[];
  onFiltersChange: (f: ColumnFilter[]) => void;
  density: Density;
  onDensityChange: (d: Density) => void;
  acciones?: React.ReactNode;
  accionesMasivas?: React.ReactNode;
  seleccionadas: number;
}) {
  const [borrador, setBorrador] = React.useState(search);

  React.useEffect(() => setBorrador(search), [search]);

  // Debounce de 350 ms: cada pulsación no puede disparar una consulta al servidor.
  React.useEffect(() => {
    if (borrador === search) return;
    const t = setTimeout(() => onSearchChange(borrador), 350);
    return () => clearTimeout(t);
  }, [borrador, search, onSearchChange]);

  const etiqueta = (id: string) => {
    const col = table.getColumn(id);
    const meta = col?.columnDef.meta as ColumnMeta | undefined;
    return meta?.label ?? id;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[14rem] flex-1">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          placeholder="Buscar…"
          className="pl-7"
          aria-label={`Buscar en ${modulo}`}
        />
        {borrador ? (
          <button
            type="button"
            onClick={() => setBorrador('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {filters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          {filters.map((f, i) => (
            <Badge key={`${f.id}-${i}`} variant="secondary" className="gap-1 py-1">
              <span className="font-medium">{etiqueta(f.id)}</span>
              <span className="text-muted-foreground">{OPERATOR_LABELS[f.operator]}</span>
              {f.value !== undefined && f.value !== null ? <span>{String(f.value)}</span> : null}
              <button
                type="button"
                onClick={() => onFiltersChange(filters.filter((_, j) => j !== i))}
                aria-label={`Quitar filtro de ${etiqueta(f.id)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={() => onFiltersChange([])}>
            Limpiar
          </Button>
        </div>
      ) : null}

      <div className="ml-auto flex items-center gap-1.5">
        {seleccionadas > 0 ? (
          <div className="flex items-center gap-1.5 rounded-[6px] border bg-accent/50 px-2 py-1">
            <span className="text-xs font-medium tabular">{seleccionadas} seleccionadas</span>
            {accionesMasivas}
          </div>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter aria-hidden />
              Filtros
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filtrar por columna</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllLeafColumns()
              .filter((c) => c.id !== '__select' && c.id !== '__acciones')
              .map((col) => (
                <DropdownMenuItem
                  key={col.id}
                  onSelect={() => onFiltersChange([...filters, { id: col.id, operator: 'contiene', value: '' }])}
                >
                  {etiqueta(col.id)}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3 aria-hidden />
              Columnas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllLeafColumns()
              .filter((c) => c.getCanHide() && c.id !== '__select')
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(Boolean(v))}
                >
                  {etiqueta(col.id)}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Densidad de la tabla">
              <Rows3 aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Densidad</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(['compacta', 'normal', 'comoda'] as const).map((d) => (
              <DropdownMenuCheckboxItem key={d} checked={density === d} onCheckedChange={() => onDensityChange(d)}>
                {d === 'comoda' ? 'Cómoda' : d.charAt(0).toUpperCase() + d.slice(1)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="icon" aria-label="Exportar" title="Exportar (Fase 2)" disabled>
          <Download aria-hidden />
        </Button>

        {acciones}
      </div>
    </div>
  );
}
