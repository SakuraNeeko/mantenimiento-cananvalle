'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { TIPO_LABELS, SEVERIDAD_LABELS } from './columns';
import type { EventoFormValues } from './actions';

const SIN_VALOR = '__vacio__';

const formSchema = z.object({
  assetId: z.string().trim().min(1),
  tipo: z.enum(['EVENTO_ADVERSO', 'INCIDENTE', 'ALERTA_FABRICANTE']),
  severidad: z.enum(['LEVE', 'MODERADA', 'GRAVE', 'CRITICA']).optional(),
  clasificacion: z.string().trim().optional(),
  fecha: z.string().trim().min(1),
  descripcion: z.string().trim().min(5),
});

function ahora(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const VALORES_INICIALES: EventoFormValues = { assetId: '', tipo: 'EVENTO_ADVERSO', fecha: ahora(), descripcion: '' };

export function EventoForm({
  opciones,
  valoresPrevios,
  textoBoton = 'Registrar evento',
  onGuardado,
}: {
  opciones: { value: string; label: string; codigo: string }[];
  valoresPrevios?: EventoFormValues;
  textoBoton?: string;
  onGuardado: (valores: EventoFormValues) => Promise<void> | void;
}) {
  const form = useForm<EventoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: valoresPrevios ?? VALORES_INICIALES,
  });

  async function onSubmit(valores: EventoFormValues) {
    await onGuardado(valores);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label>Equipo biomédico</Label>
              <Select value={form.watch('assetId')} onValueChange={(v) => form.setValue('assetId', v)}>
                <SelectTrigger aria-invalid={Boolean(form.formState.errors.assetId)}>
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {opciones.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.codigo} — {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {opciones.length === 0 ? <p className="text-2xs text-muted-foreground">No hay activos de clase "Biomédico" registrados en Activos.</p> : null}
            </div>

            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.watch('tipo')} onValueChange={(v) => form.setValue('tipo', v as EventoFormValues['tipo'])}>
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
              <Label>Severidad</Label>
              <Select value={form.watch('severidad') || SIN_VALOR} onValueChange={(v) => form.setValue('severidad', v === SIN_VALOR ? undefined : (v as EventoFormValues['severidad']))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin evaluar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>Sin evaluar</SelectItem>
                  {Object.entries(SEVERIDAD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 col-span-2">
              <Label htmlFor="fecha">Fecha y hora</Label>
              <Input id="fecha" type="datetime-local" {...form.register('fecha')} />
            </div>

            <div className="space-y-1 col-span-2">
              <Label htmlFor="clasificacion">Clasificación</Label>
              <Input id="clasificacion" {...form.register('clasificacion')} placeholder="Según la taxonomía de tu autoridad sanitaria" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" rows={4} {...form.register('descripcion')} aria-invalid={Boolean(form.formState.errors.descripcion)} />
            {form.formState.errors.descripcion ? <p className="text-2xs text-destructive">{form.formState.errors.descripcion.message}</p> : null}
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
