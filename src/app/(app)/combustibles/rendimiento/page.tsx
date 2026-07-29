import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerOpcionesAssetsCombustible } from '../actions';
import { RendimientoClient } from './rendimiento-client';

export const metadata: Metadata = { title: 'Rendimiento por activo' };

export default async function RendimientoPage({ searchParams }: { searchParams: Promise<{ assetId?: string }> }) {
  await requirePermission('combustibles.ver');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'combustibles');
  const { assetId } = await searchParams;
  const assets = await obtenerOpcionesAssetsCombustible();

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <PageHeader titulo="Rendimiento por activo" descripcion="Km/gal u h/gal calculado entre cargas consecutivas, con alerta cuando se desvía más de 30% del promedio." />
      <RendimientoClient assets={assets} assetIdInicial={assetId ?? ''} />
    </div>
  );
}
