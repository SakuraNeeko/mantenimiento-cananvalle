'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SolicitudForm } from '@/app/(app)/solicitudes/solicitud-form';
import { crearSolicitud, enviarSolicitud, type OpcionesSolicitud } from '@/app/(app)/solicitudes/actions';
import type { SolicitudFormValues } from '@/lib/validators/solicitud';

/** Reutiliza el mismo `SolicitudForm` del portal — sin duplicar el formulario para móvil. */
export function NuevaSolicitudMovilClient({ opciones, assetId }: { opciones: OpcionesSolicitud; assetId?: string }) {
  const router = useRouter();

  async function guardar(valores: SolicitudFormValues) {
    const creada = await crearSolicitud(valores);
    if (!creada.ok) {
      toast.error(creada.error);
      return;
    }
    const enviada = await enviarSolicitud(creada.id!);
    if (!enviada.ok) toast.error(enviada.error);
    else toast.success('Solicitud enviada.');
    router.push('/movil/solicitudes');
  }

  return (
    <SolicitudForm
      opciones={opciones}
      valoresPrevios={assetId ? { descripcion: '', prioridad: 'MEDIA', assetId } : undefined}
      textoBoton="Enviar solicitud"
      onGuardado={guardar}
    />
  );
}
