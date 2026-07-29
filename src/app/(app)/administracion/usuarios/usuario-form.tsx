'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { usuarioFormSchema, type UsuarioFormValues } from '@/lib/validators/usuario';
import { crearUsuario, actualizarUsuario, obtenerUsuarioParaEditar } from './actions';

const SIN_SEDE = '__sin_sede__';

const VALORES_INICIALES: UsuarioFormValues = {
  id: undefined,
  nombre: '',
  email: '',
  cargo: '',
  telefono: '',
  siteDefaultId: undefined,
  activo: true,
  roleIds: [],
  siteIds: [],
  password: '',
};

export function UsuarioForm({
  open,
  onOpenChange,
  usuarioId,
  roles,
  sites,
  onGuardado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente = editar; ausente = crear. */
  usuarioId?: string;
  roles: { id: string; codigo: string; nombre: string }[];
  sites: { id: string; nombre: string }[];
  onGuardado: () => void;
}) {
  const esEdicion = Boolean(usuarioId);
  const [cargandoDetalle, setCargandoDetalle] = React.useState(false);

  const form = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioFormSchema),
    defaultValues: VALORES_INICIALES,
  });

  React.useEffect(() => {
    if (!open) return;

    if (!usuarioId) {
      form.reset(VALORES_INICIALES);
      return;
    }

    setCargandoDetalle(true);
    obtenerUsuarioParaEditar(usuarioId)
      .then((usuario) => {
        if (!usuario) {
          toast.error('El usuario ya no existe.');
          onOpenChange(false);
          return;
        }
        form.reset({
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          cargo: usuario.cargo,
          telefono: usuario.telefono,
          siteDefaultId: usuario.siteDefaultId || undefined,
          activo: usuario.activo,
          roleIds: usuario.roleIds,
          siteIds: usuario.siteIds,
          password: '',
        });
      })
      .catch(() => toast.error('No se pudo cargar el usuario.'))
      .finally(() => setCargandoDetalle(false));
  }, [open, usuarioId, form, onOpenChange]);

  const siteIdsSeleccionados = form.watch('siteIds');

  async function onSubmit(valores: UsuarioFormValues) {
    if (!esEdicion && !valores.password) {
      form.setError('password', { message: 'La contraseña es obligatoria.' });
      return;
    }

    const resultado = esEdicion ? await actualizarUsuario({ ...valores, id: usuarioId! }) : await crearUsuario(valores);

    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }

    toast.success(esEdicion ? 'Usuario actualizado.' : 'Usuario creado.');
    onOpenChange(false);
    onGuardado();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? 'Los cambios de contraseña cierran las sesiones abiertas con la anterior.'
              : 'La persona recibe acceso inmediato con la contraseña que definas.'}
          </DialogDescription>
        </DialogHeader>

        {cargandoDetalle ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando…
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input id="nombre" {...form.register('nombre')} aria-invalid={Boolean(form.formState.errors.nombre)} />
                {form.formState.errors.nombre ? (
                  <p className="text-2xs text-destructive">{form.formState.errors.nombre.message}</p>
                ) : null}
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" type="email" {...form.register('email')} aria-invalid={Boolean(form.formState.errors.email)} />
                {form.formState.errors.email ? (
                  <p className="text-2xs text-destructive">{form.formState.errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label htmlFor="cargo">Cargo</Label>
                <Input id="cargo" {...form.register('cargo')} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" {...form.register('telefono')} />
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="password">{esEdicion ? 'Nueva contraseña (opcional)' : 'Contraseña'}</Label>
                <Input id="password" type="password" autoComplete="new-password" {...form.register('password')} aria-invalid={Boolean(form.formState.errors.password)} />
                {form.formState.errors.password ? (
                  <p className="text-2xs text-destructive">{form.formState.errors.password.message}</p>
                ) : (
                  <p className="text-2xs text-muted-foreground">Mínimo 10 caracteres, con mayúscula, minúscula, número y símbolo.</p>
                )}
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="siteDefaultId">Sede por defecto</Label>
                <Select
                  value={form.watch('siteDefaultId') || SIN_SEDE}
                  onValueChange={(v) => form.setValue('siteDefaultId', v === SIN_SEDE ? undefined : v, { shouldValidate: true })}
                >
                  <SelectTrigger id="siteDefaultId">
                    <SelectValue placeholder="Sin sede" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_SEDE}>Sin sede</SelectItem>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.siteDefaultId ? (
                  <p className="text-2xs text-destructive">{form.formState.errors.siteDefaultId.message}</p>
                ) : null}
              </div>

              {esEdicion ? (
                <div className="col-span-2 flex items-center gap-2">
                  <Checkbox
                    id="activo"
                    checked={form.watch('activo')}
                    onCheckedChange={(v) => form.setValue('activo', Boolean(v))}
                  />
                  <Label htmlFor="activo" className="font-normal">
                    Cuenta activa
                  </Label>
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-1.5 rounded-[6px] border p-2">
                {roles.map((r) => {
                  const seleccionado = form.watch('roleIds').includes(r.id);
                  return (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={seleccionado}
                        onCheckedChange={(v) => {
                          const actuales = form.getValues('roleIds');
                          form.setValue(
                            'roleIds',
                            v ? [...actuales, r.id] : actuales.filter((id) => id !== r.id),
                          );
                        }}
                      />
                      <span>
                        <span className="font-codigo text-2xs text-muted-foreground">{r.codigo}</span> {r.nombre}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Sedes con acceso</Label>
              <div className="flex flex-wrap gap-3 rounded-[6px] border p-2">
                {sites.map((s) => {
                  const seleccionado = siteIdsSeleccionados.includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={seleccionado}
                        onCheckedChange={(v) => {
                          const actuales = form.getValues('siteIds');
                          form.setValue('siteIds', v ? [...actuales, s.id] : actuales.filter((id) => id !== s.id));
                        }}
                      />
                      {s.nombre}
                    </label>
                  );
                })}
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
