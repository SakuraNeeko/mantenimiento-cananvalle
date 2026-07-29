import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerOpcionesSolicitud } from '../actions';
import { NuevaSolicitudClient } from './nueva-solicitud-client';

export const metadata: Metadata = { title: 'Nueva solicitud' };

export default async function NuevaSolicitudPage() {
  await requirePermission('solicitudes.crear');
  const opciones = await obtenerOpcionesSolicitud();

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PageHeader titulo="Nueva solicitud" descripcion="Se guarda en borrador. Podrás revisarla antes de enviarla." />
      <NuevaSolicitudClient opciones={opciones} />
    </div>
  );
}
