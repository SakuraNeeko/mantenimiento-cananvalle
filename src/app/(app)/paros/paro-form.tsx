'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { TIPO_LABELS, paroBaseSchema, type ParoFormValues } from '@/lib/validators/paro';
import type { OpcionesParo } from './actions';

const SIN_VALOR = '__vacio__';

function ahoraLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const VALORES_INICIALES: ParoFormValues = { assetId: '', tipo: 'NO_PROGRAMADO', fechaInicio: ahoraLocal() };

export function ParoForm({
  opciones,
  valoresPrevios,
  textoBoton = 'Registrar paro',
  onGuardado,
}: {
  opciones: OpcionesParo;
  valoresPrevios?: ParoFormValues;
  textoBoton?: string;
  onGuardado: (valores: ParoFormValues) => Promise<void> | void;
}) {
  const form = useForm<ParoFormValues>({
    resolver: zodResolver(paroBaseSchema),
    defaultValues: valoresPrevios ?? VALORES_INICIALES,
  });

  async function onSubmit(valores: ParoFormValues) {
    await onGuardado(valores);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Activo</Label>
              <Select value={form.watch('assetId')} onValueChange={(v) => form.setValue('assetId', v)}>
                <SelectTrigger aria-invalid={Boolean(form.formState.errors.assetId)}>
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {opciones.assets.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.assetId ? <p className="text-2xs text-destructive">{form.formState.errors.assetId.message}</p> : null}
            </div>

            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.watch('tipo')} onValueChange={(v) => form.setValue('tipo', v as ParoFormValues['tipo'])}>
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

            <div className="space-y-1 col-span-2">
              <Label htmlFor="fechaInicio">Fecha y hora de inicio</Label>
              <Input id="fechaInicio" type="datetime-local" {...form.register('fechaInicio')} aria-invalid={Boolean(form.formState.errors.fechaInicio)} />
              {form.formState.errors.fechaInicio ? <p className="text-2xs text-destructive">{form.formState.errors.fechaInicio.message}</p> : null}
            </div>

            <div className="space-y-1">
              <Label>Causa de falla</Label>
              <Select value={form.watch('causaFallaId') || SIN_VALOR} onValueChange={(v) => form.setValue('causaFallaId', v === SIN_VALOR ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Aún no se sabe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>Aún no se sabe</SelectItem>
                  {opciones.failureCauses.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Efecto de falla</Label>
              <Select value={form.watch('efectoFallaId') || SIN_VALOR} onValueChange={(v) => form.setValue('efectoFallaId', v === SIN_VALOR ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Aún no se sabe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>Aún no se sabe</SelectItem>
                  {opciones.failureEffects.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 col-span-2">
              <Label>Acción técnica</Label>
              <Select value={form.watch('technicalActionId') || SIN_VALOR} onValueChange={(v) => form.setValue('technicalActionId', v === SIN_VALOR ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>Sin especificar</SelectItem>
                  {opciones.technicalActions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" rows={3} {...form.register('observaciones')} placeholder="¿Qué se observó? ¿Cómo se detectó?" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={form.formState.isSubmitting}>
          {textoBoton}
        </Button>
      </div>
    </form>
  );
}
