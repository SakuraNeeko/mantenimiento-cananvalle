'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { OrdenForm } from '../orden-form';
import { actualizarOrden, type OpcionesOrden } from '../actions';
import type { OrdenFormValues } from '@/lib/validators/orden';

export function EditarOrdenClient({ ordenId, opciones, valoresPrevios }: { ordenId: string; opciones: OpcionesOrden; valoresPrevios: OrdenFormValues }) {
  const router = useRouter();

  async function guardar(valores: OrdenFormValues) {
    const resultado = await actualizarOrden(ordenId, valores);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Cambios guardados.');
    router.refresh();
  }

  return <OrdenForm opciones={opciones} valoresPrevios={valoresPrevios} textoBoton="Guardar cambios" onGuardado={guardar} />;
}
