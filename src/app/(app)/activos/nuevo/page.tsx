import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerOpcionesActivo } from '../actions';
import { NuevoActivoClient } from './nuevo-activo-client';

export const metadata: Metadata = { title: 'Nuevo activo' };

export default async function NuevoActivoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('activos.crear');
  const { parentId } = await searchParams;
  const opciones = await obtenerOpcionesActivo();

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <PageHeader titulo="Nuevo activo" descripcion="Completa la ficha técnica. Podrás agregar características, medidores y documentos después de crearlo." />
      <NuevoActivoClient opciones={opciones} parentId={typeof parentId === 'string' ? parentId : undefined} />
    </div>
  );
}
