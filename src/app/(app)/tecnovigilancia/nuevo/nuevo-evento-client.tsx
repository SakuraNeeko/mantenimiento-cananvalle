'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EventoForm } from '../evento-form';
import { registrarEvento, type EventoFormValues } from '../actions';

export function NuevoEventoClient({ opciones }: { opciones: { value: string; label: string; codigo: string }[] }) {
  const router = useRouter();

  async function guardar(valores: EventoFormValues) {
    const resultado = await registrarEvento(valores);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Evento registrado.');
    router.push(`/tecnovigilancia/${resultado.id}`);
  }

  return <EventoForm opciones={opciones} onGuardado={guardar} />;
}
