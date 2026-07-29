'use client';

import * as React from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Download, Loader2, RefreshCw, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/utils';
import { obtenerDashboard } from './actions';

type Dashboard = Awaited<ReturnType<typeof obtenerDashboard>>;

function inicioDeMes(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}
function inicioDeAnio(): string {
  return new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)).toISOString().slice(0, 10);
}

function Tarjeta({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular">{valor}</p>
        {nota ? <p className="text-2xs text-muted-foreground">{nota}</p> : null}
      </CardContent>
    </Card>
  );
}

function TablaPareto({ titulo, filas }: { titulo: string; filas: Dashboard['paretoCausas'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos en este periodo.</p>
        ) : (
          filas.map((f) => (
            <div key={f.etiqueta} className="space-y-0.5">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">{f.etiqueta}</span>
                <span className="tabular text-2xs text-muted-foreground">
                  {f.porcentaje.toFixed(1)}% · acum. {f.porcentajeAcumulado.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, f.porcentaje)}%` }} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardClient({ inicial, rangoInicial }: { inicial: Dashboard; rangoInicial: { desde: string; hasta: string } }) {
  const [rango, setRango] = React.useState(rangoInicial);
  const [datos, setDatos] = React.useState(inicial);
  const [cargando, setCargando] = React.useState(false);

  async function actualizar(nuevoRango: { desde: string; hasta: string }) {
    setCargando(true);
    try {
      const resultado = await obtenerDashboard(nuevoRango.desde, nuevoRango.hasta);
      setDatos(resultado);
      setRango(nuevoRango);
    } catch {
      toast.error('No se pudo actualizar el dashboard.');
    } finally {
      setCargando(false);
    }
  }

  function exportar() {
    const hoja1 = XLSX.utils.aoa_to_sheet([
      ['Indicador', 'Valor'],
      ['MTBF (horas)', datos.mtbf.mtbfHoras?.toFixed(1) ?? ''],
      ['MTTR (horas)', datos.mttr.mttrHoras?.toFixed(1) ?? ''],
      ['Disponibilidad (%)', datos.disponibilidad?.toFixed(1) ?? ''],
      ['Cumplimiento del plan (%)', datos.cumplimientoPlan.cumplimiento?.toFixed(1) ?? ''],
      ['Índice preventivo (%)', datos.preventivoCorrectivo.indice?.toFixed(1) ?? ''],
      ['Backlog (semanas)', datos.backlog.backlogSemanas?.toFixed(2) ?? ''],
      ['Rotación de inventario', datos.rotacionInventario.rotacion?.toFixed(2) ?? ''],
      ['Cumplimiento de SLA (%)', datos.cumplimientoSla.cumplimiento?.toFixed(1) ?? ''],
    ]);
    const hoja2 = XLSX.utils.aoa_to_sheet([
      ['Activo', 'Costo total'],
      ...datos.costoPorActivo.map((c) => [c.assetCodigo && c.assetNombre ? `${c.assetCodigo} — ${c.assetNombre}` : (c.assetNombre ?? ''), c.costoTotal]),
    ]);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja1, 'KPIs');
    XLSX.utils.book_append_sheet(libro, hoja2, 'Costo por activo');
    XLSX.writeFile(libro, `reportes_${rango.desde}_a_${rango.hasta}.xlsx`);
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-2 p-4">
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={() => actualizar({ desde: inicioDeMes(), hasta: hoy() })}>
              Mes actual
            </Button>
            <Button variant="outline" size="sm" onClick={() => actualizar({ desde: inicioDeAnio(), hasta: hoy() })}>
              Año actual
            </Button>
          </div>
          <div className="space-y-1">
            <Label className="text-2xs">Desde</Label>
            <Input type="date" value={rango.desde} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-2xs">Hasta</Label>
            <Input type="date" value={rango.hasta} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} />
          </div>
          <Button size="sm" onClick={() => actualizar(rango)} loading={cargando}>
            <RefreshCw aria-hidden />
            Actualizar
          </Button>
          <div className="ml-auto flex gap-1.5">
            <Button variant="outline" size="sm" asChild>
              <Link href="/reportes/balance">
                <ScrollText aria-hidden />
                Balance periódico
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={exportar}>
              {cargando ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
              Exportar a Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta titulo="MTBF" valor={datos.mtbf.mtbfHoras !== null ? `${datos.mtbf.mtbfHoras.toFixed(1)} h` : '—'} nota={`${datos.mtbf.fallas} falla(s)`} />
        <Tarjeta titulo="MTTR" valor={datos.mttr.mttrHoras !== null ? `${datos.mttr.mttrHoras.toFixed(1)} h` : '—'} nota={`${datos.mttr.reparaciones} reparación(es)`} />
        <Tarjeta titulo="Disponibilidad" valor={datos.disponibilidad !== null ? `${datos.disponibilidad.toFixed(1)}%` : '—'} />
        <Tarjeta titulo="Cumplimiento del plan" valor={datos.cumplimientoPlan.cumplimiento !== null ? `${datos.cumplimientoPlan.cumplimiento.toFixed(1)}%` : '—'} nota={`${datos.cumplimientoPlan.aTiempo}/${datos.cumplimientoPlan.programadas} a tiempo`} />
        <Tarjeta titulo="Índice preventivo" valor={datos.preventivoCorrectivo.indice !== null ? `${datos.preventivoCorrectivo.indice.toFixed(1)}%` : '—'} nota="del costo total de OT" />
        <Tarjeta titulo="Backlog" valor={datos.backlog.backlogSemanas !== null ? `${datos.backlog.backlogSemanas.toFixed(1)} sem.` : '—'} nota={`${datos.backlog.horasPendientes.toFixed(0)} h pendientes`} />
        <Tarjeta titulo="Rotación de inventario" valor={datos.rotacionInventario.rotacion !== null ? datos.rotacionInventario.rotacion.toFixed(2) : '—'} />
        <Tarjeta titulo="Cumplimiento de SLA" valor={datos.cumplimientoSla.cumplimiento !== null ? `${datos.cumplimientoSla.cumplimiento.toFixed(1)}%` : '—'} nota={`${datos.cumplimientoSla.aTiempo}/${datos.cumplimientoSla.total} a tiempo`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <TablaPareto titulo="Pareto — paros por causa de falla" filas={datos.paretoCausas} />
        <TablaPareto titulo="Pareto — costo de mantenimiento por activo" filas={datos.paretoCostos} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Costo por activo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {datos.costoPorActivo.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin órdenes cerradas en este periodo.</p>
          ) : (
            datos.costoPorActivo.map((c) => (
              <div key={c.assetId} className="flex items-center justify-between text-sm">
                <span>{c.assetCodigo} — {c.assetNombre}</span>
                <span className="tabular font-medium">{formatMoney(c.costoTotal)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
