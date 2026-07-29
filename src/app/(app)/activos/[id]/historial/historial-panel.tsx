'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { fmtDateTime } from '@/lib/datetime';
import { ESTADO_LABELS } from '@/lib/validators/activo';
import { cambiarEstadoActivo } from '../../actions';

const ESTADO_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'neutral'> = {
  OPERATIVO: 'success',
  EN_MANTENIMIENTO: 'warning',
  FUERA_DE_SERVICIO: 'destructive',
  DADO_DE_BAJA: 'neutral',
};

export type HistorialRow = {
  id: string;
  fecha: Date;
  estadoAnterior: string | null;
  estadoNuevo: string;
  motivo: string | null;
};

export function HistorialPanel({
  assetId,
  historial,
  estadoActual,
  puedeCambiarEstado,
}: {
  assetId: string;
  historial: HistorialRow[];
  estadoActual: string;
  puedeCambiarEstado: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = React.useState(false);
  const [nuevoEstado, setNuevoEstado] = React.useState(estadoActual);
  const [motivo, setMotivo] = React.useState('');
  const [guardando, setGuardando] = React.useState(false);

  async function confirmar() {
    setGuardando(true);
    const resultado = await cambiarEstadoActivo(assetId, nuevoEstado, motivo || undefined);
    setGuardando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Estado actualizado.');
    setAbierto(false);
    setMotivo('');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {puedeCambiarEstado ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAbierto(true)}>
            Cambiar estado
          </Button>
        </div>
      ) : null}

      {historial.length === 0 ? (
        <EmptyState icon={History} titulo="Sin cambios de estado" descripcion="La hoja de vida del activo se irá completando con cada cambio de estado, traslado y orden de trabajo (en fases futuras)." />
      ) : (
        <div className="space-y-2">
          {historial.map((h) => (
            <div key={h.id} className="flex items-start gap-3 rounded-[8px] border p-3">
              <div className="flex items-center gap-1.5 text-sm">
                {h.estadoAnterior ? (
                  <>
                    <Badge variant={ESTADO_VARIANT[h.estadoAnterior] ?? 'neutral'}>{ESTADO_LABELS[h.estadoAnterior] ?? h.estadoAnterior}</Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden />
                  </>
                ) : null}
                <Badge variant={ESTADO_VARIANT[h.estadoNuevo] ?? 'neutral'}>{ESTADO_LABELS[h.estadoNuevo] ?? h.estadoNuevo}</Badge>
              </div>
              <div className="flex-1">
                <p className="text-2xs text-muted-foreground">{fmtDateTime(h.fecha)}</p>
                {h.motivo ? <p className="text-xs">{h.motivo}</p> : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar estado operativo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nuevo estado</Label>
              <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ESTADO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Motivo</Label>
              <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmar} loading={guardando}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
