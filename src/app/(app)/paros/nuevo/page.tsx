import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerOpcionesParo } from '../actions';
import { NuevoParoClient } from './nuevo-paro-client';

export const metadata: Metadata = { title: 'Registrar paro' };

export default async function NuevoParoPage() {
  await requirePermission('paros.registrar');
  const opciones = await obtenerOpcionesParo();

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PageHeader titulo="Registrar paro" descripcion="Si aún no conoces la causa, puedes dejarla en blanco y completarla al cerrar." />
      <NuevoParoClient opciones={opciones} />
    </div>
  );
}
