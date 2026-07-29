import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { obtenerActivoDetalle } from '../data';
import { obtenerDocumentos } from './actions';
import { DocumentosPanel } from './documentos-panel';

export default async function DocumentosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('activos.ver');

  const detalle = await obtenerActivoDetalle(id);
  if (!detalle) notFound();

  const documentos = await obtenerDocumentos(id);

  return <DocumentosPanel assetId={id} documentos={documentos} puedeGestionar={hasPermission(session, 'activos.documentos.gestionar')} />;
}
