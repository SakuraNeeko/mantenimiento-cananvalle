# ENTREGA — FASE 12 · AUTOMATIZADOR, API E INTEGRACIONES

La última fase que agrega superficie de producto nueva antes del endurecimiento final (Fase 13): un motor de reglas sin código (inspirado en Fracttal), una API pública REST v1 autenticada por API key, y la bitácora de webhooks salientes.

---

## 1. Árbol de archivos creados o modificados

```
gmao/
├── drizzle/
│   └── 0011_fase12_automatizador_api.sql      ← NUEVO: automation_rules, automation_runs,
│                                                  webhook_deliveries, rango_min/max en asset_meters
└── src/
    ├── db/schema/{enums,automatizador,integraciones,index}.ts   ← NUEVO/MODIFICADO
    ├── db/schema/assets.ts                                        ← MODIFICADO: rangoMin/rangoMax
    ├── lib/
    │   ├── automatizador/{reglas,motor}.ts                          ← NUEVO: motor de reglas
    │   ├── api-publica/auth.ts                                      ← NUEVO: auth por API key
    │   └── email/send.ts                                            ← NUEVO: primer uso de Resend
    └── app/
        ├── (app)/automatizador/{page,actions,automatizador-client,regla-form}.tsx
        │   └── [id]/page.tsx                                        ← bitácora de una regla
        ├── (app)/administracion/integraciones/{page,actions,integraciones-client}.tsx
        ├── (app)/administracion/modulos/actions.ts                  ← MODIFICADO: descripción ya no dice "no construido"
        ├── api/v1/{activos,ordenes,solicitudes}/route.ts             ← NUEVO: API pública v1
        └── api/cron/evaluar-automatizacion/route.ts                  ← NUEVO
    └── components/layout/{nav-config,sidebar}.tsx                  ← MODIFICADO: enlace "Integraciones"
```

**23 archivos**: 19 nuevos, 4 modificados. Más `vercel.json` (cron nuevo) y `package.json` (`resend`).

---

## 2. Automatizador: reglas por barrido, no por hook en tiempo real

El prompt maestro (§4.12) pide 8 disparadores: OT/SS creada, OT cambia de estado, medidor fuera de rango, stock bajo mínimo, OT vencida, contrato por vencer, paro que excede X horas. Conectar cada uno como un *hook* en tiempo real habría significado tocar prácticamente todas las Server Actions ya construidas y probadas en las 11 fases anteriores (`iniciarEjecucion`, `crearSolicitud`, `aplicarLineaKardex`…) — alto riesgo para poco beneficio real en una app que ya evalúa casi todo por cron (la generación de OT desde planes, Fase 7, funciona igual).

**Los 8 disparadores están implementados** (`lib/automatizador/motor.ts`), pero se evalúan con un barrido periódico (`/api/cron/evaluar-automatizacion`, diario) que consulta directamente la tabla de cada disparador — el mismo patrón que `evaluarGeneracion`/`confirmarCandidatos` de la Fase 7.

### Deduplicación: `clave_dedupe`, no solo `entidad_id`

- **Disparadores de evento** (se creó una OT/SS, una OT cambió de estado): la clave es el id real de la fila — el evento ocurre una sola vez, así que dispara una sola vez para siempre.
- **Disparadores de nivel** (stock bajo mínimo, OT vencida, contrato por vencer, paro que excede horas, medidor fuera de rango): la condición sigue siendo cierta día tras día. La clave es `entidad_id + fecha del día`, para avisar una vez por día mientras persista, no una única vez para siempre y luego nunca más.

### Condiciones y acciones: jsonb, con la validación en código

`condiciones` (`{ operador: AND|OR, reglas: [{ campo, operador, valor }] }`) y `acciones` (`[{ tipo, ...parámetros }]`) son jsonb porque su forma cambia según el disparador — "Prioridad" tiene sentido para una OT, no para un contrato. `lib/automatizador/reglas.ts` es el archivo compartido cliente↔servidor (tipos + `evaluarCondiciones()` puro + los catálogos de campos/acciones que alimentan el formulario) — aprendiendo de la Fase 11, **nunca** se pasa nada con referencias crudas de Drizzle a través del límite servidor→cliente.

