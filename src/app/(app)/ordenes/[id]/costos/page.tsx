import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { obtenerCostosOtrosOrden, obtenerCostosTercerosOrden, obtenerManoObraOrden, obtenerMaterialesOrden, obtenerOrdenDetalle } from '../data';
import { obtenerOpcionesCostos } from './actions';
import { CostosPanel } from './costos-panel';

const ESTADOS_EDITABLES = ['ASIGNADA', 'EN_EJECUCION', 'PENDIENTE', 'EJECUTADA'];

export default async function OrdenCostosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('ordenes.costos.ver');
  const detalle = await obtenerOrdenDetalle(id);
  if (!detalle) notFound();

  const puedeEditar = hasPermission(session, 'ordenes.costos.editar');
  const [labor, materiales, terceros, otros, opciones] = await Promise.all([
    obtenerManoObraOrden(id),
    obtenerMaterialesOrden(id),
    obtenerCostosTercerosOrden(id),
    obtenerCostosOtrosOrden(id),
    puedeEditar ? obtenerOpcionesCostos().catch(() => null) : Promise.resolve(null),
  ]);

  const manoObra = labor.reduce((sum, l) => sum + Number(l.costoCalculado), 0);
  const costoMateriales = materiales.reduce((sum, m) => sum + Number(m.costoTotal ?? 0), 0);
  const costoTerceros = terceros.reduce((sum, t) => sum + Number(t.monto), 0);
  const costoOtros = otros.reduce((sum, o) => sum + Number(o.monto), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <CostosPanel
        ordenId={id}
        resumen={{
          manoObra: String(manoObra),
          materiales: String(costoMateriales),
          terceros: String(costoTerceros),
          otros: String(costoOtros),
          total: String(manoObra + costoMateriales + costoTerceros + costoOtros),
          estado: detalle.orden.estado,
        }}
        terceros={terceros}
        otros={otros}
        opciones={opciones}
        puedeEditar={puedeEditar && ESTADOS_EDITABLES.includes(detalle.orden.estado)}
      />
    </div>
  );
}
