# ENTREGA — FASE 4 · ALMACÉN Y KÁRDEX

El módulo con más reglas de negocio hasta ahora. Cierra dos pendientes documentados en fases anteriores (`references.material_id` de la Fase 2 y `asset_spare_parts` de la Fase 3) y entrega el motor transaccional de kárdex con costo promedio ponderado, trazabilidad por lote con consumo FEFO, e inventario físico con ajustes automáticos.

---

## 1. Árbol de archivos creados o modificados

```
gmao/
├── drizzle/
│   └── 0003_fase4_almacen_kardex.sql               ← NUEVO: 8 tablas + ALTER de `references`
└── src/
    ├── db/schema/
    │   ├── inventory.ts                              ← NUEVO: materials, kárdex, existencias, lotes, inventario físico
    │   ├── infra.ts                                    ← MODIFICADO: `references` se mudó a inventory.ts (con material_id)
    │   ├── assets.ts                                    ← MODIFICADO: + asset_spare_parts (diferido de Fase 3)
    │   ├── enums.ts                                      ← MODIFICADO: +3 enums de Almacén
    │   └── index.ts                                       ← MODIFICADO: exporta ./inventory
    ├── lib/validators/material.ts                          ← NUEVO
    ├── lib/catalogs/registry.ts                              ← MODIFICADO: catálogo "Referencias" ahora liga a Material
    ├── components/layout/nav-config.ts                        ← MODIFICADO: Materiales/Kárdex/Inventario ya no atenuados
    └── app/(app)/almacen/
        ├── materiales/{page,columns,actions,material-form,materiales-table}.tsx
        ├── materiales/[id]/{page,actions,material-detalle-client}.tsx
        ├── kardex/{page,columns,actions,validators,kardex-engine,movimiento-form,kardex-table}.tsx
        ├── kardex/nuevo/{page,nuevo-movimiento-client}.tsx
        ├── kardex/[id]/{page,movimiento-detalle-client}.tsx
        ├── inventario/{page,actions}.tsx
        ├── inventario/nuevo/{page,nueva-toma-client}.tsx
        └── inventario/[id]/{page,toma-detalle-client}.tsx
```

**29 archivos**: 24 nuevos, 5 modificados.

---

## 2. Modelo de datos

`src/db/schema/inventory.ts`:

| Tabla | Qué guarda |
|---|---|
| `materials` | Código, tipo (repuesto/insumo/herramienta/EPP), unidad de medida, `maneja_lote` / `maneja_serie` (P-03) |
| `material_references` | Referencia del fabricante y de cada proveedor, con precio y tiempo de entrega |
| `warehouse_stock` | Existencia consolidada por almacén: cantidad, mínimo/máximo/punto de pedido, **costo promedio ponderado** |
| `stock_lots` | Saldo por lote/serie, con fecha de vencimiento — la base del consumo FEFO |
| `kardex_movements` / `kardex_movement_lines` | Cabecera y detalle del movimiento. `estado`: BORRADOR → CONFIRMADO → (ANULADO) |
| `physical_inventories` / `physical_inventory_lines` | Tomas de conteo: snapshot del sistema + lo contado |

`references` (catálogo de Infraestructura) se mudó de `infra.ts` a `inventory.ts` — es el único jeito de romper la dependencia circular que habría hecho falta para darle por fin su `material_id`. La migración lo resuelve con un simple `ALTER TABLE ... ADD COLUMN`, no recrea la tabla.

---

## 3. El motor de kárdex (`kardex/kardex-engine.ts`)

Un único punto de verdad, `aplicarLineaKardex()`, que tanto `confirmarMovimiento` como `anularMovimiento` usan dentro de `dbTx.transaction(...)`:

- **ENTRADA**: `costo_promedio_nuevo = (cantidad_actual × costo_actual + cantidad_entrada × costo_entrada) / cantidad_resultante` — la regla de oro del §4.4, recalculada en la misma transacción que actualiza la existencia.
- **SALIDA**: se valora siempre al costo promedio **vigente** (el campo "Costo unitario" del formulario se deshabilita para conceptos de salida) — nunca al costo que escriba el usuario.
- **Lotes (P-03, FEFO)**: en una salida, si no se especifica lote, el motor elige el que vence primero entre los que tengan saldo suficiente. `SELECT ... FOR UPDATE` bloquea la fila mientras dura la transacción, igual que `nextCode()` de la Fase 1 bloquea la secuencia.
- **Confirmar** asigna el consecutivo (`nextCode(tx, tenantId, 'KX')`) **al confirmar, no al crear** — un borrador descartado no gasta número.
- **Anular** nunca edita ni borra el movimiento original: crea un contra-movimiento con el signo invertido, usando el mismo `aplicarLineaKardex`, y enlaza ambos por `movimiento_origen_id`.

Los permisos de creación dependen del **signo del concepto elegido**, no de una acción genérica: `almacen.kardex.entrada` para signo ENTRADA, `almacen.kardex.salida` para SALIDA — así SUPERV (que solo tiene salida) puede registrar consumos pero no reponer stock, tal como ya estaba definido en la matriz de roles de la Fase 1.

---

## 4. Inventario físico