Acciones soportadas: enviar email (Resend, primer uso real de `RESEND_API_KEY`/`EMAIL_FROM`), notificar dentro del sistema, crear una OT (origen `AUTOMATIZACION`, nuevo valor del enum `wo_origen`), cambiar el responsable de la OT, escalar su prioridad un nivel, y llamar un webhook (con bitácora en `webhook_deliveries`).

### `MEDIDOR_FUERA_RANGO`: nuevas columnas `rango_min`/`rango_max`

`asset_meters` no tenía un concepto de "rango normal" — se le agregaron `rangoMin`/`rangoMax` (nullable: vacío = sin vigilancia de rango, el medidor solo se usa para uso/desgaste como hasta ahora). Se configuran a mano por activo (vía Excel de Infraestructura o directo por SQL hasta que se decida si merece su propia UI).

---

## 3. API pública v1: reutilizando el `api_keys` de la Fase 1

Al generar la migración apareció una sorpresa útil: **`api_keys` y `api_key_usage` ya existían desde la Fase 1** (`db/schema/core.ts`, "6. API PÚBLICA") — sembrados por adelantado, igual que los 97 permisos y `tenant_modules`, para cuando llegara esta fase. Esta entrega los **usa** (`lib/api-publica/auth.ts`), no los duplica — de hecho el primer intento de esta fase sí los duplicó por accidente (un `apiKeys` nuevo en `integraciones.ts` con nombres de columna ligeramente distintos); `export * from` de TypeScript no marca la ambigüedad como error, así que el bug habría quedado invisible de no revisar el propio SQL generado antes de aplicarlo. Queda como recordatorio: **siempre leer el `CREATE TABLE` que emite `db:generate`**, no solo confiar en que compiló.

- `POST/GET /api/v1/activos`, `/api/v1/ordenes`, `/api/v1/solicitudes` — autenticación `Authorization: Bearer <api key>`, nunca por sesión.
- Alcance (`permisos` en `api_keys`) deliberadamente chico: `activos.leer`, `ordenes.leer`, `ordenes.crear`, `solicitudes.crear` — una integración externa no necesita los 97 permisos internos.
- `/administracion/integraciones` — crear/revocar API keys (el valor en claro se muestra una única vez), y ver la bitácora de webhooks salientes.
- Límite de tasa: 60 solicitudes/minuto, contando filas de `api_key_usage` en la última ventana de 60 s — sin depender de Redis/Upstash (ver deuda técnica).

---

## 4. Migración a ejecutar

`drizzle/0011_fase12_automatizador_api.sql` — 3 tablas nuevas (`automation_rules`, `automation_runs`, `webhook_deliveries`), 2 columnas nuevas en `asset_meters`, 2 enums nuevos, y `AUTOMATIZACION` agregado al enum `wo_origen`.

```bash
pnpm db:migrate
```

## 5. Variables de entorno

Ninguna nueva — pero **dos ya declaradas desde la Fase 1 se usan de verdad por primera vez**: `RESEND_API_KEY` y `EMAIL_FROM` (acción "Enviar un correo" del Automatizador). Si no están configuradas en Vercel, esa acción específica falla de forma controlada (se registra en la bitácora de la regla como error), el resto de la app no se ve afectado.

## 6. Comandos exactos

```bash
pnpm add resend
pnpm db:migrate
pnpm typecheck && pnpm test
pnpm build
pnpm dev
```

---

## 7. Checklist de pruebas manuales

