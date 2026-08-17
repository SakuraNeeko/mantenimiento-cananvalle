'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SalidaForm } from '../salida-form';
import { registrarSalida, type OpcionesBitacora } from '../actions';
import type { SalidaFormValues } from '@/lib/validators/bitacora';

export function NuevaBitacoraClient({
  opciones,
  assetIdInicial,
  bloquearResponsable,
}: {
  opciones: OpcionesBitacora;
  assetIdInicial?: string;
  bloquearResponsable?: boolean;
}) {
  const router = useRouter();

  async function guardar(valores: SalidaFormValues, formData: FormData) {
    const resultado = await registrarSalida(valores, formData);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Salida registrada.');
    router.push(`/bitacora-uso/${resultado.id}`);
  }

  return <SalidaForm opciones={opciones} assetIdInicial={assetIdInicial} bloquearResponsable={bloquearResponsable} onGuardado={guardar} />;
}
