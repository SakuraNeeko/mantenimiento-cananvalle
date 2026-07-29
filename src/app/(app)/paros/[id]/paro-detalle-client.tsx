'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fmtDateTime } from '@/lib/datetime';
import { ESTADO_LABELS, ESTADO_VARIANT, TIPO_LABELS } from '@/lib/validators/paro';
import { ParoForm } from '../paro-form';
import { actualizarParo, cerrarParo, convertirParoEnOrden, type AccionResultado, type OpcionesParo } from '../actions';
import type { ParoFormValues } from '@/lib/validators/paro';

const SIN_VALOR = '__vacio__';

type Paro = {
  id: string;
  consecutivo: string;
  assetId: string;
  assetCodigo: string | null;
  assetNombre: string | null;
  tipo: 'PROGRAMADO' | 'NO_PROGRAMADO';
  estado: string;
  fechaInicio: Date;
  fechaFin: Date | null;
  duracionMinutos: string | null;
  causaFallaId: string | null;
  causaFallaNombre: string | null;
  efectoFallaId: string | null;
  efectoFallaNombre: string | null;
  technicalActionId: string | null;
  technicalActionNombre: string | null;
  impactoUnidadesNoProducidas: string | null;
  impactoCostoEstimado: string | null;
  workOrderId: string | null;
  workOrderConsecutivo: string | null;
  responsableNombre: string | null;
  observaciones: string | null;
};

function ahoraLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function ParoDetalleClient({
  paro,
  opciones,
  permisos,
}: {
  paro: Paro;
  opciones: OpcionesParo;
  permisos: { editar: boolean; cerrar: boolean; convertir: boolean };
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [procesando, setProcesando] = React.useState(false);

  const [dialogCerrar, setDialogCerrar] = React.useState(false);
  const [fechaFin, setFechaFin] = React.useState(ahoraLocal());
  const [causaFallaId, setCausaFallaId] = React.useState(paro.causaFallaId ?? '');
  const [efectoFallaId, setEfectoFallaId] = React.useState(paro.efectoFallaId ?? '');
  const [impactoUnidades, setImpactoUnidades] = React.useState('');
  const [impactoCosto, setImpactoCosto] = React.useState('');

  async function ejecutar(accion: () => Promise<AccionResultado>, mensajeExito: string) {
    setProcesando(true);
    const resultado = await accion();
    setProcesando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(mensajeExito);
    router.refresh();
    return resultado;
  }

  async function guardarEdicion(valores: ParoFormValues) {
    const resultado = await actualizarParo(paro.id, valores);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Paro actualizado.');
    setEditando(false);
    router.refresh();
  }

  async function convertir() {
    const resultado = await ejecutar(() => convertirParoEnOrden(paro.id), 'Orden de trabajo creada.');
    if (resultado?.ok && resultado.id) router.push(`/ordenes/${resultado.id}`);
  }

  if (editando) {
    return (
      <div className="space-y-2">
        <Button variant="ghost" size="sm" onClick={() => setEditando(false)}>
          <X aria-hidden />
          Cancelar edición
        </Button>
        <ParoForm
          opciones={opciones}
          valoresPrevios={{
            assetId: paro.assetId,
            tipo: paro.tipo,
            fechaInicio: paro.fechaInicio.toISOString().slice(0, 16),
            causaFallaId: paro.causaFallaId ?? undefined,
            efectoFallaId: paro.efectoFallaId ?? undefined,
            technicalActionId: paro.technicalActionId ?? undefined,
            observaciones: paro.observaciones ?? undefined,
          }}
          textoBoton="Guardar cambios"
          onGuardado={guardarEdicion}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{paro.consecutivo}</CardTitle>
          <div className="flex gap-1.5">
            <Badge variant={paro.tipo === 'NO_PROGRAMADO' ? 'destructive' : 'neutral'}>{TIPO_LABELS[paro.tipo]}</Badge>
            <Badge variant={ESTADO_VARIANT[paro.estado] ?? 'neutral'}>{ESTADO_LABELS[paro.estado] ?? paro.estado}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <p className="text-2xs text-muted-foreground">Activo</p>
              <p>{paro.assetCodigo} — {paro.assetNombre}</p>
            </div>
            <div>
              <p className="text-2xs text-muted-foreground">Inicio</p>
              <p>{fmtDateTime(paro.fechaInicio)}</p>
            </div>
            <div>
              <p className="text-2xs text-muted-foreground">Fin</p>
              <p>{paro.fechaFin ? fmtDateTime(paro.fechaFin) : '—'}</p>
            </div>
            {paro.duracionMinutos ? (
              <div>
                <p className="text-2xs text-muted-foreground">Duración</p>
                <p>{Math.round(Number(paro.duracionMinutos))} min</p>
              </div>
            ) : null}
            <div>
              <p className="text-2xs text-muted-foreground">Reportado por</p>
              <p>{paro.responsableNombre}</p>
            </div>
            {paro.causaFallaNombre ? (
              <div>
                <p className="text-2xs text-muted-foreground">Causa de falla</p>
                <p>{paro.causaFallaNombre}</p>
              </div>
            ) : null}
            {paro.efectoFallaNombre ? (
              <div>
                <p className="text-2xs text-muted-foreground">Efecto de falla</p>
                <p>{paro.efectoFallaNombre}</p>
              </div>
            ) : null}
            {paro.technicalActionNombre ? (
              <div>
                <p className="text-2xs text-muted-foreground">Acción técnica</p>
                <p>{paro.technicalActionNombre}</p>
              </div>
            ) : null}
            {paro.impactoUnidadesNoProducidas ? (
              <div>
                <p className="text-2xs text-muted-foreground">Unidades no producidas</p>
                <p>{paro.impactoUnidadesNoProducidas}</p>
              </div>
            ) : null}
            {paro.impactoCostoEstimado ? (
              <div>
                <p className="text-2xs text-muted-foreground">Costo estimado</p>
                <p>{paro.impactoCostoEstimado}</p>
              </div>
            ) : null}
          </div>

          {paro.observaciones ? (
            <div className="rounded-[6px] border p-2 text-sm">
              <p className="text-2xs font-medium text-muted-foreground">Observaciones</p>
              <p>{paro.observaciones}</p>
            </div>
          ) : null}

          {paro.workOrderId ? (
            <div className="rounded-[6px] border border-success/30 bg-success/5 p-2 text-sm">
              <p className="text-2xs font-medium text-muted-foreground">Orden de trabajo generada</p>
              <Link href={`/ordenes/${paro.workOrderId}`} className="text-primary hover:underline">
                {paro.workOrderConsecutivo ?? 'Ver orden'}
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        {permisos.editar && paro.estado === 'ABIERTO' ? (
          <Button variant="outline" onClick={() => setEditando(true)}>
            <Pencil aria-hidden />
            Editar
          </Button>
        ) : null}
        {permisos.convertir && paro.tipo === 'NO_PROGRAMADO' && !paro.workOrderId ? (
          <Button variant="outline" onClick={convertir} loading={procesando}>
            <Wrench aria-hidden />
            Convertir en orden de trabajo
          </Button>
        ) : null}
        {permisos.cerrar && paro.estado === 'ABIERTO' ? <Button onClick={() => setDialogCerrar(true)}>Cerrar paro</Button> : null}
      </div>

      <Dialog open={dialogCerrar} onOpenChange={setDialogCerrar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar paro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Fecha y hora de fin</Label>
              <Input type="datetime-local" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Causa de falla</Label>
                <Select value={causaFallaId || SIN_VALOR} onValueChange={(v) => setCausaFallaId(v === SIN_VALOR ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin especificar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_VALOR}>Sin especificar</SelectItem>
                    {opciones.failureCauses.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Efecto de falla</Label>
                <Select value={efectoFallaId || SIN_VALOR} onValueChange={(v) => setEfectoFallaId(v === SIN_VALOR ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin especificar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_VALOR}>Sin especificar</SelectItem>
                    {opciones.failureEffects.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Unidades no producidas</Label>
                <Input value={impactoUnidades} onChange={(e) => setImpactoUnidades(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Costo estimado</Label>
                <Input value={impactoCosto} onChange={(e) => setImpactoCosto(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCerrar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await ejecutar(
                  () => cerrarParo(paro.id, { fechaFin, causaFallaId: causaFallaId || undefined, efectoFallaId: efectoFallaId || undefined, impactoUnidadesNoProducidas: impactoUnidades || undefined, impactoCostoEstimado: impactoCosto || undefined }),
                  'Paro cerrado.',
                );
                setDialogCerrar(false);
              }}
              loading={procesando}
            >
              Cerrar paro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