- [ ] En `/administracion/modulos`, activa "Automatizador" (con `admin.modulos.activar`).
- [ ] Entra a `/automatizador` (con `automatizador.ver`) y crea una regla: disparador "Un material queda bajo su mínimo", sin condiciones, acción "Notificar dentro del sistema" a tu propio usuario.
- [ ] Baja manualmente la existencia de un material por debajo de su mínimo (Almacén → Kárdex → una salida).
- [ ] Llama manualmente `GET /api/cron/evaluar-automatizacion` con el header `Authorization: Bearer $CRON_SECRET` (Postman/curl) y confirma `ejecuciones: 1`.
- [ ] Confirma que te llegó la notificación (campana del topbar) y que aparece una fila en la bitácora de la regla (`/automatizador/[id]`).
- [ ] Vuelve a llamar el cron — confirma que esta vez `ejecuciones: 0` para esa misma regla (deduplicación por día).
- [ ] En `/administracion/integraciones`, crea una API key con alcance `activos.leer` y `ordenes.crear`. Copia el valor.
- [ ] Con `curl`, prueba `GET /api/v1/activos` con esa key — confirma que devuelve tus activos.
- [ ] Prueba `POST /api/v1/ordenes` con `{"descripcionProblema": "Prueba desde la API"}` — confirma que aparece una OT en borrador en `/ordenes`.
- [ ] Revoca la API key y confirma que ambas llamadas ahora devuelven 401.
- [ ] **Verifica que `CRON_SECRET` esté configurado en Vercel** (Settings → Environment Variables) — si nunca se configuró, el cron de generación de OT de la Fase 7 (`/api/cron/generar-ot`) tampoco ha estado corriendo realmente; esta es una buena oportunidad para confirmarlo.

---

## 8. Notas de deuda técnica

### Disparadores por barrido diario, no en tiempo real

Documentado ya en la sección 2 — es la decisión de diseño más importante de esta fase. "Se crea una OT" se entera el motor cuando corre el cron siguiente (hasta 24 h después), no al instante. Si el negocio necesita reacción en minutos, el cron puede correr más seguido, pero **Vercel Hobby limita la frecuencia de los cron jobs a una vez al día** — pasar a evaluación horaria/cada-15-min exige plan Pro.

### Límite de tasa de la API pública: contador en base de datos, no Redis

60 solicitudes/minuto contando filas recientes de `api_key_usage` funciona bien a la escala de esta app, pero añade una consulta por cada request y no es perfectamente preciso bajo instancias serverless muy concurrentes (una carrera entre dos invocaciones podría dejar pasar unas pocas de más justo en el borde de la ventana). Para tráfico realmente alto, la vía correcta es un almacén dedicado (Upstash Redis + `@upstash/ratelimit`), no implementada aquí para no añadir una dependencia de infraestructura nueva sin necesidad comprobada.

### Webhook: sin reintentos

`ejecutarAcciones()` llama el webhook una sola vez y registra éxito/error en `webhook_deliveries` — no hay cola de reintento con backoff. Si el endpoint externo está caído en el momento exacto de la evaluación, esa notificación se pierde (queda el registro del intento fallido, pero nadie la reintenta sola).

### `MEDIDOR_FUERA_RANGO`: sin UI para cargar el rango

`rangoMin`/`rangoMax` de `asset_meters` se configuran por SQL o por la importación Excel de Infraestructura — no se agregó una pantalla dedicada a "configurar el rango normal de este medidor" dentro de la ficha del activo, para no ensanchar más esta entrega.

### Herencia de fases anteriores (sin tocar en esta entrega)

- La prueba `AUDITOR no tiene ningún permiso de escritura sensible` sigue fallando (preexistente de la Fase 1).
- `next lint` / `eslint.config.mjs` siguen rotos por Next 16 + ESLint 9 (Fase 11).

---

## 9. Siguiente paso propuesto

**Fase 13 — Endurecimiento**: cerrar la prueba de AUDITOR pendiente desde la Fase 1, arreglar `eslint.config.mjs`, generar el set de íconos PNG reales de la PWA, cobertura de Playwright sobre los flujos críticos (§7 del prompt maestro: generación de OT, cierre y liquidación, movimiento de kárdex, conversión SS→OT, paro→OT, envío a historia), rate limiting con Upstash para login y la API pública, y una revisión de seguridad completa antes de considerar el sistema listo para producción real con datos de la empresa.
