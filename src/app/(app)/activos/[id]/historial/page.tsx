import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { obtenerActivoDetalle } from '../data';
import { obtenerHistorialEstado } from './actions';
import { HistorialPanel } from './historial-panel';

export default async function HistorialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('activos.hoja_vida.ver');

  const detalle = await obtenerActivoDetalle(id);
  if (!detalle) notFound();

  const historial = await obtenerHistorialEstado(id);

  return (
    <HistorialPanel
      assetId={id}
      historial={historial}
      estadoActual={detalle.asset.estado}
      puedeCambiarEstado={hasPermission(session, 'activos.editar')}
    />
  );
}
