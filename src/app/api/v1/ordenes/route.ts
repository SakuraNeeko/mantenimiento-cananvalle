import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assets, workOrders } from '@/db/schema';
import { autenticarApiKey, registrarUsoApiKey, tieneAlcance } from '@/lib/api-publica/auth';

export const dynamic = 'force-dynamic';

const crearOrdenApiSchema = z.object({
  descripcionProblema: z.string().trim().min(1, 'descripcionProblema es obligatorio.'),
  assetCodigo: z.string().trim().optional(),
  prioridad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE']).optional(),
});

export async function GET(request: Request) {
  const contexto = await autenticarApiKey(request);
  if ('error' in contexto) return NextResponse.json({ error: contexto.error }, { status: contexto.status });
  if (!tieneAlcance(contexto, 'ordenes.leer')) {
    await registrarUsoApiKey(contexto.apiKeyId, '/api/v1/ordenes', 'GET', 403, request.headers.get('x-forwarded-for'));
    return NextResponse.json({ error: 'Esta API key no tiene el alcance ordenes.leer.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);

  const filas = await db
    .select({ id: workOrders.id, consecutivo: workOrders.consecutivo, estado: workOrders.estado, prioridad: workOrders.prioridad, descripcionProblema: workOrders.descripcionProblema, fechaProgramada: workOrders.fechaProgramada })
    .from(workOrders)
    .where(and(eq(workOrders.tenantId, contexto.tenantId), isNull(workOrders.deletedAt)))
    .orderBy(desc(workOrders.createdAt))
    .limit(limit);

  await registrarUsoApiKey(contexto.apiKeyId, '/api/v1/ordenes', 'GET', 200, request.headers.get('x-forwarded-for'));
  return NextResponse.json({ data: filas });
}

/** Crea una OT en borrador desde un sistema externo (§4.12: acciones del Automatizador y, en general, integraciones). */
export async function POST(request: Request) {
  const contexto = await autenticarApiKey(request);
  if ('error' in contexto) return NextResponse.json({ error: contexto.error }, { status: contexto.status });
  if (!tieneAlcance(contexto, 'ordenes.crear')) {
    await registrarUsoApiKey(contexto.apiKeyId, '/api/v1/ordenes', 'POST', 403, request.headers.get('x-forwarded-for'));
    return NextResponse.json({ error: 'Esta API key no tiene el alcance ordenes.crear.' }, { status: 403 });
  }

  const cuerpo = await request.json().catch(() => null);
  const parsed = crearOrdenApiSchema.safeParse(cuerpo);
  if (!parsed.success) {
    await registrarUsoApiKey(contexto.apiKeyId, '/api/v1/ordenes', 'POST', 422, request.headers.get('x-forwarded-for'));
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
      await registrarUsoApiKey(contexto.apiKeyId, '/api/v1/ordenes', 'POST', 422, request.headers.get('x-forwarded-for'));
      return NextResponse.json({ error: `No existe ningún activo con código "${parsed.data.assetCodigo}".` }, { status: 422 });
    }
    assetId = activo.id;
  }

  const [creada] = await db
    .insert(workOrders)
    .values({
      tenantId: contexto.tenantId,
      origen: 'MANUAL',
      assetId,
      descripcionProblema: `[API] ${parsed.data.descripcionProblema}`,
      prioridad: parsed.data.prioridad,
    })
    .returning({ id: workOrders.id });

  await registrarUsoApiKey(contexto.apiKeyId, '/api/v1/ordenes', 'POST', 201, request.headers.get('x-forwarded-for'));
  return NextResponse.json({ data: { id: creada!.id } }, { status: 201 });
}
