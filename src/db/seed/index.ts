/* eslint-disable no-console */
import 'dotenv/config';
import { and, eq, isNull, notInArray } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import {
  currencies,
  fuels,
  kardexConcepts,
  maintenanceTypes,
  permissions,
  rolePermissions,
  roles,
  sequences,
  sites,
  taxRegimes,
  tenantModules,
  uoms,
  userRoles,
  userSiteAccess,
  users,
  tenants,
  wasteTypes,
  workTypes,
} from '@/db/schema';
import {
  PERMISSIONS,
  PERMISSION_CODES,
  ROLE_CODES,
  ROLE_DEFS,
  ROLE_MATRIX,
  isSensitive,
} from '@/lib/permissions/catalog';
import { hashPassword } from '@/lib/auth/password';

/**
 * Seed idempotente de la Fase 1.
 * Se puede ejecutar cuantas veces haga falta: hace upsert, no duplica.
 *
 * NO carga datos de demostración (los ~120 activos, 800 OT, etc. del §10 del
 * prompt maestro): esos llegan en `seed/demo.ts` cuando existan sus tablas,
 * a partir de la Fase 3. Este seed prepara una instalación de PRODUCCIÓN vacía.
 */

const COMPANY_CODE = process.env.COMPANY_CODE ?? 'EMPRESA';
const COMPANY_NAME = process.env.COMPANY_NAME ?? 'Mi Empresa S.A.';
const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? 'admin@miempresa.com').toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

const SEDES_INICIALES = [
  { codigo: 'S01', nombre: 'Planta principal' },
  { codigo: 'S02', nombre: 'Planta 2' },
  { codigo: 'S03', nombre: 'Oficina administrativa' },
];

const MODULOS_OPCIONALES = [
  { modulo: 'combustibles', habilitado: true },
  { modulo: 'tecnovigilancia', habilitado: false },
  { modulo: 'automatizador', habilitado: false },
];

const SECUENCIAS = [
  { documento: 'OT', mascara: 'OT-{YYYY}-{######}' },
  { documento: 'SS', mascara: 'SS-{YYYY}-{######}' },
  { documento: 'PA', mascara: 'PA-{YYYY}-{#####}' },
  { documento: 'KX', mascara: 'KX-{YYYY}-{######}' },
  { documento: 'IF', mascara: 'IF-{YYYY}-{####}' },
  { documento: 'SC', mascara: 'SC-{YYYY}-{#####}' },
  { documento: 'OC', mascara: 'OC-{YYYY}-{#####}' },
];

/**
 * Catálogos fundacionales de Infraestructura (Fase 2): valores estándar de la
 * industria en español (es-EC), suficientes para que Activos y Almacén
 * (Fases 3-4) tengan algo real contra qué probar. No es el seed de
 * demostración del §10 del prompt maestro (eso llega en `seed/demo.ts`).
 */
type FilaCatalogoSeed = { codigo: string; nombre: string; descripcion?: string; extra?: Record<string, unknown> };

