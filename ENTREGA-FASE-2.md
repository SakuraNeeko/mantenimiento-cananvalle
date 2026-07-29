# ENTREGA — FASE 2 · INFRAESTRUCTURA

31 catálogos parametrizables administrados por una única pantalla genérica dirigida por metadatos, en vez de 31 CRUD hechos a mano — el objetivo explícito de esta fase (§4.2 del prompt maestro). Incluye árboles jerárquicos para los tres catálogos que lo necesitan, e importación/exportación Excel (P-05).

---

## 1. Árbol de archivos creados o modificados

```
gmao/
├── package.json                                    ← MODIFICADO: + xlsx (SheetJS)
├── drizzle/
│   └── 0001_fase2_infraestructura.sql              ← NUEVO: 33 tablas, 32 índices únicos parciales
└── src/
    ├── db/
    │   ├── schema/
    │   │   ├── infra.ts                             ← NUEVO: los 31 catálogos + currency_rates + import_jobs
    │   │   ├── enums.ts                              ← MODIFICADO: +5 enums (party_tipo, meter_tipo_lectura…)
    │   │   └── index.ts                              ← MODIFICADO: exporta ./infra
    │   └── seed/index.ts                             ← MODIFICADO: 8 catálogos fundacionales con valores es-EC
    ├── lib/catalogs/
    │   ├── registry.ts                               ← NUEVO: fuente de verdad — 1 entrada por catálogo
    │   ├── validators.ts                             ← NUEVO: Zod dinámico a partir del registro
    │   ├── db-helpers.ts                              ← NUEVO: acceso genérico a columnas por nombre
    │   └── excel-mapping.ts                           ← NUEVO: fila de Excel → valores tipados
    ├── components/ui/textarea.tsx                     ← NUEVO: primitivo que faltaba
    └── app/(app)/
        ├── infraestructura/page.tsx                   ← NUEVO: índice de los 31 catálogos
        └── infraestructura/[catalogo]/
            ├── page.tsx                               ← NUEVO: tabla o árbol, según el catálogo
            ├── actions.ts                              ← NUEVO: CRUD + exportar/importar genéricos
            ├── registro-form.tsx                       ← NUEVO: formulario único, campos desde el registro
            ├── catalogo-table.tsx                      ← NUEVO: listado (catálogos planos)
            ├── arbol-catalogo.tsx                      ← NUEVO: árbol expandible (catálogos jerárquicos)
            └── import-export.tsx                       ← NUEVO: botones Exportar/Importar + resultado
```

**19 archivos**: 14 nuevos, 5 modificados.

---

## 2. Cómo funciona el motor genérico

`src/lib/catalogs/registry.ts` es la única fuente de verdad. Cada una de las 31 entradas declara: la tabla Drizzle, sus campos (tipo, si es obligatorio, de dónde salen sus opciones) y si es jerárquico. A partir de ahí:

- **El formulario** (`registro-form.tsx`) recorre `campos` y decide qué `<Input>`, `<Select>`, `<Checkbox>` o `<Textarea>` renderizar — cero formularios escritos a mano.
- **La validación** (`validators.ts`) construye el esquema Zod dinámicamente con la misma información, y lo comparte el cliente (react-hook-form) y el servidor (Server Actions) — una sola fuente de verdad, igual que `validators/usuario.ts` de la Fase 1.b.
- **Las Server Actions** (`actions.ts`) son genéricas: `crearRegistro`, `actualizarRegistro`, `alternarActivo`, `eliminarRegistro`, `obtenerRegistroParaEditar`, `obtenerOpciones`, `exportarFilas`, `importarFilas` — reciben el `slug` del catálogo y operan sobre `def.tabla` dinámicamente.
- **Los campos de referencia** (ej. "Unidad de medida" en Magnitudes) declaran de qué tabla salen sus opciones (`referenciaTabla`); el motor las resuelve con una sola consulta filtrada por tenant y activo.

