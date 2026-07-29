# ENTREGA — FASE 7 · PLANES Y GENERACIÓN AUTOMÁTICA

Plantillas de mantenimiento preventivo que el cron diario (o un botón manual) convierte en Órdenes de Trabajo reales — cerrando el origen `PLAN` que quedaba declarado desde la Fase 1 (§7.1 y §4.7 del prompt maestro).

---

## 1. Árbol de archivos creados o modificados

```
gmao/
├── drizzle/
│   └── 0006_fase7_planes.sql                            ← NUEVO: 5 tablas + 6 enums
└── src/
    ├── db/schema/{enums,plans,index}.ts                   ← NUEVO/MODIFICADO
    ├── lib/
    │   ├── validators/plan.ts                                ← NUEVO
    │   └── planes/generador.ts                               ← NUEVO: motor de evaluación y generación
    ├── components/layout/nav-config.ts                        ← MODIFICADO: /planes activa (fase 7→1)
    └── app/
        ├── api/cron/generar-ot/route.ts                        ← NUEVO: cron protegido por CRON_SECRET
        └── (app)/planes/
            ├── actions.ts · columns.tsx · page.tsx · planes-table.tsx  ← NUEVO: listado + CRUD del plan
            ├── plan-form.tsx                                            ← NUEVO: formulario compartido
            ├── nuevo/{page,nuevo-plan-client}.tsx                          ← NUEVO
            ├── generar/{actions,page,generar-client}.tsx                   ← NUEVO: análisis y generación manual
            └── [id]/
                ├── data.ts · layout.tsx · tab-nav.tsx                        ← NUEVO: ficha con pestañas
                ├── plan-acciones.tsx · plan-general-client.tsx · page.tsx      ← NUEVO: activar/desactivar + General
                ├── disparadores/{actions,disparadores-panel,page}.tsx           ← NUEVO
                ├── tareas/{actions,checklist-plan-panel,page}.tsx               ← NUEVO
                ├── recursos/{actions,recursos-panel,page}.tsx                   ← NUEVO
                └── generacion/page.tsx                                        ← NUEVO: trazabilidad (solo lectura)
```

**32 archivos**: 30 nuevos, 2 modificados (`nav-config.ts`, `db/schema/index.ts`).

---

## 2. El modelo de datos (`db/schema/plans.ts`)

5 tablas: `maintenance_plans`, `plan_triggers`, `plan_tasks`, `plan_resources`, `plan_generation_log`.

- **Alcance del plan**: `ACTIVO_UNICO` (un `assetId` fijo) o `GRUPO` (filtros combinables por clase, criticidad y ubicación — cualquiera en `NULL` significa "sin restringir").
- **Disparadores múltiples y combinables** en `plan_triggers`: un mismo plan puede tener varios, de distinto tipo, activos o no de forma independiente. `modoReprogramacion` (fijo/flotante) y `diasAnticipacion` son por disparador, no por plan.
- **`plan_tasks`/`plan_resources`** son plantillas: se copian a `wo_tasks`/`wo_materials` en cada generación (§3), nunca se ejecutan directamente.
- **`plan_generation_log`**: una fila por cada (plan, disparador, activo) evaluado, genere OT o no — es la fuente de verdad tanto para la pestaña "Generación" de la ficha como para que el propio motor sepa cuál fue la última fecha/lectura desde la que debe proyectar la siguiente.

---

## 3. El motor de generación (`lib/planes/generador.ts`)

Dos funciones puras, sin acoplarse a sesión ni a Server Actions, para poder llamarlas tanto desde el cron como desde la pantalla manual:

- **`evaluarGeneracion(tenantId)`** — solo lee. Recorre los planes activos, sus disparadores `CALENDARIO`/`CONTADOR` activos, y los activos que les correspondan (uno solo, o el grupo resuelto por los filtros). Para cada combinación calcula la fecha probable:
  - **Calendario**: `fechaBase` (o la fecha de la última generación, según `modoReprogramacion`) + el intervalo. Solo entra en la lista si esa fecha cae dentro de `diasAnticipacion`.
  - **Contador**: usa `asset_meters.promedio_uso_diario` (ya existente desde la Fase 3) para proyectar cuántos días faltan hasta que el medidor alcance el objetivo (última lectura de generación + intervalo del disparador).
  - Antes de marcarlo `GENERADA`, verifica que no haya ya una OT abierta generada por ese mismo (plan, activo) — la unicidad exacta que pide §7.1.
- **`confirmarCandidatos(tenantId, candidatos)`** — por cada candidato `GENERADA`, en su propia transacción: `nextCode(tx, tenantId, 'OT')`, inserta la orden con `origen = 'PLAN'` y `estado = 'PLANIFICADA'` directo (ya tiene fecha programada, no necesita pasar por borrador), copia el checklist y los materiales previstos, y escribe la fila de `plan_generation_log`. Un candidato que falla no arrastra a los demás.

El **cron** (`/api/cron/generar-ot`, declarado en `vercel.json` desde la Fase 1, `05:00` diario) valida `Authorization: Bearer $CRON_SECRET` y simplemente encadena `evaluarGeneracion` → `confirmarCandidatos`. La **pantalla manual** (`/planes/generar`, permiso `planes.generar_ot`) hace lo mismo pero deja elegir cuáles confirmar — y vuelve a evaluar en el servidor al confirmar, para no confiar en una lista que el cliente pudo tener abierta hace rato.

---

## 4. Migración a ejecutar

