import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { obtenerActivoDetalle } from '../data';
import { obtenerOpcionesActivo } from '../../actions';
import { obtenerTraslados } from './actions';
import { TrasladosPanel } from './traslados-panel';

export default async function TrasladosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('activos.hoja_vida.ver');

  const detalle = await obtenerActivoDetalle(id);
  if (!detalle) notFound();

  const [traslados, opciones] = await Promise.all([obtenerTraslados(id), obtenerOpcionesActivo(id)]);

  return (
    <TrasladosPanel
      assetId={id}
      traslados={traslados}
      locations={opciones.locations}
      costCenters={opciones.costCenters}
      puedeTrasladar={hasPermission(session, 'activos.trasladar')}
    />
  );
}
