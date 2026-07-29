'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { OrdenForm } from '../orden-form';
import { crearOrden, type OpcionesOrden } from '../actions';
import type { OrdenFormValues } from '@/lib/validators/orden';

export function NuevaOrdenClient({ opciones }: { opciones: OpcionesOrden }) {
  const router = useRouter();

  async function guardar(valores: OrdenFormValues) {
    const resultado = await crearOrden(valores);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Orden creada en borrador.');
    router.push(`/ordenes/${resultado.id}`);
  }

  return <OrdenForm opciones={opciones} onGuardado={guardar} />;
}
