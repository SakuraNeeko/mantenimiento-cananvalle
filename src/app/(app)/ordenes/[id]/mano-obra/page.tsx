import { notFound } from 'next/navigation';
import { hasAny, requirePermission } from '@/lib/permissions';
import { obtenerManoObraOrden, obtenerOrdenDetalle } from '../data';
import { obtenerResponsablesDisponibles } from './actions';
import { ManoObraPanel } from './mano-obra-panel';

const ESTADOS_EDITABLES = ['ASIGNADA', 'EN_EJECUCION', 'PENDIENTE'];

export default async function OrdenManoObraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('ordenes.ver');
  const detalle = await obtenerOrdenDetalle(id);
  if (!detalle) notFound();

  const puedeRegistrar = hasAny(session, ['ordenes.mano_obra.propia', 'ordenes.mano_obra.terceros']);
  const [lineas, responsables] = await Promise.all([obtenerManoObraOrden(id), puedeRegistrar ? obtenerResponsablesDisponibles() : Promise.resolve([])]);

  return (
    <div className="mx-auto max-w-3xl">
      <ManoObraPanel ordenId={id} lineasIniciales={lineas} responsables={responsables} puedeEditar={puedeRegistrar && ESTADOS_EDITABLES.includes(detalle.orden.estado)} />
    </div>
  );
}
