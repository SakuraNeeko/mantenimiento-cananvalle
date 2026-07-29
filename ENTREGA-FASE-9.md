# ENTREGA — FASE 9 · HISTORIA Y KPIs

La fase que le da sentido a todo lo demás: los datos que Órdenes, Paros, Solicitudes y Kárdex vienen acumulando desde la Fase 1 finalmente se leen para producir indicadores reales (§5 del prompt maestro), y las OT cerradas obtienen su copia inmutable en historia (§4.9).

---

## 1. Árbol de archivos creados o modificados

```
gmao/
├── drizzle/
│   └── 0008_fase9_historia.sql                      ← NUEVO: wo_history, archived_history, periodic_balance
└── src/
    ├── db/schema/{enums,historia,index}.ts             ← NUEVO/MODIFICADO
    ├── lib/kpis/calculos.ts                              ← NUEVO: motor de fórmulas de KPIs
    ├── components/layout/nav-config.ts                     ← MODIFICADO: /historia y /reportes activos (fase 9→1)
    └── app/(app)/
        ├── dashboard/page.tsx                               ← MODIFICADO: rellena los "—" dejados en la Fase 1
        ├── historia/
        │   ├── actions.ts · columns.tsx · page.tsx · historia-table.tsx  ← NUEVO: listado (copia inmutable)
        │   ├── [id]/page.tsx                                                ← NUEVO: hoja de vida / detalle del snapshot
        │   ├── enviar/{page,enviar-client}.tsx                              ← NUEVO: envío en lote de OT cerradas
        │   └── archivo/{page,archivo-client}.tsx                            ← NUEVO: archivado y restauración
        └── reportes/
            ├── actions.ts · page.tsx · dashboard-client.tsx                  ← NUEVO: dashboard de KPIs y Pareto
            └── balance/{page,balance-client}.tsx                             ← NUEVO: balance periódico
```

**19 archivos**: 17 nuevos, 3 modificados (`dashboard/page.tsx`, `nav-config.ts`, `db/schema/index.ts`).

---

## 2. Historia: copia inmutable, no borrado (`db/schema/historia.ts`)

`wo_history` y `archived_history` tienen exactamente la misma forma: columnas indexables (para filtrar/sumar en reportes sin tener que abrir el jsonb) más un `snapshot` jsonb con el detalle completo (tareas, mano de obra, materiales, costos de terceros y otros, comentarios, historial de estados). Es una simplificación deliberada frente a replicar las 7 tablas hijas de `work_orders` como 7 tablas hijas más de historia — documentada en el propio esquema.

**Enviar a historia NO saca la OT de `work_orders`**: `enviarAHistoria` (`historia/actions.ts`) valida que cada orden siga `CERRADA`, arma el snapshot, lo inserta y recién entonces pasa `work_orders.estado` a `EN_HISTORIA` — la fila operativa se queda donde estaba, solo cambia de estado. Esto importa para el motor de KPIs: como una orden enviada a historia sigue siendo `work_orders` con `estado = 'EN_HISTORIA'`, los cálculos de costos y cumplimiento no necesitan mirar dos tablas ni preocuparse de si ya se archivó.

Cada orden de un lote se procesa en su propia transacción — si una falla (por ejemplo, alguien la reabrió justo antes de que corriera el envío), las demás se completan igual.

## 3. Archivado y restauración (`historia.archivar` / `historia.restaurar`)

`archivarAnio(año)` mueve — no copia — cada fila de `wo_history` cuyo `fecha_fin_real` cae en ese año hacia `archived_history` (inserta allá, borra de acá, misma transacción). `restaurarDeArchivo(id)` hace el camino inverso. Ambas están detrás de permisos separados de `historia.enviar`, tal como ya anticipaba el catálogo de permisos desde la Fase 1.

## 4. El motor de KPIs (`lib/kpis/calculos.ts`)

Funciones puras, una por indicador, con la fórmula en el comentario tal como pide el prompt maestro:

| Función | Fórmula |
|---|---|
| `calcularMTBF` | tiempo total de operación ÷ número de fallas (paros no programados) |
| `calcularMTTR` | tiempo total de reparación ÷ número de reparaciones (paros cerrados) |
| `calcularDisponibilidad` | MTBF ÷ (MTBF + MTTR) × 100 |
| `calcularCumplimientoPlan` | OT de origen PLAN ejecutadas a tiempo ÷ programadas × 100 |
| `calcularIndicePreventivoCorrectivo` | costo de OT con tipo de mantenimiento preventivo ÷ costo total × 100 |
| `calcularBacklog` | horas de trabajo pendiente ÷ horas-hombre disponibles por semana |
| `calcularCostoPorActivo` | suma de costos de OT cerradas del periodo, por activo |
| `calcularRotacionInventario` | costo de salidas de kárdex del periodo ÷ valor promedio del inventario |
| `calcularCumplimientoSLA` | solicitudes atendidas dentro del plazo ÷ total con SLA definido × 100 |
| `paretoPorCausaFalla` / `paretoPorCosto` | agrupa y ordena de mayor a menor, con % acumulado |

`OEE` (marcado como opcional en el propio prompt maestro) no se implementó — no hay ningún módulo que registre "rendimiento" ni "calidad" de producción, así que las otras dos terceras partes de la fórmula no tienen de dónde salir.

## 5. `/reportes`: dashboard y balance periódico

El dashboard recalcula todo en vivo para el rango de fechas elegido (mes/año actual o personalizado), muestra las tarjetas de KPIs, dos tablas de Pareto (por causa de falla y por costo, con barras simples — sin agregar una librería de gráficos nueva) y exporta a Excel del lado del cliente, reutilizando el mismo patrón `xlsx` de la Fase 2.

