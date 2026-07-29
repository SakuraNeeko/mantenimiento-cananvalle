'use client';

import { useRouter } from 'next/navigation';
import { MovimientoForm } from '../movimiento-form';

export function NuevoMovimientoClient() {
  const router = useRouter();
  return (
    <MovimientoForm
      modo="crear"
      onGuardado={(id) => {
        router.push(`/almacen/kardex/${id}`);
      }}
    />
  );
}
