'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ordenBaseSchema, PRIORIDAD_LABELS, type OrdenFormValues } from '@/lib/validators/orden';
import type { OpcionesOrden } from './actions';

const SIN_VALOR = '__vacio__';
const CRITICIDADES = ['A', 'B', 'C'] as const;
const CRITICIDAD_LABELS: Record<(typeof CRITICIDADES)[number], string> = { A: 'A — Crítico', B: 'B — Importante', C: 'C — Normal' };

const VALORES_INICIALES: OrdenFormValues = {
  descripcionProblema: '',
  prioridad: 'MEDIA',
  criticidad: 'C',
  requiereParo: false,
  permisoTrabajoRequerido: false,
};

function CampoSelect({
  label,
  valor,
  onChange,
  opciones,
}: {
  label: string;
  valor: string | undefined;
  onChange: (v: string | undefined) => void;
  opciones: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={valor || SIN_VALOR} onValueChange={(v) => onChange(v === SIN_VALOR ? undefined : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Sin especificar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SIN_VALOR}>Sin especificar</SelectItem>
          {opciones.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function OrdenForm({
  opciones,
  valoresPrevios,
  textoBoton = 'Guardar borrador',
  onGuardado,
}: {
  opciones: OpcionesOrden;
  valoresPrevios?: OrdenFormValues;
  textoBoton?: string;
  onGuardado: (valores: OrdenFormValues) => Promise<void> | void;
}) {
  const form = useForm<OrdenFormValues>({
    resolver: zodResolver(ordenBaseSchema),
    defaultValues: valoresPrevios ?? VALORES_INICIALES,
  });

  async function onSubmit(valores: OrdenFormValues) {
    await onGuardado(valores);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1">
            <Label htmlFor="descripcionProblema">Descripción del problema</Label>
            <Textarea
              id="descripcionProblema"
              rows={4}
              {...form.register('descripcionProblema')}
              placeholder="Describe el problema, activo afectado y contexto…"
              aria-invalid={Boolean(form.formState.errors.descripcionProblema)}
            />
            {form.formState.errors.descripcionProblema ? <p className="text-2xs text-destructive">{form.formState.errors.descripcionProblema.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Prioridad</Label>
              <Select value={form.watch('prioridad')} onValueChange={(v) => form.setValue('prioridad', v as OrdenFormValues['prioridad'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORIDAD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Criticidad</Label>
              <Select value={form.watch('criticidad')} onValueChange={(v) => form.setValue('criticidad', v as OrdenFormValues['criticidad'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRITICIDADES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CRITICIDAD_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Tiempo estimado (h)</Label>
              <Input value={form.watch('tiempoEstimadoHoras') ?? ''} onChange={(e) => form.setValue('tiempoEstimadoHoras', e.target.value)} />
            </div>

            <CampoSelect label="Activo" valor={form.watch('assetId')} onChange={(v) => form.setValue('assetId', v)} opciones={opciones.assets} />
            <CampoSelect label="Ubicación" valor={form.watch('locationId')} onChange={(v) => form.setValue('locationId', v)} opciones={opciones.locations} />
            <CampoSelect label="Centro de costo" valor={form.watch('costCenterId')} onChange={(v) => form.setValue('costCenterId', v)} opciones={opciones.costCenters} />
            <CampoSelect label="Centro responsable" valor={form.watch('responsibleCenterId')} onChange={(v) => form.setValue('responsibleCenterId', v)} opciones={opciones.responsibleCenters} />
            <CampoSelect label="Tipo de mantenimiento" valor={form.watch('maintenanceTypeId')} onChange={(v) => form.setValue('maintenanceTypeId', v)} opciones={opciones.maintenanceTypes} />
            <CampoSelect label="Tipo de trabajo" valor={form.watch('workTypeId')} onChange={(v) => form.setValue('workTypeId', v)} opciones={opciones.workTypes} />
            <CampoSelect label="Causa de falla" valor={form.watch('causaFallaId')} onChange={(v) => form.setValue('causaFallaId', v)} opciones={opciones.failureCauses} />
            <CampoSelect label="Efecto de falla" valor={form.watch('efectoFallaId')} onChange={(v) => form.setValue('efectoFallaId', v)} opciones={opciones.failureEffects} />
            <CampoSelect label="Acción técnica" valor={form.watch('technicalActionId')} onChange={(v) => form.setValue('technicalActionId', v)} opciones={opciones.technicalActions} />
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch('requiereParo')} onCheckedChange={(v) => form.setValue('requiereParo', Boolean(v))} />
              Requiere paro de equipo/línea
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch('permisoTrabajoRequerido')} onCheckedChange={(v) => form.setValue('permisoTrabajoRequerido', Boolean(v))} />
              Requiere permiso de trabajo
            </label>
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
