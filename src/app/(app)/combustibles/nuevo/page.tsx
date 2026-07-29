import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerOpcionesCombustible } from '../actions';
import { NuevoCombustibleClient } from './nuevo-combustible-client';

export const metadata: Metadata = { title: 'Registrar carga de combustible' };

export default async function NuevoCombustiblePage() {
  await requirePermission('combustibles.registrar');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'combustibles');
  const opciones = await obtenerOpcionesCombustible();

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PageHeader titulo="Registrar carga de combustible" descripcion="La lectura de odómetro/horómetro es opcional, pero sin ella no se puede calcular el rendimiento." />
      <NuevoCombustibleClient opciones={opciones} />
    </div>
  );
}
