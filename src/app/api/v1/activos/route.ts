import { NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assetClasses, assets } from '@/db/schema';
import { autenticarApiKey, registrarUsoApiKey, tieneAlcance } from '@/lib/api-publica/auth';

export const dynamic = 'force-dynamic';

/**
 * API pública v1 (§2, §8 del prompt maestro): lectura de activos para un
 * sistema externo (ERP, SCADA…). Autenticación por API key, nunca por
 * sesión — ver `lib/api-publica/auth.ts`.
 */
export async function GET(request: Request) {
  const contexto = await autenticarApiKey(request);
  if ('error' in contexto) return NextResponse.json({ error: contexto.error }, { status: contexto.status });
  if (!tieneAlcance(contexto, 'activos.leer')) {
    await registrarUsoApiKey(contexto.apiKeyId, '/api/v1/activos', 'GET', 403, request.headers.get('x-forwarded-for'));
    return NextResponse.json({ error: 'Esta API key no tiene el alcance activos.leer.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);
  const codigo = searchParams.get('codigo');

  const filas = await db
    .select({ id: assets.id, codigo: assets.codigo, nombre: assets.nombre, clase: assetClasses.nombre, criticidad: assets.criticidad, estado: assets.estado })
    .from(assets)
    .leftJoin(assetClasses, eq(assetClasses.id, assets.claseId))
    .where(and(eq(assets.tenantId, contexto.tenantId), isNull(assets.deletedAt), codigo ? eq(assets.codigo, codigo) : undefined))
    .limit(limit);

  await registrarUsoApiKey(contexto.apiKeyId, '/api/v1/activos', 'GET', 200, request.headers.get('x-forwarded-for'));
  return NextResponse.json({ data: filas });
}
