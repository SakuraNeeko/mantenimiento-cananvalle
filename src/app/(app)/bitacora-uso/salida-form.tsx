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
import type { OpcionesBitacora } from './actions';
import { DESTINO_OTRO, type SalidaFormValues } from '@/lib/validators/bitacora';

const formSchema = z
  .object({
    assetId: z.string().trim().min(1),
    responsableId: z.string().trim().min(1),
    origenSiteId: z.string().trim().min(1),
    destino: z.string().trim().min(1),
    destinoOtro: z.string().trim().optional(),
    proposito: z.string().trim().min(3),
    lecturaSalida: z.string().trim().optional(),
    observaciones: z.string().trim().optional(),
  })
  .refine((v) => v.destino !== DESTINO_OTRO || Boolean(v.destinoOtro?.trim()), {
    message: 'Especifica el destino.',
    path: ['destinoOtro'],
  });

export function SalidaForm({
  opciones,
  assetIdInicial,
  textoBoton = 'Registrar salida',
  bloquearResponsable = false,
  onGuardado,
}: {
  opciones: OpcionesBitacora;
  assetIdInicial?: string;
  textoBoton?: string;
  /** Chofer (GUARDIA): el responsable siempre es él mismo, sin selector — ver `miResponsableId`. */
  bloquearResponsable?: boolean;
  onGuardado: (valores: SalidaFormValues, formData: FormData) => Promise<void> | void;
}) {
  const [foto, setFoto] = React.useState<File | null>(null);
  const responsablePropio = bloquearResponsable ? opciones.responsables.find((r) => r.value === opciones.miResponsableId) : undefined;
  const [destinoSeleccion, setDestinoSeleccion] = React.useState('');

  const form = useForm<SalidaFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetId: assetIdInicial ?? '',
      responsableId: responsablePropio?.value ?? '',
      origenSiteId: '',
      destino: '',
      proposito: '',
    },
  });

  const assetSeleccionado = opciones.assets.find((a) => a.value === form.watch('assetId'));
  const destinoEsOtro = form.watch('destino') === DESTINO_OTRO;

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
              {responsablePropio ? (
                <p className="flex h-8 items-center rounded-[6px] border border-input bg-muted px-2.5 text-sm">{responsablePropio.label}</p>
              ) : (
                <Select value={form.watch('responsableId')} onValueChange={(v) => form.setValue('responsableId', v)}>
                  <SelectTrigger aria-invalid={Boolean(form.formState.errors.responsableId)}>
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
              )}
            </div>
            <div className="space-y-1">
              <Label>Lugar de origen</Label>
              <Select value={form.watch('origenSiteId')} onValueChange={(v) => form.setValue('origenSiteId', v)}>
                <SelectTrigger aria-invalid={Boolean(form.formState.errors.origenSiteId)}>
                  <SelectValue placeholder="Selecciona la finca…" />
                </SelectTrigger>
                <SelectContent>
                  {opciones.sites.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Destino</Label>
              <Select
                value={destinoSeleccion}
                onValueChange={(v) => {
                  setDestinoSeleccion(v);
                  const frecuente = opciones.destinosFrecuentes.find((d) => d.value === v);
                  if (frecuente) {
                    form.setValue('destino', DESTINO_OTRO);
                    form.setValue('destinoOtro', frecuente.label);
                  } else if (v === DESTINO_OTRO) {
                    form.setValue('destino', DESTINO_OTRO);
                    form.setValue('destinoOtro', '');
                  } else {
                    form.setValue('destino', v);
                    form.setValue('destinoOtro', '');
                  }
                }}
              >
                <SelectTrigger aria-invalid={Boolean(form.formState.errors.destino)}>
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {opciones.sites.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                  {opciones.destinosFrecuentes.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={DESTINO_OTRO}>Otro (especificar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {destinoEsOtro ? (
              <div className="space-y-1 col-span-2">
                <Label htmlFor="destinoOtro">Especifique</Label>
                <Input id="destinoOtro" {...form.register('destinoOtro')} placeholder="¿A dónde va?" aria-invalid={Boolean(form.formState.errors.destinoOtro)} />
                {form.formState.errors.destinoOtro ? <p className="text-2xs text-destructive">{form.formState.errors.destinoOtro.message}</p> : null}
              </div>
            ) : null}
            <div className="space-y-1 col-span-2">
              <Label htmlFor="proposito">Propósito</Label>
              <Input id="proposito" {...form.register('proposito')} placeholder="Ej. transporte de personal" aria-invalid={Boolean(form.formState.errors.proposito)} />
              {form.formState.errors.proposito ? <p className="text-2xs text-destructive">{form.formState.errors.proposito.message}</p> : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lecturaSalida">Kilometraje</Label>
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
