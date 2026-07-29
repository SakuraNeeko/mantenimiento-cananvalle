import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerMovimiento } from '../actions';
import { MovimientoDetalleClient } from './movimiento-detalle-client';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const mov = await obtenerMovimiento(id);
  return { title: mov?.consecutivo ?? 'Movimiento de kárdex' };
}

export default async function MovimientoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('almacen.kardex.ver');

  const movimiento = await obtenerMovimiento(id);
  if (!movimiento) notFound();

  return (
    <div className="space-y-3">
      <PageHeader titulo="Movimiento de kárdex" descripcion={movimiento.consecutivo ?? 'Borrador sin confirmar'} />
      <MovimientoDetalleClient
        movimiento={movimiento}
        puedeConfirmar={hasPermission(session, 'almacen.kardex.confirmar')}
        puedeAnular={hasPermission(session, 'almacen.kardex.anular')}
        puedeEditar={hasPermission(session, 'almacen.kardex.entrada') || hasPermission(session, 'almacen.kardex.salida')}
      />
    </div>
  );
}
