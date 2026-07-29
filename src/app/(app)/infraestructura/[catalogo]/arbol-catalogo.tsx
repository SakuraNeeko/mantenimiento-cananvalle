'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronRight, MoreHorizontal, Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import type { CatalogoDef } from '@/lib/catalogs/registry';
import type { RegistroRow } from './catalogo-table';
import { RegistroForm } from './registro-form';
import { alternarActivo, eliminarRegistro } from './actions';

type Nodo = RegistroRow & { hijos: Nodo[] };

function construirArbol(filas: RegistroRow[]): Nodo[] {
  const porId = new Map<string, Nodo>(filas.map((f) => [f.id, { ...f, hijos: [] }]));
  const raices: Nodo[] = [];

  for (const nodo of porId.values()) {
    const parentId = nodo.parentId as string | null | undefined;
    const padre = parentId ? porId.get(parentId) : undefined;
    if (padre) padre.hijos.push(nodo);
    else raices.push(nodo);
  }

  const ordenar = (nodos: Nodo[]) => {
    nodos.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    nodos.forEach((n) => ordenar(n.hijos));
  };
  ordenar(raices);

  return raices;
}

export function ArbolCatalogo({
  slug,
  def,
  filas,
  puedeCrear,
  puedeEditar,
  puedeEliminar,
}: {
  slug: string;
  def: CatalogoDef;
  filas: RegistroRow[];
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}) {
  const router = useRouter();
  const [dialogAbierto, setDialogAbierto] = React.useState(false);
  const [editando, setEditando] = React.useState<string | undefined>(undefined);
  const [padreNuevo, setPadreNuevo] = React.useState<string | undefined>(undefined);
  const [procesando, setProcesando] = React.useState<string | null>(null);
  const [expandidos, setExpandidos] = React.useState<Set<string>>(() => new Set(filas.map((f) => f.id)));

  const arbol = React.useMemo(() => construirArbol(filas), [filas]);

  function abrirCreacionRaiz() {
    setEditando(undefined);
    setPadreNuevo(undefined);
    setDialogAbierto(true);
  }

  function abrirCreacionHijo(padreId: string) {
    setEditando(undefined);
    setPadreNuevo(padreId);
    setDialogAbierto(true);
  }

  function abrirEdicion(id: string) {
    setEditando(id);
    setPadreNuevo(undefined);
    setDialogAbierto(true);
  }

  function alternarExpandido(id: string) {
    setExpandidos((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
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

  async function eliminar(fila: Nodo) {
    if (fila.hijos.length > 0) {
      toast.error('No puedes eliminar un registro que tiene hijos. Muévelos o elimínalos primero.');
      return;
    }
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

  function Fila({ nodo, nivel }: { nodo: Nodo; nivel: number }) {
    const tieneHijos = nodo.hijos.length > 0;
    const abierto = expandidos.has(nodo.id);
    const ocupado = procesando === nodo.id;

    return (
      <div>
        <div
          className="group flex items-center gap-1 rounded-[6px] py-1.5 pr-2 hover:bg-accent/50"
          style={{ paddingLeft: `${nivel * 1.5 + 0.25}rem` }}
        >
          <button
            type="button"
            onClick={() => tieneHijos && alternarExpandido(nodo.id)}
            className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px]', tieneHijos ? 'hover:bg-accent' : 'invisible')}
            aria-label={abierto ? 'Contraer' : 'Expandir'}
          >
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', abierto && 'rotate-90')} />
          </button>

          <span className="font-codigo text-2xs text-muted-foreground">{String(nodo.codigo)}</span>
          <span className="text-sm font-medium">{String(nodo.nombre)}</span>
          {!nodo.activo ? <Badge variant="neutral">Inactivo</Badge> : null}

          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100">
            {puedeCrear ? (
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Agregar hijo" onClick={() => abrirCreacionHijo(nodo.id)}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </Button>
            ) : null}
            {puedeEditar || puedeEliminar ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={ocupado}>
                    <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {puedeEditar ? (
                    <DropdownMenuItem onSelect={() => abrirEdicion(nodo.id)}>
                      <Pencil aria-hidden />
                      Editar
                    </DropdownMenuItem>
                  ) : null}
                  {puedeEditar ? (
                    <DropdownMenuItem onSelect={() => alternar(nodo)}>
                      {nodo.activo ? <PowerOff aria-hidden /> : <Power aria-hidden />}
                      {nodo.activo ? 'Desactivar' : 'Activar'}
                    </DropdownMenuItem>
                  ) : null}
                  {puedeEliminar ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => eliminar(nodo)} className="text-destructive focus:text-destructive">
                        <Trash2 aria-hidden />
                        Eliminar
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        {tieneHijos && abierto ? (
          <div>
            {nodo.hijos.map((hijo) => (
              <Fila key={hijo.id} nodo={hijo} nivel={nivel + 1} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-end">
        {puedeCrear ? (
          <Button size="sm" onClick={abrirCreacionRaiz}>
            <Plus aria-hidden />
            Nuevo
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[8px] border p-1">
        {arbol.length === 0 ? (
          <EmptyState titulo={`Aún no hay ${def.titulo.toLowerCase()}`} descripcion={def.descripcion} />
        ) : (
          arbol.map((nodo) => <Fila key={nodo.id} nodo={nodo} nivel={0} />)
        )}
      </div>

      {puedeCrear || puedeEditar ? (
        <RegistroForm
          key={editando ?? `nuevo-${padreNuevo ?? 'raiz'}`}
          open={dialogAbierto}
          onOpenChange={setDialogAbierto}
          slug={slug}
          registroId={editando}
          valoresExtra={!editando && padreNuevo ? { parentId: padreNuevo } : undefined}
          onGuardado={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
