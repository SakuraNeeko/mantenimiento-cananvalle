import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerInventarioFisico } from '../actions';
import { TomaDetalleClient } from './toma-detalle-client';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const toma = await obtenerInventarioFisico(id);
  return { title: toma ? `Inventario · ${toma.warehouseNombre}` : 'Toma física' };
}

export default async function TomaFisicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('almacen.inventario.ejecutar');

  const toma = await obtenerInventarioFisico(id);
  if (!toma) notFound();

  return (
    <div className="space-y-3">
      <PageHeader titulo={`Toma física — ${toma.warehouseNombre}`} descripcion="Registra lo contado por material. Las diferencias se aplican al confirmar." />
      <TomaDetalleClient toma={toma} puedeConfirmar={hasPermission(session, 'almacen.inventario.aprobar')} />
    </div>
  );
}
