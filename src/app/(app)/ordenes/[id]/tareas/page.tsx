import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { obtenerOrdenDetalle, obtenerTareasOrden } from '../data';
import { ChecklistPanel } from './checklist-panel';

const ESTADOS_EDITABLES = ['BORRADOR', 'PLANIFICADA', 'ASIGNADA', 'EN_EJECUCION', 'PENDIENTE'];

export default async function OrdenTareasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('ordenes.ver');
  const detalle = await obtenerOrdenDetalle(id);
  if (!detalle) notFound();

  const tareas = await obtenerTareasOrden(id);
  const puedeRegistrar = hasPermission(session, 'ordenes.tareas.registrar');

  return (
    <div className="mx-auto max-w-3xl">
      <ChecklistPanel
        ordenId={id}
        tareasIniciales={tareas}
        puedeEditar={puedeRegistrar && ESTADOS_EDITABLES.includes(detalle.orden.estado)}
        puedeCompletar={puedeRegistrar && detalle.orden.estado === 'EN_EJECUCION'}
      />
    </div>
  );
}
