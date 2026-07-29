import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerOpcionesOrden } from '../actions';
import { NuevaOrdenClient } from './nueva-orden-client';

export const metadata: Metadata = { title: 'Nueva orden de trabajo' };

export default async function NuevaOrdenPage() {
  await requirePermission('ordenes.crear');
  const opciones = await obtenerOpcionesOrden();

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PageHeader titulo="Nueva orden de trabajo" descripcion="Se guarda en borrador. El consecutivo se asigna al planificarla." />
      <NuevaOrdenClient opciones={opciones} />
    </div>
  );
}
