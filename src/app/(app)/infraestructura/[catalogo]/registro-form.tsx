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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getCatalogo } from '@/lib/catalogs/registry';
import { buildCatalogoSchema, valoresIniciales, type ValoresDinamicos } from '@/lib/catalogs/validators';
import { crearRegistro, actualizarRegistro, obtenerRegistroParaEditar, obtenerOpciones } from './actions';

const SIN_VALOR = '__vacio__';

export function RegistroForm({
  open,
  onOpenChange,
  slug,
  registroId,
  valoresExtra,
  onGuardado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  /** Presente = editar; ausente = crear. */
  registroId?: string;
  /** Precarga campos al crear (ej. `parentId` al agregar un hijo desde el árbol). */
  valoresExtra?: Partial<ValoresDinamicos>;
  onGuardado: () => void;
}) {
  const def = getCatalogo(slug);
  const esEdicion = Boolean(registroId);
  const [cargando, setCargando] = React.useState(false);
  const [opcionesRef, setOpcionesRef] = React.useState<Record<string, { value: string; label: string }[]>>({});

  const form = useForm<ValoresDinamicos>({
    resolver: def ? zodResolver(buildCatalogoSchema(def)) : undefined,
    defaultValues: def ? { ...valoresIniciales(def), ...valoresExtra } : {},
  });

  React.useEffect(() => {
    if (!open || !def) return;

    setCargando(true);
    Promise.all([obtenerOpciones(slug), registroId ? obtenerRegistroParaEditar(slug, registroId) : Promise.resolve(null)])
      .then(([opciones, registro]) => {
        setOpcionesRef(opciones);
        if (registroId && !registro) {
          toast.error('El registro ya no existe.');
          onOpenChange(false);
          return;
        }
        form.reset(registro ?? { ...valoresIniciales(def), ...valoresExtra });
      })
      .catch(() => toast.error('No se pudo cargar el formulario.'))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, registroId, slug]);

  if (!def) return null;

  async function onSubmit(valores: ValoresDinamicos) {
    const resultado = esEdicion ? await actualizarRegistro(slug, registroId!, valores) : await crearRegistro(slug, valores);

    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(esEdicion ? 'Registro actualizado.' : 'Registro creado.');
    onOpenChange(false);
    onGuardado();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? `Editar ${def.tituloSingular}` : `Nuevo ${def.tituloSingular}`}
          </DialogTitle>
          <DialogDescription>{def.descripcion}</DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando…
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {def.campos.map((campo) => {
                const error = form.formState.errors[campo.name]?.message as string | undefined;
                const anchoCompleto = campo.tipo === 'textarea' || campo.name === 'nombre' || campo.name === 'codigo';

                return (
                  <div key={campo.name} className={anchoCompleto ? 'col-span-2 space-y-1' : 'space-y-1'}>
                    {campo.tipo !== 'booleano' ? <Label htmlFor={campo.name}>{campo.label}</Label> : null}

                    {campo.tipo === 'texto' || campo.tipo === 'numero' || campo.tipo === 'decimal' ? (
                      <Input id={campo.name} {...form.register(campo.name)} aria-invalid={Boolean(error)} />
                    ) : campo.tipo === 'fecha' ? (
                      <Input id={campo.name} type="date" {...form.register(campo.name)} aria-invalid={Boolean(error)} />
                    ) : campo.tipo === 'textarea' ? (
                      <Textarea id={campo.name} rows={3} {...form.register(campo.name)} aria-invalid={Boolean(error)} />
                    ) : campo.tipo === 'booleano' ? (
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          id={campo.name}
                          checked={Boolean(form.watch(campo.name))}
                          onCheckedChange={(v) => form.setValue(campo.name, Boolean(v))}
                        />
                        <Label htmlFor={campo.name} className="font-normal">
                          {campo.label}
                        </Label>
                      </div>
                    ) : campo.tipo === 'enum' ? (
                      <Select
                        value={(form.watch(campo.name) as string) || SIN_VALOR}
                        onValueChange={(v) => form.setValue(campo.name, v === SIN_VALOR ? '' : v, { shouldValidate: true })}
                      >
                        <SelectTrigger id={campo.name}>
                          <SelectValue placeholder="Selecciona…" />
                        </SelectTrigger>
                        <SelectContent>
                          {!campo.requerido ? <SelectItem value={SIN_VALOR}>Sin selección</SelectItem> : null}
                          {campo.opciones?.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : campo.tipo === 'referencia' ? (
                      <Select
                        value={(form.watch(campo.name) as string) || SIN_VALOR}
                        onValueChange={(v) => form.setValue(campo.name, v === SIN_VALOR ? '' : v, { shouldValidate: true })}
                      >
                        <SelectTrigger id={campo.name}>
                          <SelectValue placeholder="Selecciona…" />
                        </SelectTrigger>
                        <SelectContent>
                          {!campo.requerido ? <SelectItem value={SIN_VALOR}>Sin selección</SelectItem> : null}
                          {(opcionesRef[campo.name] ?? [])
                            // Un registro no puede ser su propio padre (mitiga el caso trivial de ciclo).
                            .filter((o) => o.value !== registroId)
                            .map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : null}

                    {campo.ayuda && !error ? <p className="text-2xs text-muted-foreground">{campo.ayuda}</p> : null}
                    {error ? <p className="text-2xs text-destructive">{error}</p> : null}
                  </div>
                );
              })}
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
