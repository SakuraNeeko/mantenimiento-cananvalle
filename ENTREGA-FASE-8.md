# ENTREGA — FASE 8 · PAROS / AVERÍAS

El módulo más pequeño hasta ahora, y a propósito: un paro es un hecho que ya ocurrió, no un documento con flujo de aprobación (§4.6 del prompt maestro). Registra la detención de un activo, programada o no, y es la fuente de datos que en la Fase 9 alimentará MTBF, MTTR y disponibilidad.

---

## 1. Árbol de archivos creados o modificados

```
gmao/
├── drizzle/
│   └── 0007_fase8_paros.sql                     ← NUEVO: downtimes + 2 enums
└── src/
    ├── db/schema/{enums,downtimes,index}.ts        ← NUEVO/MODIFICADO
    ├── lib/validators/paro.ts                         ← NUEVO
    ├── components/layout/nav-config.ts                  ← MODIFICADO: /paros activa (fase 8→1)
    └── app/(app)/paros/
        ├── actions.ts · columns.tsx · page.tsx · paros-table.tsx  ← NUEVO: listado (con alcance por rol)
        ├── paro-form.tsx                                            ← NUEVO: formulario compartido
        ├── nuevo/{page,nuevo-paro-client}.tsx                          ← NUEVO
        └── [id]/{page,paro-detalle-client}.tsx                         ← NUEVO: ficha con acciones
```

**13 archivos**: 11 nuevos, 2 modificados.

---

## 2. El modelo de datos (`db/schema/downtimes.ts`)

Una sola tabla, `downtimes`: activo (obligatorio — un paro siempre es de un activo concreto, nunca de un grupo), tipo (programado / no programado), inicio, fin, duración (calculada al cerrar), causa/efecto de falla, acción técnica, impacto (unidades no producidas, costo estimado), la OT que eventualmente genera, y quién lo reportó.

- **Sin borrador**: a diferencia de Solicitudes u Órdenes, un paro no tiene un estado previo a existir — ya está pasando o ya pasó. El consecutivo (`PA-{YYYY}-{#####}`, secuencia ya declarada desde la Fase 1) se asigna en la misma transacción que lo crea, no al "confirmar" nada.
- **Solo dos estados**: `ABIERTO` → `CERRADO`. Mientras está abierto se puede seguir editando (causa, efecto, observaciones); al cerrar se fija `fecha_fin`, se calcula `duracion_minutos` y opcionalmente se registra el impacto — que rara vez se conoce con certeza mientras el paro sigue en curso.

---

## 3. Paro → OT correctiva (`convertirParoEnOrden`)

Mismo criterio exacto que la conversión SS → OT de la Fase 6 (`actions.ts`): arrastra activo, causa y efecto de falla, y la acción técnica si ya se conocía; marca `requiere_paro = true` y prioridad `ALTA` si el paro es no programado. Guarda el vínculo en `downtimes.work_order_id` para que no se pueda convertir dos veces.

A diferencia de Solicitudes (donde la conversión depende de que la solicitud esté `APROBADA`), aquí el botón "Convertir en orden de trabajo" está disponible en cualquier momento mientras el paro sea de tipo no programado y no tenga ya una OT asociada — se puede usar apenas se registra el paro (tal como sugiere §7.5: "se ofrece crear la OT correctiva") o más tarde, una vez que se conoce la causa real, sin que el flujo lo fuerce a un momento específico.

---

## 4. Migración a ejecutar

`drizzle/0007_fase8_paros.sql` — 1 tabla nueva + 2 enums (`downtime_tipo`, `downtime_estado`).

```bash
pnpm db:migrate
```

## 5. Variables de entorno

Ninguna nueva.

## 6. Comandos exactos

```bash
pnpm db:migrate
pnpm typecheck && pnpm test
pnpm dev
```

---

## 7. Checklist de pruebas manuales

- [ ] Con cualquier rol con `paros.registrar`, registra un paro no programado sobre un activo existente, sin causa (aún no se sabe).
- [ ] Edítalo mientras está abierto para agregar la causa una vez identificada.
- [ ] Con `paros.convertir_ot`, conviértelo en OT — verifica en `/ordenes` que la nueva orden trae la causa y el efecto heredados, y que `requiere_paro` quedó marcado.
- [ ] Vuelve al paro: debe mostrar el enlace a la orden generada y ya no ofrecer el botón de convertir de nuevo.
- [ ] Con `paros.cerrar`, ciérralo indicando la fecha de fin y el impacto (unidades no producidas, costo estimado) — verifica que la duración se calculó correctamente.
- [ ] Registra un paro programado y confirma que no aparece la opción de convertirlo en OT (solo aplica a los no programados).
- [ ] Con un usuario de alcance `PROPIO`, confirma que `/paros` solo muestra los paros que él mismo reportó.

---

## 8. Notas de deuda técnica

### MTBF/MTTR: solo se guarda la materia prima

`downtimes` guarda todo lo necesario (inicio, fin, duración, activo) para calcular MTBF (tiempo medio entre fallas) y MTTR (tiempo medio de reparación), pero el cálculo y su dashboard son explícitamente la Fase 9 ("Historia y KPIs") del roadmap — construirlos ahora habría significado un dashboard con fórmulas sin el resto de las piezas (envío a historia, balance periódico) que le dan contexto.

### Acción técnica: una sola, no múltiple

Mismo criterio simplificado que ya se documentó en la Fase 6 para `work_orders.technical_action_id`: es una FK simple, no una tabla puente. Si se necesita registrar varias acciones técnicas por paro, es una migración acotada a esta tabla.

### Sin adjuntos ni fotos del paro

El modelo no incluye una tabla de evidencias fotográficas específica de paros. La tabla genérica `attachments` (polimórfica, ya existente desde la Fase 1) se puede enchufar aquí con el mismo patrón que Documentos de Activos (Fase 3) cuando se necesite.

### Heredado de fases anteriores (sin tocar en esta entrega)

- La prueba `AUDITOR no tiene ningún permiso de escritura sensible` sigue fallando (preexistente de la Fase 1); ya registrada aparte.
- `next@15.1.4` sigue con la vulnerabilidad conocida (CVE-2025-66478); también registrada aparte.

---

## 9. Siguiente paso propuesto

**Fase 9 — Historia y KPIs**: envío en lote de OT cerradas a historia (con validación previa y copia inmutable), historia archivada, balance periódico, y los dashboards de MTBF/MTTR/disponibilidad que esta fase dejó preparados con los datos de `downtimes`.
