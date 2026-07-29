'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MODO_REPROGRAMACION_LABELS, TRIGGER_TIPO_LABELS, UNIDAD_INTERVALO_LABELS } from '@/lib/validators/plan';
import type { TriggerFormValues } from '@/lib/validators/plan';
import { agregarTrigger, alternarTrigger, eliminarTrigger } from './actions';

const SIN_VALOR = '__vacio__';

type Trigger = {
  id: string;
  tipo: 'CALENDARIO' | 'CONTADOR' | 'CONDICION' | 'EVENTO';
  activo: boolean;
  modoReprogramacion: 'FIJO' | 'FLOTANTE';
  diasAnticipacion: number;
  intervaloValor: number | null;
  intervaloUnidad: 'DIAS' | 'SEMANAS' | 'MESES' | 'ANIOS' | null;
  fechaBase: string | null;
  meterId: string | null;
  intervaloContador: string | null;
  umbralAviso: string | null;
  magnitudId: string | null;
  rangoMin: string | null;
  rangoMax: string | null;
  eventoDescripcion: string | null;
};

const VACIO: TriggerFormValues = { tipo: 'CALENDARIO', modoReprogramacion: 'FIJO', diasAnticipacion: 0 };

export function DisparadoresPanel({
  planId,
  triggersIniciales,
  meters,
  puedeEditar,
}: {
  planId: string;
  triggersIniciales: Trigger[];
  meters: { value: string; label: string }[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState<TriggerFormValues>(VACIO);
  const [guardando, setGuardando] = React.useState(false);

  function patch(cambios: Partial<TriggerFormValues>) {
    setForm((prev) => ({ ...prev, ...cambios }));
  }

  async function agregar() {
    setGuardando(true);
    const resultado = await agregarTrigger(planId, form);
    setGuardando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setForm(VACIO);
    router.refresh();
  }

  async function eliminar(id: string) {
    const resultado = await eliminarTrigger(planId, id);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    router.refresh();
  }

  async function alternar(id: string, activo: boolean) {
    const resultado = await alternarTrigger(planId, id, activo);
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
            <CardTitle>Agregar disparador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-2xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => patch({ tipo: v as TriggerFormValues['tipo'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGER_TIPO_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-2xs">Reprogramación</Label>
                <Select value={form.modoReprogramacion} onValueChange={(v) => patch({ modoReprogramacion: v as TriggerFormValues['modoReprogramacion'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MODO_REPROGRAMACION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-2xs">Días de anticipación</Label>
                <Input type="number" min={0} value={form.diasAnticipacion} onChange={(e) => patch({ diasAnticipacion: Number(e.target.value) })} />
              </div>
            </div>

            {form.tipo === 'CALENDARIO' ? (
              <div className="grid grid-cols-2 gap-2 rounded-[8px] border p-2 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-2xs">Cada</Label>
                  <Input value={form.intervaloValor ?? ''} onChange={(e) => patch({ intervaloValor: e.target.value })} placeholder="Ej. 3" />
                </div>
                <div className="space-y-1">
                  <Label className="text-2xs">Unidad</Label>
                  <Select value={form.intervaloUnidad ?? SIN_VALOR} onValueChange={(v) => patch({ intervaloUnidad: v === SIN_VALOR ? undefined : (v as TriggerFormValues['intervaloUnidad']) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNIDAD_INTERVALO_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-2xs">Fecha base</Label>
                  <Input type="date" value={form.fechaBase ?? ''} onChange={(e) => patch({ fechaBase: e.target.value })} />
                </div>
              </div>
            ) : null}

            {form.tipo === 'CONTADOR' ? (
              <div className="grid grid-cols-2 gap-2 rounded-[8px] border p-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-2xs">Medidor</Label>
                  <Select value={form.meterId ?? SIN_VALOR} onValueChange={(v) => patch({ meterId: v === SIN_VALOR ? undefined : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {meters.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-2xs">Cada (unidades del medidor)</Label>
                  <Input value={form.intervaloContador ?? ''} onChange={(e) => patch({ intervaloContador: e.target.value })} placeholder="Ej. 250" />
                </div>
                <div className="space-y-1">
                  <Label className="text-2xs">Umbral de aviso (opcional)</Label>
                  <Input value={form.umbralAviso ?? ''} onChange={(e) => patch({ umbralAviso: e.target.value })} />
                </div>
                <p className="col-span-full text-2xs text-muted-foreground">
                  La fecha probable se proyecta con el promedio de uso diario registrado en el medidor del activo.
                </p>
              </div>
            ) : null}

            {form.tipo === 'CONDICION' || form.tipo === 'EVENTO' ? (
              <p className="rounded-[8px] border border-warning/30 bg-warning/5 p-2 text-2xs text-muted-foreground">
                Este tipo de disparador queda registrado, pero su evaluación automática todavía no está implementada (ver deuda técnica en ENTREGA-FASE-7.md). No generará órdenes por sí solo.
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button onClick={agregar} loading={guardando}>
                <Plus aria-hidden />
                Agregar disparador
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-2">
        {triggersIniciales.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin disparadores configurados.</p>
        ) : (
          triggersIniciales.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-start justify-between gap-2 pt-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{TRIGGER_TIPO_LABELS[t.tipo]}</Badge>
                    <Badge variant={t.activo ? 'success' : 'neutral'}>{t.activo ? 'Activo' : 'Inactivo'}</Badge>
                    <span className="text-2xs text-muted-foreground">{MODO_REPROGRAMACION_LABELS[t.modoReprogramacion]}</span>
                  </div>
                  {t.tipo === 'CALENDARIO' ? (
                    <p>
                      Cada {t.intervaloValor} {t.intervaloUnidad ? UNIDAD_INTERVALO_LABELS[t.intervaloUnidad] : ''} desde {t.fechaBase} · {t.diasAnticipacion} días de anticipación
                    </p>
                  ) : null}
                  {t.tipo === 'CONTADOR' ? <p>Cada {t.intervaloContador} unidades del medidor · {t.diasAnticipacion} días de anticipación</p> : null}
                  {t.tipo === 'CONDICION' || t.tipo === 'EVENTO' ? <p className="text-muted-foreground">Evaluación automática diferida</p> : null}
                </div>
                {puedeEditar ? (
                  <div className="flex items-center gap-1">
                    <label className="flex items-center gap-1 text-2xs">
                      <Checkbox checked={t.activo} onCheckedChange={(v) => alternar(t.id, Boolean(v))} />
                      Activo
                    </label>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => eliminar(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
