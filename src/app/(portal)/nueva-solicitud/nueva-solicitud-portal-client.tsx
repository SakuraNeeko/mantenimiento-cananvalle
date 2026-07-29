'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SolicitudForm } from '@/app/(app)/solicitudes/solicitud-form';
import { crearSolicitud, enviarSolicitud, type OpcionesSolicitud } from '@/app/(app)/solicitudes/actions';
import type { SolicitudFormValues } from '@/lib/validators/solicitud';

export function NuevaSolicitudPortalClient({ opciones }: { opciones: OpcionesSolicitud }) {
  const router = useRouter();

  async function guardar(valores: SolicitudFormValues) {
    const creada = await crearSolicitud(valores);
    if (!creada.ok) {
      toast.error(creada.error);
      return;
    }
    // El portal no expone el concepto de "borrador": se envía de una vez.
    const enviada = await enviarSolicitud(creada.id!);
    if (!enviada.ok) {
      toast.error(enviada.error);
      router.push(`/evaluar/${creada.id}`);
      return;
    }
    toast.success('Solicitud enviada. Te avisaremos cuando haya novedades.');
    router.push(`/evaluar/${creada.id}`);
  }

  return <SolicitudForm opciones={opciones} textoBoton="Enviar solicitud" onGuardado={guardar} />;
}
