import type { Metadata } from 'next';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerArchivo } from '../actions';
import { ArchivoClient } from './archivo-client';

export const metadata: Metadata = { title: 'Historia archivada' };

export default async function ArchivoPage() {
  const session = await requirePermission('historia.ver');
  const filas = await obtenerArchivo({});

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <PageHeader titulo="Historia archivada" descripcion="Años anteriores movidos fuera de la historia activa — solo lectura, con restauración controlada." />
      <ArchivoClient filas={filas} puedeArchivar={hasPermission(session, 'historia.archivar')} puedeRestaurar={hasPermission(session, 'historia.restaurar')} />
    </div>
  );
}
