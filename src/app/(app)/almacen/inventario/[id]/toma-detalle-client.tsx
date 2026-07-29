'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber } from '@/lib/utils';
import { confirmarInventarioFisico, guardarConteo, type obtenerInventarioFisico } from '../actions';

type Toma = NonNullable<Awaited<ReturnType<typeof obtenerInventarioFisico>>>;

export function TomaDetalleClient({ toma, puedeConfirmar }: { toma: Toma; puedeConfirmar: boolean }) {
  const router = useRouter();
  const [valores, setValores] = React.useState<Record<string, string>>(() => Object.fromEntries(toma.lineas.map((l) => [l.id, l.cantidadContada ?? ''])));
  const [guardandoId, setGuardandoId] = React.useState<string | null>(null);
  const [confirmando, setConfirmando] = React.useState(false);

  const esBorrador = toma.estado === 'BORRADOR';

  async function guardarLinea(lineaId: string) {
    setGuardandoId(lineaId);
    const resultado = await guardarConteo(toma.id, lineaId, valores[lineaId] ?? '');
    setGuardandoId(null);
    if (!resultado.ok) toast.error(resultado.error);
  }

  async function confirmar() {
    const pendientes = toma.lineas.filter((l) => !valores[l.id]?.trim()).length;
    if (pendientes > 0 && !window.confirm(`${pendientes} materiales no tienen conteo registrado y se asumirán sin diferencia. ¿Confirmar de todas formas?`)) {
      return;
    }
    setConfirmando(true);
    const resultado = await confirmarInventarioFisico(toma.id);
    setConfirmando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Toma confirmada. Se generaron los ajustes correspondientes.');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant={toma.estado === 'CONFIRMADO' ? 'success' : 'warning'}>{toma.estado === 'CONFIRMADO' ? 'Confirmado' : 'Borrador'}</Badge>
        {esBorrador && puedeConfirmar ? (
          <Button size="sm" onClick={confirmar} loading={confirmando}>
            <CheckCircle2 aria-hidden />
            Confirmar y generar ajustes
          </Button>
        ) : null}
      </div>

      <div className="overflow-auto rounded-[8px] border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Sistema</TableHead>
              <TableHead className="text-right">Contado</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
              {esBorrador ? <TableHead /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {toma.lineas.map((l) => {
              const contado = valores[l.id];
              const diferencia = contado?.trim() ? Number(contado) - Number(l.cantidadSistema) : null;
              return (
                <TableRow key={l.id}>
                  <TableCell>
                    <span className="font-codigo text-2xs text-muted-foreground">{l.materialCodigo}</span> {l.materialNombre}
                  </TableCell>
                  <TableCell className="tabular text-right">{formatNumber(l.cantidadSistema)}</TableCell>
                  <TableCell className="text-right">
                    {esBorrador ? (
                      <Input
                        className="ml-auto w-28 text-right"
                        value={contado}
                        onChange={(e) => setValores((prev) => ({ ...prev, [l.id]: e.target.value }))}
                        onBlur={() => guardarLinea(l.id)}
                        disabled={guardandoId === l.id}
                      />
                    ) : (
                      <span className="tabular">{l.cantidadContada ? formatNumber(l.cantidadContada) : '—'}</span>
                    )}
                  </TableCell>
                  <TableCell className={`tabular text-right ${diferencia && diferencia !== 0 ? (diferencia > 0 ? 'text-success' : 'text-destructive') : ''}`}>
                    {diferencia !== null ? (diferencia > 0 ? `+${formatNumber(diferencia)}` : formatNumber(diferencia)) : '—'}
                  </TableCell>
                  {esBorrador ? <TableCell /> : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
