'use client';

import * as React from 'react';
import Link from 'next/link';
import { liveQuery } from 'dexie';
import { toast } from 'sonner';
import { ArrowLeft, Camera, Check, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { ESTADO_LABELS, ESTADO_VARIANT, PRIORIDAD_LABELS } from '@/lib/validators/orden';
import { movilDB } from '@/lib/movil/db';
import type { OrdenCacheada, TareaCacheada } from '@/lib/movil/tipos';
import { comentarOffline, completarTareaOffline, firmarOffline, subirFotoOffline, transicionOffline } from '@/lib/movil/acciones-offline';

type Permisos = { registrarTareas: boolean; ejecutar: boolean; firmar: boolean };

export function OrdenDetalleClient({ id, permisos }: { id: string; permisos: Permisos }) {
  const [orden, setOrden] = React.useState<OrdenCacheada | null | undefined>(undefined);
  const [comentario, setComentario] = React.useState('');
  const [enviandoComentario, setEnviandoComentario] = React.useState(false);

  React.useEffect(() => {
    const dexie = movilDB;
    if (!dexie) return;
    const sub = liveQuery(() => dexie.ordenes.get(id)).subscribe({ next: (fila) => setOrden(fila ?? null) });
    return () => sub.unsubscribe();
  }, [id]);

  if (orden === undefined) return null;
  if (orden === null) {
    return (
      <div className="space-y-3">
        <VolverAMisOrdenes />
        <EmptyState titulo="Esta orden no está disponible" descripcion="No se cacheó en este dispositivo. Ábrela una vez con señal desde &quot;Mis OT&quot;." />
      </div>
    );
  }

  const enEjecucion = orden.estado === 'EN_EJECUCION';
  const criticasPendientes = orden.tareas.some((t) => t.esCritica && !t.completadaAt);

  async function enviarComentario() {
    if (!comentario.trim()) return;
    setEnviandoComentario(true);
    await comentarOffline(id, comentario.trim());
    setEnviandoComentario(false);
    setComentario('');
    toast.success('Comentario guardado — se enviará al sincronizar.');
  }

  return (
    <div className="space-y-3">
      <VolverAMisOrdenes />

      <Card>
        <CardContent className="space-y-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-codigo text-2xs text-muted-foreground">{orden.consecutivo ?? 'Sin consecutivo'}</span>
            <Badge variant={ESTADO_VARIANT[orden.estado] ?? 'neutral'}>{ESTADO_LABELS[orden.estado] ?? orden.estado}</Badge>
          </div>
          <p className="text-sm font-medium">{orden.descripcionProblema}</p>
          <p className="text-2xs text-muted-foreground">
            {orden.assetNombre ?? 'Sin activo'} · {PRIORIDAD_LABELS[orden.prioridad as keyof typeof PRIORIDAD_LABELS] ?? orden.prioridad}
          </p>
        </CardContent>
      </Card>

      {permisos.ejecutar ? (
        <div className="flex flex-wrap gap-2">
          {orden.estado === 'ASIGNADA' ? (
            <Button className="min-h-11 flex-1" onClick={() => transicionOffline(id, 'iniciar')}>
              Iniciar ejecución
            </Button>
          ) : null}
          {orden.estado === 'PENDIENTE' ? (
            <Button className="min-h-11 flex-1" onClick={() => transicionOffline(id, 'reanudar')}>
              Reanudar
            </Button>
          ) : null}
          {enEjecucion ? (
            <>
              <Button
                variant="outline"
                className="min-h-11 flex-1"
                onClick={() => transicionOffline(id, 'pendiente', { motivo: 'Marcada pendiente desde el móvil.' })}
              >
                Marcar pendiente
              </Button>
              <Button className="min-h-11 flex-1" disabled={criticasPendientes} onClick={() => transicionOffline(id, 'ejecutada')}>
                Marcar ejecutada
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {orden.estado === 'EJECUTADA' && permisos.firmar && !orden.firmaEjecutorAt ? (
        <Button className="min-h-11 w-full" onClick={() => firmarOffline(id)}>
          Firmar como ejecutor
        </Button>
      ) : null}
      {orden.firmaEjecutorAt ? <p className="text-center text-2xs text-success">Firmada como ejecutor.</p> : null}

      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground">Checklist</h2>
        {orden.tareas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Esta orden no tiene checklist.</p>
        ) : (
          orden.tareas.map((tarea) => (
            <TareaItem key={tarea.id} ordenId={id} tarea={tarea} editable={enEjecucion && permisos.registrarTareas} />
          ))
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground">Comentario</h2>
        <Textarea rows={2} placeholder="Deja una nota sobre esta orden…" value={comentario} onChange={(e) => setComentario(e.target.value)} />
        <Button size="sm" disabled={!comentario.trim() || enviandoComentario} onClick={enviarComentario}>
          {enviandoComentario ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Enviar comentario
        </Button>
      </div>
    </div>
  );
}

function VolverAMisOrdenes() {
  return (
    <Link href="/movil/mis-ordenes" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      Mis OT
    </Link>
  );
}

function TareaItem({ ordenId, tarea, editable }: { ordenId: string; tarea: TareaCacheada; editable: boolean }) {
  const [valor, setValor] = React.useState(tarea.tipoRespuesta === 'NUMERICO' ? (tarea.valorMedido ?? '') : (tarea.resultado ?? ''));
  const [observacion, setObservacion] = React.useState(tarea.observacion ?? '');
  const inputFotoRef = React.useRef<HTMLInputElement>(null);
  const completada = Boolean(tarea.completadaAt);

  async function guardar(resultado?: string) {
    if (tarea.tipoRespuesta === 'NUMERICO') {
      await completarTareaOffline(ordenId, tarea.id, { valorMedido: valor, observacion });
    } else {
      await completarTareaOffline(ordenId, tarea.id, { resultado: resultado ?? valor, observacion });
    }
    toast.success('Tarea guardada.');
  }

  async function onFotoSeleccionada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await subirFotoOffline(ordenId, tarea.id, file);
    await completarTareaOffline(ordenId, tarea.id, { resultado: 'OK', observacion });
    toast.success('Foto guardada — se sube al sincronizar.');
  }

  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm">{tarea.descripcion}</p>
          <div className="flex shrink-0 items-center gap-1">
            {tarea.esCritica ? <Badge variant="warning">Crítica</Badge> : null}
            {completada ? <Check className="h-4 w-4 text-success" aria-hidden /> : null}
          </div>
        </div>

        {!editable ? (
          completada ? (
            <p className="text-2xs text-muted-foreground">
              Resultado: {tarea.tipoRespuesta === 'NUMERICO' ? tarea.valorMedido : tarea.resultado}
            </p>
          ) : (
            <p className="text-2xs text-muted-foreground">Pendiente — se habilita cuando la orden esté en ejecución.</p>
          )
        ) : tarea.tipoRespuesta === 'OK_NO_OK' || tarea.tipoRespuesta === 'FIRMA' ? (
          <div className="flex gap-2">
            <Button size="sm" variant={tarea.resultado === 'OK' ? 'default' : 'outline'} className="min-h-11 flex-1" onClick={() => guardar('OK')}>
              <Check aria-hidden />
              OK
            </Button>
            {tarea.tipoRespuesta === 'OK_NO_OK' ? (
              <Button size="sm" variant={tarea.resultado === 'NO_OK' ? 'destructive' : 'outline'} className="min-h-11 flex-1" onClick={() => guardar('NO_OK')}>
                <X aria-hidden />
                No OK
              </Button>
            ) : null}
          </div>
        ) : tarea.tipoRespuesta === 'FOTO' ? (
          <div className="flex items-center gap-2">
            {tarea.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tarea.fotoUrl} alt="Evidencia" className="h-12 w-12 rounded-[6px] border object-cover" />
            ) : null}
            <Button size="sm" variant="outline" className="min-h-11 flex-1" onClick={() => inputFotoRef.current?.click()}>
              <Camera aria-hidden />
              {tarea.fotoUrl ? 'Cambiar foto' : 'Tomar foto'}
            </Button>
            <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFotoSeleccionada} />
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              className="min-h-11"
              type={tarea.tipoRespuesta === 'NUMERICO' ? 'number' : 'text'}
              inputMode={tarea.tipoRespuesta === 'NUMERICO' ? 'decimal' : undefined}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
            <Button size="sm" className="min-h-11" onClick={() => guardar()}>
              Guardar
            </Button>
          </div>
        )}

        {editable && tarea.tipoRespuesta !== 'FOTO' ? (
          <Input
            placeholder="Observación (opcional)"
            className="min-h-9 text-xs"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            onBlur={() => observacion !== (tarea.observacion ?? '') && guardar(tarea.resultado ?? undefined)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
