# GMAO — Gestión del Mantenimiento Asistido por Ordenador

Aplicación web de mantenimiento industrial: activos, planes preventivos, órdenes de trabajo, kárdex e indicadores.

**Fase actual: 12 — Automatizador, API e integraciones.** Motor de reglas disparador → condiciones → acciones sin código (`/automatizador`, evaluado a diario por cron), API pública REST v1 autenticada por API key (`/api/v1/activos|ordenes|solicitudes`), y `/administracion/integraciones` para crear/revocar API keys y revisar la bitácora de webhooks salientes. Detalle en `ENTREGA-FASE-12.md` (`ENTREGA-FASE-11.md` y anteriores para las entregas previas — ver el índice completo al final de este documento).

---

## Requisitos

- Node.js 22 o superior
- pnpm 9 (`corepack enable && corepack prepare pnpm@9 --activate`)
- Una base de datos PostgreSQL en [Neon](https://neon.tech)

---

## Instalación paso a paso

### 1. Dependencias

```bash
pnpm install
```

### 2. Base de datos en Neon

1. Crea un proyecto en Neon.
2. Copia **las dos** cadenas de conexión del panel:
   - la *pooled* (contiene `-pooler`) → `DATABASE_URL`
   - la *direct* → `DATABASE_URL_UNPOOLED`

> Las migraciones y el seed usan la conexión directa; la aplicación usa la pooled.

### 3. Variables de entorno

```bash
cp .env.example .env
openssl rand -base64 32   # pégalo en AUTH_SECRET
```

> ⚠️ **`AUTH_URL` y `NEXT_PUBLIC_APP_URL` NO llevan barra final.**
> Una barra de más provoca un redirect **308** que rompe todos los `POST` en Vercel.
> Correcto: `https://gmao.vercel.app` · Incorrecto: `https://gmao.vercel.app/`

### 4. Migraciones y datos iniciales

```bash
pnpm db:generate   # genera el SQL a partir del esquema Drizzle
pnpm db:migrate    # lo aplica en Neon
pnpm db:seed       # empresa, sedes, 97 permisos, 8 roles, admin, consecutivos y catálogos fundacionales
```

### 5. Arrancar

```bash
pnpm dev
```

Abre `http://localhost:3000/login` e inicia sesión con `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` / `pnpm start` | Compilación y arranque en producción |
| `pnpm typecheck` | TypeScript en modo estricto, sin emitir |
| `pnpm lint` | ESLint |
| `pnpm test` | Pruebas unitarias (Vitest) |
| `pnpm e2e` | Pruebas E2E (Playwright) |
| `pnpm db:generate` | Genera migraciones desde el esquema |
| `pnpm db:migrate` | Aplica migraciones pendientes |
| `pnpm db:seed` | Seed idempotente |
| `pnpm db:studio` | Explorador de la base de datos |

---

## Arquitectura

```
src/
  app/
    (auth)/login             pantalla pública
    (app)/                   área autenticada con sidebar
      dashboard
      administracion/{usuarios,roles,auditoria}
      infraestructura/[catalogo]      pantalla genérica de catálogos
      activos/[id]/{caracteristicas,medidores,documentos,traslados,historial}
      almacen/{materiales,kardex,inventario}
      solicitudes/[id]
    (portal)/                       portal ligero del solicitante, sin sidebar
      mis-solicitudes, nueva-solicitud, evaluar/[id]
    api/auth/[...nextauth]
  db/
    schema/                  un archivo por dominio
    seed/
  lib/
    auth/                    Auth.js v5, Argon2id, carga del perfil
    permissions/             catálogo + guardián requirePermission
    tenant/                  resolución de la empresa
    audit/                   bitácora y cálculo de diffs
    sequences/               consecutivos con máscara
    catalogs/                registro de metadatos de Infraestructura + motor genérico
    query-builder.ts         filtros y orden → SQL parametrizado
  components/
    ui/                      primitivas
    data-table/              tabla genérica reutilizable
    layout/                  sidebar, topbar, providers
```

### Reglas que no se negocian

1. **La lógica de negocio vive en `/lib/services`.** Server Actions y rutas API son envoltorios delgados: validan con Zod, verifican permisos, llaman al servicio.
2. **Verificación de permisos en el servidor, siempre.** Ocultar un botón en la UI no es un control de seguridad. Toda Server Action empieza con `await requirePermission('...')`.
3. **Transacciones con `dbTx`, nunca con `db`.** Kárdex, cierre de OT y generación masiva de OT son obligatoriamente transaccionales.
4. **Importes y cantidades en `numeric(18,4)`.** Jamás `float`.
5. **Fechas en `timestamptz` UTC**, presentadas en la zona horaria de la empresa.
6. **Paginación en servidor siempre.** Nunca se trae un listado completo al cliente.
7. **Borrado lógico** con `deleted_at` + índice único parcial `WHERE deleted_at IS NULL`.

---

## Seguridad implementada en Fase 1

- Argon2id (19 MiB, t=2) para contraseñas
- Bloqueo temporal tras 5 intentos fallidos en 15 minutos, con bitácora en `login_attempts`
- Mensaje de error idéntico exista o no la cuenta: no se filtra qué correos están registrados
- Sesión JWT con `token_version` para cerrar sesión en todos los dispositivos
- Cabeceras CSP, HSTS, X-Frame-Options y X-Content-Type-Options en `next.config.ts`
- `audit_log` append-only con IP, user-agent y permiso ejercido
- Consultas parametrizadas vía Drizzle; el constructor de filtros resuelve columnas contra un mapa explícito

---

## Despliegue en Vercel

1. Importa el repositorio.
2. Carga las variables de `.env.example` en *Settings → Environment Variables*.
3. Añade la integración de Neon o pega las cadenas manualmente.
4. `vercel.json` ya declara los cron jobs; sus endpoints llegan en fases posteriores y validan `CRON_SECRET`.

---

## Roadmap

| Fase | Estado |
|---|---|
| 1. Fundación | ✅ |
| 1.b Cierre de deuda técnica | ✅ |
| 2. Infraestructura (31 catálogos) | ✅ |
| 3. Activos | ✅ |
| 4. Almacén y kárdex (con lotes) | ✅ |
| 5. Solicitudes + portal | ✅ |
| 6. Órdenes de trabajo | ✅ |
| 7. Planes y generación automática | ✅ |
| 8. Paros / averías | ✅ |
| 9. Historia y KPIs | ✅ |
| 10. Combustibles y tecnovigilancia | ✅ |
| 11. PWA móvil offline | ✅ |
| 12. Automatizador, API e integraciones | ✅ Esta entrega |
| 13. Endurecimiento | Siguiente |
