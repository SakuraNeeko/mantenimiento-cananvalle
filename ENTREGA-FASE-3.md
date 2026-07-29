# ENTREGA — FASE 3 · ACTIVOS

El primer módulo que consume de verdad los catálogos de la Fase 2. Patrón maestro-detalle con pestañas (§6 del prompt maestro): una ficha por activo con Características, Medidores, Documentos, Traslados e Historial — las "vistas parciales" del enfoque AM.

---

## 1. Árbol de archivos creados o modificados

```
gmao/
├── package.json                                    ← MODIFICADO: + qrcode, @vercel/blob
├── drizzle/
│   └── 0002_fase3_activos.sql                      ← NUEVO: 7 tablas
└── src/
    ├── db/schema/
    │   ├── assets.ts                                 ← NUEVO: assets + 6 tablas satélite
    │   ├── enums.ts                                   ← MODIFICADO: +4 enums de Activos
    │   └── index.ts                                    ← MODIFICADO: exporta ./assets
    ├── lib/validators/activo.ts                        ← NUEVO: esquema Zod compartido
    ├── components/layout/nav-config.ts                 ← MODIFICADO: Activos ya no aparece atenuado
    └── app/(app)/activos/
        ├── page.tsx · columns.tsx · activos-table.tsx   ← NUEVO: listado
        ├── actions.ts                                    ← NUEVO: CRUD, cambiar estado, opciones
        ├── activo-form.tsx                                ← NUEVO: formulario por secciones (crear y editar)
        ├── nuevo/{page,nuevo-activo-client}.tsx            ← NUEVO: alta (admite ?parentId= para despiece)
        └── [id]/
            ├── layout.tsx · tab-nav.tsx · qr-button.tsx      ← NUEVO: cabecera, pestañas, código QR
            ├── data.ts                                        ← NUEVO: fetch cacheado compartido entre pestañas
            ├── page.tsx · general-tab-client.tsx                ← NUEVO: pestaña General (ver/editar/eliminar)
            ├── caracteristicas/{page,actions,caracteristicas-form}.tsx  ← NUEVO
            ├── medidores/{page,actions,medidores-panel}.tsx            ← NUEVO
            ├── documentos/{page,actions,documentos-panel}.tsx          ← NUEVO
            ├── traslados/{page,actions,traslados-panel}.tsx            ← NUEVO
            └── historial/{page,actions,historial-panel}.tsx            ← NUEVO
```

**27 archivos**: 24 nuevos, 3 modificados.

---

## 2. Modelo de datos

`src/db/schema/assets.ts`:

| Tabla | Qué guarda |
|---|---|
| `assets` | La ficha: código, nombre, `parent_id` (despiece autoreferenciado), clase, criticidad (reutiliza el enum de Fase 1), ubicación/centro de costo/centro responsable (Fase 2), fabricante/modelo/serie, valores y garantía, proveedor y contrato |
| `asset_characteristics` | Valor de cada característica dinámica del catálogo `characteristics`, filtrada por `clase_activo` |
| `asset_meters` / `meter_readings` | Contadores asignados y su histórico de lecturas, append-only |
| `asset_documents` | Referencia a archivos en Vercel Blob (manual, plano, certificado, garantía) |
| `asset_transfers` | Histórico de traslados de ubicación/centro de costo, append-only |
| `asset_status_history` | Cada cambio de estado operativo — la base de la hoja de vida y, en fases futuras, de MTBF/MTTR |

`estado` **no es editable desde el formulario general**: cambia solo por `cambiarEstadoActivo`, que además escribe en `asset_status_history` dentro de la misma operación. Dejarlo editable ahí habría permitido saltarse la bitácora.

---

## 3. Cómo funciona la ficha del activo

`/activos/[id]/layout.tsx` resuelve el activo una vez (`data.ts`, envuelto en `cache()` de React) y lo comparten el layout y cada pestaña sin repetir la consulta dentro del mismo request. Las pestañas son rutas anidadas de verdad (`/activos/[id]/medidores`, `/documentos`…), no pestañas de cliente con estado oculto — cada una es un enlace normal, coherente con el resto de la app.

- **General**: vista de solo lectura por defecto; "Editar" reutiliza el mismo `ActivoForm` de la creación. Incluye la lista de componentes (despiece) con el botón "Agregar componente", que precarga `parentId` vía `?parentId=` al crear.
- **Características**: cruza el catálogo `characteristics` (filtrado por la clase del activo o sin clase asignada) con los valores guardados; un solo botón "Guardar" persiste todas a la vez y escribe un único evento de auditoría con el diff completo.
- **Medidores**: asignar un contador del catálogo, registrar lecturas y ver su historial. `registrarLectura` valida la regla de negocio explícita del prompt maestro: si el medidor no permite retroceso, la lectura no puede ser menor que la última.
- **Documentos**: sube a Vercel Blob (`put()`/`del()` de `@vercel/blob`), con lista blanca de tipos MIME y límite de 15 MB — la validación de "tipo de archivo real" y "límite de tamaño" del §8 del prompt maestro.
- **Traslados**: registra el movimiento (con origen calculado automáticamente desde el estado actual) en una transacción `dbTx` que también actualiza `assets.location_id`/`cost_center_id`.
- **Historial**: cambia el estado operativo y muestra la bitácora completa.

