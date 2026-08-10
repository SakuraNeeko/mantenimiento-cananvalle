import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerOpcionesBitacora } from '../actions';
import { NuevaBitacoraClient } from './nueva-bitacora-client';

export const metadata: Metadata = { title: 'Registrar salida' };

export default async function NuevaBitacoraPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission('bitacora.registrar');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'bitacora');
  const opciones = await obtenerOpcionesBitacora();
  const { assetId } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PageHeader titulo="Registrar salida" descripcion="La foto y la lectura del medidor son opcionales, pero ayudan a controlar el estado del activo." />
      <NuevaBitacoraClient opciones={opciones} assetIdInicial={typeof assetId === 'string' ? assetId : undefined} />
    </div>
  );
}
