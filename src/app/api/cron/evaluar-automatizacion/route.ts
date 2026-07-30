import { NextResponse } from 'next/server';
import { getCurrentTenant } from '@/lib/tenant';
import { evaluarReglas } from '@/lib/automatizador/motor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron (`vercel.json`) del motor del Automatizador (Fase 12, §4.12). Mismo
 * patrón que `/api/cron/generar-ot`: barrido periódico, no hooks en tiempo
 * real — evalúa los 8 disparadores contra su tabla correspondiente y
 * ejecuta las acciones de las reglas activas cuyas condiciones se cumplan.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET no está configurado.' }, { status: 500 });
  }
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const tenant = await getCurrentTenant();
    const resultado = await evaluarReglas(tenant.id);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    console.error('[cron/evaluar-automatizacion]', error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Error desconocido.' }, { status: 500 });
  }
}
