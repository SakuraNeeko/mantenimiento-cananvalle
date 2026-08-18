import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { assertSiteAccess, hasPermission, requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerBitacoraDetalle, obtenerOpcionesBitacora } from '../actions';
import { BitacoraDetalleClient } from './bitacora-detalle-client';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const bitacora = await obtenerBitacoraDetalle(id).catch(() => null);
  return { title: bitacora ? `${bitacora.assetCodigo} — Bitácora de uso` : 'Bitácora de uso' };
}

export default async function BitacoraDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('bitacora.ver');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'bitacora');

  const bitacora = await obtenerBitacoraDetalle(id);
  if (!bitacora) notFound();
  // Oculto en el listado no basta (§8): bloquea también la URL directa a un registro de otra sede,
  // salvo que seas quien lo registró (igual que Paros; el responsable/chofer no necesariamente tiene cuenta en el sistema).
  if (bitacora.createdBy !== session.user.id) {
    assertSiteAccess(session, bitacora.assetSiteId ?? null);
  }

  const puedeRegistrar = hasPermission(session, 'bitacora.registrar');
  const opcionesVacias = { assets: [], responsables: [], sites: [], destinosFrecuentes: [], miResponsableId: null };
  const opciones = puedeRegistrar ? await obtenerOpcionesBitacora().catch(() => opcionesVacias) : opcionesVacias;

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <PageHeader titulo={`${bitacora.assetCodigo} — ${bitacora.assetNombre}`} descripcion={bitacora.proposito} />
      <BitacoraDetalleClient bitacora={bitacora} sites={opciones.sites} destinosFrecuentes={opciones.destinosFrecuentes} puedeRegistrar={puedeRegistrar} />
    </div>
  );
}
