'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ALCANCE_LABELS, PRIORIDAD_LABELS, planBaseSchema, type PlanFormValues } from '@/lib/validators/plan';
import type { OpcionesPlan } from './actions';

const SIN_VALOR = '__vacio__';
const CRITICIDADES = ['A', 'B', 'C'] as const;
const CRITICIDAD_LABELS: Record<(typeof CRITICIDADES)[number], string> = { A: 'A — Crítico', B: 'B — Importante', C: 'C — Normal' };

const VALORES_INICIALES: PlanFormValues = { codigo: '', nombre: '', alcance: 'ACTIVO_UNICO', prioridad: 'MEDIA' };

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

export function PlanForm({
  opciones,
  valoresPrevios,
  textoBoton = 'Guardar plan',
  onGuardado,
}: {
  opciones: OpcionesPlan;
  valoresPrevios?: PlanFormValues;
  textoBoton?: string;
  onGuardado: (valores: PlanFormValues) => Promise<void> | void;
}) {
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planBaseSchema),
    defaultValues: valoresPrevios ?? VALORES_INICIALES,
  });

  const alcance = form.watch('alcance');

  async function onSubmit(valores: PlanFormValues) {
    await onGuardado(valores);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" {...form.register('codigo')} placeholder="PLAN-0001" aria-invalid={Boolean(form.formState.errors.codigo)} />
              {form.formState.errors.codigo ? <p className="text-2xs text-destructive">{form.formState.errors.codigo.message}</p> : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" {...form.register('nombre')} placeholder="Mantenimiento preventivo trimestral" aria-invalid={Boolean(form.formState.errors.nombre)} />
              {form.formState.errors.nombre ? <p className="text-2xs text-destructive">{form.formState.errors.nombre.message}</p> : null}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Alcance</Label>
            <Select value={alcance} onValueChange={(v) => form.setValue('alcance', v as PlanFormValues['alcance'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ALCANCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {alcance === 'ACTIVO_UNICO' ? (
            <>
              <CampoSelect label="Activo" valor={form.watch('assetId')} onChange={(v) => form.setValue('assetId', v)} opciones={opciones.assets} />
              {form.formState.errors.assetId ? <p className="text-2xs text-destructive">{form.formState.errors.assetId.message}</p> : null}
            </>
          ) : (
            <div className="grid grid-cols-3 gap-3 rounded-[8px] border p-3">
              <CampoSelect label="Clase" valor={form.watch('claseFiltroId')} onChange={(v) => form.setValue('claseFiltroId', v)} opciones={opciones.clases} />
              <div className="space-y-1">
                <Label>Criticidad</Label>
                <Select value={form.watch('criticidadFiltro') || SIN_VALOR} onValueChange={(v) => form.setValue('criticidadFiltro', v === SIN_VALOR ? undefined : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cualquiera" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_VALOR}>Cualquiera</SelectItem>
                    {CRITICIDADES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CRITICIDAD_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <CampoSelect label="Ubicación" valor={form.watch('locationFiltro')} onChange={(v) => form.setValue('locationFiltro', v)} opciones={opciones.locations} />
              <p className="col-span-3 text-2xs text-muted-foreground">Los filtros se combinan entre sí (Y lógico). Deja &quot;Cualquiera&quot; el que no quieras restringir.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CampoSelect label="Tipo de mantenimiento" valor={form.watch('maintenanceTypeId')} onChange={(v) => form.setValue('maintenanceTypeId', v)} opciones={opciones.maintenanceTypes} />
            <CampoSelect label="Tipo de trabajo" valor={form.watch('workTypeId')} onChange={(v) => form.setValue('workTypeId', v)} opciones={opciones.workTypes} />
            <CampoSelect label="Responsable por defecto" valor={form.watch('responsibleDefaultId')} onChange={(v) => form.setValue('responsibleDefaultId', v)} opciones={opciones.responsables} />
            <div className="space-y-1">
              <Label>Prioridad</Label>
              <Select value={form.watch('prioridad')} onValueChange={(v) => form.setValue('prioridad', v as PlanFormValues['prioridad'])}>
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
              <Label>Tiempo estimado (h)</Label>
              <Input value={form.watch('tiempoEstimadoHoras') ?? ''} onChange={(e) => form.setValue('tiempoEstimadoHoras', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="instrucciones">Instrucciones generales</Label>
            <Textarea id="instrucciones" rows={3} {...form.register('instrucciones')} placeholder="Contexto o precauciones para quien ejecute la orden generada…" />
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
