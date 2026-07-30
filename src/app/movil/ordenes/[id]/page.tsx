import type { Metadata } from 'next';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { OrdenDetalleClient } from './orden-detalle-client';

export const metadata: Metadata = { title: 'Detalle de OT' };

export default async function OrdenMovilPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('ordenes.ver');
  const { id } = await params;

  return (
    <OrdenDetalleClient
      id={id}
      permisos={{
        registrarTareas: hasPermission(session, 'ordenes.tareas.registrar'),
        ejecutar: hasPermission(session, 'ordenes.ejecutar'),
        firmar: hasPermission(session, 'ordenes.firmar.ejecutor'),
      }}
    />
  );
}
