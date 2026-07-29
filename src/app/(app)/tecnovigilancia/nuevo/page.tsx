import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerOpcionesEvento } from '../actions';
import { NuevoEventoClient } from './nuevo-evento-client';

export const metadata: Metadata = { title: 'Registrar evento de tecnovigilancia' };

export default async function NuevoEventoPage() {
  await requirePermission('tecnovigilancia.registrar');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'tecnovigilancia');
  const opciones = await obtenerOpcionesEvento();

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PageHeader titulo="Registrar evento" descripcion="Evento adverso, incidente o alerta de fabricante para un equipo biomédico." />
      <NuevoEventoClient opciones={opciones} />
    </div>
  );
}
