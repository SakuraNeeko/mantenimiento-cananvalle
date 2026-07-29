# ENTREGA — FASE 6 · ÓRDENES DE TRABAJO

El módulo central del sistema (§7 del prompt maestro): ciclo de vida completo desde el borrador hasta el cierre, checklist ejecutable, mano de obra, materiales con consumo real de kárdex al liquidar, costos de terceros y otros, firma digital simple, listado con vista kanban, y el cierre de la conversión SS → OT que había quedado diferida en la Fase 5.

---

## 1. Árbol de archivos creados o modificados

```
gmao/
├── drizzle/
│   └── 0005_fase6_ordenes.sql                          ← NUEVO: 8 tablas + 2 enums
└── src/
    ├── db/schema/{enums,work-orders,index}.ts             ← NUEVO/MODIFICADO
    ├── lib/validators/orden.ts                              ← NUEVO
    ├── components/layout/nav-config.ts                        ← MODIFICADO: /ordenes activa (fase 6→1)
    └── app/(app)/ordenes/
        ├── actions.ts                                          ← NUEVO: motor de ciclo de vida + liquidación
        ├── columns.tsx · page.tsx · ordenes-view.tsx · kanban-board.tsx  ← NUEVO: listado (lista + kanban)
        ├── orden-form.tsx                                        ← NUEVO: formulario compartido crear/editar
        ├── nueva/{page,nueva-orden-client}.tsx                     ← NUEVO
        └── [id]/
            ├── data.ts · layout.tsx · tab-nav.tsx                    ← NUEVO: ficha con pestañas
            ├── orden-acciones.tsx                                      ← NUEVO: botones de transición de estado
            ├── page.tsx · editar-orden-client.tsx · comentarios-panel.tsx  ← NUEVO: pestaña General + bitácora
            ├── tareas/{actions,checklist-panel,page}.tsx                 ← NUEVO: checklist
            ├── mano-obra/{actions,mano-obra-panel,page}.tsx               ← NUEVO
            ├── materiales/{actions,materiales-panel,page}.tsx             ← NUEVO
            ├── costos/{actions,costos-panel,page}.tsx                     ← NUEVO
            └── historial/page.tsx                                       ← NUEVO
```

**32 archivos**: 30 nuevos, 2 modificados (`nav-config.ts`, `db/schema/index.ts`).

---

## 2. El modelo de datos (`db/schema/work-orders.ts`)

8 tablas: `work_orders` (la central, ~40 columnas de negocio), `wo_tasks` (checklist), `wo_labor`, `wo_materials`, `wo_third_party_costs`, `wo_other_costs`, `wo_comments`, `wo_status_history`.

- **Sin estado `APROBADA`** (decisión P-02, declarada desde la Fase 1): `PLANIFICADA` pasa directo a `ASIGNADA`.
- **Despiece de OT**: `parent_work_order_id` autorreferenciado, para cuando una orden padre necesite abrir hijas (no hay UI para esto todavía — ver §6).
- **`kardex_movement_id` en `wo_materials`** queda `null` hasta liquidar: el material se *solicita* durante la ejecución, pero el kárdex real (y su costo) se genera recién al liquidar.

---

## 3. El ciclo de vida (`ordenes/actions.ts`)

```
BORRADOR → PLANIFICADA → ASIGNADA → EN_EJECUCION ⇄ PENDIENTE → EJECUTADA → LIQUIDADA → CERRADA (+ CANCELADA, REABIERTA)
```

Cada transición es su propia Server Action, exige el permiso concreto ya definido desde la Fase 1 (`ordenes.planificar`, `.asignar`, `.ejecutar`, `.liquidar`, `.cerrar`, `.reabrir`, `.cancelar`, `.firmar.ejecutor`/`.firmar.aprobador`) y valida el estado de origen.

