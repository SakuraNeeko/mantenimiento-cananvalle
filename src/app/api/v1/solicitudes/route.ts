import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db, dbTx } from '@/db';
import { assets, serviceRequests } from '@/db/schema';
import { autenticarApiKey, registrarUsoApiKey, tieneAlcance } from '@/lib/api-publica/auth';
import { nextCode } from '@/lib/sequences';

export const dynamic = 'force-dynamic';

const crearSolicitudApiSchema = z.object({
  descripcion: z.string().trim().min(1, 'descripcion es obligatoria.'),
  assetCodigo: z.string().trim().optional(),
  prioridad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE']).optional(),
});

/** Crea una solicitud de servicio desde un sistema externo (p.ej. una alarma de sensor). Queda a nombre de quien emitió la API key — es quien responde por lo que esa integración reporta. */
export async function POST(request: Request) {
  const contexto = await autenticarApiKey(request);
  if ('error' in contexto) return NextResponse.json({ error: contexto.error }, { status: contexto.status });
  if (!tieneAlcance(contexto, 'solicitudes.crear')) {
    await registrarUsoApiKey(contexto.apiKeyId, '/api/v1/solicitudes', 'POST', 403, request.headers.get('x-forwarded-for'));
    return NextResponse.json({ error: 'Esta API key no tiene el alcance solicitudes.crear.' }, { status: 403 });
  }
  if (!contexto.creadaPor) {
    await registrarUsoApiKey(contexto.apiKeyId, '/api/v1/solicitudes', 'POST', 500, request.headers.get('x-forwarded-for'));
    return NextResponse.json({ error: 'Esta API key no tiene un usuario asociado para registrar la solicitud.' }, { status: 500 });
  }

  const cuerpo = await request.json().catch(() => null);
  const parsed = crearSolicitudApiSchema.safeParse(cuerpo);
  if (!parsed.success) {
    await registrarUsoApiKey(contexto.apiKeyId, '/api/v1/solicitudes', 'POST', 422, request.headers.get('x-forwarded-for'));
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 422 });
  }

  let assetId: string | null = null;
  if (parsed.data.assetCodigo) {
    const [activo] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(and(eq(assets.tenantId, contexto.tenantId), eq(assets.codigo, parsed.data.assetCodigo), isNull(assets.deletedAt)))
      .limit(1);
    if (!activo) {
      await registrarUsoApiKey(contexto.apiKeyId, '/api/v1/solicitudes', 'POST', 422, request.headers.get('x-forwarded-for'));
      return NextResponse.json({ error: `No existe ningún activo con código "${parsed.data.assetCodigo}".` }, { status: 422 });
    }
    assetId = activo.id;
  }

  // Se crea en BORRADOR y se envía en un segundo paso — mismo orden que `crearSolicitud`/`enviarSolicitud`
  // del escritorio (`(app)/solicitudes/actions.ts`), que no se pueden llamar aquí directo porque exigen
  // una sesión de usuario logueado y esta ruta se autentica por API key.
  const [creada] = await db
    .insert(serviceRequests)
    .values({
      tenantId: contexto.tenantId,
      solicitanteUserId: contexto.creadaPor,
      assetId,
      descripcion: `[API] ${parsed.data.descripcion}`,
      prioridad: parsed.data.prioridad,
    })
    .returning({ id: serviceRequests.id });

  const id = creada!.id;
  await dbTx.transaction(async (tx) => {
    const consecutivo = await nextCode(tx, contexto.tenantId, 'SS');
    await tx.update(serviceRequests).set({ estado: 'ENVIADA', consecutivo }).where(eq(serviceRequests.id, id));
  });

  await registrarUsoApiKey(contexto.apiKeyId, '/api/v1/solicitudes', 'POST', 201, request.headers.get('x-forwarded-for'));
  return NextResponse.json({ data: { id } }, { status: 201 });
}
