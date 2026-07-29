'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CombustibleForm } from '../combustible-form';
import { registrarCombustible, type OpcionesCombustible, type RegistroCombustibleValues } from '../actions';

export function NuevoCombustibleClient({ opciones }: { opciones: OpcionesCombustible }) {
  const router = useRouter();

  async function guardar(valores: RegistroCombustibleValues) {
    const resultado = await registrarCombustible(valores);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Carga registrada.');
    router.push('/combustibles');
  }

  return <CombustibleForm opciones={opciones} onGuardado={guardar} />;
}
