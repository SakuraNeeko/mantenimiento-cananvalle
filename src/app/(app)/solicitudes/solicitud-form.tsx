'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { solicitudBaseSchema, PRIORIDAD_LABELS, type SolicitudFormValues } from '@/lib/validators/solicitud';
import type { OpcionesSolicitud } from './actions';

const SIN_VALOR = '__vacio__';

const VALORES_INICIALES: SolicitudFormValues = { descripcion: '', prioridad: 'MEDIA' };

export function SolicitudForm({
  opciones,
  valoresPrevios,
  textoBoton = 'Guardar borrador',
  onGuardado,
}: {
  opciones: OpcionesSolicitud;
  valoresPrevios?: SolicitudFormValues;
  textoBoton?: string;
  onGuardado: (valores: SolicitudFormValues) => Promise<void> | void;
}) {
  const form = useForm<SolicitudFormValues>({
    resolver: zodResolver(solicitudBaseSchema),
    defaultValues: valoresPrevios ?? VALORES_INICIALES,
  });

  async function onSubmit(valores: SolicitudFormValues) {
    await onGuardado(valores);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1">
            <Label htmlFor="descripcion">¿Qué está pasando?</Label>
            <Textarea id="descripcion" rows={4} {...form.register('descripcion')} placeholder="Describe el problema con el mayor detalle posible: qué activo, qué falla, desde cuándo…" aria-invalid={Boolean(form.formState.errors.descripcion)} />
            {form.formState.errors.descripcion ? <p className="text-2xs text-destructive">{form.formState.errors.descripcion.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="prioridad">Prioridad</Label>
              <Select value={form.watch('prioridad')} onValueChange={(v) => form.setValue('prioridad', v as SolicitudFormValues['prioridad'])}>
                <SelectTrigger id="prioridad">
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
              <Label htmlFor="siteId">Sede</Label>
              <Select value={form.watch('siteId') || SIN_VALOR} onValueChange={(v) => form.setValue('siteId', v === SIN_VALOR ? undefined : v)}>
                <SelectTrigger id="siteId">
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>Sin especificar</SelectItem>
                  {opciones.sites.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="assetId">Activo relacionado</Label>
              <Select value={form.watch('assetId') || SIN_VALOR} onValueChange={(v) => form.setValue('assetId', v === SIN_VALOR ? undefined : v)}>
                <SelectTrigger id="assetId">
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>Sin especificar</SelectItem>
                  {opciones.assets.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="locationId">Ubicación</Label>
              <Select value={form.watch('locationId') || SIN_VALOR} onValueChange={(v) => form.setValue('locationId', v === SIN_VALOR ? undefined : v)}>
                <SelectTrigger id="locationId">
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>Sin especificar</SelectItem>
                  {opciones.locations.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="workTypeId">Tipo de trabajo</Label>
              <Select value={form.watch('workTypeId') || SIN_VALOR} onValueChange={(v) => form.setValue('workTypeId', v === SIN_VALOR ? undefined : v)}>
                <SelectTrigger id="workTypeId">
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>Sin especificar</SelectItem>
                  {opciones.workTypes.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
