import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { NuevaTomaClient } from './nueva-toma-client';

export const metadata: Metadata = { title: 'Nueva toma física' };

export default async function NuevaTomaPage() {
  await requirePermission('almacen.inventario.ejecutar');

  return (
    <div className="space-y-3">
      <PageHeader titulo="Nueva toma física" descripcion="Se fotografía la cantidad de sistema de cada material con existencia configurada en el almacén elegido." />
      <NuevaTomaClient />
    </div>
  );
}
