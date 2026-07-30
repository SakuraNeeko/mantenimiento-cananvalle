'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRightLeft, Send, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fmtDateTime } from '@/lib/datetime';
import { ESTADO_LABELS, PRIORIDAD_LABELS } from '@/lib/validators/solicitud';
import { SolicitudForm } from '../solicitud-form';
import {
  agregarNota,
  aprobarSolicitud,
  asignarSolicitud,
  calificarSolicitud,
  cerrarSolicitud,
  eliminarSolicitud,
  enviarSolicitud,
  iniciarAtencionSolicitud,
  rechazarSolicitud,
  resolverSolicitud,
  type OpcionesSolicitud,
} from '../actions';
import { convertirSolicitudEnOrden } from '../../ordenes/actions';

type Solicitud = {
  id: string;
  consecutivo: string | null;
  fecha: Date;
  descripcion: string;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  estado: string;
  solicitanteUserId: string;
  solicitanteNombre: string;
  responsableUserId: string | null;
  responsableNombre: string | null;
  assetNombre: string | null;
  locationNombre: string | null;
  siteNombre: string | null;
  workTypeNombre: string | null;
  fechaCompromiso: Date | null;
  fechaAtencion: Date | null;
  solucionAplicada: string | null;
  esAtencionDirecta: boolean;
  causaRechazo: string | null;
  calificacion: number | null;
  comentarioCalificacion: string | null;
};

type Nota = { id: string; mensaje: string; visibleSolicitante: boolean; createdAt: Date; autorNombre: string | null };

const ESTADO_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'info' | 'neutral'> = {
  BORRADOR: 'neutral',
  ENVIADA: 'info',
  EN_REVISION: 'info',
  APROBADA: 'info',
  RECHAZADA: 'destructive',
  ASIGNADA: 'warning',
  EN_ATENCION: 'warning',
  RESUELTA: 'success',
  CERRADA: 'neutral',
  CONVERTIDA_EN_OT: 'success',
};

