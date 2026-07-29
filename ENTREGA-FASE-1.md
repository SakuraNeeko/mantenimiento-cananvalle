# ENTREGA — FASE 1 · FUNDACIÓN

---

## 0. Cambios que provocan tus cinco respuestas

| Pregunta | Tu respuesta | Impacto en el diseño aprobado |
|---|---|---|
| **P-01** | Una sola empresa, varias sedes | Se **conserva** `tenant_id` en toda tabla (una columna y un índice, barato) pero desaparecen el selector de empresa, el rol `SOPORTE` y las pantallas de aprovisionamiento. `getCurrentTenant()` resuelve la única empresa desde `COMPANY_CODE`. La app **nunca** acepta un `tenant_id` del cliente. El *scoping* real de la operación diaria pasa a ser por **sede**, vía `user_site_access`. |
| **P-02** | `PLANIFICADA → ASIGNADA` directo | Se elimina el estado `APROBADA` del enum `wo_status` y el permiso `ordenes.aprobar` del catálogo. Total: **97 permisos**, no 98. Hay una prueba unitaria que falla si alguien lo reintroduce. |
| **P-03** | Trazabilidad por lote | Se adopta la **opción B** de D-06: la tabla `stock_lots` deja de ser opcional. `materials` ya lleva `maneja_lote` y `maneja_serie` como banderas, y el permiso `almacen.lotes.gestionar` existe desde ya. El saldo por lote y el consumo FEFO se implementan en la Fase 4. |
| **P-04** | Multi-moneda con tasas históricas | `currencies` y `currency_rates` quedan como catálogos **activos**, no informativos. `tenants.moneda_base` es la moneda de consolidación; toda conversión buscará la tasa vigente a la fecha del documento, no la tasa de hoy. |
| **P-05** | Excel + alta manual | El importador Excel sube de la Fase 12 a la **Fase 2** para catálogos y a la **Fase 3** para activos. Se añaden los permisos `infra.importar` y `activos.importar`, y la tabla `import_jobs` se adelanta para poder mostrar el resultado fila por fila. |

---

## 1. Árbol de archivos creados

**82 archivos.** Todos nuevos; no hay modificaciones sobre código previo.

```
gmao/
├── package.json · tsconfig.json · next.config.ts · drizzle.config.ts
├── postcss.config.mjs · eslint.config.mjs · .prettierrc
├── vercel.json · .env.example · .gitignore · README.md
├── vitest.config.ts · playwright.config.ts
├── .github/workflows/ci.yml
├── drizzle/
│   ├── 0000_fase1_nucleo.sql          ← migración generada y verificada
│   ├── meta/{_journal.json, 0000_snapshot.json}
│   └── README.md
├── e2e/login.spec.ts
├── tests/{permissions.test.ts, sequences.test.ts}
└── src/
    ├── middleware.ts
    ├── types/next-auth.d.ts
    ├── db/
    │   ├── index.ts                   ← db (HTTP) + dbTx (Pool, transacciones)
    │   ├── schema/{index,_shared,enums,core}.ts
    │   └── seed/index.ts
    ├── lib/
    │   ├── auth/{index,config,password}.ts
    │   ├── permissions/{index,catalog,guard}.ts
    │   ├── tenant/index.ts
    │   ├── audit/index.ts
    │   ├── sequences/index.ts
    │   ├── query-builder.ts
    │   ├── datetime.ts
    │   └── utils.ts
    ├── components/
    │   ├── ui/                        ← 13 primitivas
    │   ├── data-table/{data-table,toolbar,pagination,types,index}
    │   └── layout/{sidebar,topbar,nav-config,page-header,providers}
    └── app/
        ├── layout.tsx · page.tsx · error.tsx · not-found.tsx · globals.css
        ├── (auth)/{layout, login/page, login/login-form}
        ├── (app)/layout.tsx
        ├── (app)/dashboard/page.tsx
        ├── (app)/administracion/usuarios/{page,columns,usuarios-table}
        ├── (app)/administracion/roles/page.tsx
        ├── (app)/administracion/auditoria/{page,columns,auditoria-table}
        └── api/auth/[...nextauth]/route.ts
```

---

## 2. Migración a ejecutar

`drizzle/0000_fase1_nucleo.sql` — **293 líneas**, generada con `drizzle-kit` y verificada contra el esquema:

