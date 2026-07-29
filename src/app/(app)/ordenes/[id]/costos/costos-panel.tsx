'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { agregarCostoOtro, agregarCostoTercero, eliminarCostoOtro, eliminarCostoTercero } from './actions';

const SIN_VALOR = '__vacio__';

type Tercero = { id: string; partyId: string | null; partyNombre: string | null; descripcion: string; monto: string };
type Otro = { id: string; otherCostConceptId: string | null; conceptoNombre: string | null; descripcion: string; monto: string };

export function CostosPanel({
  ordenId,
  resumen,
  terceros,
  otros,
  opciones,
  puedeEditar,
}: {
  ordenId: string;
  resumen: { manoObra: string; materiales: string; terceros: string; otros: string; total: string; estado: string };
  terceros: Tercero[];
  otros: Otro[];
  opciones: { parties: { value: string; label: string }[]; conceptos: { value: string; label: string }[] } | null;
  puedeEditar: boolean;
}) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Resumen de costos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-5">
          <Resumen etiqueta="Mano de obra" valor={resumen.manoObra} />
          <Resumen etiqueta="Materiales" valor={resumen.materiales} />
          <Resumen etiqueta="Terceros" valor={resumen.terceros} />
          <Resumen etiqueta="Otros" valor={resumen.otros} />
          <Resumen etiqueta="Total" valor={resumen.total} destacado />
          {resumen.estado === 'BORRADOR' || ['BORRADOR', 'PLANIFICADA'].includes(resumen.estado) ? (
            <p className="col-span-full text-2xs text-muted-foreground">Los totales se recalculan al liquidar la orden; mientras tanto reflejan lo registrado hasta ahora.</p>
          ) : null}
        </CardContent>
      </Card>

      <CostoLista
        titulo="Costos de terceros"
        lineas={terceros.map((t) => ({ id: t.id, etiqueta: t.partyNombre, descripcion: t.descripcion, monto: t.monto }))}
        opciones={opciones?.parties ?? []}
        placeholderSelect="Tercero (opcional)"
        puedeEditar={puedeEditar}
        onAgregar={async (seleccionId, descripcion, monto) => {
          const resultado = await agregarCostoTercero(ordenId, { partyId: seleccionId, descripcion, monto });
          if (!resultado.ok) {
            toast.error(resultado.error);
            return false;
          }
          router.refresh();
          return true;
        }}
        onEliminar={async (id) => {
          const resultado = await eliminarCostoTercero(ordenId, id);
          if (!resultado.ok) {
            toast.error(resultado.error);
            return;
          }
          router.refresh();
        }}
      />

      <CostoLista
        titulo="Otros costos"
        lineas={otros.map((o) => ({ id: o.id, etiqueta: o.conceptoNombre, descripcion: o.descripcion, monto: o.monto }))}
        opciones={opciones?.conceptos ?? []}
        placeholderSelect="Concepto (opcional)"
        puedeEditar={puedeEditar}
        onAgregar={async (seleccionId, descripcion, monto) => {
          const resultado = await agregarCostoOtro(ordenId, { otherCostConceptId: seleccionId, descripcion, monto });
          if (!resultado.ok) {
            toast.error(resultado.error);
            return false;
          }
          router.refresh();
          return true;
        }}
        onEliminar={async (id) => {
          const resultado = await eliminarCostoOtro(ordenId, id);
          if (!resultado.ok) {
            toast.error(resultado.error);
            return;
          }
          router.refresh();
        }}
      />
    </div>
  );
}

function Resumen({ etiqueta, valor, destacado }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <div>
      <p className="text-2xs text-muted-foreground">{etiqueta}</p>
      <p className={destacado ? 'text-base font-semibold' : ''}>{Number(valor).toFixed(2)}</p>
    </div>
  );
}

function CostoLista({
  titulo,
  lineas,
  opciones,
  placeholderSelect,
  puedeEditar,
  onAgregar,
  onEliminar,
}: {
  titulo: string;
  lineas: { id: string; etiqueta: string | null; descripcion: string; monto: string }[];
  opciones: { value: string; label: string }[];
  placeholderSelect: string;
  puedeEditar: boolean;
  onAgregar: (seleccionId: string | undefined, descripcion: string, monto: string) => Promise<boolean>;
  onEliminar: (id: string) => Promise<void>;
}) {
  const [seleccion, setSeleccion] = React.useState('');
  const [descripcion, setDescripcion] = React.useState('');
  const [monto, setMonto] = React.useState('');
  const [guardando, setGuardando] = React.useState(false);

  const total = lineas.reduce((sum, l) => sum + Number(l.monto), 0);

  async function agregar() {
    setGuardando(true);
    const ok = await onAgregar(seleccion === SIN_VALOR || !seleccion ? undefined : seleccion, descripcion, monto);
    setGuardando(false);
    if (ok) {
      setSeleccion('');
      setDescripcion('');
      setMonto('');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {puedeEditar ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-2xs">{placeholderSelect}</Label>
              <Select value={seleccion || SIN_VALOR} onValueChange={setSeleccion}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>Sin especificar</SelectItem>
                  {opciones.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-2xs">Descripción</Label>
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-2xs">Monto</Label>
              <Input value={monto} onChange={(e) => setMonto(e.target.value)} />
            </div>
            <div className="col-span-2 flex items-end sm:col-span-4">
              <Button onClick={agregar} loading={guardando}>
                <Plus aria-hidden />
                Agregar
              </Button>
            </div>
          </div>
        ) : null}

        {lineas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin registros.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                {puedeEditar ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineas.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.etiqueta ?? '—'}</TableCell>
                  <TableCell>{l.descripcion}</TableCell>
                  <TableCell className="text-right">{Number(l.monto).toFixed(2)}</TableCell>
                  {puedeEditar ? (
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEliminar(l.id)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="text-right text-sm font-medium">Total: {total.toFixed(2)}</p>
      </CardContent>
    </Card>
  );
}
