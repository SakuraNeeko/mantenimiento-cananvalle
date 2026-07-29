import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { PlusCircle, Star } from 'lucide-react';
import { db } from '@/db';
import { serviceRequests } from '@/db/schema';
import { requireSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { fmtDate } from '@/lib/datetime';
import { ESTADO_LABELS, PRIORIDAD_LABELS } from '@/lib/validators/solicitud';

export const metadata: Metadata = { title: 'Mis solicitudes' };

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

export default async function MisSolicitudesPage() {
  const session = await requireSession();

  const solicitudes = await db
    .select({
      id: serviceRequests.id,
      consecutivo: serviceRequests.consecutivo,
      descripcion: serviceRequests.descripcion,
      prioridad: serviceRequests.prioridad,
      estado: serviceRequests.estado,
      fecha: serviceRequests.fecha,
      calificacion: serviceRequests.calificacion,
    })
    .from(serviceRequests)
    .where(eq(serviceRequests.solicitanteUserId, session.user.id))
    .orderBy(desc(serviceRequests.fecha))
    .limit(50);

  return (
    <div className="space-y-3">
      <PageHeader
        titulo="Mis solicitudes"
        descripcion="Todo lo que has reportado, con su estado actual."
        acciones={
          <Button size="sm" asChild>
            <Link href="/nueva-solicitud">
              <PlusCircle aria-hidden />
              Nueva solicitud
            </Link>
          </Button>
        }
      />

      {solicitudes.length === 0 ? (
        <EmptyState titulo="Todavía no has reportado nada" descripcion="Cuando algo falle, repórtalo aquí — no necesitas saber nada más del sistema." />
      ) : (
        <div className="space-y-2">
          {solicitudes.map((s) => (
            <Link key={s.id} href={`/evaluar/${s.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="space-y-1 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-codigo text-2xs text-muted-foreground">{s.consecutivo ?? 'Borrador'}</span>
                    <div className="flex items-center gap-1.5">
                      {s.calificacion ? <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden /> : null}
                      <Badge variant={ESTADO_VARIANT[s.estado] ?? 'neutral'}>{ESTADO_LABELS[s.estado] ?? s.estado}</Badge>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-sm">{s.descripcion}</p>
                  <p className="text-2xs text-muted-foreground">
                    {PRIORIDAD_LABELS[s.prioridad]} · {fmtDate(s.fecha)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
