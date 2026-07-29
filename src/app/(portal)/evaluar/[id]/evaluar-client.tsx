'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtDateTime } from '@/lib/datetime';
import { ESTADO_LABELS, PRIORIDAD_LABELS } from '@/lib/validators/solicitud';
import { agregarNota, calificarSolicitud } from '@/app/(app)/solicitudes/actions';

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

type Solicitud = {
  id: string;
  consecutivo: string | null;
  fecha: Date;
  descripcion: string;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  estado: string;
  responsableNombre: string | null;
  solucionAplicada: string | null;
  calificacion: number | null;
  comentarioCalificacion: string | null;
};

type Nota = { id: string; mensaje: string; createdAt: Date; autorNombre: string | null };

export function EvaluarClient({ solicitud, notas: notasIniciales, puedeCalificar }: { solicitud: Solicitud; notas: Nota[]; puedeCalificar: boolean }) {
  const router = useRouter();
  const [notas, setNotas] = React.useState(notasIniciales);
  const [nuevaNota, setNuevaNota] = React.useState('');
  const [estrellas, setEstrellas] = React.useState(5);
  const [comentario, setComentario] = React.useState('');
  const [enviandoCalificacion, setEnviandoCalificacion] = React.useState(false);

  async function enviarNota() {
    if (!nuevaNota.trim()) return;
    const resultado = await agregarNota(solicitud.id, nuevaNota, true);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setNotas((prev) => [...prev, { id: crypto.randomUUID(), mensaje: nuevaNota, createdAt: new Date(), autorNombre: 'Tú' }]);
    setNuevaNota('');
    router.refresh();
  }

  async function enviarCalificacion() {
    setEnviandoCalificacion(true);
    const resultado = await calificarSolicitud(solicitud.id, estrellas, comentario);
    setEnviandoCalificacion(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('¡Gracias por tu calificación!');
    router.refresh();
  }

  const yaSePuedeCalificar = puedeCalificar && ['RESUELTA', 'CERRADA'].includes(solicitud.estado) && !solicitud.calificacion;

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
        <CardContent className="space-y-2">
          <p className="text-sm">{solicitud.descripcion}</p>
          <p className="text-2xs text-muted-foreground">
            {fmtDateTime(solicitud.fecha)} {solicitud.responsableNombre ? `· Atendido por ${solicitud.responsableNombre}` : ''}
          </p>
          {solicitud.solucionAplicada ? (
            <div className="rounded-[6px] border p-2 text-sm">
              <p className="text-2xs font-medium text-muted-foreground">Solución aplicada</p>
              <p>{solicitud.solucionAplicada}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {yaSePuedeCalificar ? (
        <Card>
          <CardHeader>
            <CardTitle>¿Cómo fue el servicio?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} type="button" onClick={() => setEstrellas(i + 1)}>
                  <Star className={`h-7 w-7 ${i < estrellas ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>
            <Textarea rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Cuéntanos más (opcional)" />
            <Button onClick={enviarCalificacion} loading={enviandoCalificacion}>
              Enviar calificación
            </Button>
          </CardContent>
        </Card>
      ) : solicitud.calificacion ? (
        <Card>
          <CardContent className="flex items-center gap-1 p-3 text-sm">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${i < solicitud.calificacion! ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
            ))}
            {solicitud.comentarioCalificacion ? <span className="ml-2 text-muted-foreground">{solicitud.comentarioCalificacion}</span> : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Seguimiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {notas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin novedades todavía.</p>
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
    </div>
  );
}
