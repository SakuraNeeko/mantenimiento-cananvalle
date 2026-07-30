import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerApiKeys, obtenerWebhookDeliveries } from './actions';
import { IntegracionesClient } from './integraciones-client';

export const metadata: Metadata = { title: 'Integraciones' };

export default async function IntegracionesPage() {
  await requirePermission('admin.integraciones.gestionar');
  const [apiKeys, webhooks] = await Promise.all([obtenerApiKeys(), obtenerWebhookDeliveries()]);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <PageHeader
        titulo="Integraciones"
        descripcion="API keys para la API pública v1 (/api/v1/…) y la bitácora de webhooks salientes del Automatizador."
      />
      <IntegracionesClient apiKeysIniciales={apiKeys} webhooks={webhooks} />
    </div>
  );
}
