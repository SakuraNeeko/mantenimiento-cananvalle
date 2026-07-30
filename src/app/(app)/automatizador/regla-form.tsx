'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ACCION_LABELS,
  CAMPOS_POR_DISPARADOR,
  DISPARADORES_CON_UMBRAL,
  DISPARADOR_LABELS,
  OPERADORES_CONDICION,
  TIPOS_ACCION,
  type AccionRegla,
  type CondicionSimple,
  type CondicionesRegla,
} from '@/lib/automatizador/reglas';
import { crearRegla, actualizarRegla, obtenerUsuariosParaAutomatizador, type ReglaFormValues } from './actions';

const DISPARADORES = Object.keys(DISPARADOR_LABELS);

function nuevaAccionPorTipo(tipo: (typeof TIPOS_ACCION)[number]): AccionRegla {
  switch (tipo) {
    case 'EMAIL':
      return { tipo, destinatarios: '', asunto: '', cuerpo: '' };
    case 'NOTIFICACION':
      return { tipo, userId: '', titulo: '' };
    case 'CREAR_OT':
      return { tipo, descripcionProblema: '' };
    case 'CAMBIAR_RESPONSABLE':
      return { tipo, responsableUserId: '' };
    case 'ESCALAR_PRIORIDAD':
      return { tipo };
    case 'WEBHOOK':
      return { tipo, url: '' };
  }
}

const VALORES_INICIALES: ReglaFormValues = {
  codigo: '',
  nombre: '',
  activo: true,
  disparadorTipo: 'OT_CREADA',
  condiciones: { operador: 'AND', reglas: [] },
  acciones: [],
};

