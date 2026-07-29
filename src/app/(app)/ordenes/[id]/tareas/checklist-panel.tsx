'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { agregarTarea, completarTarea, eliminarTarea, reabrirTarea } from './actions';

type Tarea = {
  id: string;
  orden: number;
  descripcion: string;
  tipoRespuesta: 'OK_NO_OK' | 'NUMERICO' | 'TEXTO' | 'FOTO' | 'FIRMA';
  esCritica: boolean;
  resultado: string | null;
  valorMedido: string | null;
  observacion: string | null;
  completadaAt: Date | null;
};

const TIPO_LABELS: Record<Tarea['tipoRespuesta'], string> = {
  OK_NO_OK: 'OK / No OK',
  NUMERICO: 'Numérico',
  TEXTO: 'Texto',
  FOTO: 'Foto',
  FIRMA: 'Firma',
};

export function ChecklistPanel({
  ordenId,
  tareasIniciales,
  puedeEditar,
  puedeCompletar,
}: {
  ordenId: string;
  tareasIniciales: Tarea[];
  puedeEditar: boolean;
  puedeCompletar: boolean;
}) {
  const router = useRouter();
  const [descripcion, setDescripcion] = React.useState('');
  const [tipoRespuesta, setTipoRespuesta] = React.useState<Tarea['tipoRespuesta']>('OK_NO_OK');
  const [esCritica, setEsCritica] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);

  async function agregar() {
    if (!descripcion.trim()) {
      toast.error('Describe la tarea.');
      return;
    }
    setGuardando(true);
    const resultado = await agregarTarea(ordenId, descripcion, tipoRespuesta, esCritica);
    setGuardando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setDescripcion('');
    setEsCritica(false);
    router.refresh();
  }

  async function eliminar(tareaId: string) {
    const resultado = await eliminarTarea(ordenId, tareaId);
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
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-6">
            <div className="space-y-1 sm:col-span-3">
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
            <label className="flex items-center gap-2 self-end text-sm">
              <Checkbox checked={esCritica} onCheckedChange={(v) => setEsCritica(Boolean(v))} />
              Crítica
            </label>
            <div className="flex items-end">
              <Button className="w-full" onClick={agregar} loading={guardando}>
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
            <TareaItem key={tarea.id} ordenId={ordenId} tarea={tarea} puedeEditar={puedeEditar} puedeCompletar={puedeCompletar} onEliminar={() => eliminar(tarea.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function TareaItem({
  ordenId,
  tarea,
  puedeEditar,
  puedeCompletar,
  onEliminar,
}: {
  ordenId: string;
  tarea: Tarea;
  puedeEditar: boolean;
  puedeCompletar: boolean;
  onEliminar: () => void;
}) {
  const router = useRouter();
  const [resultado, setResultado] = React.useState(tarea.resultado ?? '');
  const [valorMedido, setValorMedido] = React.useState(tarea.valorMedido ?? '');
  const [observacion, setObservacion] = React.useState(tarea.observacion ?? '');
  const [guardando, setGuardando] = React.useState(false);

  const completada = Boolean(tarea.completadaAt);

  async function completar() {
    setGuardando(true);
    const resp = await completarTarea(ordenId, tarea.id, { resultado, valorMedido, observacion });
    setGuardando(false);
    if (!resp.ok) {
      toast.error(resp.error);
      return;
    }
    toast.success('Ítem completado.');
    router.refresh();
  }

  async function reabrir() {
    const resp = await reabrirTarea(ordenId, tarea.id);
    if (!resp.ok) {
      toast.error(resp.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">
              {tarea.orden}. {tarea.descripcion}
              {tarea.esCritica ? <Badge variant="destructive" className="ml-2">Crítica</Badge> : null}
            </p>
            <p className="text-2xs text-muted-foreground">{TIPO_LABELS[tarea.tipoRespuesta]}</p>
          </div>
          <div className="flex items-center gap-1">
            {completada ? <Badge variant="success">Completada</Badge> : <Badge variant="neutral">Pendiente</Badge>}
            {puedeEditar && !completada ? (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEliminar}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            ) : null}
          </div>
        </div>

        {completada ? (
          <div className="space-y-1 rounded-[6px] border bg-muted/30 p-2 text-sm">
            {tarea.resultado ? <p>Resultado: {tarea.resultado}</p> : null}
            {tarea.valorMedido ? <p>Valor medido: {tarea.valorMedido}</p> : null}
            {tarea.observacion ? <p className="text-muted-foreground">{tarea.observacion}</p> : null}
            {puedeCompletar ? (
              <Button variant="outline" size="sm" onClick={reabrir}>
                <Undo2 aria-hidden />
                Reabrir
              </Button>
            ) : null}
          </div>
        ) : puedeCompletar ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {tarea.tipoRespuesta === 'OK_NO_OK' ? (
              <Select value={resultado} onValueChange={setResultado}>
                <SelectTrigger>
                  <SelectValue placeholder="Resultado…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="NO_OK">No OK</SelectItem>
                </SelectContent>
              </Select>
            ) : tarea.tipoRespuesta === 'NUMERICO' ? (
              <Input placeholder="Valor medido" value={valorMedido} onChange={(e) => setValorMedido(e.target.value)} />
            ) : (
              <Input placeholder="Resultado" value={resultado} onChange={(e) => setResultado(e.target.value)} />
            )}
            <Textarea className="sm:col-span-2" rows={1} placeholder="Observación (opcional)" value={observacion} onChange={(e) => setObservacion(e.target.value)} />
            <Button size="sm" onClick={completar} loading={guardando}>
              Completar
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
