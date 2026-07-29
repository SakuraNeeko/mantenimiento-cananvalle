'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { crearMovimiento, actualizarMovimiento, obtenerOpcionesMovimiento, type OpcionesMovimiento } from './actions';
import type { LineaMovimientoInput, MovimientoInput } from './validators';

const SIN_VALOR = '__vacio__';

type LineaState = LineaMovimientoInput;

const LINEA_VACIA: LineaState = { materialId: '', cantidad: '', costoUnitario: '', lote: '', serie: '', fechaVencimiento: '' };

export type MovimientoValoresIniciales = MovimientoInput;

export function MovimientoForm({
  modo,
  movimientoId,
  valoresIniciales,
  onGuardado,
}: {
  modo: 'crear' | 'editar';
  movimientoId?: string;
  valoresIniciales?: MovimientoValoresIniciales;
  onGuardado: (id: string) => void;
}) {
  const router = useRouter();
  const [opciones, setOpciones] = React.useState<OpcionesMovimiento | null>(null);
  const [warehouseId, setWarehouseId] = React.useState(valoresIniciales?.warehouseId ?? '');
  const [kardexConceptId, setKardexConceptId] = React.useState(valoresIniciales?.kardexConceptId ?? '');
  const [partyId, setPartyId] = React.useState(valoresIniciales?.partyId ?? '');
  const [documentoSoporte, setDocumentoSoporte] = React.useState(valoresIniciales?.documentoSoporte ?? '');
  const [fecha, setFecha] = React.useState(valoresIniciales?.fecha ?? new Date().toISOString().slice(0, 10));
  const [lineas, setLineas] = React.useState<LineaState[]>(valoresIniciales?.lineas.length ? valoresIniciales.lineas : [LINEA_VACIA]);
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    obtenerOpcionesMovimiento()
      .then(setOpciones)
      .catch(() => toast.error('No se pudieron cargar las opciones.'));
  }, []);

  const concepto = opciones?.conceptos.find((c) => c.id === kardexConceptId);
  const materialesPorId = React.useMemo(() => new Map((opciones?.materiales ?? []).map((m) => [m.id, m])), [opciones]);

  function actualizarLinea(i: number, patch: Partial<LineaState>) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, LINEA_VACIA]);
  }

  function quitarLinea(i: number) {
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function guardar() {
    if (!warehouseId || !kardexConceptId) {
      toast.error('Selecciona almacén y concepto.');
      return;
    }
    const payload: MovimientoInput = { warehouseId, kardexConceptId, partyId, documentoSoporte, fecha, lineas };

    setGuardando(true);
    const resultado = modo === 'editar' ? await actualizarMovimiento(movimientoId!, payload) : await crearMovimiento(payload);
    setGuardando(false);

    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(modo === 'editar' ? 'Movimiento actualizado.' : 'Movimiento creado en borrador.');
    onGuardado(resultado.id!);
  }

  if (!opciones) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Datos del movimiento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label>Almacén</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {opciones.warehouses.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Concepto</Label>
            <Select value={kardexConceptId} onValueChange={setKardexConceptId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {opciones.conceptos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre} ({c.signo === 'ENTRADA' ? '+' : '−'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>
              Tercero {concepto?.exigeTercero ? <span className="text-destructive">*</span> : null}
            </Label>
            <Select value={partyId || SIN_VALOR} onValueChange={(v) => setPartyId(v === SIN_VALOR ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sin tercero" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_VALOR}>Sin tercero</SelectItem>
                {opciones.parties.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1 sm:col-span-4">
            <Label>
              Documento de soporte {concepto?.exigeOt ? <span className="text-destructive">* (este concepto exige referencia de OT)</span> : null}
            </Label>
            <Input value={documentoSoporte} onChange={(e) => setDocumentoSoporte(e.target.value)} placeholder="Ej. factura, OT-2026-000123…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Líneas</CardTitle>
          <Button variant="outline" size="sm" onClick={agregarLinea}>
            <Plus aria-hidden />
            Agregar línea
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {lineas.map((linea, i) => {
            const material = materialesPorId.get(linea.materialId);
            const mostrarLote = material?.manejaLote;
            const mostrarSerie = material?.manejaSerie;
            const costoEditable = concepto?.signo === 'ENTRADA';

            return (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-[8px] border p-2 sm:grid-cols-6">
                <div className="col-span-2 space-y-1">
                  <Label className="text-2xs">Material</Label>
                  <Select value={linea.materialId} onValueChange={(v) => actualizarLinea(i, { materialId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {opciones.materiales.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.codigo} — {m.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-2xs">Cantidad {material?.uomSimbolo ? `(${material.uomSimbolo})` : ''}</Label>
                  <Input value={linea.cantidad} onChange={(e) => actualizarLinea(i, { cantidad: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-2xs">Costo unitario</Label>
                  <Input
                    value={linea.costoUnitario}
                    onChange={(e) => actualizarLinea(i, { costoUnitario: e.target.value })}
                    disabled={!costoEditable}
                    placeholder={costoEditable ? '' : 'Costo promedio'}
                  />
                </div>
                {mostrarLote ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-2xs">Lote {concepto?.signo === 'SALIDA' ? '(vacío = FEFO)' : ''}</Label>
                      <Input value={linea.lote} onChange={(e) => actualizarLinea(i, { lote: e.target.value })} />
                    </div>
                    {concepto?.signo === 'ENTRADA' ? (
                      <div className="space-y-1">
                        <Label className="text-2xs">Vence</Label>
                        <Input type="date" value={linea.fechaVencimiento} onChange={(e) => actualizarLinea(i, { fechaVencimiento: e.target.value })} />
                      </div>
                    ) : null}
                  </>
                ) : null}
                {mostrarSerie ? (
                  <div className="space-y-1">
                    <Label className="text-2xs">Serie</Label>
                    <Input value={linea.serie} onChange={(e) => actualizarLinea(i, { serie: e.target.value })} />
                  </div>
                ) : null}
                <div className="flex items-end justify-end">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => quitarLinea(i)} disabled={lineas.length === 1}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button onClick={guardar} loading={guardando}>
          Guardar borrador
        </Button>
      </div>
    </div>
  );
}
