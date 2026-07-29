'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { agregarMaterial, eliminarMaterial } from './actions';

type Linea = {
  id: string;
  materialId: string;
  materialCodigo: string | null;
  materialNombre: string | null;
  uomSimbolo: string | null;
  cantidadSolicitada: string;
  cantidadEntregada: string | null;
  costoUnitario: string | null;
  costoTotal: string | null;
  kardexMovementId: string | null;
};

export function MaterialesPanel({
  ordenId,
  lineasIniciales,
  materialesDisponibles,
  puedeEditar,
}: {
  ordenId: string;
  lineasIniciales: Linea[];
  materialesDisponibles: { value: string; label: string; codigo: string; uomSimbolo: string | null }[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [materialId, setMaterialId] = React.useState('');
  const [cantidad, setCantidad] = React.useState('');
  const [guardando, setGuardando] = React.useState(false);

  const totalCosto = lineasIniciales.reduce((sum, l) => sum + Number(l.costoTotal ?? 0), 0);

  async function agregar() {
    setGuardando(true);
    const resultado = await agregarMaterial(ordenId, materialId, cantidad);
    setGuardando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setMaterialId('');
    setCantidad('');
    router.refresh();
  }

  async function eliminar(id: string) {
    const resultado = await eliminarMaterial(ordenId, id);
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
            <CardTitle>Solicitar material</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-2xs">Material</Label>
              <Select value={materialId} onValueChange={setMaterialId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {materialesDisponibles.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.codigo} — {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-2xs">Cantidad</Label>
              <Input value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={agregar} loading={guardando}>
                <Plus aria-hidden />
                Solicitar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Materiales</CardTitle>
        </CardHeader>
        <CardContent>
          {lineasIniciales.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin materiales solicitados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Solicitada</TableHead>
                  <TableHead className="text-right">Entregada</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead>Estado</TableHead>
                  {puedeEditar ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineasIniciales.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      {l.materialCodigo} — {l.materialNombre}
                    </TableCell>
                    <TableCell className="text-right">
                      {l.cantidadSolicitada} {l.uomSimbolo}
                    </TableCell>
                    <TableCell className="text-right">{l.cantidadEntregada ?? '—'}</TableCell>
                    <TableCell className="text-right">{l.costoTotal ? Number(l.costoTotal).toFixed(2) : '—'}</TableCell>
                    <TableCell>
                      {l.kardexMovementId ? <Badge variant="success">Liquidado</Badge> : <Badge variant="neutral">Pendiente</Badge>}
                    </TableCell>
                    {puedeEditar ? (
                      <TableCell>
                        {!l.kardexMovementId ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => eliminar(l.id)}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-2 text-right text-sm font-medium">Total liquidado: {totalCosto.toFixed(2)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
