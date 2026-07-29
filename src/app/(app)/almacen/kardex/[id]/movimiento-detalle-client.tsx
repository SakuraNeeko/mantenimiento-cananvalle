'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, Pencil, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fmtDateTime } from '@/lib/datetime';
import { formatMoney, formatNumber } from '@/lib/utils';
import { MovimientoForm } from '../movimiento-form';
import { anularMovimiento, confirmarMovimiento, eliminarMovimiento, type obtenerMovimiento } from '../actions';

type Movimiento = NonNullable<Awaited<ReturnType<typeof obtenerMovimiento>>>;

const ESTADO_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'neutral'> = {
  BORRADOR: 'warning',
  CONFIRMADO: 'success',
  ANULADO: 'destructive',
};
const ESTADO_LABELS: Record<string, string> = { BORRADOR: 'Borrador', CONFIRMADO: 'Confirmado', ANULADO: 'Anulado' };

export function MovimientoDetalleClient({
  movimiento,
  puedeConfirmar,
  puedeAnular,
  puedeEditar,
}: {
  movimiento: Movimiento;
  puedeConfirmar: boolean;
  puedeAnular: boolean;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [confirmando, setConfirmando] = React.useState(false);
  const [dialogAnular, setDialogAnular] = React.useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = React.useState('');
  const [anulando, setAnulando] = React.useState(false);
  const [eliminando, setEliminando] = React.useState(false);

  async function confirmar() {
    if (!window.confirm('¿Confirmar este movimiento? Actualizará la existencia y ya no podrás editarlo.')) return;
    setConfirmando(true);
    const resultado = await confirmarMovimiento(movimiento.id);
    setConfirmando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Movimiento confirmado.');
    router.refresh();
  }

  async function anular() {
    setAnulando(true);
    const resultado = await anularMovimiento(movimiento.id, motivoAnulacion);
    setAnulando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Movimiento anulado con un contra-movimiento.');
    setDialogAnular(false);
    router.push(`/almacen/kardex/${resultado.id}`);
  }

  async function eliminar() {
    if (!window.confirm('¿Eliminar este borrador? No se puede deshacer.')) return;
    setEliminando(true);
    const resultado = await eliminarMovimiento(movimiento.id);
    setEliminando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Borrador eliminado.');
    router.push('/almacen/kardex');
  }

  if (editando) {
    return (
      <MovimientoForm
        modo="editar"
        movimientoId={movimiento.id}
        valoresIniciales={{
          warehouseId: movimiento.warehouseId,
          kardexConceptId: movimiento.kardexConceptId,
          partyId: movimiento.partyId ?? '',
          documentoSoporte: movimiento.documentoSoporte ?? '',
          fecha: new Date(movimiento.fecha).toISOString().slice(0, 10),
          lineas: movimiento.lineas.map((l) => ({
            materialId: l.materialId,
            cantidad: l.cantidad,
            costoUnitario: l.costoUnitario,
            lote: l.lote ?? '',
            serie: l.serie ?? '',
            fechaVencimiento: l.fechaVencimiento ?? '',
          })),
        }}
        onGuardado={() => {
          setEditando(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {movimiento.estado === 'BORRADOR' && puedeEditar ? (
          <>
            <Button variant="outline" size="sm" onClick={eliminar} disabled={eliminando} className="text-destructive hover:text-destructive">
              <Trash2 aria-hidden />
              Eliminar borrador
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
              <Pencil aria-hidden />
              Editar
            </Button>
          </>
        ) : null}
        {movimiento.estado === 'BORRADOR' && puedeConfirmar ? (
          <Button size="sm" onClick={confirmar} loading={confirmando}>
            <CheckCircle2 aria-hidden />
            Confirmar
          </Button>
        ) : null}
        {movimiento.estado === 'CONFIRMADO' && puedeAnular ? (
          <Button variant="outline" size="sm" onClick={() => setDialogAnular(true)} className="text-destructive hover:text-destructive">
            <Undo2 aria-hidden />
            Anular
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{movimiento.consecutivo ?? 'Sin confirmar todavía'}</CardTitle>
          <Badge variant={ESTADO_VARIANT[movimiento.estado] ?? 'neutral'}>{ESTADO_LABELS[movimiento.estado] ?? movimiento.estado}</Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <div>
            <p className="text-2xs text-muted-foreground">Concepto</p>
            <p className="text-sm">
              {movimiento.conceptoNombre} ({movimiento.signo === 'ENTRADA' ? '+' : '−'})
            </p>
          </div>
          <div>
            <p className="text-2xs text-muted-foreground">Almacén</p>
            <p className="text-sm">{movimiento.warehouseNombre}</p>
          </div>
          <div>
            <p className="text-2xs text-muted-foreground">Fecha</p>
            <p className="text-sm">{fmtDateTime(movimiento.fecha)}</p>
          </div>
          <div>
            <p className="text-2xs text-muted-foreground">Tercero</p>
            <p className="text-sm">{movimiento.partyNombre ?? '—'}</p>
          </div>
          {movimiento.documentoSoporte ? (
            <div className="col-span-2 sm:col-span-4">
              <p className="text-2xs text-muted-foreground">Documento de soporte</p>
              <p className="text-sm">{movimiento.documentoSoporte}</p>
            </div>
          ) : null}
          {movimiento.motivoAnulacion ? (
            <div className="col-span-2 sm:col-span-4">
              <p className="text-2xs text-muted-foreground">Motivo de anulación</p>
              <p className="text-sm">{movimiento.motivoAnulacion}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Líneas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-[6px] border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo unitario</TableHead>
                  <TableHead className="text-right">Costo total</TableHead>
                  <TableHead>Lote / serie</TableHead>
                  <TableHead className="text-right">Saldo resultante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimiento.lineas.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <span className="font-codigo text-2xs text-muted-foreground">{l.materialCodigo}</span> {l.materialNombre}
                    </TableCell>
                    <TableCell className="tabular text-right">{formatNumber(l.cantidad)}</TableCell>
                    <TableCell className="tabular text-right">{formatMoney(l.costoUnitario)}</TableCell>
                    <TableCell className="tabular text-right">{formatMoney(l.costoTotal)}</TableCell>
                    <TableCell className="text-xs">{[l.lote, l.serie].filter(Boolean).join(' / ') || '—'}</TableCell>
                    <TableCell className="tabular text-right">{l.saldoResultante ? formatNumber(l.saldoResultante) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogAnular} onOpenChange={setDialogAnular}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular movimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Textarea rows={3} value={motivoAnulacion} onChange={(e) => setMotivoAnulacion(e.target.value)} placeholder="Obligatorio" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAnular(false)}>
              Cancelar
            </Button>
            <Button onClick={anular} loading={anulando}>
              Anular con contra-movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
