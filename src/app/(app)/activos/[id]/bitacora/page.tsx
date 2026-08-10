import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Car, Plus } from 'lucide-react';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { fmtDateTime } from '@/lib/datetime';
import { ESTADO_LABELS, ESTADO_VARIANT } from '@/lib/validators/bitacora';
import { obtenerActivoDetalle } from '../data';
import { obtenerBitacoraPorAsset } from '../../../bitacora-uso/actions';

export default async function ActivoBitacoraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('bitacora.ver');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'bitacora');

  const detalle = await obtenerActivoDetalle(id);
  if (!detalle) notFound();

  const registros = await obtenerBitacoraPorAsset(id);
  const puedeRegistrar = hasPermission(session, 'bitacora.registrar');

  return (
    <div className="space-y-3">
      {puedeRegistrar ? (
        <div className="flex justify-end">
          <Button size="sm" asChild>
            <Link href={`/bitacora-uso/nueva?assetId=${id}`}>
              <Plus aria-hidden />
              Registrar salida
            </Link>
          </Button>
        </div>
      ) : null}

      {registros.length === 0 ? (
        <EmptyState icon={Car} titulo="Sin uso registrado" descripcion="Cuando alguien saque este activo, quedará registrado aquí con foto y lectura del medidor." />
      ) : (
        <div className="divide-y rounded-[8px] border">
          {registros.map((r) => (
            <Link key={r.id} href={`/bitacora-uso/${r.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/50">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.proposito}</p>
                <p className="text-2xs text-muted-foreground">
                  {r.responsableNombre} · {fmtDateTime(r.fechaSalida)}
                  {r.fechaRegreso ? ` → ${fmtDateTime(r.fechaRegreso)}` : ''}
                </p>
              </div>
              <Badge variant={ESTADO_VARIANT[r.estado] ?? 'neutral'}>{ESTADO_LABELS[r.estado] ?? r.estado}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
