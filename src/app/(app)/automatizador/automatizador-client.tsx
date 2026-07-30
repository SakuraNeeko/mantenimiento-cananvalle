'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MoreHorizontal, Pencil, Plus, Power, PowerOff, ScrollText, Trash2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { DISPARADOR_LABELS, type AccionRegla, type CondicionesRegla } from '@/lib/automatizador/reglas';
import { fmtDateTime } from '@/lib/datetime';
import { alternarActivoRegla, eliminarRegla, type ReglaFormValues } from './actions';
import { ReglaForm } from './regla-form';

export type ReglaRow = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  disparadorTipo: string;
  umbral: number | null;
  condiciones: unknown;
  acciones: unknown;
  ultimaEvaluacionAt: Date | null;
};

export function AutomatizadorClient({ reglas, puedeGestionar, puedeVerBitacora }: { reglas: ReglaRow[]; puedeGestionar: boolean; puedeVerBitacora: boolean }) {
  const router = useRouter();
  const [dialogAbierto, setDialogAbierto] = React.useState(false);
  const [editando, setEditando] = React.useState<ReglaRow | null>(null);
  const [procesando, setProcesando] = React.useState<string | null>(null);

  function abrirCreacion() {
    setEditando(null);
    setDialogAbierto(true);
  }

  async function alternar(regla: ReglaRow) {
    setProcesando(regla.id);
    const resultado = await alternarActivoRegla(regla.id, !regla.activo);
    setProcesando(null);
    if (!resultado.ok) return toast.error(resultado.error);
    toast.success(regla.activo ? 'Regla desactivada.' : 'Regla activada.');
    router.refresh();
  }

  async function eliminar(regla: ReglaRow) {
    if (!window.confirm(`¿Eliminar la regla "${regla.nombre}"? Esta acción no se puede deshacer desde la interfaz.`)) return;
    setProcesando(regla.id);
    const resultado = await eliminarRegla(regla.id);
    setProcesando(null);
    if (!resultado.ok) return toast.error(resultado.error);
    toast.success('Regla eliminada.');
    router.refresh();
  }

  return (
    <>
      {puedeGestionar ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={abrirCreacion}>
            <Plus aria-hidden />
            Nueva regla
          </Button>
        </div>
      ) : null}

      {reglas.length === 0 ? (
        <EmptyState titulo="Todavía no hay reglas" descripcion="Crea una regla disparador → condiciones → acciones para automatizar avisos y tareas repetitivas." />
      ) : (
        <div className="space-y-2">
          {reglas.map((regla) => (
            <Card key={regla.id}>
              <CardContent className="space-y-1.5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-codigo text-2xs text-muted-foreground">{regla.codigo}</span>
                      <Badge variant={regla.activo ? 'success' : 'neutral'}>{regla.activo ? 'Activa' : 'Inactiva'}</Badge>
                    </div>
                    <p className="text-sm font-medium">{regla.nombre}</p>
                    <p className="text-2xs text-muted-foreground">
                      <Zap className="mr-1 inline h-3 w-3" aria-hidden />
                      {DISPARADOR_LABELS[regla.disparadorTipo] ?? regla.disparadorTipo}
                      {regla.umbral ? ` · umbral ${regla.umbral}` : ''}
                    </p>
                    {regla.descripcion ? <p className="text-2xs text-muted-foreground">{regla.descripcion}</p> : null}
                    <p className="text-2xs text-muted-foreground">
                      Última evaluación: {regla.ultimaEvaluacionAt ? fmtDateTime(regla.ultimaEvaluacionAt) : 'nunca'}
                    </p>
                  </div>

                  {puedeGestionar || puedeVerBitacora ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={procesando === regla.id}>
                          <MoreHorizontal aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {puedeVerBitacora ? (
                          <DropdownMenuItem asChild>
                            <Link href={`/automatizador/${regla.id}`}>
                              <ScrollText aria-hidden />
                              Ver bitácora
                            </Link>
                          </DropdownMenuItem>
                        ) : null}
                        {puedeGestionar ? (
                          <>
                            <DropdownMenuItem
                              onSelect={() => {
                                setEditando(regla);
                                setDialogAbierto(true);
                              }}
                            >
                              <Pencil aria-hidden />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => alternar(regla)}>
                              {regla.activo ? <PowerOff aria-hidden /> : <Power aria-hidden />}
                              {regla.activo ? 'Desactivar' : 'Activar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => eliminar(regla)} className="text-destructive focus:text-destructive">
                              <Trash2 aria-hidden />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {puedeGestionar ? (
        <ReglaForm
          key={editando?.id ?? 'nueva'}
          open={dialogAbierto}
          onOpenChange={setDialogAbierto}
          valoresPrevios={
            editando
              ? ({
                  codigo: editando.codigo,
                  nombre: editando.nombre,
                  descripcion: editando.descripcion ?? undefined,
                  activo: editando.activo,
                  disparadorTipo: editando.disparadorTipo,
                  umbral: editando.umbral ?? undefined,
                  condiciones: editando.condiciones as CondicionesRegla,
                  acciones: editando.acciones as AccionRegla[],
                } satisfies ReglaFormValues)
              : undefined
          }
          reglaId={editando?.id}
          onGuardado={() => router.refresh()}
        />
      ) : null}
    </>
  );
}