Código QR: `qr-button.tsx` genera el PNG en el navegador con `qrcode` y enlaza a `/activos/[id]` — no hay portal público en esta fase, así que escanearlo exige sesión iniciada.

---

## 4. Migración a ejecutar

`drizzle/0002_fase3_activos.sql` — 7 tablas nuevas (`assets` con 33 columnas, 6 índices y 7 FK, más las 6 satélite), generada con `drizzle-kit generate`.

```bash
pnpm db:migrate
```

---

## 5. Variables de entorno

Ninguna nueva — `BLOB_READ_WRITE_TOKEN` ya estaba en `.env.example` desde la Fase 1 ("fases posteriores"). **Esta es la fase que la activa de verdad**: sin ella, "Subir documento" falla con un error controlado ("Verifica que BLOB_READ_WRITE_TOKEN esté configurado"), no con una pantalla en blanco.

---

## 6. Comandos exactos

```bash
pnpm install       # agrega qrcode y @vercel/blob
pnpm db:migrate
pnpm typecheck && pnpm test
pnpm dev
```

Abre `http://localhost:3000/activos` — ya no aparece atenuado en el sidebar.

---

## 7. Checklist de pruebas manuales

### CRUD y despiece

- [ ] "Nuevo activo": completa Identificación y Ubicación como mínimo, guarda. Redirige a la ficha.
- [ ] Desde la ficha, "Agregar componente": el nuevo activo trae precargado "Pertenece a" sin que tengas que buscarlo.
- [ ] En la pestaña General del componente, el breadcrumb superior enlaza de vuelta al padre.
- [ ] Intenta eliminar un activo que tiene componentes: lo bloquea con un mensaje claro.
- [ ] Código repetido al crear: "Ya existe un activo con ese código."

### Características

- [ ] Crea una característica en Infraestructura con `Clase de activo = Equipo` y tipo `Lista de opciones`.
- [ ] En un activo de clase Equipo, la pestaña Características la muestra con su selector; en uno de otra clase, no aparece.
- [ ] Guarda un valor, recarga la página: persiste.

### Medidores

- [ ] Asigna un contador con "Permite retroceso" desactivado. Registra una lectura menor a la actual: lo rechaza con el mensaje exacto de la última lectura.
- [ ] Registra una lectura mayor: se actualiza el valor mostrado en la tarjeta y aparece en "Historial".

### Documentos

- [ ] Sin `BLOB_READ_WRITE_TOKEN` configurado, "Subir documento" falla con el mensaje controlado, no con un error 500 crudo.
- [ ] Con el token configurado: sube un PDF, aparece en la lista, el enlace abre el archivo. Elimínalo: desaparece de la lista y del storage.
- [ ] Intenta subir un `.exe`: lo rechaza por tipo de archivo no permitido.

### Traslados e historial

- [ ] "Nuevo traslado" cambiando solo la ubicación: el centro de costo queda igual en el registro.
- [ ] La pestaña General ahora muestra la nueva ubicación.
- [ ] "Cambiar estado" a "En mantenimiento" con un motivo: aparece en Historial con el badge de transición correcto.

### QR

- [ ] "Código QR" genera la imagen; "Descargar" guarda un PNG; "Imprimir" abre una ventana lista para imprimir.
- [ ] Escanéalo con el celular: abre `/activos/[id]` (pide iniciar sesión si no la tienes).

---

## 8. Notas de deuda técnica

### Selector de padre sin búsqueda

El campo "Pertenece a (despiece)" en el formulario es un `<Select>` con todos los activos del tenant, igual que los campos de referencia de la Fase 2. Con cientos de activos se vuelve incómodo. *Para que sea robusto:* un combobox con búsqueda server-side — encaja mejor cuando exista un volumen real de datos que lo justifique.

### Validación de ciclos en el despiece

`actualizarActivo` impide que un activo sea su propio padre, pero no valida ciclos más profundos (un nieto como padre del abuelo) — la misma limitación documentada para los catálogos jerárquicos de la Fase 2.

### `asset_spare_parts` (BOM) no existe todavía

El prompt maestro lo incluye en el modelo de Activos, pero depende de `materials`, que llega en la Fase 4. Se implementa ahí, junto con el catálogo de materiales.

### `asset_depreciation` omitido

El propio prompt maestro lo marca "(opcional)". No se construyó: no hay todavía ningún reporte financiero que lo consuma, y el cálculo de depreciación es una decisión contable que merece su propia fase si se necesita.

### Importación Excel de activos, fuera de alcance

El permiso `activos.importar` ya existe en el catálogo (heredado de la Fase 1), pero el roadmap de esta fase no incluye su pantalla — a diferencia de Infraestructura, donde P-05 sí lo pedía explícitamente. Con la estructura del motor de importación de la Fase 2 ya construida, extenderlo a activos es mecánico cuando haga falta.

---

## 9. Siguiente paso propuesto

**Fase 4 — Almacén y Kárdex**: materiales, existencias por almacén, movimientos transaccionales de kárdex con costo promedio ponderado, alertas de mínimos e inventario físico. Cierra dos pendientes de fases anteriores: la FK `references.material_id` (Fase 2) y `asset_spare_parts` (esta fase).
