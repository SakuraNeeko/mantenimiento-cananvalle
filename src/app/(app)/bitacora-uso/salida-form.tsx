'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { etiquetaCampoLectura } from '@/lib/combustibles/medidor';
import type { OpcionesBitacora } from './actions';
import type { SalidaFormValues } from '@/lib/validators/bitacora';

const formSchema = z.object({
  assetId: z.string().trim().min(1),
  responsableUserId: z.string().trim().min(1),
  proposito: z.string().trim().min(3),
  lecturaSalida: z.string().trim().optional(),
  observaciones: z.string().trim().optional(),
});

export function SalidaForm({
  opciones,
  assetIdInicial,
  textoBoton = 'Registrar salida',
  onGuardado,
}: {
  opciones: OpcionesBitacora;
  assetIdInicial?: string;
  textoBoton?: string;
  onGuardado: (valores: SalidaFormValues, formData: FormData) => Promise<void> | void;
}) {
  const [foto, setFoto] = React.useState<File | null>(null);

  const form = useForm<SalidaFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { assetId: assetIdInicial ?? '', responsableUserId: '', proposito: '' },
  });

  const assetSeleccionado = opciones.assets.find((a) => a.value === form.watch('assetId'));
  const etiquetaLectura = etiquetaCampoLectura(assetSeleccionado?.tipoLectura ?? null, assetSeleccionado?.simboloUom ?? null);

  async function onSubmit(valores: SalidaFormValues) {
    const formData = new FormData();
    if (foto) formData.append('foto', foto);
    await onGuardado(valores, formData);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Activo / vehículo</Label>
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
            </div>
            <div className="space-y-1">
              <Label>Responsable</Label>
              <Select value={form.watch('responsableUserId')} onValueChange={(v) => form.setValue('responsableUserId', v)}>
                <SelectTrigger aria-invalid={Boolean(form.formState.errors.responsableUserId)}>
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {opciones.responsables.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="proposito">Propósito / destino</Label>
              <Input id="proposito" {...form.register('proposito')} placeholder="Ej. transporte de personal a Finca 2" aria-invalid={Boolean(form.formState.errors.proposito)} />
              {form.formState.errors.proposito ? <p className="text-2xs text-destructive">{form.formState.errors.proposito.message}</p> : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lecturaSalida">{etiquetaLectura}</Label>
              <Input id="lecturaSalida" {...form.register('lecturaSalida')} placeholder="Opcional" />
              {assetSeleccionado?.tipoLectura ? <p className="text-2xs text-muted-foreground">Alimenta el medidor del activo en Infraestructura.</p> : null}
            </div>
            <div className="space-y-1">
              <Label>Foto de salida</Label>
              <label className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'w-full cursor-pointer justify-start')}>
                <Camera aria-hidden />
                {foto ? foto.name : 'Tomar o subir foto'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" rows={2} {...form.register('observaciones')} placeholder="Estado del vehículo, novedades, etc." />
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