const CATALOGOS_SEED: { nombre: string; tabla: PgTable; filas: FilaCatalogoSeed[] }[] = [
  {
    nombre: 'Tipos de mantenimiento',
    tabla: maintenanceTypes,
    filas: [
      { codigo: 'PREV', nombre: 'Preventivo' },
      { codigo: 'CORR', nombre: 'Correctivo' },
      { codigo: 'PRED', nombre: 'Predictivo' },
      { codigo: 'LUB', nombre: 'Lubricación' },
      { codigo: 'METR', nombre: 'Metrología' },
      { codigo: 'INSP', nombre: 'Inspección' },
      { codigo: 'MEJ', nombre: 'Mejora' },
    ],
  },
  {
    nombre: 'Tipos de trabajo',
    tabla: workTypes,
    filas: [
      { codigo: 'MEC', nombre: 'Mecánico' },
      { codigo: 'ELEC', nombre: 'Eléctrico' },
      { codigo: 'CIVIL', nombre: 'Civil' },
      { codigo: 'INST', nombre: 'Instrumentación' },
      { codigo: 'NEUM', nombre: 'Neumático' },
      { codigo: 'HIDR', nombre: 'Hidráulico' },
      { codigo: 'SOFT', nombre: 'Software / TI' },
    ],
  },
  {
    nombre: 'Conceptos de kárdex',
    tabla: kardexConcepts,
    filas: [
      { codigo: 'ENT-COMP', nombre: 'Entrada por compra', extra: { signo: 'ENTRADA', exigeTercero: true, afectaCostoPromedio: true } },
      { codigo: 'ENT-DEV', nombre: 'Entrada por devolución', extra: { signo: 'ENTRADA', afectaCostoPromedio: true } },
      { codigo: 'ENT-AJU', nombre: 'Entrada por ajuste de inventario', extra: { signo: 'ENTRADA', afectaCostoPromedio: true } },
      { codigo: 'SAL-OT', nombre: 'Salida a orden de trabajo', extra: { signo: 'SALIDA', exigeOt: true, afectaCostoPromedio: true } },
      { codigo: 'SAL-AJU', nombre: 'Salida por ajuste de inventario', extra: { signo: 'SALIDA', afectaCostoPromedio: true } },
      { codigo: 'SAL-BAJA', nombre: 'Salida por baja u obsolescencia', extra: { signo: 'SALIDA', afectaCostoPromedio: true } },
    ],
  },
  {
    nombre: 'Regímenes tributarios',
    tabla: taxRegimes,
    filas: [
      { codigo: 'GEN', nombre: 'Régimen General' },
      { codigo: 'RIMPE', nombre: 'RIMPE' },
      { codigo: 'NC', nombre: 'No contribuyente' },
    ],
  },
  {
    nombre: 'Combustibles',
    tabla: fuels,
    filas: [
      { codigo: 'DIESEL', nombre: 'Diésel' },
      { codigo: 'EXTRA', nombre: 'Gasolina Extra' },
      { codigo: 'SUPER', nombre: 'Gasolina Súper' },
      { codigo: 'GLP', nombre: 'Gas licuado de petróleo' },
      { codigo: 'ELEC', nombre: 'Eléctrico' },
    ],
  },
  {
    nombre: 'Tipos de residuo',
    tabla: wasteTypes,
    filas: [
      { codigo: 'ACEITE', nombre: 'Aceite usado' },
      { codigo: 'FILTRO', nombre: 'Filtros usados' },
      { codigo: 'CHATARRA', nombre: 'Chatarra metálica' },
      { codigo: 'ELECT', nombre: 'Residuos electrónicos' },
      { codigo: 'BAT', nombre: 'Baterías' },
      { codigo: 'OTRO', nombre: 'Otro' },
    ],
  },
  {
    nombre: 'Unidades de medida',
    tabla: uoms,
    filas: [
      { codigo: 'UN', nombre: 'Unidad', extra: { simbolo: 'u' } },
      { codigo: 'CAJA12', nombre: 'Caja x12', extra: { simbolo: 'caja', factorConversion: '12' } },
      { codigo: 'GAL', nombre: 'Galón', extra: { simbolo: 'gal' } },
      { codigo: 'LT', nombre: 'Litro', extra: { simbolo: 'L' } },
      { codigo: 'KG', nombre: 'Kilogramo', extra: { simbolo: 'kg' } },
      { codigo: 'M', nombre: 'Metro', extra: { simbolo: 'm' } },
      { codigo: 'HR', nombre: 'Hora', extra: { simbolo: 'h' } },
    ],
  },
  {
    nombre: 'Monedas',
    tabla: currencies,
    filas: [
      { codigo: 'USD', nombre: 'Dólar estadounidense', extra: { simbolo: '$' } },
      { codigo: 'EUR', nombre: 'Euro', extra: { simbolo: '€' } },
    ],
  },
];

