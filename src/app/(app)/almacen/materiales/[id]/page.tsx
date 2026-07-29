import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerMaterialParaEditar } from '../actions';
import { obtenerExistencias, obtenerReferenciasMaterial } from './actions';
import { MaterialDetalleClient } from './material-detalle-client';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const material = await obtenerMaterialParaEditar(id);
  return { title: material ? `${material.codigo} · ${material.nombre}` : 'Material' };
}

export default async function MaterialDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('almacen.materiales.ver');

  const material = await obtenerMaterialParaEditar(id);
  if (!material) notFound();

  const [existencias, referencias] = await Promise.all([obtenerExistencias(id), obtenerReferenciasMaterial(id)]);

  return (
    <div className="space-y-3">
      <PageHeader titulo={`${material.codigo} · ${material.nombre}`} descripcion="Ficha, existencias por almacén y referencias de proveedor." />
      <MaterialDetalleClient
        material={material}
        existencias={existencias}
        referencias={referencias}
        puedeEditarMaterial={hasPermission(session, 'almacen.materiales.gestionar')}
        puedeParametrizar={hasPermission(session, 'almacen.existencias.parametrizar')}
        puedeGestionarReferencias={hasPermission(session, 'almacen.materiales.gestionar')}
      />
    </div>
  );
}
