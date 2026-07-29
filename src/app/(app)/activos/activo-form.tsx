'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { activoBaseSchema, CLASE_LABELS, type ActivoFormValues } from '@/lib/validators/activo';
import type { OpcionesActivo } from './actions';
import { crearActivo, actualizarActivo } from './actions';

const SIN_VALOR = '__vacio__';

export const VALORES_INICIALES: ActivoFormValues = {
  codigo: '',
  nombre: '',
  clase: 'EQUIPO',
  criticidad: 'C',
  diasAlertaGarantia: 30,
  activo: true,
};

function CampoSelect({
  id,
  label,
  value,
  onChange,
  opciones,
  placeholder = 'Sin selección',
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  opciones: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || SIN_VALOR} onValueChange={(v) => onChange(v === SIN_VALOR ? undefined : v)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SIN_VALOR}>{placeholder}</SelectItem>
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

export function ActivoForm({
  modo,
  activoId,
  opciones,
  valoresPrevios,
  onGuardado,
}: {
  modo: 'crear' | 'editar';
  activoId?: string;
  opciones: OpcionesActivo;
  valoresPrevios?: ActivoFormValues;
  onGuardado: (id: string) => void;
}) {
  const form = useForm<ActivoFormValues>({
    resolver: zodResolver(activoBaseSchema),
    defaultValues: valoresPrevios ?? VALORES_INICIALES,
  });

  async function onSubmit(valores: ActivoFormValues) {
    const resultado = modo === 'editar' ? await actualizarActivo({ ...valores, id: activoId! }) : await crearActivo(valores);

    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(modo === 'editar' ? 'Activo actualizado.' : 'Activo creado.');
    onGuardado(resultado.id!);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Identificación</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="codigo">Código</Label>
            <Input id="codigo" {...form.register('codigo')} aria-invalid={Boolean(form.formState.errors.codigo)} />
            {form.formState.errors.codigo ? <p className="text-2xs text-destructive">{form.formState.errors.codigo.message}</p> : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" {...form.register('nombre')} aria-invalid={Boolean(form.formState.errors.nombre)} />
            {form.formState.errors.nombre ? <p className="text-2xs text-destructive">{form.formState.errors.nombre.message}</p> : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="clase">Clase</Label>
            <Select value={form.watch('clase')} onValueChange={(v) => form.setValue('clase', v as ActivoFormValues['clase'])}>
              <SelectTrigger id="clase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLASE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="criticidad">Criticidad</Label>
            <Select value={form.watch('criticidad')} onValueChange={(v) => form.setValue('criticidad', v as ActivoFormValues['criticidad'])}>
              <SelectTrigger id="criticidad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A — crítico</SelectItem>
                <SelectItem value="B">B — importante</SelectItem>
                <SelectItem value="C">C — normal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CampoSelect id="parentId" label="Pertenece a (despiece)" value={form.watch('parentId')} onChange={(v) => form.setValue('parentId', v)} opciones={opciones.padres} placeholder="Activo independiente" />

          <div className="col-span-2 space-y-1">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" rows={2} {...form.register('descripcion')} />
          </div>

          {modo === 'editar' ? (
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox id="activo" checked={form.watch('activo')} onCheckedChange={(v) => form.setValue('activo', Boolean(v))} />
              <Label htmlFor="activo" className="font-normal">
                Activo visible en el listado por defecto
              </Label>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ubicación y responsabilidad</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <CampoSelect id="locationId" label="Ubicación" value={form.watch('locationId')} onChange={(v) => form.setValue('locationId', v)} opciones={opciones.locations} />
          <CampoSelect id="costCenterId" label="Centro de costo" value={form.watch('costCenterId')} onChange={(v) => form.setValue('costCenterId', v)} opciones={opciones.costCenters} />
          <CampoSelect id="responsibleCenterId" label="Centro responsable" value={form.watch('responsibleCenterId')} onChange={(v) => form.setValue('responsibleCenterId', v)} opciones={opciones.responsibleCenters} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos técnicos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="fabricante">Fabricante</Label>
            <Input id="fabricante" {...form.register('fabricante')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="modelo">Modelo</Label>
            <Input id="modelo" {...form.register('modelo')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="serie">Serie</Label>
            <Input id="serie" {...form.register('serie')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="anio">Año</Label>
            <Input id="anio" type="number" {...form.register('anio')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valores y garantía</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="fechaCompra">Fecha de compra</Label>
            <Input id="fechaCompra" type="date" {...form.register('fechaCompra')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="valorCompra">Valor de compra</Label>
            <Input id="valorCompra" {...form.register('valorCompra')} aria-invalid={Boolean(form.formState.errors.valorCompra)} />
            {form.formState.errors.valorCompra ? <p className="text-2xs text-destructive">{form.formState.errors.valorCompra.message}</p> : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="valorActual">Valor actual</Label>
            <Input id="valorActual" {...form.register('valorActual')} aria-invalid={Boolean(form.formState.errors.valorActual)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="vidaUtilMeses">Vida útil (meses)</Label>
            <Input id="vidaUtilMeses" type="number" {...form.register('vidaUtilMeses')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="garantiaFin">Garantía hasta</Label>
            <Input id="garantiaFin" type="date" {...form.register('garantiaFin')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="diasAlertaGarantia">Días de alerta antes de vencer</Label>
            <Input id="diasAlertaGarantia" type="number" {...form.register('diasAlertaGarantia')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proveedor y contrato</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <CampoSelect id="partyId" label="Proveedor" value={form.watch('partyId')} onChange={(v) => form.setValue('partyId', v)} opciones={opciones.parties} />
          <CampoSelect id="contractId" label="Contrato" value={form.watch('contractId')} onChange={(v) => form.setValue('contractId', v)} opciones={opciones.contracts} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" loading={form.formState.isSubmitting}>
          Guardar
        </Button>
      </div>
    </form>
  );
}
