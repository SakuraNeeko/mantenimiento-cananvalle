'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlanForm } from '../plan-form';
import { crearPlan, type OpcionesPlan } from '../actions';
import type { PlanFormValues } from '@/lib/validators/plan';

export function NuevoPlanClient({ opciones }: { opciones: OpcionesPlan }) {
  const router = useRouter();

  async function guardar(valores: PlanFormValues) {
    const resultado = await crearPlan(valores);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Plan creado.');
    router.push(`/planes/${resultado.id}`);
  }

  return <PlanForm opciones={opciones} onGuardado={guardar} />;
}
