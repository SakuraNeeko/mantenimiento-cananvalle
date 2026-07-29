import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { obtenerPlanDetalle, obtenerTriggersPlan } from '../data';
import { obtenerOpcionesTrigger } from './actions';
import { DisparadoresPanel } from './disparadores-panel';

export default async function PlanDisparadoresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('planes.ver');
  const detalle = await obtenerPlanDetalle(id);
  if (!detalle) notFound();

  const puedeEditar = hasPermission(session, 'planes.gestionar');
  const [triggers, opciones] = await Promise.all([obtenerTriggersPlan(id), puedeEditar ? obtenerOpcionesTrigger() : Promise.resolve({ meters: [], magnitudes: [] })]);

  return (
    <div className="mx-auto max-w-3xl">
      <DisparadoresPanel planId={id} triggersIniciales={triggers} meters={opciones.meters} puedeEditar={puedeEditar} />
    </div>
  );
}