Esto obliga a un puñado de accesos a columnas por nombre en runtime (`src/lib/catalogs/db-helpers.ts`), inevitables en un motor genuinamente genérico — están contenidos en un único archivo pequeño, con `!` justificado y comentado, no repartidos por el código.

### Catálogos jerárquicos

`cost_centers`, `responsible_centers` y `locations` tienen `parent_id` autoreferenciado y se listan en `arbol-catalogo.tsx`: un árbol expandible con lazy-render (no lazy-fetch — las filas ya vienen del servidor, plegar/desplegar es solo estado de cliente). El mismo `registro-form.tsx` sirve para crear hijos: el botón "+" de cada nodo precarga `parentId` sin exponer un campo oculto raro. Un registro no puede elegirse a sí mismo como padre; los ciclos más profundos (nieto como padre) no se validan todavía — ver §6.

### Excel (P-05)

"Exportar" arma un `.xlsx` en el navegador con las filas ya filtradas/buscadas de la vista actual (sin paginar). "Importar" lee el archivo con SheetJS, mapea cada columna por su encabezado (mismo texto que exporta el sistema) a los campos del catálogo, y llama a `importarFilas`: cada fila se procesa de forma independiente — código existente actualiza, código nuevo crea, un error en una fila no tumba a las demás. El resultado exacto (fila por fila) queda en `import_jobs` y se muestra en un diálogo al terminar.

---

## 3. Migración a ejecutar

`drizzle/0001_fase2_infraestructura.sql` — generada con `drizzle-kit generate` y verificada:

- **33 tablas** nuevas: 31 catálogos + `currency_rates` + `import_jobs`.
- **32 índices únicos parciales** (`WHERE deleted_at IS NULL`), uno por catálogo con código, más el de `currency_rates` sobre (moneda, fecha).
- **5 enums nuevos**: `party_tipo`, `meter_tipo_lectura`, `characteristic_tipo_dato`, `kardex_signo`, `import_job_estado`.
- FKs con `ON DELETE set null` en las autoreferencias jerárquicas y en los campos de referencia opcionales; `restrict` donde el catálogo no puede quedar huérfano (ej. `warehouses.site_id`).

```bash
pnpm db:migrate
```

---

## 4. Variables de entorno nuevas

Ninguna.

---

## 5. Comandos exactos

```bash
pnpm install          # agrega xlsx
pnpm db:migrate       # aplica 0001_fase2_infraestructura.sql
pnpm db:seed          # además de lo de Fase 1, siembra 8 catálogos fundacionales
pnpm typecheck && pnpm test
pnpm dev
```

Abre `http://localhost:3000/infraestructura` con el admin — ya no aparece atenuado en el sidebar.

---

## 6. Checklist de pruebas manuales

### Catálogo plano (ej. "Tipos de mantenimiento")

- [ ] Entra a `/infraestructura`: los 31 catálogos aparecen como tarjetas; los tres jerárquicos llevan la etiqueta "Árbol".
- [ ] Tras el seed, "Tipos de mantenimiento" ya trae 7 filas (Preventivo, Correctivo…).
- [ ] "Nuevo": crea uno con código repetido → "Ya existe un registro con ese código."
- [ ] Edítalo, desactívalo desde el menú de la fila: desaparece si filtras por activo.
- [ ] Elimínalo: borrado lógico, no vuelve a aparecer aunque repitas `pnpm db:seed`.

### Catálogo con campo de referencia (ej. "Magnitudes")

- [ ] Al crear una magnitud, el selector "Unidad de medida" trae las unidades ya sembradas (UN, GAL, LT…).
- [ ] En el listado, la columna muestra el **nombre** de la unidad, no su id.

### Catálogo jerárquico (ej. "Centros de costo")

- [ ] "Nuevo" en la raíz crea un centro sin padre.
- [ ] El botón "+" de un nodo crea un hijo con el padre precargado y no editable por error.
- [ ] Al editar, el selector de "padre" no incluye al propio registro.
- [ ] Intenta eliminar un centro que tiene hijos: lo bloquea con un mensaje claro, no lo intenta y falla a medias.

