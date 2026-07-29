import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerModulos } from './actions';
import { ModulosClient } from './modulos-client';

export const metadata: Metadata = { title: 'Módulos opcionales' };

export default async function ModulosPage() {
  await requirePermission('admin.modulos.activar');
  const modulos = await obtenerModulos();

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PageHeader titulo="Módulos opcionales" descripcion="Activa o desactiva funcionalidades complementarias, activables por empresa (§4.11 del prompt maestro)." />
      <ModulosClient modulos={modulos} />
    </div>
  );
}
