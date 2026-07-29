'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fmtDateTime } from '@/lib/datetime';
import { ESTADO_LABELS, ESTADO_VARIANT, SEVERIDAD_LABELS, SEVERIDAD_VARIANT, TIPO_LABELS } from '../columns';
import { EventoForm } from '../evento-form';
import { actualizarEvento, cerrarEvento, iniciarGestionEvento, marcarReportadoAutoridad, type AccionResultado, type EventoFormValues } from '../actions';

type Evento = {
  id: string;
  assetId: string;
  assetCodigo: string | null;
  assetNombre: string | null;
  tipo: EventoFormValues['tipo'];
  severidad: NonNullable<EventoFormValues['severidad']> | null;
  clasificacion: string | null;
  fecha: Date;
  descripcion: string;
  estado: string;
  causaRaiz: string | null;
  accionesCorrectivas: string | null;
  reportadoAutoridad: boolean;
  fechaReporte: Date | null;
  numeroReporte: string | null;
  reportanteNombre: string | null;
};

export function EventoDetalleClient({
  evento,
  opciones,
  permisos,
}: {
  evento: Evento;
  opciones: { value: string; label: string; codigo: string }[];
  permisos: { editar: boolean; reportar: boolean };
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [procesando, setProcesando] = React.useState(false);

  const [dialogCerrar, setDialogCerrar] = React.useState(false);
  const [causaRaiz, setCausaRaiz] = React.useState('');
  const [accionesCorrectivas, setAccionesCorrectivas] = React.useState('');

  const [dialogReportar, setDialogReportar] = React.useState(false);
  const [numeroReporte, setNumeroReporte] = React.useState('');

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

  async function guardarEdicion(valores: EventoFormValues) {
    const resultado = await actualizarEvento(evento.id, valores);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Evento actualizado.');
    setEditando(false);
    router.refresh();
  }

  if (editando) {
    return (
      <div className="space-y-2">
        <Button variant="ghost" size="sm" onClick={() => setEditando(false)}>
          <X aria-hidden />
          Cancelar edición
        </Button>
        <EventoForm
          opciones={opciones}
          valoresPrevios={{
            assetId: evento.assetId,
            tipo: evento.tipo,
            severidad: evento.severidad ?? undefined,
            clasificacion: evento.clasificacion ?? undefined,
            fecha: evento.fecha.toISOString().slice(0, 16),
            descripcion: evento.descripcion,
          }}
          textoBoton="Guardar cambios"
          onGuardado={guardarEdicion}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>
            {evento.assetCodigo} — {evento.assetNombre}
          </CardTitle>
          <div className="flex gap-1.5">
            <Badge variant="outline">{TIPO_LABELS[evento.tipo]}</Badge>
            {evento.severidad ? <Badge variant={SEVERIDAD_VARIANT[evento.severidad]}>{SEVERIDAD_LABELS[evento.severidad]}</Badge> : null}
            <Badge variant={ESTADO_VARIANT[evento.estado] ?? 'neutral'}>{ESTADO_LABELS[evento.estado] ?? evento.estado}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{evento.descripcion}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <p className="text-2xs text-muted-foreground">Fecha</p>
              <p>{fmtDateTime(evento.fecha)}</p>
            </div>
            <div>
              <p className="text-2xs text-muted-foreground">Reportante</p>
              <p>{evento.reportanteNombre}</p>
            </div>
            {evento.clasificacion ? (
              <div>
                <p className="text-2xs text-muted-foreground">Clasificación</p>
                <p>{evento.clasificacion}</p>
              </div>
            ) : null}
          </div>

          {evento.reportadoAutoridad ? (
            <div className="rounded-[6px] border border-success/30 bg-success/5 p-2 text-sm">
              <p className="text-2xs font-medium text-muted-foreground">Reportado a la autoridad sanitaria</p>
              <p>
                {fmtDateTime(evento.fechaReporte)} {evento.numeroReporte ? `· N.º ${evento.numeroReporte}` : ''}
              </p>
            </div>
          ) : null}

          {evento.causaRaiz ? (
            <div className="rounded-[6px] border p-2 text-sm">
              <p className="text-2xs font-medium text-muted-foreground">Causa raíz</p>
              <p>{evento.causaRaiz}</p>
              <p className="mt-1 text-2xs font-medium text-muted-foreground">Acciones correctivas</p>
              <p>{evento.accionesCorrectivas}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        {permisos.editar && evento.estado !== 'CERRADO' ? (
          <Button variant="outline" onClick={() => setEditando(true)}>
            <Pencil aria-hidden />
            Editar
          </Button>
        ) : null}
        {permisos.reportar && !evento.reportadoAutoridad ? (
          <Button variant="outline" onClick={() => setDialogReportar(true)}>
            <Send aria-hidden />
            Reportar a autoridad sanitaria
          </Button>
        ) : null}
        {permisos.editar && evento.estado === 'ABIERTO' ? (
          <Button onClick={() => ejecutar(() => iniciarGestionEvento(evento.id), 'Gestión iniciada.')} loading={procesando}>
            Iniciar gestión
          </Button>
        ) : null}
        {permisos.editar && evento.estado === 'EN_GESTION' ? <Button onClick={() => setDialogCerrar(true)}>Cerrar evento</Button> : null}
      </div>

      <Dialog open={dialogCerrar} onOpenChange={setDialogCerrar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Causa raíz</Label>
              <Textarea rows={3} value={causaRaiz} onChange={(e) => setCausaRaiz(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Acciones correctivas</Label>
              <Textarea rows={3} value={accionesCorrectivas} onChange={(e) => setAccionesCorrectivas(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCerrar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await ejecutar(() => cerrarEvento(evento.id, causaRaiz, accionesCorrectivas), 'Evento cerrado.');
                setDialogCerrar(false);
              }}
              loading={procesando}
            >
              Cerrar evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogReportar} onOpenChange={setDialogReportar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar a la autoridad sanitaria</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>N.º de reporte (opcional)</Label>
            <Input value={numeroReporte} onChange={(e) => setNumeroReporte(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogReportar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await ejecutar(() => marcarReportadoAutoridad(evento.id, numeroReporte), 'Marcado como reportado.');
                setDialogReportar(false);
              }}
              loading={procesando}
            >
              Confirmar reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
