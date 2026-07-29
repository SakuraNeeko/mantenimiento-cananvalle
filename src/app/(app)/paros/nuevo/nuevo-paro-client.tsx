'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ParoForm } from '../paro-form';
import { registrarParo, type OpcionesParo } from '../actions';
import type { ParoFormValues } from '@/lib/validators/paro';

export function NuevoParoClient({ opciones }: { opciones: OpcionesParo }) {
  const router = useRouter();

  async function guardar(valores: ParoFormValues) {
    const resultado = await registrarParo(valores);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Paro registrado.');
    router.push(`/paros/${resultado.id}`);
  }

  return <ParoForm opciones={opciones} onGuardado={guardar} />;
}
