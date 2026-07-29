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
import { agregarRecursoManoObra, agregarRecursoMaterial, eliminarRecurso } from './actions';

type Recurso = {
  id: string;
  tipo: 'MANO_OBRA' | 'MATERIAL';
  tradeId: string | null;
  tradeNombre: string | null;
  horasEstimadas: string | null;
  materialId: string | null;
  materialCodigo: string | null;
  materialNombre: string | null;
  cantidadEstimada: string | null;
  costoEstimado: string | null;
};

export function RecursosPanel({
  planId,
  recursosIniciales,
  trades,
  materials,
  puedeEditar,
}: {
  planId: string;
  recursosIniciales: Recurso[];
  trades: { value: string; label: string }[];
  materials: { value: string; label: string; codigo: string }[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [tradeId, setTradeId] = React.useState('');
  const [horas, setHoras] = React.useState('');
  const [materialId, setMaterialId] = React.useState('');
  const [cantidad, setCantidad] = React.useState('');
  const [guardandoLabor, setGuardandoLabor] = React.useState(false);
  const [guardandoMaterial, setGuardandoMaterial] = React.useState(false);

  const manoObra = recursosIniciales.filter((r) => r.tipo === 'MANO_OBRA');
  const material = recursosIniciales.filter((r) => r.tipo === 'MATERIAL');

  async function agregarLabor() {
    setGuardandoLabor(true);
    const resultado = await agregarRecursoManoObra(planId, { tradeId, horasEstimadas: horas });
    setGuardandoLabor(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setTradeId('');
    setHoras('');
    router.refresh();
  }

  async function agregarMat() {
    setGuardandoMaterial(true);
    const resultado = await agregarRecursoMaterial(planId, { materialId, cantidadEstimada: cantidad });
    setGuardandoMaterial(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setMaterialId('');
    setCantidad('');
    router.refresh();
  }

  async function eliminar(id: string) {
    const resultado = await eliminarRecurso(planId, id);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Mano de obra prevista</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {puedeEditar ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-2xs">Oficio</Label>
                <Select value={tradeId} onValueChange={setTradeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona…" />
                  </SelectTrigger>
                  <SelectContent>
                    {trades.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-2xs">Horas estimadas</Label>
                <Input value={horas} onChange={(e) => setHoras(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={agregarLabor} loading={guardandoLabor}>
                  <Plus aria-hidden />
                  Agregar
                </Button>
              </div>
            </div>
          ) : null}

          {manoObra.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin mano de obra prevista.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Oficio</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  {puedeEditar ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {manoObra.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.tradeNombre}</TableCell>
                    <TableCell className="text-right">{r.horasEstimadas}</TableCell>
                    {puedeEditar ? (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => eliminar(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Materiales previstos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {puedeEditar ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-2xs">Material</Label>
                <Select value={materialId} onValueChange={setMaterialId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona…" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.codigo} — {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-2xs">Cantidad estimada</Label>
                <Input value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={agregarMat} loading={guardandoMaterial}>
                  <Plus aria-hidden />
                  Agregar
                </Button>
              </div>
            </div>
          ) : null}

          {material.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin materiales previstos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  {puedeEditar ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {material.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.materialCodigo} — {r.materialNombre}
                    </TableCell>
                    <TableCell className="text-right">{r.cantidadEstimada}</TableCell>
                    {puedeEditar ? (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => eliminar(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
