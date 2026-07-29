'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Pencil, Plus, Trash2, Warehouse as WarehouseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatMoney, formatNumber } from '@/lib/utils';
import { TIPO_MATERIAL_LABELS, type MaterialFormValues } from '@/lib/validators/material';
import { MaterialForm } from '../material-form';
import {
  configurarExistencia,
  crearReferenciaMaterial,
  eliminarReferenciaMaterial,
  obtenerAlmacenesDisponibles,
  obtenerProveedoresDisponibles,
} from './actions';

export type ExistenciaRow = {
  id: string;
  warehouseId: string;
  warehouseNombre: string;
  cantidad: string;
  minimo: string | null;
  maximo: string | null;
  puntoPedido: string | null;
  ubicacionEstante: string | null;
  costoPromedio: string;
};

export type ReferenciaRow = {
  id: string;
  partyNombre: string | null;
  fabricante: string | null;
  referenciaFabricante: string | null;
  referenciaProveedor: string | null;
  precio: string | null;
  tiempoEntregaDias: number | null;
};

export function MaterialDetalleClient({
  material,
  existencias,
  referencias,
  puedeEditarMaterial,
  puedeParametrizar,
  puedeGestionarReferencias,
}: {
  material: MaterialFormValues;
  existencias: ExistenciaRow[];
  referencias: ReferenciaRow[];
  puedeEditarMaterial: boolean;
  puedeParametrizar: boolean;
  puedeGestionarReferencias: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);

  // --- Existencias ---
  const [dialogExistencia, setDialogExistencia] = React.useState(false);
  const [almacenesDisponibles, setAlmacenesDisponibles] = React.useState<{ value: string; label: string }[]>([]);
  const [warehouseId, setWarehouseId] = React.useState('');
  const [minimo, setMinimo] = React.useState('');
  const [maximo, setMaximo] = React.useState('');
  const [puntoPedido, setPuntoPedido] = React.useState('');
  const [ubicacionEstante, setUbicacionEstante] = React.useState('');
  const [guardandoExistencia, setGuardandoExistencia] = React.useState(false);

  async function abrirNuevaExistencia() {
    setWarehouseId('');
    setMinimo('');
    setMaximo('');
    setPuntoPedido('');
    setUbicacionEstante('');
    setAlmacenesDisponibles(await obtenerAlmacenesDisponibles(material.id!));
    setDialogExistencia(true);
  }

  async function guardarExistencia() {
    if (!warehouseId) {
      toast.error('Selecciona un almacén.');
      return;
    }
    setGuardandoExistencia(true);
    const resultado = await configurarExistencia(material.id!, warehouseId, minimo, maximo, puntoPedido, ubicacionEstante);
    setGuardandoExistencia(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Existencia configurada.');
    setDialogExistencia(false);
    router.refresh();
  }

  // --- Referencias ---
  const [dialogReferencia, setDialogReferencia] = React.useState(false);
  const [proveedores, setProveedores] = React.useState<{ value: string; label: string }[]>([]);
  const [partyId, setPartyId] = React.useState('');
  const [fabricante, setFabricante] = React.useState('');
  const [refFabricante, setRefFabricante] = React.useState('');
  const [refProveedor, setRefProveedor] = React.useState('');
  const [precio, setPrecio] = React.useState('');
  const [tiempoEntrega, setTiempoEntrega] = React.useState('');
  const [guardandoReferencia, setGuardandoReferencia] = React.useState(false);

  async function abrirNuevaReferencia() {
    setPartyId('');
    setFabricante('');
    setRefFabricante('');
    setRefProveedor('');
    setPrecio('');
    setTiempoEntrega('');
    setProveedores(await obtenerProveedoresDisponibles());
    setDialogReferencia(true);
  }

  async function guardarReferencia() {
    setGuardandoReferencia(true);
    const resultado = await crearReferenciaMaterial(material.id!, partyId, fabricante, refFabricante, refProveedor, precio, tiempoEntrega);
    setGuardandoReferencia(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Referencia agregada.');
    setDialogReferencia(false);
    router.refresh();
  }

  async function quitarReferencia(id: string) {
    if (!window.confirm('¿Eliminar esta referencia de proveedor?')) return;
    const resultado = await eliminarReferenciaMaterial(material.id!, id);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Referencia eliminada.');
    router.refresh();
  }

  if (editando) {
    return (
      <MaterialForm
        open
        onOpenChange={(o) => !o && setEditando(false)}
        materialId={material.id}
        onGuardado={() => {
          setEditando(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Ficha del material</CardTitle>
          {puedeEditarMaterial ? (
            <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
              <Pencil aria-hidden />
              Editar
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <div>
            <p className="text-2xs text-muted-foreground">Tipo</p>
            <p className="text-sm">{TIPO_MATERIAL_LABELS[material.tipo]}</p>
          </div>
          <div>
            <p className="text-2xs text-muted-foreground">Categoría</p>
            <p className="text-sm">{material.categoria ?? '—'}</p>
          </div>
          <div>
            <p className="text-2xs text-muted-foreground">Crítico</p>
            <p className="text-sm">{material.critico ? <Badge variant="destructive">Sí</Badge> : 'No'}</p>
          </div>
          <div>
            <p className="text-2xs text-muted-foreground">Trazabilidad</p>
            <p className="flex gap-1 text-sm">
              {material.manejaLote ? <Badge variant="info">Lote</Badge> : null}
              {material.manejaSerie ? <Badge variant="info">Serie</Badge> : null}
              {!material.manejaLote && !material.manejaSerie ? '—' : null}
            </p>
          </div>
          {material.descripcion ? (
            <div className="col-span-2 sm:col-span-4">
              <p className="text-2xs text-muted-foreground">Descripción</p>
              <p className="text-sm">{material.descripcion}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Existencias por almacén</CardTitle>
          {puedeParametrizar ? (
            <Button variant="outline" size="sm" onClick={abrirNuevaExistencia}>
              <Plus aria-hidden />
              Configurar en almacén
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {existencias.length === 0 ? (
            <EmptyState icon={WarehouseIcon} titulo="Sin existencias configuradas" descripcion="Configura mínimos y máximos en un almacén, o registra un movimiento de kárdex para que aparezca aquí." />
          ) : (
            <div className="overflow-auto rounded-[6px] border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Almacén</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead className="text-right">Máximo</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead className="text-right">Costo promedio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {existencias.map((e) => {
                    const bajoMinimo = e.minimo !== null && Number(e.cantidad) < Number(e.minimo);
                    return (
                      <TableRow key={e.id}>
                        <TableCell>{e.warehouseNombre}</TableCell>
                        <TableCell className="tabular text-right">
                          <span className="inline-flex items-center gap-1">
                            {bajoMinimo ? <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-label="Bajo mínimo" /> : null}
                            {formatNumber(e.cantidad)}
                          </span>
                        </TableCell>
                        <TableCell className="tabular text-right">{e.minimo ? formatNumber(e.minimo) : '—'}</TableCell>
                        <TableCell className="tabular text-right">{e.maximo ? formatNumber(e.maximo) : '—'}</TableCell>
                        <TableCell className="text-xs">{e.ubicacionEstante ?? '—'}</TableCell>
                        <TableCell className="tabular text-right">{formatMoney(e.costoPromedio)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Referencias de proveedor</CardTitle>
          {puedeGestionarReferencias ? (
            <Button variant="outline" size="sm" onClick={abrirNuevaReferencia}>
              <Plus aria-hidden />
              Agregar referencia
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {referencias.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin referencias de proveedor registradas.</p>
          ) : (
            <div className="divide-y">
              {referencias.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{r.partyNombre ?? r.fabricante ?? 'Sin proveedor'}</p>
                    <p className="text-2xs text-muted-foreground">
                      {[r.referenciaProveedor, r.referenciaFabricante, r.precio ? formatMoney(r.precio) : null, r.tiempoEntregaDias ? `${r.tiempoEntregaDias} días` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {puedeGestionarReferencias ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => quitarReferencia(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogExistencia} onOpenChange={setDialogExistencia}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar existencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Almacén</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {almacenesDisponibles.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Mínimo</Label>
                <Input value={minimo} onChange={(e) => setMinimo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Máximo</Label>
                <Input value={maximo} onChange={(e) => setMaximo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Punto de pedido</Label>
                <Input value={puntoPedido} onChange={(e) => setPuntoPedido(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Ubicación en estantería</Label>
              <Input value={ubicacionEstante} onChange={(e) => setUbicacionEstante(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogExistencia(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarExistencia} loading={guardandoExistencia}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogReferencia} onOpenChange={setDialogReferencia}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva referencia de proveedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Proveedor</Label>
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fabricante</Label>
                <Input value={fabricante} onChange={(e) => setFabricante(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Referencia del fabricante</Label>
                <Input value={refFabricante} onChange={(e) => setRefFabricante(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Referencia del proveedor</Label>
                <Input value={refProveedor} onChange={(e) => setRefProveedor(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Precio</Label>
                <Input value={precio} onChange={(e) => setPrecio(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Tiempo de entrega (días)</Label>
                <Input value={tiempoEntrega} onChange={(e) => setTiempoEntrega(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogReferencia(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarReferencia} loading={guardandoReferencia}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
