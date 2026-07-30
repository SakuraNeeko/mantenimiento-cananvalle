import type { Metadata } from 'next';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { automationRules } from '@/db/schema';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { PageHeader } from '@/components/layout/page-header';
import { AutomatizadorClient } from './automatizador-client';

export const metadata: Metadata = { title: 'Automatizador' };

export default async function AutomatizadorPage() {
  const session = await requirePermission('automatizador.ver');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'automatizador');

  const reglas = await db
    .select({
      id: automationRules.id,
      codigo: automationRules.codigo,
      nombre: automationRules.nombre,
      descripcion: automationRules.descripcion,
      activo: automationRules.activo,
      disparadorTipo: automationRules.disparadorTipo,
      umbral: automationRules.umbral,
      condiciones: automationRules.condiciones,
      acciones: automationRules.acciones,
      ultimaEvaluacionAt: automationRules.ultimaEvaluacionAt,
    })
    .from(automationRules)
    .where(and(eq(automationRules.tenantId, tenant.id), isNull(automationRules.deletedAt)))
    .orderBy(desc(automationRules.createdAt));

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <PageHeader
        titulo="Automatizador"
        descripcion="Reglas disparador → condiciones → acciones, sin necesidad de código (§4.12 del prompt maestro). Se evalúan una vez al día (cron) — ver ENTREGA-FASE-12.md."
      />
      <AutomatizadorClient
        reglas={reglas}
        puedeGestionar={hasPermission(session, 'automatizador.gestionar')}
        puedeVerBitacora={hasPermission(session, 'automatizador.bitacora.ver')}
      />
    </div>
  );
}
