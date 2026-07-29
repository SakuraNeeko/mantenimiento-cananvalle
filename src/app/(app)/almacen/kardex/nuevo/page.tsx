import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { hasAny, ForbiddenError, UnauthorizedError } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { NuevoMovimientoClient } from './nuevo-movimiento-client';

export const metadata: Metadata = { title: 'Nuevo movimiento de kárdex' };

export default async function NuevoMovimientoPage() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  // La página solo exige ALGUNO de los dos: el envío exige el concreto según el concepto elegido.
  if (!hasAny(session, ['almacen.kardex.entrada', 'almacen.kardex.salida'])) {
    throw new ForbiddenError('almacen.kardex.entrada');
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <PageHeader titulo="Nuevo movimiento" descripcion="Se guarda en borrador. Revísalo y confírmalo desde su ficha para que afecte la existencia." />
      <NuevoMovimientoClient />
    </div>
  );
}