### Excel

- [ ] "Exportar" en cualquier catálogo descarga un `.xlsx` con encabezados legibles.
- [ ] Edita ese archivo (cambia un nombre, agrega una fila nueva con código inédito) y vuelve a subirlo con "Importar": el diálogo muestra correctas/con error/total.
- [ ] Sube un archivo con una fila de código duplicado dentro del mismo archivo y otra con un campo obligatorio vacío: ambas aparecen en la lista de errores con su número de fila; las demás filas sí se guardan.
- [ ] `/administracion/auditoria` registra la importación como evento CRÍTICO.

### Permisos

- [ ] Con un usuario `TECNICO` (sin `infra.catalogos.crear/editar/eliminar`), el listado es de solo lectura: sin botón "Nuevo", sin menú de acciones, sin botones de exportar/importar si tampoco tiene `infra.exportar`/`infra.importar`.
- [ ] `ALMACEN` sí puede ver y exportar catálogos, pero no gestionarlos (matriz de roles sin cambios respecto a la Fase 1).

---

## 7. Notas de deuda técnica

### ⚠️ SOLUCIÓN RÁPIDA — Ciclos en catálogos jerárquicos

El formulario evita que un registro se elija a sí mismo como padre, pero no valida ciclos más profundos (elegir a un nieto como padre del abuelo). Con la operación manual esperada en esta fase el riesgo es bajo. *Para que sea robusto:* una validación recursiva del lado del servidor en `actualizarRegistro` cuando el catálogo es jerárquico, antes de la Fase 3.

### ⚠️ SOLUCIÓN RÁPIDA — `currency_rates` sin pantalla propia

El esquema y el catálogo `currencies` están listos (P-04), pero no se construyó una pantalla para cargar tasas históricas: no hay todavía ningún documento (Fase 6+) que las consuma, y una pantalla maestro-detalle completa habría sido trabajo prematuro. Mientras tanto, `pnpm db:studio`.

### Deuda estructural, sin atajo

1. **`references.material_id` no existe.** El catálogo de referencias de repuesto por proveedor se adelantó a esta fase (P-05), pero `materials` no existe hasta la Fase 4. La FK se añade por migración manual en cuanto exista esa tabla.
2. **El botón "Exportar" del `DataTable` genérico sigue deshabilitado.** Infraestructura tiene su propia barra de exportar/importar (`import-export.tsx`), deliberadamente fuera del componente `DataTable` compartido por todos los módulos — extenderlo a un mecanismo de exportación verdaderamente genérico (usuarios, y cada módulo de las fases siguientes) es una decisión de diseño más amplia que no correspondía tomar solo para Infraestructura.
3. **`uoms.uom_base_id` queda sin enlazar en el seed.** Las 7 unidades sembradas no declaran su unidad base entre sí; se vinculan a mano desde la pantalla ahora que existe.
4. **Cobertura de pruebas automatizadas sin ampliar.** El motor genérico se verificó manualmente (checklist §6) y con `pnpm typecheck`; no se agregaron pruebas Vitest para `registry.ts` o `validators.ts`. Encaja mejor cuando `/lib/services` empiece a existir de verdad, en la Fase 4.

### Heredado de fases anteriores (sin tocar en esta entrega)

- La prueba `AUDITOR no tiene ningún permiso de escritura sensible` sigue fallando (preexistente de la Fase 1); ya está registrada como tarea aparte.
- `next@15.1.4` sigue con la vulnerabilidad conocida (CVE-2025-66478); también registrada aparte.

---

## 8. Siguiente paso propuesto

**Fase 3 — Activos**: CRUD, jerarquía/despiece, ficha técnica con las características dinámicas de esta fase, medidores y lecturas, documentos, QR, traslados y hoja de vida. Es el primer módulo que consume de verdad los catálogos: `locations`, `cost_centers`, `responsible_centers`, `characteristics`, `meters` y `parties` dejan de ser listas vacías.
