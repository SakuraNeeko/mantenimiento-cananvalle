'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Gauge, History, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { fmtDateTime } from '@/lib/datetime';
import { formatNumber } from '@/lib/utils';
import { asignarMedidor, obtenerLecturas, quitarMedidor, registrarLectura } from './actions';

export type AssetMeterRow = {
  id: string;
  meterId: string;
  meterNombre: string;
  simbolo: string | null;
  valorActual: string;
  promedioUsoDiario: string | null;
  permiteRetroceso: boolean;
};

export function MedidoresPanel({
  assetId,
  asignados,
  disponibles,
  puedeGestionar,
  puedeRegistrar,
}: {
  assetId: string;
  asignados: AssetMeterRow[];
  disponibles: { value: string; label: string }[];
  puedeGestionar: boolean;
  puedeRegistrar: boolean;
}) {
  const router = useRouter();
  const [dialogAsignar, setDialogAsignar] = React.useState(false);
  const [meterSeleccionado, setMeterSeleccionado] = React.useState('');
  const [valorInicial, setValorInicial] = React.useState('0');
  const [promedioUso, setPromedioUso] = React.useState('');
  const [guardando, setGuardando] = React.useState(false);

  const [dialogLectura, setDialogLectura] = React.useState<AssetMeterRow | null>(null);
  const [valorLectura, setValorLectura] = React.useState('');
  const [observacion, setObservacion] = React.useState('');

  const [dialogHistorial, setDialogHistorial] = React.useState<AssetMeterRow | null>(null);
  const [historial, setHistorial] = React.useState<Awaited<ReturnType<typeof obtenerLecturas>>>([]);
  const [cargandoHistorial, setCargandoHistorial] = React.useState(false);

  async function confirmarAsignacion() {
    if (!meterSeleccionado) {
      toast.error('Selecciona un medidor.');
      return;
    }
    setGuardando(true);
    const resultado = await asignarMedidor(assetId, meterSeleccionado, valorInicial, promedioUso);
    setGuardando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Medidor asignado.');
    setDialogAsignar(false);
    setMeterSeleccionado('');
    setValorInicial('0');
    setPromedioUso('');
    router.refresh();
  }

  async function quitar(fila: AssetMeterRow) {
    if (!window.confirm(`¿Quitar el medidor "${fila.meterNombre}" de este activo?`)) return;
    const resultado = await quitarMedidor(assetId, fila.id);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Medidor removido.');
    router.refresh();
  }

  async function confirmarLectura() {
    if (!dialogLectura) return;
    const resultado = await registrarLectura(assetId, dialogLectura.id, valorLectura, observacion);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Lectura registrada.');
    setDialogLectura(null);
    setValorLectura('');
    setObservacion('');
    router.refresh();
  }

  async function abrirHistorial(fila: AssetMeterRow) {
    setDialogHistorial(fila);
    setCargandoHistorial(true);
    try {
      setHistorial(await obtenerLecturas(fila.id));
    } finally {
      setCargandoHistorial(false);
    }
  }

  return (
    <div className="space-y-3">
      {puedeGestionar ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setDialogAsignar(true)}>
            <Plus aria-hidden />
            Asignar medidor
          </Button>
        </div>
      ) : null}

      {asignados.length === 0 ? (
        <EmptyState icon={Gauge} titulo="Sin medidores asignados" descripcion="Asigna un contador del catálogo de Infraestructura para empezar a registrar lecturas." />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {asignados.map((m) => (
            <Card key={m.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{m.meterNombre}</p>
                    <p className="text-2xs text-muted-foreground">{m.promedioUsoDiario ? `~${formatNumber(m.promedioUsoDiario)} ${m.simbolo ?? ''}/día` : 'Sin promedio de uso'}</p>
                  </div>
                  {puedeGestionar ? (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => quitar(m)} title="Quitar">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  ) : null}
                </div>
                <p className="tabular text-lg font-semibold">
                  {formatNumber(m.valorActual)} <span className="text-xs font-normal text-muted-foreground">{m.simbolo}</span>
                </p>
                <div className="flex gap-2">
                  {puedeRegistrar ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDialogLectura(m);
                        setValorLectura(m.valorActual);
                      }}
                    >
                      Registrar lectura
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => abrirHistorial(m)}>
                    <History aria-hidden />
                    Historial
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogAsignar} onOpenChange={setDialogAsignar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar medidor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Medidor</Label>
              <Select value={meterSeleccionado} onValueChange={setMeterSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {disponibles.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Valor inicial</Label>
                <Input value={valorInicial} onChange={(e) => setValorInicial(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Promedio de uso diario</Label>
                <Input value={promedioUso} onChange={(e) => setPromedioUso(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAsignar(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarAsignacion} loading={guardando}>
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(dialogLectura)} onOpenChange={(o) => !o && setDialogLectura(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar lectura — {dialogLectura?.meterNombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Valor</Label>
              <Input value={valorLectura} onChange={(e) => setValorLectura(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1">
              <Label>Observación</Label>
              <Input value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogLectura(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarLectura}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(dialogHistorial)} onOpenChange={(o) => !o && setDialogHistorial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historial — {dialogHistorial?.meterNombre}</DialogTitle>
          </DialogHeader>
          {cargandoHistorial ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : historial.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin lecturas registradas todavía.</p>
          ) : (
            <div className="max-h-72 overflow-auto rounded-[6px] border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Observación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{fmtDateTime(h.fecha)}</TableCell>
                      <TableCell className="tabular text-right">{formatNumber(h.valor)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{h.observacion ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