- **8 tipos ENUM**: `scope`, `audit_action`, `audit_level`, `notification_channel`, `wo_status`, `sr_status`, `priority`, `criticality`.
- **19 tablas** del módulo Núcleo.
- **Índices únicos parciales** correctos (`WHERE deleted_at IS NULL`) en `users`, `sites` y `roles` — la decisión D-04 quedó verificada en el SQL emitido, no solo en el papel.
- Claves foráneas con `ON DELETE` explícito: `restrict` donde borrar arrastraría historia, `cascade` en tablas puente.

Los enums `wo_status` y `sr_status` se declaran ya en la Fase 1 aunque sus tablas lleguen después, porque `audit_log` y el automatizador los referencian.

---

## 3. Variables de entorno nuevas

Todas están en `.env.example`. Las que **bloquean el arranque** si faltan:

```bash
DATABASE_URL=              # Neon POOLED
DATABASE_URL_UNPOOLED=     # Neon DIRECT (migraciones y seed)
AUTH_SECRET=               # openssl rand -base64 32
AUTH_URL=                  # SIN barra final
NEXT_PUBLIC_APP_URL=       # SIN barra final
COMPANY_CODE=              # debe coincidir con el tenant sembrado
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

> Recordatorio de la regla que ya te costó tiempo antes: **una barra final en `AUTH_URL` o `NEXT_PUBLIC_APP_URL` provoca un 308 y rompe todos los `POST` en Vercel.** `src/lib/utils.ts` expone `baseUrl()` que la elimina defensivamente.

---

## 4. Comandos exactos

```bash
cd gmao
corepack enable && corepack prepare pnpm@9 --activate
pnpm install

cp .env.example .env
openssl rand -base64 32          # → AUTH_SECRET
# pega las dos cadenas de Neon en DATABASE_URL y DATABASE_URL_UNPOOLED
# ajusta COMPANY_CODE, COMPANY_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD

pnpm db:migrate                  # aplica 0000_fase1_nucleo.sql
pnpm db:seed                     # empresa, 3 sedes, 97 permisos, 8 roles, admin, 7 secuencias
pnpm typecheck && pnpm test
pnpm dev
```

Abre `http://localhost:3000/login`.

> `pnpm db:generate` **no hace falta ahora**: la migración ya está en el repo. Lo usarás en la Fase 2, al añadir `infra.ts`.

---

## 5. Checklist de pruebas manuales

### Autenticación

- [ ] `/dashboard` sin sesión redirige a `/login`.
- [ ] Credenciales incorrectas muestran «Correo o contraseña incorrectos» — **el mismo mensaje** exista o no la cuenta.
- [ ] Seis intentos fallidos seguidos con el mismo correo devuelven el aviso de bloqueo; se ven las filas en `login_attempts`.
- [ ] Login correcto entra al dashboard y `users.last_login_at` se actualiza.
- [ ] «Cerrar sesión» vuelve a `/login` y `/dashboard` ya no es accesible.

### Autorización

- [ ] Con el admin, el sidebar muestra los cinco grupos. Los módulos de fases futuras aparecen atenuados con su etiqueta `F2`…`F12`.
- [ ] Crea a mano un usuario con rol `TECNICO` (`INSERT` directo por ahora) y verifica que su sidebar **no** muestra Usuarios, Roles ni Auditoría.
- [ ] `Tecnovigilancia` y `Automatizador` no aparecen: están desactivados en `tenant_modules`. Pon `habilitado = true` en `tecnovigilancia`, recarga y comprueba que aparece.
- [ ] Entra a `/administracion/roles` con un usuario sin `admin.roles.gestionar`: debe fallar con error controlado, **no** con pantalla en blanco.

### Tabla genérica

- [ ] En `/administracion/usuarios`, escribe en el buscador: la URL gana `?search=…` y la consulta se dispara ~350 ms después, no en cada tecla.
- [ ] Clic en «Nombre» ordena ascendente; segundo clic, descendente; tercero, quita el orden.
- [ ] **Mayús + clic** sobre una segunda columna añade orden secundario y aparece el número de prioridad junto a la flecha.
- [ ] Cambia «Filas» a 25: la URL gana `pageSize=25` y la paginación se recalcula.
- [ ] Añade un filtro desde el menú «Filtros»: sale el chip y el listado se reduce.
- [ ] Copia la URL completa y ábrela en otra pestaña: **el mismo estado exacto** de filtros, orden y página.
- [ ] Prueba «Columnas» y «Densidad».
- [ ] Filtra por algo inexistente: sale el estado vacío con texto explicativo, no una tabla en blanco.

### Auditoría