`/reportes/balance` es distinto: **genera y guarda** un snapshot (`periodic_balance`) para un mes/trimestre/año — a diferencia del dashboard, que siempre recalcula, un balance ya generado no se puede volver a generar para el mismo periodo (hay que consultarlo), consistente con la idea de "cierre" de gestión.

El **dashboard de la Fase 1** (`/dashboard`) también se actualizó: las dos tarjetas que decían literalmente `"Disponible en la Fase 6"` y `"Disponible en la Fase 9"` ahora muestran el conteo real de órdenes abiertas y la disponibilidad del mes, con un enlace a `/reportes` para el detalle completo.

---

## 6. Migración a ejecutar

`drizzle/0008_fase9_historia.sql` — 3 tablas nuevas (`wo_history`, `archived_history`, `periodic_balance`) + 1 enum (`periodo_tipo`).

```bash
pnpm db:migrate
```

## 7. Variables de entorno

Ninguna nueva.

## 8. Comandos exactos

```bash
pnpm db:migrate
pnpm typecheck && pnpm test
pnpm dev
```

---

## 9. Checklist de pruebas manuales

- [ ] Cierra un par de órdenes de trabajo (Fase 6) si no tienes ninguna `CERRADA` todavía.
- [ ] Con `historia.enviar`, entra a `/historia/enviar`, selecciona las órdenes cerradas y envíalas — verifica que en `/ordenes` esas órdenes ahora aparecen como `EN_HISTORIA`.
- [ ] Entra al detalle en `/historia` y confirma que el snapshot muestra el checklist, mano de obra y materiales tal como quedaron.
- [ ] Con `historia.archivar`, archiva un año que tenga historia — confirma que desaparece de `/historia` y aparece en `/historia/archivo`.
- [ ] Con `historia.restaurar`, restaura ese mismo registro y confirma que vuelve a `/historia`.
- [ ] Entra a `/reportes`, cambia el rango de fechas y confirma que las tarjetas de KPIs y las tablas de Pareto se recalculan.
- [ ] Exporta el dashboard a Excel y abre el archivo — debe traer una hoja de KPIs y otra de costo por activo.
- [ ] Con `historia.balance.calcular`, genera el balance del mes actual en `/reportes/balance` — confirma que aparece en el listado, e intenta generarlo de nuevo para el mismo mes (debe rechazarlo).
- [ ] Entra a `/dashboard` (el de siempre) y confirma que "Órdenes abiertas" y "Disponibilidad" ya muestran números reales, no "—".

---

## 10. Notas de deuda técnica

### Backlog: jornada semanal asumida en 40 h

`calcularBacklog` no tiene de dónde leer cuántas horas a la semana trabaja cada responsable — el modelo no define una jornada configurable — así que asume 40 h/semana por cada responsable activo y disponible. Si se necesita una jornada real, es un campo nuevo en `responsibles` y un ajuste acotado a esta función.

### Rotación de inventario: valorización actual como proxy del promedio

Como `warehouse_stock` no guarda snapshots históricos de cantidad/costo, "valor promedio del inventario en el periodo" usa la valorización de HOY como aproximación. Es exacto si el inventario no cambió mucho de tamaño durante el periodo; para una rotación con precisión histórica real haría falta empezar a snapshot-ear `warehouse_stock` periódicamente (encaja con el propio `periodic_balance` si se decide guardarlo ahí en el futuro).

### Índice preventivo/correctivo: por costo, no por horas

El prompt maestro permite calcularlo con horas o con costo; se eligió costo porque `work_orders.costo_total` ya es un dato confiable desde la Fase 6, mientras que "horas" requeriría sumar `wo_labor` con supuestos adicionales sobre qué cuenta como hora "preventiva".

### OEE no implementado

Marcado como opcional en el prompt maestro (§5). No hay ningún módulo que registre rendimiento ni calidad de producción — los otros dos factores de la fórmula (Disponibilidad × Rendimiento × Calidad) no tienen fuente de datos todavía.

### Reportes programados por correo: no implementado

`RESEND_API_KEY`/`EMAIL_FROM` siguen sin usarse (declarados desde la Fase 1), y el cron `/api/cron/reportes-programados` (declarado en `vercel.json` desde la Fase 1) sigue sin un endpoint real. Enviar el dashboard por correo con una cadencia diaria/semanal/mensual es una pieza de diseño propia (plantillas de email, preferencias de envío por usuario) que no encajaba en el alcance de "calcular los KPIs" de esta fase — queda como el siguiente paso natural del módulo de Reportes.

### Exportación a PDF: no implementada

Mismo criterio que la exportación de la OT a PDF, diferida desde la Fase 6: es una pieza aislada (plantilla + librería de render) que no bloquea el resto de la fase. La exportación a Excel sí quedó lista, reutilizando el patrón ya usado en Infraestructura (Fase 2).

### Heredado de fases anteriores (sin tocar en esta entrega)

- La prueba `AUDITOR no tiene ningún permiso de escritura sensible` sigue fallando (preexistente de la Fase 1); ya registrada aparte.
- `next@15.1.4` sigue con la vulnerabilidad conocida (CVE-2025-66478); también registrada aparte.

---

## 11. Siguiente paso propuesto

**Fase 10 — Combustibles y Tecnovigilancia**: dos módulos complementarios, activables por tenant. Combustibles (`fuel_records`) reutiliza el mismo patrón de medidores de la Fase 3 para calcular rendimiento (km/gal, L/h) y detectar consumos anómalos; Tecnovigilancia es específico de equipos biomédicos (`adverse_events`, alertas de fabricante) y probablemente el primer módulo de este proyecto que de verdad necesita el flag "activable por tenant" que hasta ahora nadie ha usado.
