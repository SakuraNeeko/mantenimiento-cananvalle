# ENTREGA — FASE 10 · COMBUSTIBLES Y TECNOVIGILANCIA

Los dos primeros módulos genuinamente **opcionales** del sistema (§4.10, §4.11): el mecanismo de activación por tenant existía desde la Fase 1 (`tenant_modules`, `visibleNav()` ya lo consultaba) pero nadie lo había usado todavía porque no había nada que activar. Esta fase también cierra ese círculo con una pantalla para prender y apagar módulos.

---

## 1. Árbol de archivos creados o modificados

```
gmao/
├── drizzle/
│   └── 0009_fase10_combustibles_tecnovigilancia.sql   ← NUEVO: fuel_records, adverse_events
└── src/
    ├── db/schema/{enums,combustibles,tecnovigilancia,index}.ts  ← NUEVO/MODIFICADO
    ├── lib/
    │   ├── tenant/modules.ts                                       ← NUEVO: guard server-side de módulos opcionales
    │   └── combustibles/rendimiento.ts                              ← NUEVO: cálculo de rendimiento y anomalías
    ├── components/layout/nav-config.ts                                ← MODIFICADO: módulos activos (fase 10→1) + nuevo ítem
    └── app/(app)/
        ├── administracion/modulos/{actions,page,modulos-client}.tsx     ← NUEVO: activar/desactivar módulos
        ├── combustibles/
        │   ├── actions.ts · columns.tsx · page.tsx · combustibles-table.tsx · combustible-form.tsx  ← NUEVO
        │   ├── nuevo/{page,nuevo-combustible-client}.tsx                  ← NUEVO
        │   ├── [id]/{page,combustible-detalle-client}.tsx                 ← NUEVO
        │   └── rendimiento/{page,rendimiento-client}.tsx                  ← NUEVO
        └── tecnovigilancia/
            ├── actions.ts · columns.tsx · page.tsx · eventos-table.tsx · evento-form.tsx  ← NUEVO
            ├── nuevo/{page,nuevo-evento-client}.tsx                         ← NUEVO
            └── [id]/{page,evento-detalle-client}.tsx                        ← NUEVO
```

**27 archivos**: 24 nuevos, 3 modificados (`nav-config.ts`, `db/schema/index.ts`, y el propio `db/schema/enums.ts`).

---

## 2. Módulos opcionales: de flag ignorado a algo real

`tenant_modules` y `visibleNav(permisos, modulosActivos)` existían desde la Fase 1 — el layout ya ocultaba del menú cualquier ítem cuyo `modulo` no estuviera habilitado. Lo que faltaba era (a) algo que de verdad dependiera de ese flag y (b) una forma de cambiarlo sin tocar SQL a mano:

- **`lib/tenant/modules.ts`** — `requireModulo(tenantId, modulo)` se llama al inicio de cada `page.tsx` de Combustibles y Tecnovigilancia. Ocultar el enlace del menú no alcanza: sin este guard, alguien con el permiso pero con el módulo desactivado podría entrar igual escribiendo la URL directamente.
- **`/administracion/modulos`** (permiso `admin.modulos.activar`, ya definido desde la Fase 1) — activa/desactiva Combustibles, Tecnovigilancia y Automatizador (este último queda ahí sin efecto hasta la Fase 12: activarlo no hace nada todavía porque el módulo no existe).

Por el seed de la Fase 1, Combustibles llega **activado** por defecto y Tecnovigilancia **desactivado** — tal como especifica `MODULOS_OPCIONALES` en `seed/index.ts` desde el principio.

## 3. Combustibles (`fuel_records`)

Una sola tabla transaccional: activo, tipo de combustible (catálogo `fuels`, ya sembrado desde la Fase 2), cantidad, costo unitario y total, lectura de odómetro/horómetro, proveedor, conductor y factura.

**Rendimiento y anomalías no se guardan, se calculan** (`lib/combustibles/rendimiento.ts`): por cada carga, rendimiento = (lectura actual − lectura anterior) ÷ cantidad cargada, comparando con la carga inmediatamente anterior del mismo activo. Se marca "anómalo" cuando el rendimiento se desvía más de 30% del promedio de las cargas previas — un umbral fijo, documentado como simplificación en el propio código. La pantalla `/combustibles/rendimiento` deja elegir un activo y ver su historial completo con el rendimiento calculado línea por línea.

