'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatMoney } from '@/lib/utils';
import { generarBalance } from '../actions';

type Balance = {
  id: string;
  tipo: 'MES' | 'TRIMESTRE' | 'ANIO';
  anio: number;
  numero: number;
  costoTotal: string;
  otCerradas: number;
  cumplimientoPlan: string | null;
  disponibilidad: string | null;
};

const TIPO_LABELS: Record<Balance['tipo'], string> = { MES: 'Mensual', TRIMESTRE: 'Trimestral', ANIO: 'Anual' };
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function etiquetaPeriodo(b: Balance): string {
  if (b.tipo === 'ANIO') return String(b.anio);
  if (b.tipo === 'TRIMESTRE') return `T${b.numero} ${b.anio}`;
  return `${MESES[b.numero - 1] ?? b.numero} ${b.anio}`;
}

export function BalanceClient({ balances: balancesIniciales }: { balances: Balance[] }) {
  const router = useRouter();
  const [tipo, setTipo] = React.useState<Balance['tipo']>('MES');
  const [anio, setAnio] = React.useState(String(new Date().getFullYear()));
  const [numero, setNumero] = React.useState(String(new Date().getMonth() + 1));
  const [generando, setGenerando] = React.useState(false);

  async function generar() {
    setGenerando(true);
    const resultado = await generarBalance(tipo, Number(anio), tipo === 'ANIO' ? null : Number(numero));
    setGenerando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Balance generado.');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Generar balance periódico</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-2xs">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Balance['tipo'])}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-2xs">Año</Label>
            <Input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} className="w-28" />
          </div>
          {tipo !== 'ANIO' ? (
            <div className="space-y-1">
              <Label className="text-2xs">{tipo === 'MES' ? 'Mes (1-12)' : 'Trimestre (1-4)'}</Label>
              <Input type="number" min={1} max={tipo === 'MES' ? 12 : 4} value={numero} onChange={(e) => setNumero(e.target.value)} className="w-24" />
            </div>
          ) : null}
          <Button onClick={generar} loading={generando}>
            <Sparkles aria-hidden />
            Generar
          </Button>
        </CardContent>
      </Card>

      {balancesIniciales.length === 0 ? (
        <EmptyState icon={Sparkles} titulo="Sin balances generados" descripcion="Genera el balance de un periodo para dejar un cierre inmutable de costos y cumplimiento." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Balances generados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">OT cerradas</TableHead>
                  <TableHead className="text-right">Costo total</TableHead>
                  <TableHead className="text-right">Cumplimiento plan</TableHead>
                  <TableHead className="text-right">Disponibilidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balancesIniciales.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{etiquetaPeriodo(b)}</TableCell>
                    <TableCell>{TIPO_LABELS[b.tipo]}</TableCell>
                    <TableCell className="text-right">{b.otCerradas}</TableCell>
                    <TableCell className="text-right">{formatMoney(b.costoTotal)}</TableCell>
                    <TableCell className="text-right">{b.cumplimientoPlan ? `${Number(b.cumplimientoPlan).toFixed(1)}%` : '—'}</TableCell>
                    <TableCell className="text-right">{b.disponibilidad ? `${Number(b.disponibilidad).toFixed(1)}%` : '—'}</TableCell>
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
