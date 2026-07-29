'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtDateTime } from '@/lib/datetime';
import { agregarComentarioOrden } from '../actions';

type Comentario = { id: string; mensaje: string; createdAt: Date; autorNombre: string | null };

export function ComentariosPanel({ ordenId, comentariosIniciales }: { ordenId: string; comentariosIniciales: Comentario[] }) {
  const router = useRouter();
  const [comentarios, setComentarios] = React.useState(comentariosIniciales);
  const [mensaje, setMensaje] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);

  async function enviar() {
    if (!mensaje.trim()) return;
    setEnviando(true);
    const resultado = await agregarComentarioOrden(ordenId, mensaje);
    setEnviando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setComentarios((prev) => [...prev, { id: crypto.randomUUID(), mensaje, createdAt: new Date(), autorNombre: 'Tú' }]);
    setMensaje('');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {comentarios.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin comentarios todavía.</p>
        ) : (
          comentarios.map((c) => (
            <div key={c.id} className="rounded-[6px] border p-2 text-sm">
              <p className="text-2xs text-muted-foreground">
                {c.autorNombre ?? 'Alguien'} · {fmtDateTime(c.createdAt)}
              </p>
              <p>{c.mensaje}</p>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <Input value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Escribe un comentario…" onKeyDown={(e) => e.key === 'Enter' && enviar()} disabled={enviando} />
        <Button variant="outline" onClick={enviar} disabled={enviando}>
          Enviar
        </Button>
      </div>
    </div>
  );
}
