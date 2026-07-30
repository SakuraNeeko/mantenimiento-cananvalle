'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Gauge } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { fmtDate } from '@/lib/datetime';
import { formatMoney } from '@/lib/utils';
import { obtenerRendimientoAsset } from '../actions';
import type { RegistroConRendimiento } from '@/lib/combustibles/rendimiento';
import { unidadLectura, type TipoLecturaMedidor } from '@/lib/combustibles/medidor';

type AssetOption = { value: string; label: string; codigo: string; tipoLectura: TipoLecturaMedidor | null; simboloUom: string | null };

export function RendimientoClient({ assets, assetIdInicial }: { assets: AssetOption[]; assetIdInicial: string }) {
  const [assetId, setAssetId] = React.useState(assetIdInicial);
  const [registros, setRegistros] = React.useState<RegistroConRendimiento[] | null>(null);
  const [cargando, setCargando] = React.useState(false);

  const assetSeleccionado = assets.find((a) => a.value === assetId);
  const unidad = assetSeleccionado?.tipoLectura ? unidadLectura(assetSeleccionado.tipoLectura, assetSeleccionado.simboloUom) : null;
  const etiquetaRendimiento = unidad ? `Rendimiento (${unidad}/gal)` : 'Rendimiento';

  const cargar = React.useCallback(async (id: string) => {
    if (!id) return;
    setCargando(true);
    try {
      const resultado = await obtenerRendimientoAsset(id);
      setRegistros(resultado);
    } catch {
      toast.error('No se pudo calcular el rendimiento.');
    } finally {
      setCargando(false);
    }
  }, []);

  React.useEffect(() => {
    // Carga única al montar: no hay prop de la que derivar esto, es un fetch de arranque de página.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (assetIdInicial) cargar(assetIdInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4">
          <div className="max-w-sm space-y-1">
            <Label className="text-2xs">Activo / vehículo</Label>
            <Select
              value={assetId}
              onValueChange={(v) => {
                setAssetId(v);
                cargar(v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.codigo} — {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!assetId ? (
        <EmptyState icon={Gauge} titulo="Selecciona un activo" descripcion="Elige un activo o vehículo para ver su historial de rendimiento." />
      ) : cargando ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Calculando…</p>
      ) : registros && registros.length === 0 ? (
        <EmptyState icon={Gauge} titulo="Sin cargas registradas" descripcion="Este activo todavía no tiene cargas de combustible registradas." />
      ) : registros ? (
        <Card>
          <CardHeader>
            <CardTitle>Historial de cargas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Lectura{unidad ? ` (${unidad})` : ''}</TableHead>
                  <TableHead className="text-right">{etiquetaRendimiento}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{fmtDate(r.fecha)}</TableCell>
                    <TableCell className="text-right">{r.cantidad}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.costoTotal)}</TableCell>
                    <TableCell className="text-right">{r.lectura ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {r.rendimiento !== null ? (
                        <span className="inline-flex items-center gap-1">
                          {r.rendimiento.toFixed(2)}
                          {r.anomalo ? (
                            <Badge variant="warning" className="gap-1">
                              <AlertTriangle className="h-3 w-3" aria-hidden />
                              Anómalo
                            </Badge>
                          ) : null}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
