'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { LogOut, MoreHorizontal, Pencil, Power, PowerOff, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/data-table';
import type { ColumnFilter, SortRule, TableResult } from '@/components/data-table/types';
import { usuarioColumns, type UsuarioRow } from './columns';
import { UsuarioForm } from './usuario-form';
import { cambiarEstadoUsuario, eliminarUsuario } from './actions';

type RolOpcion = { id: string; codigo: string; nombre: string };
type SedeOpcion = { id: string; nombre: string };

export function UsuariosTable({
  data,
  sort,
  filters,
  search,
  roles,
  sites,
  puedeGestionar,
}: {
  data: TableResult<UsuarioRow>;
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
  roles: RolOpcion[];
  sites: SedeOpcion[];
  puedeGestionar: boolean;
}) {
  const router = useRouter();
  const [dialogAbierto, setDialogAbierto] = React.useState(false);
  const [usuarioEditando, setUsuarioEditando] = React.useState<string | undefined>(undefined);
  const [procesando, setProcesando] = React.useState<string | null>(null);

  function abrirCreacion() {
    setUsuarioEditando(undefined);
    setDialogAbierto(true);
  }

  function abrirEdicion(id: string) {
    setUsuarioEditando(id);
    setDialogAbierto(true);
  }

  async function alternarEstado(fila: UsuarioRow) {
    const activar = !fila.activo;
    if (!activar && !window.confirm(`¿Desactivar a ${fila.nombre}? Perderá acceso de inmediato.`)) return;

    setProcesando(fila.id);
    const resultado = await cambiarEstadoUsuario(fila.id, activar);
    setProcesando(null);

    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(activar ? 'Usuario activado.' : 'Usuario desactivado.');
    router.refresh();
  }

  async function cerrarSesiones(fila: UsuarioRow) {
    if (!window.confirm(`¿Cerrar la sesión de ${fila.nombre} en todos los dispositivos?`)) return;

    setProcesando(fila.id);
    try {
      const res = await fetch(`/api/usuarios/${fila.id}/invalidar-sesiones`, { method: 'POST' });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error ?? 'No se pudo cerrar la sesión.');
      toast.success('Sesiones cerradas.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.');
    } finally {
      setProcesando(null);
    }
  }

  async function eliminar(fila: UsuarioRow) {
    if (!window.confirm(`¿Eliminar a ${fila.nombre}? Esta acción no se puede deshacer desde la interfaz.`)) return;

    setProcesando(fila.id);
    const resultado = await eliminarUsuario(fila.id);
    setProcesando(null);

    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Usuario eliminado.');
    router.refresh();
  }

  const columnas = React.useMemo<ColumnDef<UsuarioRow, unknown>[]>(() => {
    if (!puedeGestionar) return usuarioColumns;

    const columnaAcciones: ColumnDef<UsuarioRow, unknown> = {
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
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={ocupado}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Acciones para ${fila.nombre}`}
              >
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onSelect={() => abrirEdicion(fila.id)}>
                <Pencil aria-hidden />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => alternarEstado(fila)}>
                {fila.activo ? <PowerOff aria-hidden /> : <Power aria-hidden />}
                {fila.activo ? 'Desactivar' : 'Activar'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => cerrarSesiones(fila)}>
                <LogOut aria-hidden />
                Cerrar sesiones
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => eliminar(fila)} className="text-destructive focus:text-destructive">
                <Trash2 aria-hidden />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    };

    return [...usuarioColumns, columnaAcciones];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeGestionar, procesando]);

  return (
    <>
      <DataTable
        modulo="usuarios"
        columns={columnas}
        data={data}
        sort={sort}
        filters={filters}
        search={search}
        seleccionable={false}
        acciones={
          puedeGestionar ? (
            <Button size="sm" onClick={abrirCreacion}>
              <UserPlus aria-hidden />
              Nuevo usuario
            </Button>
          ) : null
        }
        vacio={{
          titulo: 'Aún no hay usuarios',
          descripcion:
            'Los usuarios son las personas que acceden al sistema. Cada uno recibe uno o varios roles, que definen qué puede ver y hacer.',
        }}
      />

      {puedeGestionar ? (
        <UsuarioForm
          key={usuarioEditando ?? 'nuevo'}
          open={dialogAbierto}
          onOpenChange={setDialogAbierto}
          usuarioId={usuarioEditando}
          roles={roles}
          sites={sites}
          onGuardado={() => router.refresh()}
        />
      ) : null}
    </>
  );
}
