# ENTREGA — FASE 5 · SOLICITUDES DE SERVICIO

Dos experiencias sobre el mismo modelo de datos: el módulo interno (staff, con todas las transiciones de estado) y el portal ligero (cualquier empleado, sin ver el resto del sistema) — tal como lo pide el §6 del prompt maestro.

---

## 1. Árbol de archivos creados o modificados

```
gmao/
├── drizzle/
│   └── 0004_fase5_solicitudes.sql                  ← NUEVO: service_requests, service_request_notes
└── src/
    ├── db/schema/service-requests.ts                 ← NUEVO
    ├── lib/validators/solicitud.ts                     ← NUEVO
    ├── components/layout/{nav-config,topbar}.tsx         ← MODIFICADO: Solicitudes activa + enlace al portal
    └── app/
        ├── (app)/solicitudes/
        │   ├── page.tsx · columns.tsx · solicitudes-table.tsx    ← NUEVO: listado (con alcance por rol)
        │   ├── actions.ts                                          ← NUEVO: motor de ciclo de vida completo
        │   ├── solicitud-form.tsx                                    ← NUEVO: formulario compartido crear/editar
        │   ├── nueva/{page,nueva-solicitud-client}.tsx                ← NUEVO
        │   └── [id]/{page,solicitud-detalle-client}.tsx                ← NUEVO: ficha con bitácora y acciones
        └── (portal)/                                    ← NUEVO route group, layout propio sin sidebar
            ├── layout.tsx
            ├── mis-solicitudes/page.tsx
            ├── nueva-solicitud/{page,nueva-solicitud-portal-client}.tsx
            └── evaluar/[id]/{page,evaluar-client}.tsx
```

**16 archivos**: 14 nuevos, 2 modificados.

---

## 2. El ciclo de vida (`solicitudes/actions.ts`)

```
BORRADOR → ENVIADA → EN_REVISION → APROBADA / RECHAZADA → ASIGNADA → EN_ATENCION → RESUELTA → CERRADA
```

(`CONVERTIDA_EN_OT` existe en el enum desde la Fase 1 pero no se activa todavía — ver §5.)

Cada transición es su propia Server Action, exige el permiso concreto (`solicitudes.aprobar`, `.asignar`, `.atender`, `.cerrar`…, todos ya definidos desde la Fase 1) y valida que la solicitud esté en el estado del que puede salir — `cambiarEstado()` es el único punto que toca `estado`, así que no hay forma de saltarse un paso llamando a la acción equivocada.

- El **consecutivo** se asigna con `nextCode(tx, tenantId, 'SS')` al **enviar**, no al crear — mismo criterio que el kárdex de la Fase 4: un borrador descartado no gasta número.
- El **SLA** (`fecha_compromiso`) se calcula automáticamente al aprobar, según la prioridad: Urgente 4 h, Alta 24 h, Media 72 h, Baja 7 días.
- **Atención directa**: al resolver, marcar la casilla exige el permiso `solicitudes.atencion_directa` además de `solicitudes.atender` — dos roles distintos pueden necesitar autorizarla por separado.
- **Alcance por rol**: el listado usa `scopeDescriptor()` (ya existente desde la Fase 1) — un usuario `PROPIO` (rol SOLIC) solo ve las solicitudes donde es solicitante o responsable; `SEDE` además filtra por sus sedes; `TENANT` ve todo.
- **Notificaciones reales**: cada aprobación, rechazo, asignación y resolución escribe una fila en la tabla `notifications` (ya existía desde la Fase 1, con su badge de no leídas en el topbar — hasta ahora nunca se había llenado con datos reales).

---

## 3. El portal ligero — `(portal)`

Un route group de Next.js completamente aparte de `(app)`, con su propio `layout.tsx`: sin sidebar de módulos, solo una cabecera con el nombre de la empresa y un botón "Ir al sistema" (visible únicamente si el usuario tiene permisos más allá de Solicitudes). Mismo login — `middleware.ts` no necesitó ningún cambio porque su matcher ya cubre cualquier ruta que no esté en la lista pública.

