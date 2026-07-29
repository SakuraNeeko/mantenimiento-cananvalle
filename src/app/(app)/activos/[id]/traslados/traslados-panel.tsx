'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { fmtDateTime } from '@/lib/datetime';
import { registrarTraslado } from './actions';

const SIN_VALOR = '__vacio__';

export type TrasladoRow = {
  id: string;
  fecha: Date;
  ubicacionOrigen: string | null;
  ubicacionDestino: string | null;
  centroCostoOrigen: string | null;
  centroCostoDestino: string | null;
  motivo: string | null;
};

export function TrasladosPanel({
  assetId,
  traslados,
  locations,
  costCenters,
  puedeTrasladar,
}: {
  assetId: string;
  traslados: TrasladoRow[];
  locations: { value: string; label: string }[];
  costCenters: { value: string; label: string }[];
  puedeTrasladar: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = React.useState(false);
  const [locationDestino, setLocationDestino] = React.useState('');
  const [costCenterDestino, setCostCenterDestino] = React.useState('');
  const [motivo, setMotivo] = React.useState('');
  const [guardando, setGuardando] = React.useState(false);

  async function confirmar() {
    setGuardando(true);
    const resultado = await registrarTraslado(assetId, locationDestino || undefined, costCenterDestino || undefined, motivo || undefined);
    setGuardando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Traslado registrado.');
    setAbierto(false);
    setLocationDestino('');
    setCostCenterDestino('');
    setMotivo('');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {puedeTrasladar ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAbierto(true)}>
            <Plus aria-hidden />
            Nuevo traslado
          </Button>
        </div>
      ) : null}

      {traslados.length === 0 ? (
        <EmptyState icon={MapPin} titulo="Sin traslados" descripcion="Los movimientos de ubicación o centro de costo del activo quedarán registrados aquí." />
      ) : (
        <div className="space-y-2">
          {traslados.map((t) => (
            <div key={t.id} className="rounded-[8px] border p-3 text-sm">
              <p className="text-2xs text-muted-foreground">{fmtDateTime(t.fecha)}</p>
              {t.ubicacionOrigen !== t.ubicacionDestino ? (
                <p className="flex items-center gap-1.5">
                  <span>{t.ubicacionOrigen ?? 'Sin ubicación'}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden />
                  <span className="font-medium">{t.ubicacionDestino ?? 'Sin ubicación'}</span>
                </p>
              ) : null}
              {t.centroCostoOrigen !== t.centroCostoDestino ? (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <span>{t.centroCostoOrigen ?? 'Sin centro de costo'}</span>
                  <ArrowRight className="h-3 w-3" aria-hidden />
                  <span className="font-medium text-foreground">{t.centroCostoDestino ?? 'Sin centro de costo'}</span>
                </p>
              ) : null}
              {t.motivo ? <p className="mt-1 text-xs text-muted-foreground">{t.motivo}</p> : null}
            </div>
          ))}
        </div>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo traslado</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nueva ubicación</Label>
              <Select value={locationDestino || SIN_VALOR} onValueChange={(v) => setLocationDestino(v === SIN_VALOR ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin cambio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>Sin cambio</SelectItem>
                  {locations.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nuevo centro de costo</Label>
              <Select value={costCenterDestino || SIN_VALOR} onValueChange={(v) => setCostCenterDestino(v === SIN_VALOR ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin cambio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>Sin cambio</SelectItem>
                  {costCenters.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
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
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
