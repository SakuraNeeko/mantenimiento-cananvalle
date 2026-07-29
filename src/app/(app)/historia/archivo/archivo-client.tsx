'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Archive, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { fmtDate } from '@/lib/datetime';
import { formatMoney } from '@/lib/utils';
import { archivarAnio, restaurarDeArchivo } from '../actions';

type FilaArchivo = { id: string; consecutivo: string; assetCodigo: string | null; assetNombre: string | null; fechaFinReal: Date | null; costoTotal: string; archivedAt: Date };

export function ArchivoClient({ filas, puedeArchivar, puedeRestaurar }: { filas: FilaArchivo[]; puedeArchivar: boolean; puedeRestaurar: boolean }) {
  const router = useRouter();
  const [anio, setAnio] = React.useState(String(new Date().getFullYear() - 1));
  const [procesando, setProcesando] = React.useState(false);

  async function archivar() {
    setProcesando(true);
    const resultado = await archivarAnio(Number(anio));
    setProcesando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Historia archivada.');
    router.refresh();
  }

  async function restaurar(id: string) {
    const resultado = await restaurarDeArchivo(id);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Registro restaurado a Historia.');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {puedeArchivar ? (
        <Card>
          <CardHeader>
            <CardTitle>Archivar un año</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-2xs">Año</Label>
              <Input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} className="w-32" />
            </div>
            <Button onClick={archivar} loading={procesando}>
              <Archive aria-hidden />
              Archivar {anio}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {filas.length === 0 ? (
        <EmptyState icon={Archive} titulo="Sin historia archivada" descripcion="Los registros de años anteriores que archives aparecerán aquí, de solo lectura." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Historia archivada ({filas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consecutivo</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>Cerrada</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  {puedeRestaurar ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-codigo text-xs">{f.consecutivo}</TableCell>
                    <TableCell>{f.assetCodigo} — {f.assetNombre}</TableCell>
                    <TableCell>{fmtDate(f.fechaFinReal)}</TableCell>
                    <TableCell className="text-right">{formatMoney(f.costoTotal)}</TableCell>
                    {puedeRestaurar ? (
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => restaurar(f.id)}>
                          <Undo2 aria-hidden />
                          Restaurar
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
