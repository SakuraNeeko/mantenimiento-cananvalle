import type { Metadata } from 'next';
import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { physicalInventories, warehouses } from '@/db/schema';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { fmtDateTime } from '@/lib/datetime';
import { ClipboardList, Plus } from 'lucide-react';

export const metadata: Metadata = { title: 'Inventario físico' };

export default async function InventarioPage() {
  const session = await requirePermission('almacen.inventario.ejecutar');
  const tenant = await getCurrentTenant();

  const tomas = await db
    .select({ id: physicalInventories.id, fecha: physicalInventories.fecha, estado: physicalInventories.estado, warehouseNombre: warehouses.nombre })
    .from(physicalInventories)
    .innerJoin(warehouses, eq(warehouses.id, physicalInventories.warehouseId))
    .where(and(eq(physicalInventories.tenantId, tenant.id)))
    .orderBy(desc(physicalInventories.fecha))
    .limit(100);

  return (
    <div className="space-y-3">
      <PageHeader
        titulo="Inventario físico"
        descripcion="Tomas de conteo por almacén. Al confirmar, las diferencias generan ajustes de kárdex."
        acciones={
          <Button size="sm" asChild>
            <Link href="/almacen/inventario/nuevo">
              <Plus aria-hidden />
              Nueva toma
            </Link>
          </Button>
        }
      />

      {tomas.length === 0 ? (
        <EmptyState icon={ClipboardList} titulo="Sin tomas físicas" descripcion="Abre una toma para un almacén y compara lo contado contra el sistema." />
      ) : (
        <div className="space-y-2">
          {tomas.map((t) => (
            <Link key={t.id} href={`/almacen/inventario/${t.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{t.warehouseNombre}</p>
                    <p className="text-2xs text-muted-foreground">{fmtDateTime(t.fecha)}</p>
                  </div>
                  <Badge variant={t.estado === 'CONFIRMADO' ? 'success' : 'warning'}>{t.estado === 'CONFIRMADO' ? 'Confirmado' : 'Borrador'}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {!hasPermission(session, 'almacen.inventario.aprobar') ? (
        <p className="text-2xs text-muted-foreground">Puedes contar, pero necesitas a alguien con permiso de aprobación para confirmar los ajustes.</p>
      ) : null}
    </div>
  );
}
