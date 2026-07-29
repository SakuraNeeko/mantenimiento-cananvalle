'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { agregarTareaPlan, eliminarTareaPlan } from './actions';

type Tarea = {
  id: string;
  orden: number;
  descripcion: string;
  tipoRespuesta: 'OK_NO_OK' | 'NUMERICO' | 'TEXTO' | 'FOTO' | 'FIRMA';
  esCritica: boolean;
  tradeId: string | null;
  tradeNombre: string | null;
  duracionMinutos: number | null;
};

const TIPO_LABELS: Record<Tarea['tipoRespuesta'], string> = {
  OK_NO_OK: 'OK / No OK',
  NUMERICO: 'Numérico',
  TEXTO: 'Texto',
  FOTO: 'Foto',
  FIRMA: 'Firma',
};

const SIN_VALOR = '__vacio__';

export function ChecklistPlanPanel({
  planId,
  tareasIniciales,
  oficios,
  puedeEditar,
}: {
  planId: string;
  tareasIniciales: Tarea[];
  oficios: { value: string; label: string }[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [descripcion, setDescripcion] = React.useState('');
  const [tipoRespuesta, setTipoRespuesta] = React.useState<Tarea['tipoRespuesta']>('OK_NO_OK');
  const [esCritica, setEsCritica] = React.useState(false);
  const [tradeId, setTradeId] = React.useState('');
  const [duracionMinutos, setDuracionMinutos] = React.useState('');
  const [guardando, setGuardando] = React.useState(false);

  async function agregar() {
    setGuardando(true);
    const resultado = await agregarTareaPlan(planId, { descripcion, tipoRespuesta, esCritica, tradeId: tradeId || undefined, duracionMinutos: duracionMinutos || undefined });
    setGuardando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setDescripcion('');
    setEsCritica(false);
    setTradeId('');
    setDuracionMinutos('');
    router.refresh();
  }

  async function eliminar(id: string) {
    const resultado = await eliminarTareaPlan(planId, id);
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
            <CardTitle>Agregar ítem al checklist</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-2xs">Descripción</Label>
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Verificar nivel de aceite" />
            </div>
            <div className="space-y-1">
              <Label className="text-2xs">Tipo de respuesta</Label>
              <Select value={tipoRespuesta} onValueChange={(v) => setTipoRespuesta(v as Tarea['tipoRespuesta'])}>
                <SelectTrigger>
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
              <Label className="text-2xs">Oficio</Label>
              <Select value={tradeId || SIN_VALOR} onValueChange={(v) => setTradeId(v === SIN_VALOR ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Cualquiera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>Cualquiera</SelectItem>
                  {oficios.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-2xs">Duración (min)</Label>
              <Input value={duracionMinutos} onChange={(e) => setDuracionMinutos(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 self-end text-sm">
              <Checkbox checked={esCritica} onCheckedChange={(v) => setEsCritica(Boolean(v))} />
              Crítica
            </label>
            <div className="col-span-2 flex items-end sm:col-span-6">
              <Button onClick={agregar} loading={guardando}>
                <Plus aria-hidden />
                Agregar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-2">
        {tareasIniciales.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ítems en el checklist.</p>
        ) : (
          tareasIniciales.map((tarea) => (
            <Card key={tarea.id}>
              <CardContent className="flex items-start justify-between gap-2 pt-4 text-sm">
                <div>
                  <p className="font-medium">
                    {tarea.orden}. {tarea.descripcion}
                    {tarea.esCritica ? (
                      <Badge variant="destructive" className="ml-2">
                        Crítica
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-2xs text-muted-foreground">
                    {TIPO_LABELS[tarea.tipoRespuesta]}
                    {tarea.tradeNombre ? ` · ${tarea.tradeNombre}` : ''}
                    {tarea.duracionMinutos ? ` · ${tarea.duracionMinutos} min` : ''}
                  </p>
                </div>
                {puedeEditar ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => eliminar(tarea.id)}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
