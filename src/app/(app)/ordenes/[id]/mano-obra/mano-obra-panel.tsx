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
import { fmtDate } from '@/lib/datetime';
import { agregarManoObra, eliminarManoObra } from './actions';

type Linea = {
  id: string;
  responsibleId: string | null;
  responsableNombre: string | null;
  fecha: string;
  horasNormales: string;
  horasExtras: string;
  horasNocturnas: string;
  costoCalculado: string;
};

export function ManoObraPanel({
  ordenId,
  lineasIniciales,
  responsables,
  puedeEditar,
}: {
  ordenId: string;
  lineasIniciales: Linea[];
  responsables: { value: string; label: string }[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [responsibleId, setResponsibleId] = React.useState('');
  const [fecha, setFecha] = React.useState(new Date().toISOString().slice(0, 10));
  const [horasNormales, setHorasNormales] = React.useState('0');
  const [horasExtras, setHorasExtras] = React.useState('0');
  const [horasNocturnas, setHorasNocturnas] = React.useState('0');
  const [guardando, setGuardando] = React.useState(false);

  const total = lineasIniciales.reduce((sum, l) => sum + Number(l.costoCalculado), 0);

  async function agregar() {
    setGuardando(true);
    const resultado = await agregarManoObra(ordenId, { responsibleId, fecha, horasNormales, horasExtras, horasNocturnas });
    setGuardando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setResponsibleId('');
    setHorasNormales('0');
    setHorasExtras('0');
    setHorasNocturnas('0');
    router.refresh();
  }

  async function eliminar(id: string) {
    const resultado = await eliminarManoObra(ordenId, id);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {puedeEditar ? (
        <Card>
          <CardHeader>
            <CardTitle>Registrar horas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-2xs">Responsable</Label>
              <Select value={responsibleId} onValueChange={setResponsibleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {responsables.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-2xs">Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-2xs">Horas normales</Label>
              <Input value={horasNormales} onChange={(e) => setHorasNormales(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-2xs">Horas extras</Label>
              <Input value={horasExtras} onChange={(e) => setHorasExtras(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-2xs">Horas nocturnas</Label>
              <Input value={horasNocturnas} onChange={(e) => setHorasNocturnas(e.target.value)} />
            </div>
            <div className="col-span-2 flex items-end sm:col-span-6">
              <Button onClick={agregar} loading={guardando}>
                <Plus aria-hidden />
                Agregar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Horas registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {lineasIniciales.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin horas registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Normales</TableHead>
                  <TableHead className="text-right">Extras</TableHead>
                  <TableHead className="text-right">Nocturnas</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  {puedeEditar ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineasIniciales.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.responsableNombre ?? '—'}</TableCell>
                    <TableCell>{fmtDate(l.fecha)}</TableCell>
                    <TableCell className="text-right">{l.horasNormales}</TableCell>
                    <TableCell className="text-right">{l.horasExtras}</TableCell>
                    <TableCell className="text-right">{l.horasNocturnas}</TableCell>
                    <TableCell className="text-right">{Number(l.costoCalculado).toFixed(2)}</TableCell>
                    {puedeEditar ? (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => eliminar(l.id)}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-2 text-right text-sm font-medium">Total: {total.toFixed(2)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
