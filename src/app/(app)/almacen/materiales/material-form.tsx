'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { materialBaseSchema, TIPO_MATERIAL_LABELS, type MaterialFormValues } from '@/lib/validators/material';
import { crearMaterial, actualizarMaterial, obtenerMaterialParaEditar, obtenerOpcionesMaterial } from './actions';

const SIN_VALOR = '__vacio__';

const VALORES_INICIALES: MaterialFormValues = {
  codigo: '',
  nombre: '',
  tipo: 'REPUESTO',
  critico: false,
  manejaLote: false,
  manejaSerie: false,
  activo: true,
};

export function MaterialForm({
  open,
  onOpenChange,
  materialId,
  onGuardado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente = editar; ausente = crear. */
  materialId?: string;
  onGuardado: (id: string) => void;
}) {
  const esEdicion = Boolean(materialId);
  const [cargando, setCargando] = React.useState(false);
  const [opcionesUom, setOpcionesUom] = React.useState<{ value: string; label: string }[]>([]);

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialBaseSchema),
    defaultValues: VALORES_INICIALES,
  });

  React.useEffect(() => {
    if (!open) return;
    setCargando(true);
    Promise.all([obtenerOpcionesMaterial(), materialId ? obtenerMaterialParaEditar(materialId) : Promise.resolve(null)])
      .then(([opciones, material]) => {
        setOpcionesUom(opciones.uoms);
        if (materialId && !material) {
          toast.error('El material ya no existe.');
          onOpenChange(false);
          return;
        }
        form.reset(material ?? VALORES_INICIALES);
      })
      .catch(() => toast.error('No se pudo cargar el formulario.'))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, materialId]);

  async function onSubmit(valores: MaterialFormValues) {
    const resultado = esEdicion ? await actualizarMaterial({ ...valores, id: materialId! }) : await crearMaterial(valores);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(esEdicion ? 'Material actualizado.' : 'Material creado.');
    onOpenChange(false);
    onGuardado(resultado.id!);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar material' : 'Nuevo material'}</DialogTitle>
          <DialogDescription>Repuestos, insumos, herramientas y EPP que se controlan por kárdex.</DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando…
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={form.watch('tipo')} onValueChange={(v) => form.setValue('tipo', v as MaterialFormValues['tipo'])}>
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_MATERIAL_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="uomId">Unidad de medida</Label>
                <Select value={form.watch('uomId') || SIN_VALOR} onValueChange={(v) => form.setValue('uomId', v === SIN_VALOR ? undefined : v)}>
                  <SelectTrigger id="uomId">
                    <SelectValue placeholder="Sin definir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_VALOR}>Sin definir</SelectItem>
                    {opcionesUom.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="categoria">Categoría</Label>
                <Input id="categoria" {...form.register('categoria')} placeholder="Opcional" />
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea id="descripcion" rows={2} {...form.register('descripcion')} />
              </div>

              <div className="col-span-2 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.watch('critico')} onCheckedChange={(v) => form.setValue('critico', Boolean(v))} />
                  Crítico
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.watch('manejaLote')} onCheckedChange={(v) => form.setValue('manejaLote', Boolean(v))} />
                  Maneja lote
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.watch('manejaSerie')} onCheckedChange={(v) => form.setValue('manejaSerie', Boolean(v))} />
                  Maneja serie
                </label>
                {esEdicion ? (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.watch('activo')} onCheckedChange={(v) => form.setValue('activo', Boolean(v))} />
                    Activo
                  </label>
                ) : null}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
