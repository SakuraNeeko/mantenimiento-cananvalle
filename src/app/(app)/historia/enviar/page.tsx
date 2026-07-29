import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerOrdenesElegiblesHistoria } from '../actions';
import { EnviarClient } from './enviar-client';

export const metadata: Metadata = { title: 'Enviar OT a historia' };

export default async function EnviarHistoriaPage() {
  await requirePermission('historia.enviar');
  const elegibles = await obtenerOrdenesElegiblesHistoria();

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PageHeader titulo="Enviar órdenes de trabajo a historia" descripcion="Genera una copia inmutable de cada orden cerrada seleccionada y la marca como enviada a historia." />
      <EnviarClient elegibles={elegibles} />
    </div>
  );
}