`crearInventarioFisico` fotografía la cantidad de sistema de todo lo que ya tenga existencia configurada en el almacén elegido. `confirmarInventarioFisico` (permiso `almacen.inventario.aprobar`, que ALMACEN no tiene — solo GERENTE) recorre las líneas con diferencia y genera, por cada una, un movimiento de kárdex **ENT-AJU o SAL-AJU ya confirmado**, pasando por el mismo `aplicarLineaKardex`. El flujo real: el almacenista cuenta (`almacen.inventario.ejecutar`), el gerente aprueba.

---

## 5. Migración a ejecutar

`drizzle/0003_fase4_almacen_kardex.sql` — 8 tablas nuevas más el `ALTER TABLE "references" ADD COLUMN "material_id"` que cierra la deuda de la Fase 2.

```bash
pnpm db:migrate
```

## 6. Variables de entorno

Ninguna nueva.

## 7. Comandos exactos

```bash
pnpm db:migrate
pnpm typecheck && pnpm test
pnpm dev
```

---

## 8. Checklist de pruebas manuales

### Materiales

- [ ] Crea un material con "Maneja lote" activado.
- [ ] En su ficha, "Configurar en almacén": define un mínimo. Sin movimientos todavía, la cantidad aparece en 0.

### Kárdex — entrada

- [ ] "Nuevo movimiento" con concepto "Entrada por compra": selecciona el material anterior, cantidad 100, costo unitario 5.00, lote "L1", vence en 6 meses.
- [ ] Guarda (queda en Borrador). Ábrelo y "Confirmar": la ficha del material ahora muestra 100 unidades a costo promedio 5.00.
- [ ] Repite una segunda entrada del mismo material: 50 unidades a costo 8.00. Al confirmar, el costo promedio pasa a `(100×5 + 50×8)/150 = 6.00`.

### Kárdex — salida y FEFO

- [ ] Registra una segunda entrada con lote "L2" que vence ANTES que "L1".
- [ ] Una salida sin especificar lote consume primero de "L2" (verifica en el detalle del movimiento confirmado qué lote quedó aplicado).
- [ ] Una salida que exige lote y cantidad mayor a lo que tiene cualquier lote individual: falla pidiendo dividir el movimiento a mano — la limitación documentada de v1.
- [ ] Una salida mayor a la existencia total: "Existencia insuficiente…", sin tocar la base.

### Anulación

- [ ] Anula un movimiento de entrada confirmado: se crea un contra-movimiento inmediato (ya CONFIRMADO), la cantidad vuelve al valor anterior, y el original queda "Anulado" con el motivo visible.
- [ ] Intenta anular un movimiento ya anulado o en borrador: lo rechaza.

### Inventario físico

- [ ] "Nueva toma" en el almacén con existencias configuradas.
- [ ] Cuenta un material con diferencia (más o menos que el sistema). Con un usuario `ALMACEN`, el botón "Confirmar" no aparece.
- [ ] Con `GERENTE`, "Confirmar y generar ajustes": aparece un nuevo movimiento CONFIRMADO con concepto ENT-AJU o SAL-AJU según el signo de la diferencia, y la existencia del material cambia en consecuencia.

### Permisos y auditoría

- [ ] `/administracion/auditoria` muestra cada confirmación y anulación como evento CRÍTICO.
- [ ] Un usuario sin ningún permiso de kárdex ve el listado (si tiene `.ver`) pero no el botón "Nuevo movimiento".

---

## 9. Notas de deuda técnica

### ⚠️ SOLUCIÓN RÁPIDA — FEFO de un solo lote

Documentado desde el diseño (§ "Trazabilidad por lote"): si ninguna partida individual alcanza para cubrir la cantidad solicitada, el sistema rechaza la salida en vez de repartirla automáticamente entre varios lotes. *Para que sea robusto:* extender `kardex_movement_lines` para admitir una asignación de lotes por línea (una línea lógica, varias filas físicas de consumo) — vale la pena cuando el volumen real lo exija.

### Sin `work_order_id` en kárdex

`kardex_movements.documento_soporte` es un campo de texto libre, no una FK — `work_orders` no existe hasta la Fase 6. El concepto `exigeOt` solo valida que el campo no esté vacío, no que apunte a una OT real. Se añade la FK por migración manual cuando exista esa tabla, igual que pasó con `references.material_id` en esta misma fase.

### `purchase_requests` / `purchase_orders` no se construyeron

El propio prompt maestro los marca "(opcional)" en el modelo de Almacén. Los permisos `almacen.compras.solicitar` / `almacen.compras.aprobar` ya existen en el catálogo desde la Fase 1 pero no tienen pantalla — quedan para cuando haga falta reposición automática por debajo del punto de pedido.

### Anulación y costo promedio

Revertir una SALIDA vuelve a sumar la cantidad usando el costo que tenía esa línea en su momento, no un nuevo promedio recalculado contra el estado actual. Es matemáticamente correcto si nada más tocó ese material entretanto, pero dos anulaciones cruzadas en el tiempo pueden no ser perfectamente conmutativas — un caso extremo, aceptable para esta fase.

### Heredado de fases anteriores (sin tocar en esta entrega)

- La prueba `AUDITOR no tiene ningún permiso de escritura sensible` sigue fallando (preexistente de la Fase 1); ya registrada aparte.
- `next@15.1.4` sigue con la vulnerabilidad conocida (CVE-2025-66478); también registrada aparte.

---

## 10. Siguiente paso propuesto

**Fase 5 — Solicitudes de Servicio**: módulo interno + portal ligero del solicitante, SLA, notificaciones, calificación del servicio y atención directa sin generar OT.