- `/nueva-solicitud` reutiliza el mismo `SolicitudForm` y las mismas Server Actions del módulo interno (`crearSolicitud` + `enviarSolicitud` encadenadas: el portal no expone el concepto de "borrador", se envía de una vez).
- `/mis-solicitudes` — tarjetas simples, no la tabla genérica pesada: es justo lo que pide "portal ligero".
- `/evaluar/[id]` — detalle de solo lectura de una solicitud propia (verifica que `solicitanteUserId` sea el usuario actual, si no, 404), con la bitácora visible y el formulario de calificación cuando corresponde.

---

## 4. Migración a ejecutar

`drizzle/0004_fase5_solicitudes.sql` — 2 tablas nuevas.

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

- [ ] Con un usuario `SOLIC` (o cualquiera), entra a `/nueva-solicitud` (menú de usuario → "Portal de solicitudes"), reporta algo y envíalo.
- [ ] Con `GERENTE` o `PLANIF`, entra a `/solicitudes`: la ves en estado "Enviada". Apruébala — revisa que el badge de notificaciones del solicitante haya subido.
- [ ] Asígnala a un responsable — ese usuario recibe su propia notificación.
- [ ] Con el responsable, "Iniciar atención" y luego "Resolver", marcando "Atención directa" si tienes el permiso.
- [ ] Vuelve como el solicitante a `/mis-solicitudes` o `/evaluar/[id]`: aparece la solución aplicada y el formulario de calificación. Califícala.
- [ ] Con un usuario `SOLIC` distinto, verifica que `/solicitudes` (módulo interno) **no** muestra la solicitud del primero — el alcance `PROPIO` lo bloquea.
- [ ] Escribe un comentario en la bitácora desde el portal; entra al módulo interno con el responsable y verifica que aparece ahí también.
- [ ] Prueba "Rechazar" con un motivo: el estado queda en Rechazada con el motivo visible para el solicitante.

---

## 8. Notas de deuda técnica

### Conversión SS → OT no activada

El estado `CONVERTIDA_EN_OT` existe en el enum desde la Fase 1, y el permiso `solicitudes.convertir_ot` también — pero no hay botón: `work_orders` no existe hasta la Fase 6, y "convertir" a algo que no existe habría sido una funcionalidad a medias. El flujo real (§7.4 del prompt maestro: arrastra activo, descripción, prioridad y solicitante; mantiene vínculo bidireccional) se construye junto con Órdenes de Trabajo.

### Centro de notificaciones sin panel propio

El badge del topbar ahora refleja notificaciones reales, pero la campana sigue sin abrir un listado — hacer clic no lleva a ningún lado todavía. Construir un panel desplegable con las notificaciones (marcar leída, ir al enlace) es una mejora transversal a toda la app, no específica de Solicitudes; encaja mejor como una pieza aparte cuando haya más módulos generando notificaciones (Fase 6 en adelante).

### Adjuntos de la solicitud

El modelo permite adjuntar fotos (tabla genérica `attachments`, ya existente desde la Fase 1, con `entidad`/`entidad_id` polimórficos) pero no se construyó la subida en esta fase — el mismo patrón de Vercel Blob que ya funciona en Documentos de Activos (Fase 3) se puede enchufar aquí directamente cuando se necesite.

### Heredado de fases anteriores (sin tocar en esta entrega)

- La prueba `AUDITOR no tiene ningún permiso de escritura sensible` sigue fallando (preexistente de la Fase 1); ya registrada aparte.
- `next@15.1.4` sigue con la vulnerabilidad conocida (CVE-2025-66478); también registrada aparte.

---

## 9. Siguiente paso propuesto

**Fase 6 — Órdenes de Trabajo**: el módulo más grande del sistema — CRUD, checklist, mano de obra, materiales, costos, estados, kanban, calendario, OT en PDF, firmas. Cierra la conversión SS → OT diferida en esta fase y activa por fin `exige_ot` en los conceptos de kárdex y en `documento_soporte` de los movimientos.
