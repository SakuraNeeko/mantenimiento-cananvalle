import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerOpcionesSolicitud } from '@/app/(app)/solicitudes/actions';
import { NuevaSolicitudMovilClient } from './nueva-solicitud-movil-client';

export const metadata: Metadata = { title: 'Nueva solicitud' };

export default async function NuevaSolicitudMovilPage({ searchParams }: { searchParams: Promise<{ assetId?: string }> }) {
  await requirePermission('solicitudes.crear');
  const opciones = await obtenerOpcionesSolicitud();
  const { assetId } = await searchParams;

  return (
    <div className="space-y-3">
      <PageHeader titulo="Nueva solicitud" descripcion="Cuéntanos qué pasa." />
      <NuevaSolicitudMovilClient opciones={opciones} assetId={assetId} />
    </div>
  );
}