`drizzle/0006_fase7_planes.sql` — 5 tablas nuevas + 6 enums (`plan_alcance`, `plan_trigger_tipo`, `plan_intervalo_unidad`, `plan_reprogramacion_modo`, `plan_resource_tipo`, `plan_generation_resultado`).

```bash
pnpm db:migrate
```

## 5. Variables de entorno

Ninguna nueva — `CRON_SECRET` ya estaba en `.env.example` desde la Fase 1, sin usar hasta ahora. Configúrala en Vercel (Project Settings → Environment Variables) para que el cron funcione en producción; en local puedes invocar el endpoint a mano con el mismo valor:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/generar-ot
```

## 6. Comandos exactos

```bash
pnpm db:migrate
pnpm typecheck && pnpm test
pnpm dev
```

---

## 7. Checklist de pruebas manuales

- [ ] Con `PLANIF` (o `GERENTE`), crea un plan de alcance "un solo activo" sobre un activo existente.
- [ ] Agrégale un disparador de calendario (ej. cada 7 días, fecha base ayer, 2 días de anticipación) — debería quedar dentro de la ventana de inmediato.
- [ ] Agrégale un par de ítems al checklist y un material previsto.
- [ ] Ve a `/planes/generar`: el plan debe aparecer en "Listas para generar". Confírmalo.
- [ ] Verifica en `/ordenes` que se creó la OT en estado Planificada, con el checklist y el material precargados, y `origen = PLAN` (visible en el detalle si inspeccionas la fila).
- [ ] Vuelve a `/planes/generar`: el mismo plan/activo ya NO debería aparecer como generable (la OT sigue abierta) — debe listarse como "Ya hay una OT abierta" si sigue dentro de la ventana.
- [ ] Entra a la pestaña "Generación" del plan y confirma que quedó la fila de trazabilidad con el enlace a la OT.
- [ ] Crea un segundo plan de alcance "grupo" filtrando por clase o criticidad, y confirma que al analizar aparece una fila por cada activo que cumple el filtro.
- [ ] Prueba un disparador de contador sobre un activo con medidor y `promedio_uso_diario` cargado (Fase 3) — debe proyectar una fecha; sin promedio, debe aparecer como "Sin datos para proyectar".
- [ ] Desactiva el plan (`planes.activar`) y confirma que ya no aparece en el análisis aunque su disparador siga "vigente".

---

## 8. Notas de deuda técnica

### Disparadores CONDICIÓN y EVENTO: declarados, no evaluados

El esquema y el formulario los aceptan (`plan_triggers.tipo`), pero `evaluarGeneracion` solo recorre `CALENDARIO` y `CONTADOR`. **Condición** necesitaría un feed de lecturas de magnitud (vibración, temperatura…) vía IoT o carga manual, que no existe en ningún módulo todavía. **Evento** ("tras el cierre de una OT determinada") depende conceptualmente del módulo de Paros (Fase 8) para tener un catálogo real de qué eventos disparan qué. Ambos quedan visibles en la UI con una nota explícita para que no parezca que simplemente no funcionan.

### ⚠️ SOLUCIÓN RÁPIDA: intervalos de calendario en días aproximados

`intervaloADias()` convierte `MESES` a 30 días y `AÑOS` a 365 — no usa un calendario real (meses de 28-31 días, años bisiestos). Para mantenimiento preventivo industrial el margen de error de uno o dos días no es crítico frente a `diasAnticipacion`, pero si se necesita precisión calendario exacta, esta función es el único punto a tocar.

### ⚠️ SOLUCIÓN RÁPIDA: no reconstruye ocurrencias perdidas

Si el cron no corre por un tiempo largo (varias veces el intervalo de un plan), `evaluarGeneracion` solo proyecta la **próxima** ocurrencia desde la última generación — no genera una OT por cada período que se saltó. Es una simplificación deliberada: reconstruir todo el historial perdido con datos posiblemente desactualizados genera más ruido que valor: la OT más reciente en el momento es lo que casi siempre importa operativamente.

### Recursos de mano de obra previstos: no se copian a la OT

Al generar, los materiales previstos (`plan_resources.tipo = 'MATERIAL'`) sí se precargan como `wo_materials` (cantidad solicitada). Las horas de mano de obra previstas (`tipo = 'MANO_OBRA'`) **no** se copian a `wo_labor`: esa tabla representa horas *realmente* trabajadas, no estimaciones, y precargarlas habría dejado a la OT con "trabajo ya hecho" que nadie hizo. La estimación sigue visible en la pestaña Recursos del plan como referencia para quien planifica.

### "Agrupar por ruta" no implementado

El prompt maestro menciona agrupar la generación por ruta cuando corresponda; el modelo de datos no define una entidad `routes` en ningún punto del §4, así que no había nada que agrupar — cada (plan, disparador, activo) se evalúa y genera de forma independiente. Si se necesita, sería un catálogo nuevo (`routes` + `route_assets`) más un filtro adicional en `evaluarGeneracion`.

### Heredado de fases anteriores (sin tocar en esta entrega)

- La prueba `AUDITOR no tiene ningún permiso de escritura sensible` sigue fallando (preexistente de la Fase 1); ya registrada aparte.
- `next@15.1.4` sigue con la vulnerabilidad conocida (CVE-2025-66478); también registrada aparte.

---

## 9. Siguiente paso propuesto

**Fase 8 — Paros / Averías**: registro de paros no programados, causa/efecto, impacto y conversión a OT correctiva (heredando causa y efecto de falla, tal como ya hace la conversión SS → OT desde la Fase 6). Es también la pieza que le falta al disparador `EVENTO` de esta fase para dejar de estar diferido.
