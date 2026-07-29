import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerOpcionesSolicitud } from '@/app/(app)/solicitudes/actions';
import { NuevaSolicitudPortalClient } from './nueva-solicitud-portal-client';

export const metadata: Metadata = { title: 'Nueva solicitud' };

export default async function NuevaSolicitudPortalPage() {
  await requirePermission('solicitudes.crear');
  const opciones = await obtenerOpcionesSolicitud();

  return (
    <div className="space-y-3">
      <PageHeader titulo="Reportar una falla o pedir un trabajo" descripcion="Cuéntanos qué pasa. Recibirás avisos cuando cambie el estado." />
      <NuevaSolicitudPortalClient opciones={opciones} />
    </div>
  );
}
