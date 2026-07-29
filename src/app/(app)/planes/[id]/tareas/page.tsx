import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { obtenerPlanDetalle, obtenerTareasPlan } from '../data';
import { obtenerOficios } from './actions';
import { ChecklistPlanPanel } from './checklist-plan-panel';

export default async function PlanTareasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('planes.ver');
  const detalle = await obtenerPlanDetalle(id);
  if (!detalle) notFound();

  const puedeEditar = hasPermission(session, 'planes.gestionar');
  const [tareas, oficios] = await Promise.all([obtenerTareasPlan(id), puedeEditar ? obtenerOficios() : Promise.resolve([])]);

  return (
    <div className="mx-auto max-w-3xl">
      <ChecklistPlanPanel planId={id} tareasIniciales={tareas} oficios={oficios} puedeEditar={puedeEditar} />
    </div>
  );
}