## 4. Tecnovigilancia (`adverse_events`)

Orientado a activos de clase `BIOMEDICO` (ya existente desde la Fase 3). Una sola tabla cubre tanto eventos/incidentes propios como alertas de fabricante (`tipo` los distingue) — una simplificación frente a modelarlos como dos tablas separadas, documentada en el esquema.

Ciclo de vida simple: `ABIERTO → EN_GESTION → CERRADO` (exige causa raíz y acciones correctivas para cerrar). El reporte a la autoridad sanitaria es una acción aparte, detrás de su propio permiso `tecnovigilancia.reportar` — más sensible que solo gestionar el evento internamente, ya definido así desde la Fase 1.

---

## 5. Migración a ejecutar

`drizzle/0009_fase10_combustibles_tecnovigilancia.sql` — 2 tablas nuevas (`fuel_records`, `adverse_events`) + 3 enums (`adverse_event_tipo`, `adverse_event_severidad`, `adverse_event_estado`).

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

- [ ] Con `admin.modulos.activar`, entra a `/administracion/modulos` y confirma que Combustibles aparece activado y Tecnovigilancia desactivado (default del seed).
- [ ] Con Tecnovigilancia desactivado, intenta entrar a `/tecnovigilancia` directamente por URL — debe dar 404, no solo estar oculto del menú.
- [ ] Actívalo desde `/administracion/modulos` y confirma que el enlace aparece en el menú y la página ya carga.
- [ ] Registra dos o tres cargas de combustible para el mismo activo, con lecturas de odómetro crecientes.
- [ ] Entra a `/combustibles/rendimiento`, selecciona ese activo y confirma que el rendimiento se calculó entre cargas consecutivas.
- [ ] Registra una carga con una lectura que dispare una desviación grande — confirma que aparece marcada "Anómalo".
- [ ] Registra un evento de tecnovigilancia sobre un activo de clase Biomédico (si no tienes uno, créalo primero en Activos).
- [ ] Avanza su ciclo de vida: Iniciar gestión → Cerrar (con causa raíz y acciones correctivas).
- [ ] Con `tecnovigilancia.reportar`, márcalo como reportado a la autoridad sanitaria y confirma que queda visible en la ficha.

---

## 9. Notas de deuda técnica

### Consumo anómalo: umbral fijo de 30%

El prompt maestro pide "detección de consumos anómalos frente al histórico" sin especificar el método. Se implementó con un umbral fijo (±30% del promedio de cargas anteriores) en vez de un cálculo estadístico (desviación estándar) o un umbral por clase de activo — con poco volumen de datos reales, un cálculo estadístico habría sido más aparatoso que preciso. Es el único número mágico del módulo y está documentado en el propio código (`lib/combustibles/rendimiento.ts`) para ajustarlo cuando haya más historial real.

### Tecnovigilancia: eventos propios y alertas de fabricante comparten tabla

El prompt maestro menciona `adverse_events` para eventos/incidentes y "alertas de fabricante/recalls" como si fueran conceptos separados con su propia "gestión y cierre de alertas". Se modelaron en una sola tabla con `tipo = 'ALERTA_FABRICANTE'` porque el ciclo de vida (abierto → en gestión → cerrado) es idéntico para ambos — separarlos habría duplicado el 90% del esquema y de las acciones.

### Clasificación regulatoria: texto libre

La "clasificación" de un evento de tecnovigilancia varía según la autoridad sanitaria de cada país (ARCSA en Ecuador, INVIMA en Colombia, ANMAT en Argentina…). En vez de imponer una taxonomía, el campo es texto libre — cada empresa escribe la clasificación de su propio marco regulatorio.

### Heredado de fases anteriores (sin tocar en esta entrega)

- La prueba `AUDITOR no tiene ningún permiso de escritura sensible` sigue fallando (preexistente de la Fase 1); ya registrada aparte.
- `next@15.1.4` sigue con la vulnerabilidad conocida (CVE-2025-66478); también registrada aparte.

---

## 10. Siguiente paso propuesto

**Fase 11 — PWA móvil offline**: la app para técnicos en campo — escaneo de QR (el generador ya existe desde la Fase 3), ejecución de checklist sin conexión y cola de sincronización cuando vuelve la señal. Es la primera fase que no agrega un módulo de negocio nuevo, sino una forma distinta de usar los que ya existen (Órdenes, sobre todo).
