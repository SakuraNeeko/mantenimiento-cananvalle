'use client';

import * as React from 'react';
import type { Table as TanstackTable } from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Columns3, Download, Filter, Rows3, Search, X } from 'lucide-react';
import { aplicarFormatoHoja } from '@/lib/excel/hoja-con-formato';
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
  const [searchPrevio, setSearchPrevio] = React.useState(search);
  if (search !== searchPrevio) {
    setSearchPrevio(search);
    setBorrador(search);
  }

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

  /**
   * Exporta la página actual de la tabla (las filas ya cargadas) a Excel.
   * Antes este botón estaba deshabilitado en TODOS los módulos ("Fase 2",
   * pero nunca se implementó ahí ni en ninguna fase posterior — solo el
   * exportador propio de Infraestructura funcionaba). Exporta las filas
   * visibles de la página actual, no el listado completo del servidor:
   * para exportar más filas, sube el tamaño de página antes de exportar.
   *
   * Las fechas se escriben como fecha real de Excel (no como texto), para
   * que se puedan ordenar/filtrar como fecha en vez de alfabéticamente. Los
   * anchos de columna se calculan del contenido y se agrega autofiltro en
   * el encabezado — la edición community de `xlsx` no permite negrita ni
   * color de celda (eso exige la versión de paga), así que el margen de
   * mejora visual real se agota ahí.
   */
  function exportarPaginaActual() {
    const columnas = table.getAllLeafColumns().filter((c) => c.columnDef.meta);
    if (columnas.length === 0 || table.getRowModel().rows.length === 0) {
      toast.info('No hay filas para exportar.');
      return;
    }

    const headers = columnas.map((c) => (c.columnDef.meta as ColumnMeta).label);
    const filas = table.getRowModel().rows.map((row) =>
      columnas.map((col) => {
        const meta = col.columnDef.meta as ColumnMeta;
        const valor = row.getValue(col.id);
        if (valor === null || valor === undefined || valor === '') return '';
        if (meta.tipo === 'booleano') return valor ? 'Sí' : 'No';
        if (meta.tipo === 'enum') return meta.opciones?.find((o) => o.value === valor)?.label ?? String(valor);
        if (meta.tipo === 'fecha') {
          const fecha = valor instanceof Date ? valor : new Date(String(valor));
          return Number.isNaN(fecha.getTime()) ? String(valor) : fecha;
        }
        return typeof valor === 'number' ? valor : String(valor);
      }),
    );

    const hoja = XLSX.utils.aoa_to_sheet([headers, ...filas], { cellDates: true });
    const columnasFecha = columnas.map((col) => (col.columnDef.meta as ColumnMeta).tipo === 'fecha');
    aplicarFormatoHoja(hoja, headers, filas, columnasFecha);

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, modulo.slice(0, 31));
    XLSX.writeFile(libro, `${modulo}.xlsx`);
  }

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

        <Button variant="outline" size="icon" aria-label="Exportar a Excel" title="Exportar la página actual a Excel" onClick={exportarPaginaActual}>
          <Download aria-hidden />
        </Button>

        {acciones}
      </div>
    </div>
  );
}