export function ReglaForm({
  open,
  onOpenChange,
  valoresPrevios,
  reglaId,
  onGuardado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  valoresPrevios?: ReglaFormValues;
  reglaId?: string;
  onGuardado: () => void;
}) {
  const esEdicion = Boolean(reglaId);
  const [valores, setValores] = React.useState<ReglaFormValues>(valoresPrevios ?? VALORES_INICIALES);
  const [usuarios, setUsuarios] = React.useState<{ value: string; label: string }[]>([]);
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    if (open) obtenerUsuariosParaAutomatizador().then(setUsuarios).catch(() => setUsuarios([]));
  }, [open]);

  function actualizarCampo<K extends keyof ReglaFormValues>(campo: K, valor: ReglaFormValues[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  function agregarCondicion() {
    const campos = CAMPOS_POR_DISPARADOR[valores.disparadorTipo] ?? [];
    const nueva: CondicionSimple = { campo: campos[0]?.value ?? '', operador: '=', valor: '' };
    actualizarCampo('condiciones', { ...valores.condiciones, reglas: [...valores.condiciones.reglas, nueva] });
  }

  function actualizarCondicion(i: number, cambios: Partial<CondicionSimple>) {
    const reglas = valores.condiciones.reglas.map((r, idx) => (idx === i ? { ...r, ...cambios } : r));
    actualizarCampo('condiciones', { ...valores.condiciones, reglas });
  }

  function quitarCondicion(i: number) {
    actualizarCampo('condiciones', { ...valores.condiciones, reglas: valores.condiciones.reglas.filter((_, idx) => idx !== i) });
  }

  function agregarAccion(tipo: (typeof TIPOS_ACCION)[number]) {
    actualizarCampo('acciones', [...valores.acciones, nuevaAccionPorTipo(tipo)]);
  }

  function actualizarAccion(i: number, accion: AccionRegla) {
    actualizarCampo(
      'acciones',
      valores.acciones.map((a, idx) => (idx === i ? accion : a)),
    );
  }

  function quitarAccion(i: number) {
    actualizarCampo('acciones', valores.acciones.filter((_, idx) => idx !== i));
  }

  async function guardar() {
    if (!valores.codigo.trim() || !valores.nombre.trim()) {
      toast.error('Código y nombre son obligatorios.');
      return;
    }
    setGuardando(true);
    const resultado = esEdicion ? await actualizarRegla(reglaId!, valores) : await crearRegla(valores);
    setGuardando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(esEdicion ? 'Regla actualizada.' : 'Regla creada.');
    onOpenChange(false);
    onGuardado();
  }

  const camposDisponibles = CAMPOS_POR_DISPARADOR[valores.disparadorTipo] ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar regla' : 'Nueva regla'}</DialogTitle>
          <DialogDescription>Disparador → condiciones → acciones. Se evalúa una vez al día.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Código</Label>
              <Input value={valores.codigo} onChange={(e) => actualizarCampo('codigo', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={valores.nombre} onChange={(e) => actualizarCampo('nombre', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Descripción</Label>
              <Textarea rows={2} value={valores.descripcion ?? ''} onChange={(e) => actualizarCampo('descripcion', e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox checked={valores.activo} onCheckedChange={(v) => actualizarCampo('activo', Boolean(v))} id="regla-activa" />
              <Label htmlFor="regla-activa" className="font-normal">
                Regla activa
              </Label>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Disparador</Label>
            <Select value={valores.disparadorTipo} onValueChange={(v) => actualizarCampo('disparadorTipo', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPARADORES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {DISPARADOR_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {DISPARADORES_CON_UMBRAL.has(valores.disparadorTipo) ? (
              <div className="pt-2">
                <Label>Umbral (horas)</Label>
                <Input type="number" value={valores.umbral ?? ''} onChange={(e) => actualizarCampo('umbral', Number(e.target.value) || undefined)} />
              </div>
            ) : null}
          </div>

          <div className="space-y-2 rounded-[8px] border p-3">
            <div className="flex items-center justify-between">
              <Label>Condiciones (vacío = siempre dispara)</Label>
              {valores.condiciones.reglas.length > 1 ? (
                <Select value={valores.condiciones.operador} onValueChange={(v) => actualizarCampo('condiciones', { ...valores.condiciones, operador: v as 'AND' | 'OR' })}>
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">Todas (Y)</SelectItem>
                    <SelectItem value="OR">Alguna (O)</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
            </div>
            {valores.condiciones.reglas.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={r.campo} onValueChange={(v) => actualizarCondicion(i, { campo: v })}>
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {camposDisponibles.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={r.operador} onValueChange={(v) => actualizarCondicion(i, { operador: v as CondicionSimple['operador'] })}>
                  <SelectTrigger className="h-8 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERADORES_CONDICION.map((op) => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input className="h-8 flex-1 text-xs" value={r.valor} onChange={(e) => actualizarCondicion(i, { valor: e.target.value })} />
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => quitarCondicion(i)}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={agregarCondicion}>
              <Plus aria-hidden />
              Agregar condición
            </Button>
          </div>

          <div className="space-y-2 rounded-[8px] border p-3">
            <Label>Acciones</Label>
            {valores.acciones.map((accion, i) => (
              <div key={i} className="space-y-2 rounded-[6px] bg-accent/30 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{ACCION_LABELS[accion.tipo]}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => quitarAccion(i)}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>

                {accion.tipo === 'EMAIL' ? (
                  <div className="space-y-1.5">
                    <Input placeholder="Destinatarios separados por coma" value={accion.destinatarios} onChange={(e) => actualizarAccion(i, { ...accion, destinatarios: e.target.value })} />
                    <Input placeholder="Asunto" value={accion.asunto} onChange={(e) => actualizarAccion(i, { ...accion, asunto: e.target.value })} />
                    <Textarea placeholder="Cuerpo del mensaje" rows={2} value={accion.cuerpo} onChange={(e) => actualizarAccion(i, { ...accion, cuerpo: e.target.value })} />
                  </div>
                ) : accion.tipo === 'NOTIFICACION' ? (
                  <div className="space-y-1.5">
                    <Select value={accion.userId} onValueChange={(v) => actualizarAccion(i, { ...accion, userId: v })}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Usuario a notificar" />
                      </SelectTrigger>
                      <SelectContent>
                        {usuarios.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Título de la notificación" value={accion.titulo} onChange={(e) => actualizarAccion(i, { ...accion, titulo: e.target.value })} />
                  </div>
                ) : accion.tipo === 'CREAR_OT' ? (
                  <Textarea placeholder="Descripción del problema" rows={2} value={accion.descripcionProblema} onChange={(e) => actualizarAccion(i, { ...accion, descripcionProblema: e.target.value })} />
                ) : accion.tipo === 'CAMBIAR_RESPONSABLE' ? (
                  <Select value={accion.responsableUserId} onValueChange={(v) => actualizarAccion(i, { ...accion, responsableUserId: v })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Nuevo responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : accion.tipo === 'WEBHOOK' ? (
                  <Input placeholder="https://..." value={accion.url} onChange={(e) => actualizarAccion(i, { ...accion, url: e.target.value })} />
                ) : null}
              </div>
            ))}

            <Select onValueChange={(v) => agregarAccion(v as (typeof TIPOS_ACCION)[number])} value="">
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Agregar acción…" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_ACCION.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ACCION_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} loading={guardando}>
            {guardando ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
