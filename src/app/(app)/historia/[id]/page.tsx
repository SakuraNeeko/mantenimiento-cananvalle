import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtDate, fmtDateTime } from '@/lib/datetime';
import { formatMoney } from '@/lib/utils';
import { obtenerHistorialDetalle } from '../actions';

type Snapshot = {
  tareas: { id: string; orden: number; descripcion: string; resultado: string | null; esCritica: boolean }[];
  manoObra: { id: string; responsableNombre: string | null; fecha: string; horasNormales: string; costoCalculado: string }[];
  materiales: { id: string; materialCodigo: string | null; materialNombre: string | null; cantidadEntregada: string | null; costoTotal: string | null }[];
  costosTerceros: { id: string; partyNombre: string | null; descripcion: string; monto: string }[];
  costosOtros: { id: string; descripcion: string; monto: string }[];
  comentarios: { id: string; mensaje: string; autorNombre: string | null; createdAt: string }[];
  historialEstados: { id: string; estadoAnterior: string | null; estadoNuevo: string; motivo: string | null; fecha: string; autorNombre: string | null }[];
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const fila = await obtenerHistorialDetalle(id);
  return { title: fila?.consecutivo ?? 'Historia' };
}

export default async function HistoriaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fila = await obtenerHistorialDetalle(id);
  if (!fila) notFound();

  const snap = fila.snapshot as Snapshot;

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{fila.consecutivo}</CardTitle>
          <Badge variant="neutral">Copia inmutable</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{fila.descripcionProblema}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <p className="text-2xs text-muted-foreground">Activo</p>
              <p>{fila.assetCodigo} — {fila.assetNombre}</p>
            </div>
            <div>
              <p className="text-2xs text-muted-foreground">Tipo de mantenimiento</p>
              <p>{fila.maintenanceTypeNombre ?? '—'}</p>
            </div>
            <div>
              <p className="text-2xs text-muted-foreground">Centro de costo</p>
              <p>{fila.costCenterNombre ?? '—'}</p>
            </div>
            <div>
              <p className="text-2xs text-muted-foreground">Inicio real</p>
              <p>{fmtDateTime(fila.fechaInicioReal)}</p>
            </div>
            <div>
              <p className="text-2xs text-muted-foreground">Fin real</p>
              <p>{fmtDateTime(fila.fechaFinReal)}</p>
            </div>
            <div>
              <p className="text-2xs text-muted-foreground">Causa de cierre</p>
              <p>{fila.causaCierreNombre ?? '—'}</p>
            </div>
            {fila.causaFallaNombre ? (
              <div>
                <p className="text-2xs text-muted-foreground">Causa de falla</p>
                <p>{fila.causaFallaNombre}</p>
              </div>
            ) : null}
            {fila.efectoFallaNombre ? (
              <div>
                <p className="text-2xs text-muted-foreground">Efecto de falla</p>
                <p>{fila.efectoFallaNombre}</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Costos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-5">
          <div>
            <p className="text-2xs text-muted-foreground">Mano de obra</p>
            <p>{formatMoney(fila.costoManoObra)}</p>
          </div>
          <div>
            <p className="text-2xs text-muted-foreground">Materiales</p>
            <p>{formatMoney(fila.costoMateriales)}</p>
          </div>
          <div>
            <p className="text-2xs text-muted-foreground">Terceros</p>
            <p>{formatMoney(fila.costoTerceros)}</p>
          </div>
          <div>
            <p className="text-2xs text-muted-foreground">Otros</p>
            <p>{formatMoney(fila.costoOtros)}</p>
          </div>
          <div>
            <p className="text-2xs font-medium text-muted-foreground">Total</p>
            <p className="text-base font-semibold">{formatMoney(fila.costoTotal)}</p>
          </div>
        </CardContent>
      </Card>

      {snap.tareas?.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {snap.tareas.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-[6px] border p-2 text-sm">
                <span>
                  {t.orden}. {t.descripcion} {t.esCritica ? <Badge variant="destructive">Crítica</Badge> : null}
                </span>
                <span className="text-muted-foreground">{t.resultado ?? '—'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {snap.manoObra?.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Mano de obra</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Horas normales</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.manoObra.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.responsableNombre ?? '—'}</TableCell>
                    <TableCell>{fmtDate(l.fecha)}</TableCell>
                    <TableCell className="text-right">{l.horasNormales}</TableCell>
                    <TableCell className="text-right">{formatMoney(l.costoCalculado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {snap.materiales?.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Materiales</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.materiales.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.materialCodigo} — {m.materialNombre}</TableCell>
                    <TableCell className="text-right">{m.cantidadEntregada ?? '—'}</TableCell>
                    <TableCell className="text-right">{m.costoTotal ? formatMoney(m.costoTotal) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {snap.historialEstados?.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Historial de estados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {snap.historialEstados.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <span>
                  {h.estadoAnterior ?? '—'} → {h.estadoNuevo}
                </span>
                <span className="text-2xs text-muted-foreground">{fmtDateTime(h.fecha)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
