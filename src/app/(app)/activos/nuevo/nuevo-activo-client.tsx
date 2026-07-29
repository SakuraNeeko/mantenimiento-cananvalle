'use client';

import { useRouter } from 'next/navigation';
import { ActivoForm, VALORES_INICIALES } from '../activo-form';
import type { OpcionesActivo } from '../actions';

export function NuevoActivoClient({ opciones, parentId }: { opciones: OpcionesActivo; parentId?: string }) {
  const router = useRouter();

  return (
    <ActivoForm
      modo="crear"
      opciones={opciones}
      valoresPrevios={parentId ? { ...VALORES_INICIALES, parentId } : undefined}
      onGuardado={(id) => {
        router.push(`/activos/${id}`);
        router.refresh();
      }}
    />
  );
}