/** Upsert genérico por (tenant_id, codigo) — mismo criterio que el índice único parcial de cada catálogo. */
async function seedCatalogo(tabla: PgTable, tenantId: string, filas: FilaCatalogoSeed[]): Promise<void> {
  const cols = tabla as unknown as Record<string, PgColumn | undefined>;
  if (!cols.tenantId || !cols.codigo || !cols.deletedAt) return;

  for (const fila of filas) {
    const valores = { tenantId, codigo: fila.codigo, nombre: fila.nombre, descripcion: fila.descripcion ?? null, ...(fila.extra ?? {}) };
    await db
      .insert(tabla)
      .values(valores)
      .onConflictDoUpdate({
        target: [cols.tenantId, cols.codigo],
        targetWhere: isNull(cols.deletedAt),
        set: valores,
      });
  }
}

async function main(): Promise<void> {
  if (!ADMIN_PASSWORD) {
    throw new Error('Define SEED_ADMIN_PASSWORD en el entorno antes de ejecutar el seed.');
  }

  console.log('▶ Sincronizando catálogo de permisos…');
  for (const p of PERMISSIONS) {
    await db
      .insert(permissions)
      .values({
        codigo: p.codigo,
        modulo: p.modulo,
        descripcion: p.descripcion,
        esSensible: isSensitive(p.codigo),
      })
      .onConflictDoUpdate({
        target: permissions.codigo,
        set: { modulo: p.modulo, descripcion: p.descripcion, esSensible: isSensitive(p.codigo) },
      });
  }
  // Retira los permisos que ya no existen en el catálogo.
  await db.delete(permissions).where(notInArray(permissions.codigo, PERMISSION_CODES));
  console.log(`  ✓ ${PERMISSIONS.length} permisos`);

  console.log('▶ Empresa…');
  const [tenant] = await db
    .insert(tenants)
    .values({
      codigo: COMPANY_CODE,
      razonSocial: COMPANY_NAME,
      ruc: process.env.COMPANY_RUC ?? null,
      monedaBase: process.env.DEFAULT_CURRENCY ?? 'USD',
      timezone: process.env.DEFAULT_TIMEZONE ?? 'America/Guayaquil',
      locale: process.env.DEFAULT_LOCALE ?? 'es-EC',
      parametros: {
        passwordMinLength: 10,
        passwordRequireSymbol: true,
        sessionIdleMinutes: 720,
        maxLoginAttempts: 5,
        lockoutMinutes: 15,
      },
    })
    .onConflictDoUpdate({ target: tenants.codigo, set: { razonSocial: COMPANY_NAME } })
    .returning();

  if (!tenant) throw new Error('No se pudo crear la empresa.');
  console.log(`  ✓ ${tenant.razonSocial} (${tenant.codigo})`);

  console.log('▶ Sedes…');
  const sedes = [];
  for (const s of SEDES_INICIALES) {
    const existente = await db
      .select()
      .from(sites)
      .where(and(eq(sites.tenantId, tenant.id), eq(sites.codigo, s.codigo)))
      .limit(1);

    if (existente[0]) {
      sedes.push(existente[0]);
      continue;
    }
    const [nueva] = await db
      .insert(sites)
      .values({ tenantId: tenant.id, codigo: s.codigo, nombre: s.nombre })
      .returning();
    if (nueva) sedes.push(nueva);
  }
  console.log(`  ✓ ${sedes.length} sedes`);

  console.log('▶ Módulos opcionales…');
  for (const m of MODULOS_OPCIONALES) {
    await db
      .insert(tenantModules)
      .values({ tenantId: tenant.id, modulo: m.modulo, habilitado: m.habilitado })
      .onConflictDoNothing();
  }

  console.log('▶ Consecutivos…');
  const anio = new Date().getUTCFullYear();
  for (const s of SECUENCIAS) {
    await db
      .insert(sequences)
      .values({ tenantId: tenant.id, documento: s.documento, mascara: s.mascara, anio, valorActual: 0 })
      .onConflictDoNothing();
  }
  console.log(`  ✓ ${SECUENCIAS.length} secuencias`);

  console.log('▶ Catálogos fundacionales de Infraestructura…');
  for (const c of CATALOGOS_SEED) {
    await seedCatalogo(c.tabla, tenant.id, c.filas);
    console.log(`  ✓ ${c.filas.length.toString().padStart(2)}  ${c.nombre}`);
  }

  console.log('▶ Roles y matriz de permisos…');
  const rolesPorCodigo = new Map<string, string>();

  for (const codigo of ROLE_CODES) {
    const def = ROLE_DEFS[codigo];
    const [rol] = await db
      .insert(roles)
      .values({
        tenantId: tenant.id,
        codigo,
        nombre: def.nombre,
        descripcion: def.descripcion,
        scopeDefault: def.scope,
        esSistema: true,
      })
      .onConflictDoUpdate({
        target: [roles.tenantId, roles.codigo],
        // El índice roles_codigo_uq es PARCIAL: PostgreSQL exige repetir su predicado.
        targetWhere: isNull(roles.deletedAt),
        set: { nombre: def.nombre, descripcion: def.descripcion, scopeDefault: def.scope },
      })
      .returning();

    // onConflictDoUpdate sobre índice parcial puede no devolver fila: se relee.
    const rolFinal =
      rol ??
      (
        await db
          .select()
          .from(roles)
          .where(and(eq(roles.tenantId, tenant.id), eq(roles.codigo, codigo)))
          .limit(1)
      )[0];

    if (!rolFinal) throw new Error(`No se pudo crear el rol ${codigo}.`);
    rolesPorCodigo.set(codigo, rolFinal.id);

    const deseados = ROLE_MATRIX[codigo];

    // Reconciliación exacta: se añaden los que faltan y se quitan los sobrantes.
    if (deseados.length > 0) {
      await db
        .insert(rolePermissions)
        .values(deseados.map((permissionCode) => ({ roleId: rolFinal.id, permissionCode })))
        .onConflictDoNothing();

      await db
        .delete(rolePermissions)
        .where(
          and(eq(rolePermissions.roleId, rolFinal.id), notInArray(rolePermissions.permissionCode, [...deseados])),
        );
    }

    console.log(`  ✓ ${codigo.padEnd(8)} ${deseados.length} permisos`);
  }

  console.log('▶ Usuario administrador…');
  const adminRoleId = rolesPorCodigo.get('ADMIN');
  if (!adminRoleId) throw new Error('Falta el rol ADMIN.');

  const [existente] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenant.id), eq(users.email, ADMIN_EMAIL)))
    .limit(1);

  let adminId: string;

  if (existente) {
    adminId = existente.id;
    console.log('  ↺ Ya existía; no se toca su contraseña.');
  } else {
    const [nuevo] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: ADMIN_EMAIL,
        passwordHash: await hashPassword(ADMIN_PASSWORD),
        nombre: 'Administrador del sistema',
        cargo: 'Administrador / TI',
        siteDefaultId: sedes[0]?.id ?? null,
        passwordChangedAt: new Date(),
      })
      .returning();
    if (!nuevo) throw new Error('No se pudo crear el usuario administrador.');
    adminId = nuevo.id;
    console.log(`  ✓ ${ADMIN_EMAIL}`);
  }

  await db.insert(userRoles).values({ userId: adminId, roleId: adminRoleId, scope: 'TENANT' }).onConflictDoNothing();

  if (sedes.length > 0) {
    await db
      .insert(userSiteAccess)
      .values(sedes.map((s) => ({ userId: adminId, siteId: s.id })))
      .onConflictDoNothing();
  }

  console.log('\n✅ Seed completado.');
  console.log(`   Entra con ${ADMIN_EMAIL} y la clave definida en SEED_ADMIN_PASSWORD.`);
  console.log('   ⚠️  Cambia esa contraseña en el primer inicio de sesión.\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ El seed falló:', error);
    process.exit(1);
  });
