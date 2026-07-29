'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SolicitudForm } from '../solicitud-form';
import { crearSolicitud, type OpcionesSolicitud } from '../actions';
import type { SolicitudFormValues } from '@/lib/validators/solicitud';

export function NuevaSolicitudClient({ opciones }: { opciones: OpcionesSolicitud }) {
  const router = useRouter();

  async function guardar(valores: SolicitudFormValues) {
    const resultado = await crearSolicitud(valores);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Solicitud creada en borrador.');
    router.push(`/solicitudes/${resultado.id}`);
  }

  return <SolicitudForm opciones={opciones} onGuardado={guardar} />;
}