export function SolicitudDetalleClient({
  solicitud,
  notas: notasIniciales,
  opciones,
  responsables,
  currentUserId,
  permisos,
}: {
  solicitud: Solicitud;
  notas: Nota[];
  opciones: OpcionesSolicitud | null;
  responsables: { value: string; label: string }[];
  currentUserId: string;
  permisos: { editar: boolean; aprobar: boolean; rechazar: boolean; asignar: boolean; atender: boolean; atencionDirecta: boolean; cerrar: boolean; calificar: boolean; convertirOt: boolean };
}) {
  const router = useRouter();
  const esDuenio = solicitud.solicitanteUserId === currentUserId;
  const puedeEditarEsta = permisos.editar && (esDuenio || solicitud.estado !== 'BORRADOR');

  const [procesando, setProcesando] = React.useState(false);
  const [dialogRechazar, setDialogRechazar] = React.useState(false);
  const [causaRechazo, setCausaRechazo] = React.useState('');
  const [dialogAsignar, setDialogAsignar] = React.useState(false);
  const [responsableSel, setResponsableSel] = React.useState('');
  const [dialogResolver, setDialogResolver] = React.useState(false);
  const [solucion, setSolucion] = React.useState('');
  const [atencionDirecta, setAtencionDirecta] = React.useState(false);
  const [dialogCalificar, setDialogCalificar] = React.useState(false);
  const [estrellas, setEstrellas] = React.useState(5);
  const [comentario, setComentario] = React.useState('');
  const [nuevaNota, setNuevaNota] = React.useState('');
  const [notas, setNotas] = React.useState(notasIniciales);

  async function ejecutar(accion: () => Promise<{ ok: true; id?: string } | { ok: false; error: string }>, mensajeExito: string) {
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

  async function convertirEnOt() {
    setProcesando(true);
    const resultado = await convertirSolicitudEnOrden(solicitud.id);
    setProcesando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Solicitud convertida en orden de trabajo.');
    router.push(`/ordenes/${resultado.id}`);
  }

  async function enviarNota() {
    if (!nuevaNota.trim()) return;
    const resultado = await agregarNota(solicitud.id, nuevaNota, true);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setNotas((prev) => [...prev, { id: crypto.randomUUID(), mensaje: nuevaNota, visibleSolicitante: true, createdAt: new Date(), autorNombre: 'Tú' }]);
    setNuevaNota('');
    router.refresh();
  }

  if (solicitud.estado === 'BORRADOR' && puedeEditarEsta) {
    return (
      <div className="space-y-3">
        <SolicitudForm
          opciones={opciones ?? { assets: [], locations: [], sites: [], workTypes: [], responsables: [] }}
          valoresPrevios={{
            descripcion: solicitud.descripcion,
            prioridad: solicitud.prioridad,
          }}
          textoBoton="Guardar cambios"
          onGuardado={async () => {
            toast.success('Borrador guardado.');
            router.refresh();
          }}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => ejecutar(() => eliminarSolicitud(solicitud.id), 'Borrador eliminado.')} disabled={procesando}>
            <Trash2 aria-hidden />
            Eliminar borrador
          </Button>
          <Button onClick={() => ejecutar(() => enviarSolicitud(solicitud.id), 'Solicitud enviada.')} loading={procesando}>
            <Send aria-hidden />
            Enviar solicitud
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{solicitud.consecutivo ?? 'Borrador'}</CardTitle>
          <div className="flex gap-1.5">
            <Badge variant={ESTADO_VARIANT[solicitud.estado] ?? 'neutral'}>{ESTADO_LABELS[solicitud.estado] ?? solicitud.estado}</Badge>
            <Badge variant="outline">{PRIORIDAD_LABELS[solicitud.prioridad]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{solicitud.descripcion}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <p className="text-2xs text-muted-foreground">Solicitante</p>
              <p>{solicitud.solicitanteNombre}</p>
            </div>
            <div>
              <p className="text-2xs text-muted-foreground">Responsable</p>
              <p>{solicitud.responsableNombre ?? '—'}</p>
            </div>
            <div>
              <p className="text-2xs text-muted-foreground">Fecha</p>
              <p>{fmtDateTime(solicitud.fecha)}</p>
            </div>
            {solicitud.assetNombre ? (
              <div>
                <p className="text-2xs text-muted-foreground">Activo</p>
                <p>{solicitud.assetNombre}</p>
              </div>
            ) : null}
            {solicitud.locationNombre ? (
              <div>
                <p className="text-2xs text-muted-foreground">Ubicación</p>
                <p>{solicitud.locationNombre}</p>
              </div>
            ) : null}
            {solicitud.siteNombre ? (
              <div>
                <p className="text-2xs text-muted-foreground">Sede</p>
                <p>{solicitud.siteNombre}</p>
              </div>
            ) : null}
            {solicitud.workTypeNombre ? (
              <div>
                <p className="text-2xs text-muted-foreground">Tipo de trabajo</p>
                <p>{solicitud.workTypeNombre}</p>
              </div>
            ) : null}
            {solicitud.fechaCompromiso ? (
              <div>
                <p className="text-2xs text-muted-foreground">Compromiso (SLA)</p>
                <p>{fmtDateTime(solicitud.fechaCompromiso)}</p>
              </div>
            ) : null}
          </div>

          {solicitud.causaRechazo ? (
            <div className="rounded-[6px] border border-destructive/30 bg-destructive/5 p-2 text-sm">
              <p className="text-2xs font-medium text-destructive">Motivo del rechazo</p>
              <p>{solicitud.causaRechazo}</p>
            </div>
          ) : null}

          {solicitud.solucionAplicada ? (
            <div className="rounded-[6px] border p-2 text-sm">
              <p className="text-2xs font-medium text-muted-foreground">
                Solución aplicada {solicitud.esAtencionDirecta ? <Badge variant="info" className="ml-1">Atención directa</Badge> : null}
              </p>
              <p>{solicitud.solucionAplicada}</p>
            </div>
          ) : null}

          {solicitud.calificacion ? (
            <div className="flex items-center gap-1 text-sm">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < solicitud.calificacion! ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
              ))}
              {solicitud.comentarioCalificacion ? <span className="ml-2 text-muted-foreground">{solicitud.comentarioCalificacion}</span> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        {permisos.aprobar && ['ENVIADA', 'EN_REVISION'].includes(solicitud.estado) ? (
          <>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDialogRechazar(true)}>
              Rechazar
            </Button>
            <Button onClick={() => ejecutar(() => aprobarSolicitud(solicitud.id), 'Solicitud aprobada.')} loading={procesando}>
              Aprobar
            </Button>
          </>
        ) : null}

        {permisos.asignar && solicitud.estado === 'APROBADA' ? <Button onClick={() => setDialogAsignar(true)}>Asignar responsable</Button> : null}

        {permisos.convertirOt && solicitud.estado === 'APROBADA' ? (
          <Button variant="outline" onClick={convertirEnOt} loading={procesando}>
            <ArrowRightLeft aria-hidden />
            Convertir en OT
          </Button>
        ) : null}

        {permisos.atender && solicitud.estado === 'ASIGNADA' ? (
          <Button onClick={() => ejecutar(() => iniciarAtencionSolicitud(solicitud.id), 'Atención iniciada.')} loading={procesando}>
            Iniciar atención
          </Button>
        ) : null}

        {permisos.atender && solicitud.estado === 'EN_ATENCION' ? <Button onClick={() => setDialogResolver(true)}>Resolver</Button> : null}

        {permisos.cerrar && solicitud.estado === 'RESUELTA' ? (
          <Button onClick={() => ejecutar(() => cerrarSolicitud(solicitud.id), 'Solicitud cerrada.')} loading={procesando}>
            Cerrar
          </Button>
        ) : null}

        {permisos.calificar && esDuenio && ['RESUELTA', 'CERRADA'].includes(solicitud.estado) && !solicitud.calificacion ? (
          <Button variant="outline" onClick={() => setDialogCalificar(true)}>
            <Star aria-hidden />
            Calificar servicio
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seguimiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {notas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin comentarios todavía.</p>
            ) : (
              notas.map((n) => (
                <div key={n.id} className="rounded-[6px] border p-2 text-sm">
                  <p className="text-2xs text-muted-foreground">
                    {n.autorNombre ?? 'Alguien'} · {fmtDateTime(n.createdAt)}
                  </p>
                  <p>{n.mensaje}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input value={nuevaNota} onChange={(e) => setNuevaNota(e.target.value)} placeholder="Escribe un comentario…" onKeyDown={(e) => e.key === 'Enter' && enviarNota()} />
            <Button variant="outline" onClick={enviarNota}>
              Enviar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* --- Diálogos --- */}
      <Dialog open={dialogRechazar} onOpenChange={setDialogRechazar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Textarea rows={3} value={causaRechazo} onChange={(e) => setCausaRechazo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRechazar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await ejecutar(() => rechazarSolicitud(solicitud.id, causaRechazo), 'Solicitud rechazada.');
                setDialogRechazar(false);
              }}
              loading={procesando}
            >
              Rechazar
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
                {responsables.map((o) => (
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
                await ejecutar(() => asignarSolicitud(solicitud.id, responsableSel), 'Responsable asignado.');
                setDialogAsignar(false);
              }}
              loading={procesando}
            >
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogResolver} onOpenChange={setDialogResolver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Solución aplicada</Label>
              <Textarea rows={3} value={solucion} onChange={(e) => setSolucion(e.target.value)} />
            </div>
            {permisos.atencionDirecta ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={atencionDirecta} onCheckedChange={(v) => setAtencionDirecta(Boolean(v))} />
                Fue una atención directa (sin generar orden de trabajo)
              </label>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogResolver(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await ejecutar(() => resolverSolicitud(solicitud.id, solucion, atencionDirecta), 'Solicitud resuelta.');
                setDialogResolver(false);
              }}
              loading={procesando}
            >
              Resolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogCalificar} onOpenChange={setDialogCalificar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Califica el servicio recibido</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} type="button" onClick={() => setEstrellas(i + 1)}>
                  <Star className={`h-6 w-6 ${i < estrellas ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <Label>Comentario</Label>
              <Textarea rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCalificar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await ejecutar(() => calificarSolicitud(solicitud.id, estrellas, comentario), '¡Gracias por tu calificación!');
                setDialogCalificar(false);
              }}
              loading={procesando}
            >
              Enviar calificación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
