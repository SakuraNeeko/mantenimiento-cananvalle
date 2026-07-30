import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { PlusCircle } from 'lucide-react';
import { db } from '@/db';
import { serviceRequests } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { fmtDate } from '@/lib/datetime';
import { ESTADO_LABELS, PRIORIDAD_LABELS } from '@/lib/validators/solicitud';

export const metadata: Metadata = { title: 'Solicitudes' };

const ESTADO_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'info' | 'neutral'> = {
  BORRADOR: 'neutral',
  ENVIADA: 'info',
  EN_REVISION: 'info',
  APROBADA: 'info',
  RECHAZADA: 'destructive',
  ASIGNADA: 'warning',
  EN_ATENCION: 'warning',
  RESUELTA: 'success',
  CERRADA: 'neutral',
  CONVERTIDA_EN_OT: 'success',
};

export default async function SolicitudesMovilPage() {
  const session = await requirePermission('solicitudes.ver');

  const solicitudes = await db
    .select({
      id: serviceRequests.id,
      consecutivo: serviceRequests.consecutivo,
      descripcion: serviceRequests.descripcion,
      prioridad: serviceRequests.prioridad,
      estado: serviceRequests.estado,
      fecha: serviceRequests.fecha,
    })
    .from(serviceRequests)
    .where(eq(serviceRequests.solicitanteUserId, session.user.id))
    .orderBy(desc(serviceRequests.fecha))
    .limit(30);

  return (
    <div className="space-y-3">
      <PageHeader
        titulo="Solicitudes"
        descripcion="Lo que has reportado tú."
        acciones={
          <Button size="sm" asChild>
            <Link href="/movil/solicitudes/nueva">
              <PlusCircle aria-hidden />
              Nueva
            </Link>
          </Button>
        }
      />

      {solicitudes.length === 0 ? (
        <EmptyState titulo="No has reportado nada todavía" descripcion="Repórtalo aquí en cuanto veas una falla." />
      ) : (
        <div className="space-y-2">
          {solicitudes.map((s) => (
            <Card key={s.id}>
              <CardContent className="space-y-1 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-codigo text-2xs text-muted-foreground">{s.consecutivo ?? 'Borrador'}</span>
                  <Badge variant={ESTADO_VARIANT[s.estado] ?? 'neutral'}>{ESTADO_LABELS[s.estado] ?? s.estado}</Badge>
                </div>
                <p className="line-clamp-2 text-sm">{s.descripcion}</p>
                <p className="text-2xs text-muted-foreground">
                  {PRIORIDAD_LABELS[s.prioridad]} · {fmtDate(s.fecha)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
