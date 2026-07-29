import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerOpcionesPlan } from '../actions';
import { NuevoPlanClient } from './nuevo-plan-client';

export const metadata: Metadata = { title: 'Nuevo plan de mantenimiento' };

export default async function NuevoPlanPage() {
  await requirePermission('planes.gestionar');
  const opciones = await obtenerOpcionesPlan();

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PageHeader titulo="Nuevo plan de mantenimiento" descripcion="Define a quién aplica; los disparadores, el checklist y los recursos se agregan después de guardarlo." />
      <NuevoPlanClient opciones={opciones} />
    </div>
  );
}
