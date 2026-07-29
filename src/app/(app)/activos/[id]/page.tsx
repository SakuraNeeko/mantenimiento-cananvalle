import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { obtenerOpcionesActivo } from '../actions';
import { obtenerActivoDetalle, obtenerComponentes } from './data';
import { GeneralTabClient } from './general-tab-client';

export default async function ActivoGeneralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('activos.ver');
  const [detalle, componentes, opciones] = await Promise.all([obtenerActivoDetalle(id), obtenerComponentes(id), obtenerOpcionesActivo(id)]);
  if (!detalle) notFound();

  const { asset } = detalle;

  return (
    <GeneralTabClient
      activoId={id}
      valoresPrevios={{
        id: asset.id,
        codigo: asset.codigo,
        nombre: asset.nombre,
        clase: asset.clase,
        criticidad: asset.criticidad,
        parentId: asset.parentId ?? undefined,
        locationId: asset.locationId ?? undefined,
        costCenterId: asset.costCenterId ?? undefined,
        responsibleCenterId: asset.responsibleCenterId ?? undefined,
        fabricante: asset.fabricante ?? undefined,
        modelo: asset.modelo ?? undefined,
        serie: asset.serie ?? undefined,
        anio: asset.anio ?? undefined,
        fechaCompra: asset.fechaCompra ?? undefined,
        valorCompra: asset.valorCompra ?? undefined,
        valorActual: asset.valorActual ?? undefined,
        vidaUtilMeses: asset.vidaUtilMeses ?? undefined,
        garantiaFin: asset.garantiaFin ?? undefined,
        diasAlertaGarantia: asset.diasAlertaGarantia,
        partyId: asset.partyId ?? undefined,
        contractId: asset.contractId ?? undefined,
        descripcion: asset.descripcion ?? undefined,
        activo: asset.activo,
      }}
      opciones={opciones}
      detalle={{
        ubicacion: detalle.ubicacion,
        centroCosto: detalle.centroCosto,
        centroResponsable: detalle.centroResponsable,
        proveedor: detalle.proveedor,
        contrato: detalle.contrato,
      }}
      componentes={componentes}
      puedeEditar={hasPermission(session, 'activos.editar')}
      puedeCrear={hasPermission(session, 'activos.crear')}
      puedeEliminar={hasPermission(session, 'activos.eliminar')}
    />
  );
}
