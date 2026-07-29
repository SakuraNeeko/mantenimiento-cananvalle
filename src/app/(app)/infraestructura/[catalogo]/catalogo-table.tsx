'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/data-table';
import type { ColumnFilter, ColumnMeta, SortRule, TableResult } from '@/components/data-table/types';
import { fmtDate } from '@/lib/datetime';
import { formatNumber } from '@/lib/utils';
import type { CampoDef, CatalogoDef } from '@/lib/catalogs/registry';
import { RegistroForm } from './registro-form';
import { ImportExportBar } from './import-export';
import { alternarActivo, eliminarRegistro } from './actions';

export type RegistroRow = Record<string, unknown> & { id: string };

function celda(campo: CampoDef, valor: unknown, opciones: Record<string, { value: string; label: string }[]>): React.ReactNode {
  if (valor === null || valor === undefined || valor === '') return <span className="text-muted-foreground">—</span>;

  switch (campo.tipo) {
    case 'booleano':
      return valor ? <Badge variant="success">Sí</Badge> : <Badge variant="neutral">No</Badge>;
    case 'fecha':
      return <span className="tabular text-xs">{fmtDate(String(valor))}</span>;
    case 'numero':
    case 'decimal':
      return <span className="tabular text-xs">{formatNumber(String(valor))}</span>;
    case 'enum':
      return campo.opciones?.find((o) => o.value === valor)?.label ?? String(valor);
    case 'referencia':
      return (opciones[campo.name] ?? []).find((o) => o.value === valor)?.label ?? <span className="text-muted-foreground">—</span>;
    default:
      return String(valor);
  }
}

function buildColumnas(
  def: CatalogoDef,
  opciones: Record<string, { value: string; label: string }[]>,
): ColumnDef<RegistroRow, unknown>[] {
  return def.campos.map((campo) => ({
    accessorKey: campo.name,
    header: campo.label,
    enableSorting: campo.tipo !== 'referencia',
    meta: {
      label: campo.label,
      tipo: campo.tipo === 'numero' || campo.tipo === 'decimal' ? 'numero' : campo.tipo === 'booleano' ? 'booleano' : campo.tipo === 'fecha' ? 'fecha' : 'texto',
      align: campo.tipo === 'numero' || campo.tipo === 'decimal' ? 'right' : 'left',
      ocultaPorDefecto: campo.tipo === 'textarea',
    } satisfies ColumnMeta,
    cell: ({ row }) => celda(campo, row.original[campo.name], opciones),
  }));
}

export function CatalogoTable({
  slug,
  def,
  data,
  sort,
  filters,
  search,
  opciones,
  puedeCrear,
  puedeEditar,
  puedeEliminar,
  puedeExportar,
  puedeImportar,
}: {
  slug: string;
  def: CatalogoDef;
  data: TableResult<RegistroRow>;
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
  opciones: Record<string, { value: string; label: string }[]>;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  puedeExportar: boolean;
  puedeImportar: boolean;
}) {
  const router = useRouter();
  const [dialogAbierto, setDialogAbierto] = React.useState(false);
  const [editando, setEditando] = React.useState<string | undefined>(undefined);
  const [procesando, setProcesando] = React.useState<string | null>(null);

  function abrirCreacion() {
    setEditando(undefined);
    setDialogAbierto(true);
  }

  function abrirEdicion(id: string) {
    setEditando(id);
    setDialogAbierto(true);
  }

  async function alternar(fila: RegistroRow) {
    const nuevoActivo = !fila.activo;
    setProcesando(fila.id);
    const resultado = await alternarActivo(slug, fila.id, nuevoActivo);
    setProcesando(null);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(nuevoActivo ? 'Registro activado.' : 'Registro desactivado.');
    router.refresh();
  }

  async function eliminar(fila: RegistroRow) {
    const nombre = String(fila.nombre ?? fila.codigo ?? '');
    if (!window.confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer desde la interfaz.`)) return;

    setProcesando(fila.id);
    const resultado = await eliminarRegistro(slug, fila.id);
    setProcesando(null);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Registro eliminado.');
    router.refresh();
  }

  const columnas = React.useMemo<ColumnDef<RegistroRow, unknown>[]>(() => {
    const base = buildColumnas(def, opciones);
    if (!puedeEditar && !puedeEliminar) return base;

    const columnaAcciones: ColumnDef<RegistroRow, unknown> = {
      id: '__acciones',
      header: '',
      size: 40,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const fila = row.original;
        const ocupado = procesando === fila.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={ocupado} onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {puedeEditar ? (
                <DropdownMenuItem onSelect={() => abrirEdicion(fila.id)}>
                  <Pencil aria-hidden />
                  Editar
                </DropdownMenuItem>
              ) : null}
              {puedeEditar ? (
                <DropdownMenuItem onSelect={() => alternar(fila)}>
                  {fila.activo ? <PowerOff aria-hidden /> : <Power aria-hidden />}
                  {fila.activo ? 'Desactivar' : 'Activar'}
                </DropdownMenuItem>
              ) : null}
              {puedeEliminar ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => eliminar(fila)} className="text-destructive focus:text-destructive">
                    <Trash2 aria-hidden />
                    Eliminar
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    };
    return [...base, columnaAcciones];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, opciones, puedeEditar, puedeEliminar, procesando]);

  return (
    <>
      <DataTable
        modulo={slug}
        columns={columnas}
        data={data}
        sort={sort}
        filters={filters}
        search={search}
        acciones={
          <>
            <ImportExportBar slug={slug} def={def} filtros={filters} search={search} puedeExportar={puedeExportar} puedeImportar={puedeImportar} />
            {puedeCrear ? (
              <Button size="sm" onClick={abrirCreacion}>
                <Plus aria-hidden />
                Nuevo
              </Button>
            ) : null}
          </>
        }
        vacio={{
          titulo: `Aún no hay ${def.titulo.toLowerCase()}`,
          descripcion: def.descripcion,
        }}
      />

      {puedeCrear || puedeEditar ? (
        <RegistroForm
          key={editando ?? 'nuevo'}
          open={dialogAbierto}
          onOpenChange={setDialogAbierto}
          slug={slug}
          registroId={editando}
          onGuardado={() => router.refresh()}
        />
      ) : null}
    </>
  );
}