- El **consecutivo** se asigna con `nextCode(tx, tenantId, 'OT')` al **planificar**, no al crear — mismo criterio que Solicitudes y Kárdex.
- **`marcarEjecutada`** bloquea la transición si queda alguna tarea del checklist marcada `es_critica = true` sin completar (§7.2 del prompt maestro).
- **`liquidarOrden`** es la pieza más delicada: dentro de una sola transacción, consolida los 4 costos (mano de obra, materiales, terceros, otros) y, por cada línea de `wo_materials` sin `kardex_movement_id`, genera un movimiento de kárdex `SALIDA` real usando `aplicarLineaKardex` (el mismo motor de costo promedio ponderado + FEFO de la Fase 4) con el concepto ya sembrado `SAL-OT`. Si hay materiales pero la orden no tiene almacén asignado, o si falta el concepto `SAL-OT`, la liquidación se rechaza con un error explícito en vez de fallar a medias.
- **`convertirSolicitudEnOrden`** cierra la deuda técnica dejada en la Fase 5: arrastra activo, ubicación, tipo de trabajo, prioridad y descripción; marca la solicitud como `CONVERTIDA_EN_OT`; mantiene el vínculo bidireccional (`work_orders.service_request_id`).

---

## 4. La ficha de la OT — pestañas

Mismo patrón de la ficha de Activos (Fase 3): `layout.tsx` con cabecera + pestañas + botones de acción según el estado y el permiso del usuario, y cada pestaña como su propia ruta anidada con su propio `actions.ts`.

- **General**: descripción, clasificación completa, notas de estado, bitácora de comentarios. Mientras la orden está en `BORRADOR`, esta pestaña muestra el formulario de edición en vez de la vista de solo lectura (mismo patrón que Solicitudes).
- **Checklist** (`tareas/`): agregar ítems con tipo de respuesta (OK/No OK, numérico, texto, foto, firma) y marca de "crítica"; completar/reabrir solo mientras la orden está `EN_EJECUCION`.
- **Mano de obra**: horas por responsable y fecha, valoradas contra `responsibles.costo_hora` (ver deuda técnica en §6).
- **Materiales**: solicitar cantidad contra el catálogo; el costo y la cantidad entregada quedan en blanco hasta la liquidación.
- **Costos**: resumen en vivo de los 4 rubros + CRUD de costos de terceros y otros costos.
- **Historial**: línea de tiempo de `wo_status_history`.

---

## 5. Listado con vista kanban (`ordenes/page.tsx`, `ordenes-view.tsx`, `kanban-board.tsx`)

Un solo Server Component decide, según `?vista=lista|kanban`, si arma la consulta paginada estándar (`DataTable`, igual que Activos/Solicitudes/Kárdex) o una consulta acotada (300 filas, sin `CANCELADA`/`EN_HISTORIA`) agrupada por estado para el tablero. El alcance por rol (`scopeDescriptor`) es el mismo criterio que Solicitudes: `TENANT` ve todo, `SEDE` filtra por la sede de la ubicación de la orden (o si es su responsable), `PROPIO` solo ve las que tiene asignadas. El kanban es de solo lectura — clic en una tarjeta lleva a la ficha; no hay arrastrar-y-soltar (ver §6).

---

## 6. Migración a ejecutar

`drizzle/0005_fase6_ordenes.sql` — 8 tablas nuevas + 2 enums (`wo_origen`, `wo_task_tipo_respuesta`).

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

- [ ] Con `PLANIF` (o `GERENTE`), crea una orden desde `/ordenes/nueva`, guárdala en borrador y edítala.
- [ ] Planifícala (elige almacén si vas a probar materiales) — verifica que aparece el consecutivo `OT-...`.
- [ ] Asígnala a un responsable — ese usuario ve el botón "Iniciar ejecución".
- [ ] Con el responsable: inicia ejecución, agrega ítems al checklist (marca uno como crítico), registra horas de mano de obra y solicita un material del almacén que existía en el kárdex.
- [ ] Intenta "Marcar ejecutada" sin completar la tarea crítica — debe rechazarla. Complétala y vuelve a intentar.
- [ ] Firma como ejecutor y como aprobador (si tienes ambos permisos).
- [ ] Liquida la orden — revisa en `/almacen/kardex` que apareció un movimiento `SAL-OT` confirmado, y en la pestaña Costos que el total coincide.
- [ ] Ciérrala eligiendo una causa de cierre.
- [ ] Cambia a la vista kanban (`/ordenes?vista=kanban`) y confirma que la orden aparece en la columna correcta.
- [ ] Desde una solicitud `APROBADA` (Fase 5), conviértela en OT y confirma que arrastra activo/descripción y que la solicitud queda `CONVERTIDA_EN_OT`.
- [ ] Con un usuario de alcance `PROPIO`, confirma que `/ordenes` solo muestra las órdenes donde es responsable.

