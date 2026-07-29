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
import type { OpcionesCombustible, RegistroCombustibleValues } from './actions';

const SIN_VALOR = '__vacio__';

const formSchema = z.object({
  assetId: z.string().trim().min(1),
  fuelId: z.string().trim().min(1),
  fecha: z.string().trim().min(1),
  cantidad: z.string().trim().min(1),
  costoUnitario: z.string().trim().min(1),
  lectura: z.string().trim().optional(),
  partyId: z.string().trim().optional(),
  conductorUserId: z.string().trim().optional(),
  numeroFactura: z.string().trim().optional(),
  observaciones: z.string().trim().optional(),
});

function ahora(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const VALORES_INICIALES: RegistroCombustibleValues = { assetId: '', fuelId: '', fecha: ahora(), cantidad: '', costoUnitario: '' };

export function CombustibleForm({
  opciones,
  valoresPrevios,
  textoBoton = 'Registrar carga',
  onGuardado,
}: {
  opciones: OpcionesCombustible;
  valoresPrevios?: RegistroCombustibleValues;
  textoBoton?: string;
  onGuardado: (valores: RegistroCombustibleValues) => Promise<void> | void;
}) {
  const form = useForm<RegistroCombustibleValues>({
    resolver: zodResolver(formSchema),
    defaultValues: valoresPrevios ?? VALORES_INICIALES,
  });

  const cantidad = Number(form.watch('cantidad') || 0);
  const costoUnitario = Number(form.watch('costoUnitario') || 0);
  const costoTotal = cantidad * costoUnitario;

  async function onSubmit(valores: RegistroCombustibleValues) {
    await onGuardado(valores);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Activo / vehículo</Label>
              <Select value={form.watch('assetId')} onValueChange={(v) => form.setValue('assetId', v)}>
                <SelectTrigger>
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
              <Label>Tipo de combustible</Label>
              <Select value={form.watch('fuelId')} onValueChange={(v) => form.setValue('fuelId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {opciones.fuels.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="fecha">Fecha y hora</Label>
              <Input id="fecha" type="datetime-local" {...form.register('fecha')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input id="cantidad" {...form.register('cantidad')} placeholder="Galones o litros" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="costoUnitario">Costo unitario</Label>
              <Input id="costoUnitario" {...form.register('costoUnitario')} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-2xs text-muted-foreground">Costo total (calculado)</Label>
              <p className="text-sm font-medium">{costoTotal.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="lectura">Lectura de odómetro / horómetro</Label>
              <Input id="lectura" {...form.register('lectura')} placeholder="Opcional, para calcular rendimiento" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="numeroFactura">N.º de factura</Label>
              <Input id="numeroFactura" {...form.register('numeroFactura')} />
            </div>
            <div className="space-y-1">
              <Label>Estación / proveedor</Label>
              <Select value={form.watch('partyId') || SIN_VALOR} onValueChange={(v) => form.setValue('partyId', v === SIN_VALOR ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>Sin especificar</SelectItem>
                  {opciones.parties.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Conductor</Label>
              <Select value={form.watch('conductorUserId') || SIN_VALOR} onValueChange={(v) => form.setValue('conductorUserId', v === SIN_VALOR ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>Sin especificar</SelectItem>
                  {opciones.conductores.map((o) => (
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
            <Textarea id="observaciones" rows={2} {...form.register('observaciones')} />
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
