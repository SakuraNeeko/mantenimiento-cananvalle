import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { GenerarClient } from './generar-client';

export const metadata: Metadata = { title: 'Analizar y generar OT' };

export default async function GenerarPage() {
  await requirePermission('planes.generar_ot');

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <PageHeader titulo="Analizar y generar órdenes de trabajo" descripcion="Previsualiza qué generaría el cron diario y confirma manualmente lo que necesites antes de esperar a la próxima corrida." />
      <GenerarClient />
    </div>
  );
}
