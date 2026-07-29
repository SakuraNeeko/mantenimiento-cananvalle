import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { obtenerPlanDetalle, obtenerRecursosPlan } from '../data';
import { obtenerOpcionesRecursos } from './actions';
import { RecursosPanel } from './recursos-panel';

export default async function PlanRecursosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('planes.ver');
  const detalle = await obtenerPlanDetalle(id);
  if (!detalle) notFound();

  const puedeEditar = hasPermission(session, 'planes.gestionar');
  const [recursos, opciones] = await Promise.all([obtenerRecursosPlan(id), puedeEditar ? obtenerOpcionesRecursos() : Promise.resolve({ trades: [], materials: [] })]);

  return (
    <div className="mx-auto max-w-3xl">
      <RecursosPanel planId={id} recursosIniciales={recursos} trades={opciones.trades} materials={opciones.materials} puedeEditar={puedeEditar} />
    </div>
  );
}
