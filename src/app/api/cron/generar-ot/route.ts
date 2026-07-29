import { NextResponse } from 'next/server';
import { getCurrentTenant } from '@/lib/tenant';
import { confirmarCandidatos, evaluarGeneracion } from '@/lib/planes/generador';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron diario (`vercel.json`, 05:00) del flujo §7.1 del prompt maestro.
 * Vercel Cron llama con `Authorization: Bearer $CRON_SECRET` — cualquier
 * otro llamador (incluido un usuario navegando a la URL) recibe 401.
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
    const candidatos = await evaluarGeneracion(tenant.id);
    const resultado = await confirmarCandidatos(tenant.id, candidatos);

    return NextResponse.json({
      ok: true,
      evaluados: candidatos.length,
      ...resultado,
    });
  } catch (error) {
    console.error('[cron/generar-ot]', error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Error desconocido.' }, { status: 500 });
  }
}
