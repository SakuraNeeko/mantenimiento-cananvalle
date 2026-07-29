'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  asignarOrden,
  cancelarOrden,
  cerrarOrden,
  eliminarOrden,
  firmarComoAprobador,
  firmarComoEjecutor,
  iniciarEjecucion,
  liquidarOrden,
  marcarEjecutada,
  marcarPendiente,
  planificarOrden,
  reabrirOrden,
  reanudarEjecucion,
  type AccionResultado,
  type OpcionesOrden,
} from '../actions';

type Opcion = { value: string; label: string };

export function OrdenAcciones({
  orden,
  permisos,
  opciones,
  causasCierre,
  causasPendiente,
}: {
  orden: { id: string; estado: string; warehouseId: string | null; firmaEjecutorAt: Date | null; firmaAprobadorAt: Date | null };
  permisos: {
    editar: boolean;
    eliminar: boolean;
    planificar: boolean;
    asignar: boolean;
    ejecutar: boolean;
    liquidar: boolean;
    cerrar: boolean;
    reabrir: boolean;
    cancelar: boolean;
    firmarEjecutor: boolean;
    firmarAprobador: boolean;
  };
  opciones: OpcionesOrden | null;
  causasCierre: Opcion[];
  causasPendiente: Opcion[];
}) {
  const router = useRouter();
  const [procesando, setProcesando] = React.useState(false);

  const [dialogPlanificar, setDialogPlanificar] = React.useState(false);
  const [fechaProgramada, setFechaProgramada] = React.useState('');
  const [warehouseSel, setWarehouseSel] = React.useState('');

  const [dialogAsignar, setDialogAsignar] = React.useState(false);
  const [responsableSel, setResponsableSel] = React.useState('');

  const [dialogPendiente, setDialogPendiente] = React.useState(false);
  const [causaPendienteSel, setCausaPendienteSel] = React.useState('');
  const [motivoPendiente, setMotivoPendiente] = React.useState('');

  const [dialogCerrar, setDialogCerrar] = React.useState(false);
  const [causaCierreSel, setCausaCierreSel] = React.useState('');

  const [dialogReabrir, setDialogReabrir] = React.useState(false);
  const [dialogCancelar, setDialogCancelar] = React.useState(false);
  const [motivo, setMotivo] = React.useState('');

  async function ejecutar(accion: () => Promise<AccionResultado>, mensajeExito: string) {
    setProcesando(true);
    const resultado = await accion();
    setProcesando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(mensajeExito);
    router.refresh();
  }

  const { estado } = orden;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {permisos.eliminar && estado === 'BORRADOR' ? (
        <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => ejecutar(() => eliminarOrden(orden.id), 'Borrador eliminado.')} disabled={procesando}>
          Eliminar
        </Button>
      ) : null}

      {permisos.planificar && estado === 'BORRADOR' ? <Button onClick={() => setDialogPlanificar(true)}>Planificar</Button> : null}

      {permisos.asignar && estado === 'PLANIFICADA' ? <Button onClick={() => setDialogAsignar(true)}>Asignar</Button> : null}

      {permisos.ejecutar && estado === 'ASIGNADA' ? (
        <Button onClick={() => ejecutar(() => iniciarEjecucion(orden.id), 'Ejecución iniciada.')} loading={procesando}>
          Iniciar ejecución
        </Button>
      ) : null}

      {permisos.ejecutar && estado === 'EN_EJECUCION' ? (
        <>
          <Button variant="outline" onClick={() => setDialogPendiente(true)}>
            Marcar pendiente
          </Button>
          <Button onClick={() => ejecutar(() => marcarEjecutada(orden.id), 'Orden marcada como ejecutada.')} loading={procesando}>
            Marcar ejecutada
          </Button>
        </>
      ) : null}

      {permisos.ejecutar && estado === 'PENDIENTE' ? (
        <Button onClick={() => ejecutar(() => reanudarEjecucion(orden.id), 'Ejecución reanudada.')} loading={procesando}>
          Reanudar
        </Button>
      ) : null}

      {permisos.firmarEjecutor && estado === 'EJECUTADA' && !orden.firmaEjecutorAt ? (
        <Button variant="outline" onClick={() => ejecutar(() => firmarComoEjecutor(orden.id), 'Firmado como ejecutor.')} loading={procesando}>
          Firmar (ejecutor)
        </Button>
      ) : null}

      {permisos.firmarAprobador && estado === 'EJECUTADA' && !orden.firmaAprobadorAt ? (
        <Button variant="outline" onClick={() => ejecutar(() => firmarComoAprobador(orden.id), 'Firmado como aprobador.')} loading={procesando}>
          Firmar (aprobador)
        </Button>
      ) : null}

      {permisos.liquidar && estado === 'EJECUTADA' ? (
        <Button onClick={() => ejecutar(() => liquidarOrden(orden.id), 'Orden liquidada.')} loading={procesando}>
          Liquidar
        </Button>
      ) : null}

      {permisos.cerrar && estado === 'LIQUIDADA' ? <Button onClick={() => setDialogCerrar(true)}>Cerrar</Button> : null}

      {permisos.reabrir && estado === 'CERRADA' ? <Button variant="outline" onClick={() => setDialogReabrir(true)}>Reabrir</Button> : null}

      {permisos.cancelar && ['BORRADOR', 'PLANIFICADA', 'ASIGNADA', 'EN_EJECUCION', 'PENDIENTE'].includes(estado) ? (
        <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDialogCancelar(true)}>
          Cancelar
        </Button>
      ) : null}

      {/* --- Diálogos --- */}
      <Dialog open={dialogPlanificar} onOpenChange={setDialogPlanificar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planificar orden</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Fecha programada</Label>
              <Input type="date" value={fechaProgramada} onChange={(e) => setFechaProgramada(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Almacén (opcional, requerido si se consumen materiales)</Label>
              <Select value={warehouseSel} onValueChange={setWarehouseSel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {(opciones?.warehouses ?? []).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPlanificar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!fechaProgramada) {
                  toast.error('Indica la fecha programada.');
                  return;
                }
                await ejecutar(() => planificarOrden(orden.id, fechaProgramada, warehouseSel || undefined), 'Orden planificada.');
                setDialogPlanificar(false);
              }}
              loading={procesando}
            >
              Planificar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogAsignar} onOpenChange={setDialogAsignar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar responsable</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Responsable</Label>
            <Select value={responsableSel} onValueChange={setResponsableSel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {(opciones?.responsables ?? []).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAsignar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!responsableSel) {
                  toast.error('Selecciona un responsable.');
                  return;
                }
                await ejecutar(() => asignarOrden(orden.id, responsableSel), 'Responsable asignado.');
                setDialogAsignar(false);
              }}
              loading={procesando}
            >
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogPendiente} onOpenChange={setDialogPendiente}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como pendiente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Causa</Label>
              <Select value={causaPendienteSel} onValueChange={setCausaPendienteSel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {causasPendiente.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Motivo</Label>
              <Textarea rows={3} value={motivoPendiente} onChange={(e) => setMotivoPendiente(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPendiente(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await ejecutar(() => marcarPendiente(orden.id, causaPendienteSel, motivoPendiente), 'Orden marcada como pendiente.');
                setDialogPendiente(false);
              }}
              loading={procesando}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogCerrar} onOpenChange={setDialogCerrar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar orden</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Causa de cierre</Label>
            <Select value={causaCierreSel} onValueChange={setCausaCierreSel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {causasCierre.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCerrar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!causaCierreSel) {
                  toast.error('Selecciona la causa de cierre.');
                  return;
                }
                await ejecutar(() => cerrarOrden(orden.id, causaCierreSel), 'Orden cerrada.');
                setDialogCerrar(false);
              }}
              loading={procesando}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogReabrir} onOpenChange={setDialogReabrir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir orden</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogReabrir(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!motivo.trim()) {
                  toast.error('Indica el motivo.');
                  return;
                }
                await ejecutar(() => reabrirOrden(orden.id, motivo), 'Orden reabierta.');
                setDialogReabrir(false);
                setMotivo('');
              }}
              loading={procesando}
            >
              Reabrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogCancelar} onOpenChange={setDialogCancelar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar orden</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCancelar(false)}>
              Volver
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={async () => {
                if (!motivo.trim()) {
                  toast.error('Indica el motivo.');
                  return;
                }
                await ejecutar(() => cancelarOrden(orden.id, motivo), 'Orden cancelada.');
                setDialogCancelar(false);
                setMotivo('');
              }}
              loading={procesando}
            >
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
