import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { ESTADO_LABELS, ESTADO_VARIANT, PRIORIDAD_LABELS } from '@/lib/validators/orden';
import { obtenerCausasCierre, obtenerCausasPendiente, obtenerOpcionesOrden } from '../actions';
import { obtenerOrdenDetalle } from './data';
import { TabNav } from './tab-nav';
import { OrdenAcciones } from './orden-acciones';

const TABS = [
  { href: '', label: 'General' },
  { href: '/tareas', label: 'Checklist' },
  { href: '/mano-obra', label: 'Mano de obra' },
  { href: '/materiales', label: 'Materiales' },
  { href: '/costos', label: 'Costos' },
  { href: '/historial', label: 'Historial' },
];

const CRITICIDAD_VARIANT = { A: 'destructive', B: 'warning', C: 'success' } as const;

export default async function OrdenLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('ordenes.ver');
  const detalle = await obtenerOrdenDetalle(id);
  if (!detalle) notFound();

  const { orden } = detalle;

  const puedeCrear = hasPermission(session, 'ordenes.crear');
  const puedeCerrar = hasPermission(session, 'ordenes.cerrar');
  const puedeEjecutar = hasPermission(session, 'ordenes.ejecutar');

  const [opciones, causasCierre, causasPendiente] = await Promise.all([
    puedeCrear ? obtenerOpcionesOrden().catch(() => null) : Promise.resolve(null),
    puedeCerrar ? obtenerCausasCierre().catch(() => []) : Promise.resolve([]),
    puedeEjecutar ? obtenerCausasPendiente().catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="space-y-2">
        <PageHeader
          titulo={orden.consecutivo ?? 'Borrador'}
          descripcion={detalle.assetNombre ?? undefined}
          acciones={
            <>
              <Badge variant={CRITICIDAD_VARIANT[orden.criticidad]}>Criticidad {orden.criticidad}</Badge>
              <Badge variant="outline">{PRIORIDAD_LABELS[orden.prioridad]}</Badge>
              <Badge variant={ESTADO_VARIANT[orden.estado] ?? 'neutral'}>{ESTADO_LABELS[orden.estado] ?? orden.estado}</Badge>
            </>
          }
        />
        <OrdenAcciones
          orden={{ id: orden.id, estado: orden.estado, warehouseId: orden.warehouseId, firmaEjecutorAt: orden.firmaEjecutorAt, firmaAprobadorAt: orden.firmaAprobadorAt }}
          permisos={{
            editar: hasPermission(session, 'ordenes.editar'),
            eliminar: hasPermission(session, 'ordenes.eliminar'),
            planificar: hasPermission(session, 'ordenes.planificar'),
            asignar: hasPermission(session, 'ordenes.asignar'),
            ejecutar: puedeEjecutar,
            liquidar: hasPermission(session, 'ordenes.liquidar'),
            cerrar: puedeCerrar,
            reabrir: hasPermission(session, 'ordenes.reabrir'),
            cancelar: hasPermission(session, 'ordenes.cancelar'),
            firmarEjecutor: hasPermission(session, 'ordenes.firmar.ejecutor'),
            firmarAprobador: hasPermission(session, 'ordenes.firmar.aprobador'),
          }}
          opciones={opciones}
          causasCierre={causasCierre}
          causasPendiente={causasPendiente}
        />
      </div>

      <TabNav id={id} tabs={TABS} />

      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