---

## 10. Notas de deuda técnica

### ⚠️ SOLUCIÓN RÁPIDA: mano de obra sin recargo por hora extra/nocturna

`liquidarOrden` y `agregarManoObra` valoran **todas** las horas (normales, extras, nocturnas) al mismo `responsibles.costo_hora`, sin ningún factor de recargo — el prompt maestro no define esos factores y no había un catálogo de tarifas diferenciadas para tomarlos. El campo existe y se registra por separado, así que aplicar un multiplicador real (p. ej. 1.5× / 2×) es un cambio acotado a `mano-obra/actions.ts` cuando se defina la política.

### ⚠️ SOLUCIÓN RÁPIDA: firma digital simple, no un trazo dibujado

`firmaEjecutorUserId/At` y `firmaAprobadorUserId/At` registran *quién* confirmó y *cuándo* — no una firma dibujada en un canvas. Es consistente con lo ya declarado en el esquema (Fase 6, comentario en `work-orders.ts`) y evita depender de un componente de canvas + almacenamiento de imagen para una firma que, legalmente, no aporta más que el registro de auditoría ya presente.

### Vista kanban sin arrastrar-y-soltar

El tablero agrupa por estado y es clicable, pero mover una tarjeta no dispara la transición de estado (eso requeriría decidir, por cada par de columnas, cuál acción ejecutar y qué diálogos pedir — p. ej. mover a "Asignada" necesita elegir un responsable). Se mantiene de solo lectura; las transiciones reales se hacen desde la ficha, donde el formulario correcto ya está armado.

### Calendario y OT en PDF diferidos

El roadmap del prompt maestro menciona "calendario" y "OT en PDF" para este módulo. El calendario tiene más sentido una vez exista el módulo de Planes (Fase 7), que es quien generará las fechas programadas en lote; construirlo antes habría significado una vista sin datos reales que mostrar. La exportación a PDF es una pieza aislada (plantilla + librería de render) que no bloquea nada del ciclo de vida — queda para cuando el resto de módulos que alimentan la ficha (Planes, Paros) estén completos y el PDF pueda incluirlos.

### Despiece de OT sin UI

`parent_work_order_id` existe en el esquema (una orden padre puede abrir hijas) pero no hay pantalla para crear ni visualizar ese árbol — no estaba en el alcance explícito de esta fase y no bloquea el resto del ciclo de vida.

### Acción técnica: una sola, no múltiple

`work_orders.technical_action_id` es una FK simple. Si en el futuro una orden necesita registrar varias acciones técnicas a la vez, este campo se puede migrar a una tabla puente sin romper lo existente (mismo patrón que se usó para materiales/mano de obra, que sí son tablas propias desde el inicio).

### Heredado de fases anteriores (sin tocar en esta entrega)

- La prueba `AUDITOR no tiene ningún permiso de escritura sensible` sigue fallando (preexistente de la Fase 1, ahora también incluye `ordenes.costos.ver` en la lista); ya registrada aparte.
- `next@15.1.4` sigue con la vulnerabilidad conocida (CVE-2025-66478); también registrada aparte.

---

## 11. Siguiente paso propuesto

**Fase 7 — Planes y generación automática**: planes de mantenimiento preventivo (por calendario y/o por lectura de medidor), que generan automáticamente órdenes de trabajo con su checklist heredado — es el origen `PLAN` que ya está declarado en el enum `wo_origen` desde esta fase, y habilita por fin una vista de calendario con datos reales.
