import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { ALCANCE_LABELS, PRIORIDAD_LABELS } from '@/lib/validators/plan';
import { obtenerPlanDetalle } from './data';
import { TabNav } from './tab-nav';
import { PlanAcciones } from './plan-acciones';

const TABS = [
  { href: '', label: 'General' },
  { href: '/disparadores', label: 'Disparadores' },
  { href: '/tareas', label: 'Checklist' },
  { href: '/recursos', label: 'Recursos' },
  { href: '/generacion', label: 'Generación' },
];

export default async function PlanLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('planes.ver');
  const detalle = await obtenerPlanDetalle(id);
  if (!detalle) notFound();

  const { plan } = detalle;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="space-y-2">
        <PageHeader
          titulo={`${plan.codigo} · ${plan.nombre}`}
          descripcion={plan.alcance === 'ACTIVO_UNICO' ? (detalle.assetNombre ?? undefined) : ALCANCE_LABELS.GRUPO}
          acciones={
            <>
              <Badge variant="outline">{PRIORIDAD_LABELS[plan.prioridad]}</Badge>
              <Badge variant={plan.activo ? 'success' : 'neutral'}>{plan.activo ? 'Activo' : 'Inactivo'}</Badge>
              <PlanAcciones planId={id} activo={plan.activo} permisos={{ activar: hasPermission(session, 'planes.activar'), eliminar: hasPermission(session, 'planes.gestionar') }} />
            </>
          }
        />
      </div>

      <TabNav id={id} tabs={TABS} />

      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
