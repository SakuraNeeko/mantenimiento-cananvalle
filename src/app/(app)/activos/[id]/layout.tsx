import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { assertSiteAccess, requirePermission } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { ESTADO_LABELS, CLASE_LABELS } from '@/lib/validators/activo';
import { obtenerActivoDetalle } from './data';
import { TabNav } from './tab-nav';
import { QrButton } from './qr-button';

const TABS = [
  { href: '', label: 'General' },
  { href: '/caracteristicas', label: 'Características' },
  { href: '/medidores', label: 'Medidores' },
  { href: '/documentos', label: 'Documentos' },
  { href: '/traslados', label: 'Traslados' },
  { href: '/historial', label: 'Historial' },
];

const CRITICIDAD_VARIANT = { A: 'destructive', B: 'warning', C: 'success' } as const;
const ESTADO_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'neutral'> = {
  OPERATIVO: 'success',
  EN_MANTENIMIENTO: 'warning',
  FUERA_DE_SERVICIO: 'destructive',
  DADO_DE_BAJA: 'neutral',
};

export default async function ActivoLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('activos.ver');
  const detalle = await obtenerActivoDetalle(id);
  if (!detalle) notFound();

  const { asset } = detalle;
  // Oculto en el menú no basta (§8): bloquea también la URL directa a un activo de una sede que no te corresponde.
  assertSiteAccess(session, detalle.ubicacionSiteId ?? null);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="space-y-1">
        {detalle.padreId ? (
          <Link href={`/activos/${detalle.padreId}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            {detalle.padreCodigo} — {detalle.padreNombre}
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="text-foreground">{asset.nombre}</span>
          </Link>
        ) : null}
        <PageHeader
          titulo={`${asset.codigo} · ${asset.nombre}`}
          descripcion={CLASE_LABELS[asset.clase]}
          acciones={
            <>
              <Badge variant={CRITICIDAD_VARIANT[asset.criticidad]}>Criticidad {asset.criticidad}</Badge>
              <Badge variant={ESTADO_VARIANT[asset.estado] ?? 'neutral'}>{ESTADO_LABELS[asset.estado] ?? asset.estado}</Badge>
              <QrButton id={asset.id} codigo={asset.codigo} nombre={asset.nombre} />
            </>
          }
        />
      </div>

      <TabNav id={id} tabs={TABS} />

      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
