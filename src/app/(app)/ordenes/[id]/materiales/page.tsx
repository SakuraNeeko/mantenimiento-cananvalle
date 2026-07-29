import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { obtenerMaterialesOrden, obtenerOrdenDetalle } from '../data';
import { obtenerMaterialesDisponibles } from './actions';
import { MaterialesPanel } from './materiales-panel';

const ESTADOS_EDITABLES = ['ASIGNADA', 'EN_EJECUCION', 'PENDIENTE'];

export default async function OrdenMaterialesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('ordenes.ver');
  const detalle = await obtenerOrdenDetalle(id);
  if (!detalle) notFound();

  const puedeSolicitar = hasPermission(session, 'ordenes.materiales.solicitar');
  const [lineas, disponibles] = await Promise.all([obtenerMaterialesOrden(id), puedeSolicitar ? obtenerMaterialesDisponibles() : Promise.resolve([])]);

  return (
    <div className="mx-auto max-w-3xl">
      <MaterialesPanel ordenId={id} lineasIniciales={lineas} materialesDisponibles={disponibles} puedeEditar={puedeSolicitar && ESTADOS_EDITABLES.includes(detalle.orden.estado)} />
    </div>
  );
}