- [ ] Tras iniciar sesión, `/administracion/auditoria` muestra eventos.
- [ ] Entra a `/administracion/roles` (permiso 🔒) y comprueba que se escribió una fila con nivel **CRÍTICO**, el código del permiso y tu IP.
- [ ] Intenta acceder a una ruta sin permiso: se registra el intento denegado.

### Diseño

- [ ] El alternador de tema cambia claro/oscuro y persiste al recargar.
- [ ] Recorre toda la app con **Tab**: el foco es siempre visible.
- [ ] Colapsa el sidebar: quedan solo los iconos y los tooltips funcionan.
- [ ] En un móvil (o 390 px de ancho) la app sigue siendo usable.

### Integridad

- [ ] Ejecuta `pnpm db:seed` **dos veces seguidas**: la segunda no duplica nada ni falla.
- [ ] Quita un permiso del array de `GERENTE` en `catalog.ts`, re-siembra y verifica que desaparece de `role_permissions` — la reconciliación es exacta, no solo aditiva.

---

## 6. Notas de deuda técnica

### ⚠️ SOLUCIÓN RÁPIDA — Permisos dentro del JWT

Los permisos viajan en el token para no consultar la base en cada request. **Consecuencia:** si le quitas un permiso a un usuario conectado, sigue teniéndolo hasta que su token caduque (12 h) o vuelva a entrar.

*Para que sea robusto:* comparar `token.tokenVersion` contra `users.token_version` en el callback `jwt` y forzar recarga cuando difieran. La columna ya existe y el seed la inicializa; falta el callback y el `POST /api/usuarios/[id]/invalidar-sesiones`. **Se cierra en la Fase 1.b, antes de tocar la Fase 2.**

### ⚠️ SOLUCIÓN RÁPIDA — Rate limiting en base de datos

El bloqueo por intentos fallidos hace un `count(*)` sobre `login_attempts` en cada login. Con 54 usuarios es irrelevante; con miles de intentos automatizados, no.

*Para que sea robusto:* Upstash Redis con ventana deslizante, y `login_attempts` reducida a bitácora forense. Está agendado en la Fase 13, salvo que expongas el login a internet abierto antes.

### ⚠️ SOLUCIÓN RÁPIDA — Selector de sede del topbar

El desplegable de sede **muestra** las sedes pero todavía no cambia nada: no hay módulos que filtrar. Debe pasar a ser una cookie leída por `getCurrentSite()` en la Fase 3, cuando los activos ya se puedan filtrar por sede.

### Deuda estructural, sin atajo

1. **RLS de PostgreSQL sin activar.** El aislamiento depende de que cada servicio use el helper de sede. Con una sola empresa el riesgo es bajo, pero la RLS sigue agendada en la Fase 13 como red de seguridad.
2. **Sin pantalla de alta de usuarios.** El listado es de solo lectura; el alta y la edición llegan con el formulario reutilizable de la Fase 1.b. Mientras tanto, `INSERT` directo o repetir el seed.
3. **Exportación deshabilitada.** El botón existe y está desactivado a propósito. SheetJS entra en la Fase 2 junto al importador de catálogos.
4. **Buscador global (⌘K) deshabilitado.** Necesita índices GIN sobre tablas que aún no existen; entra en la Fase 3.
5. **`createdBy` / `updatedBy` sin FK declarada** para evitar circularidad en el módulo núcleo. Se añaden por migración manual en la Fase 13.
6. **Cobertura real por debajo del 70 %.** Las dos suites cubren el catálogo de permisos y las máscaras de consecutivo. El umbral solo se alcanzará con la lógica de servicios de las Fases 4 y 6 (costo promedio ponderado, disparadores de planes, transiciones de estado) — que es exactamente donde el `/lib/services` empieza a existir.

---

## 7. Qué NO incluye esta fase, a propósito

El seed **no** carga los datos de demostración del §10 del prompt maestro (120 activos, 800 OT, 18 meses de historia). Sus tablas todavía no existen: llegan en `src/db/seed/demo.ts` a partir de la Fase 3. Lo que hay ahora es un seed de **instalación real**: empresa, sedes, permisos, roles, administrador y consecutivos.

---

## 8. Siguiente paso propuesto

**Fase 1.b** (corta, ~1 entrega): cerrar las tres soluciones rápidas —validación de `tokenVersion`, formulario reutilizable de alta/edición y el CRUD de usuarios— para no arrastrarlas.

Después, **Fase 2 — Infraestructura**: los 34 catálogos con la pantalla genérica por metadatos, los árboles de ubicaciones y centros de costo, y el importador Excel que adelantaste con P-05.
