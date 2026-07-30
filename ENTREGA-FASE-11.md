# ENTREGA — FASE 11 · PWA MÓVIL OFFLINE

La primera fase que no agrega un módulo de negocio nuevo, sino una forma distinta de usar los que ya existen (sobre todo Órdenes): una PWA instalable para técnicos en campo, con checklist, fotos y firma que funcionan **sin conexión real**, cola de sincronización en IndexedDB y resolución de conflictos "última escritura gana" con bitácora de auditoría.

---

## 1. Árbol de archivos creados o modificados

```
gmao/
├── drizzle/
│   └── 0010_fase11_pwa_offline.sql            ← NUEVO: sync_conflicts
├── public/                                     ← NUEVO (no existía)
│   ├── manifest.webmanifest                     ← NUEVO: manifest de la PWA
│   ├── sw.js                                    ← NUEVO: service worker (app shell)
│   └── icons/icon.svg                           ← NUEVO: ícono placeholder
└── src/
    ├── db/schema/{sync,index}.ts                ← NUEVO/MODIFICADO: sync_conflicts
    ├── lib/
    │   ├── sync/conflicts.ts                       ← NUEVO: bitácora de conflictos
    │   └── movil/
    │       ├── tipos.ts                              ← NUEVO: tipos compartidos cliente↔servidor
    │       ├── db.ts                                 ← NUEVO: Dexie (IndexedDB)
    │       ├── sync-manager.ts                       ← NUEVO: cola, drenado, auto-sync
    │       ├── acciones-offline.ts                   ← NUEVO: optimista local + encola
    │       └── qr.ts                                 ← NUEVO: parseo del QR de un activo
    ├── components/layout/topbar.tsx                ← MODIFICADO: enlace "Vista móvil"
    └── app/movil/                                  ← NUEVO — toda la PWA
        ├── layout.tsx · _components/{bottom-nav,sw-register}.tsx
        ├── _lib/{sync-actions,activos-actions}.ts
        ├── mis-ordenes/{page,mis-ordenes-client}.tsx
        ├── ordenes/[id]/{page,orden-detalle-client}.tsx
        ├── activos/[id]/page.tsx
        ├── escanear/{page,escanear-client}.tsx
        ├── solicitudes/{page,nueva/{page,nueva-solicitud-movil-client}.tsx}
        ├── perfil/{page,sync-panel}.tsx
        └── offline/page.tsx
```

**33 archivos**: 30 nuevos, 3 modificados (`db/schema/index.ts`, `components/layout/topbar.tsx`, y el propio `package.json` por la dependencia nueva).

---

## 2. Por qué `/movil` es una ruta real y no un grupo de rutas

El árbol del prompt maestro anota `/(movil)`, igual que `/(app)` o `/(auth)`. Pero un grupo de rutas de Next.js **no aparece en la URL** — `/(app)/dashboard` sirve en `/dashboard`, no en `/app/dashboard`. El *scope* de un service worker y el `start_url`/`scope` de un manifest de PWA sí necesitan una URL real y estable para funcionar (`/movil/`): por eso `src/app/movil/` es una carpeta de verdad, no `(movil)`. Es la única desviación deliberada de la notación literal del prompt maestro, y es la razón técnica de fondo, no un descuido.

## 3. Arquitectura offline: Dexie como modelo de lectura, cola como modelo de escritura

- **`lib/movil/db.ts`** — una sola base IndexedDB (`gmao-movil`) con tres tablas: `ordenes` (espejo de las OT asignadas, con su checklist completo), `cola` (operaciones de texto pendientes de reproducir) y `colaFotos` (Blobs de evidencia, que no viajan por la cola de texto).
- **Cada pantalla lee siempre de Dexie, nunca directo de la prop del servidor** (`liveQuery` de Dexie, sin depender del paquete `dexie-react-hooks`): así una OT que se cambió hace un segundo offline se ve reflejada de inmediato, sin esperar a sincronizar.
- **`lib/movil/acciones-offline.ts`** — cada acción del técnico (completar tarea, firmar, cambiar de estado, comentar, subir foto) hace dos cosas siempre en el mismo orden: (1) aplica el cambio de inmediato sobre la copia local — responde al toque sin spinner — y (2) encola la misma operación en `sync-manager.ts`.
- **`sync-manager.ts`** — drena la cola en orden de creación llamando a `procesarOperacionCola()` (Server Action), reintenta al recuperar el evento `online` y cada 60 s mientras haya señal, y expone `usePendientesSync()` para el contador de la navegación inferior.
- **La reproducción reutiliza las Server Actions del escritorio tal cual** (`completarTarea`, `firmarComoEjecutor`, `agregarComentarioOrden`, `iniciarEjecucion`/`marcarPendiente`/`reanudarEjecucion`/`marcarEjecutada`) — cero lógica de negocio duplicada. `src/app/movil/_lib/sync-actions.ts` es solo el despachador + la detección de conflicto.

### Resolución de conflictos: "última escritura gana", con bitácora

El prompt maestro pide exactamente esa estrategia. La escritura offline **siempre se aplica** — nunca se descarta ni se bloquea —, pero si el valor ya había cambiado en el servidor mientras el técnico no tenía señal, queda registrado en `sync_conflicts` (nueva tabla, Fase 11) para que se pueda revisar qué se sobrescribió:

- **Tareas del checklist**: conflicto si la tarea ya estaba completada con un resultado distinto al que se está por aplicar.
- **Firma**: conflicto si ya la había firmado otro usuario.
- **Comentarios**: nunca conflictúan — solo se agregan.
- **Transiciones de estado** (iniciar/pendiente/reanudar/ejecutada): a diferencia de las anteriores, **no se fuerzan** — cada Server Action ya valida su propia precondición (p. ej. "solo se puede iniciar una orden ASIGNADA"); si alguien cambió el estado desde el escritorio mientras el técnico estaba offline, aplicar la transición offline rompería la máquina de estados. Se registra como conflicto y el técnico lo ve en Perfil, en vez de aplicarse a la fuerza.

## 4. Pantallas (`Mis OT · Escanear · Solicitudes · Perfil`)

- **Mis OT** — las OT asignadas al técnico (`responsablePrincipalUserId = sesión`) en estado ASIGNADA/EN_EJECUCION/PENDIENTE/EJECUTADA, con el avance del checklist.
- **Detalle de OT** — checklist ejecutable (cada tipo de respuesta con su control: OK/No OK, numérico, texto, foto con `capture="environment"`, firma simplificada a un botón de confirmación), transiciones de estado y un comentario de una sola vía (sin hilo de comentarios, ver deuda técnica).
- **Escanear** — usa la `BarcodeDetector` API nativa cuando existe; si no (Safari/iOS, sobre todo), cae a una búsqueda manual por código. El QR es el mismo que genera `qr-button.tsx` desde la Fase 3 (enlaza a `/activos/<id>`) — se reutiliza el mismo formato, no se inventa uno nuevo.
- **Solicitudes** — reutiliza el mismo `SolicitudForm` que ya usa el portal del solicitante; "Reportar novedad" desde la ficha de un activo escaneado precarga el `assetId`.
- **Perfil** — datos de sesión, cerrar sesión, y el panel de sincronización: pendientes, botón "Sincronizar ahora", y los conflictos resueltos a favor de la última escritura.

## 5. PWA: manifest + service worker

- `public/manifest.webmanifest` — instalable, `start_url: /movil/mis-ordenes`, `scope: /movil/`.
- `public/sw.js` — alcance deliberadamente angosto: solo hace posible que la app **abra** sin conexión (cachea el app shell y sirve `/movil/offline` como respaldo). Los **datos** offline no viven en la caché del service worker, viven en IndexedDB — son cosas distintas y no hay que confundirlas.
- El ícono (`public/icons/icon.svg`) es un placeholder SVG — ver deuda técnica.

---

## 6. Migración a ejecutar

`drizzle/0010_fase11_pwa_offline.sql` — 1 tabla nueva (`sync_conflicts`).

```bash
pnpm db:migrate
```

## 7. Variables de entorno

Ninguna nueva.

## 8. Comandos exactos

```bash
pnpm add dexie
pnpm db:migrate
pnpm typecheck && pnpm test
pnpm build
pnpm dev
```

---

## 9. Checklist de pruebas manuales

- [ ] Con un usuario con rol `TECNICO` (o cualquiera con `ordenes.tareas.registrar`), entra por el menú del avatar → "Vista móvil (técnicos)", o directo a `/movil/mis-ordenes`.
- [ ] Confirma que aparecen las OT asignadas a ese usuario con checklist pendiente.
- [ ] Abre una OT, complétala parcialmente (marca una tarea OK, toma una foto en otra).
- [ ] **Activa el modo avión** (o corta el WiFi) y confirma que sigues pudiendo: abrir "Mis OT" (datos ya cacheados), abrir el detalle, completar más tareas, firmar, cambiar de estado.
- [ ] Reactiva la conexión y confirma que el badge de "Perfil" baja a 0 pendientes solo (auto-sync) o al tocar "Sincronizar ahora".
- [ ] Desde el escritorio, cambia el estado de esa misma OT (o marca la misma tarea) MIENTRAS el técnico tiene cambios sin sincronizar — confirma que al sincronizar aparece un conflicto en Perfil.
- [ ] Prueba "Escanear": si tu navegador soporta `BarcodeDetector` (Chrome/Edge en Android o desktop), escanea el QR de un activo (Ficha del activo → "Código QR" → imprime o muéstralo en otra pantalla) y confirma que abre su ficha móvil. Si no, usa la búsqueda manual por código.
- [ ] Desde la ficha móvil de un activo, "Reportar novedad" y confirma que llega precargado el activo en el formulario de nueva solicitud.
- [ ] En un navegador Chromium, confirma que aparece el ícono de "Instalar app" en la barra de direcciones al visitar `/movil/mis-ordenes`.

---

## 10. Notas de deuda técnica

### Ícono de la PWA: SVG placeholder, no un set de PNG

Sin un asset de marca real en el repo, el ícono es un SVG generado ("GM" sobre azul). Es válido para el manifest y para el prompt de instalación en Chrome/Edge, pero iOS Safari típicamente quiere un PNG de `apple-touch-icon` para el ícono de pantalla de inicio — antes de repartir esto a técnicos con iPhone, hay que generar un set de PNG reales (192×192, 512×512, y un `apple-touch-icon.png` de 180×180) a partir del logo definitivo de Cananvalle.

### Comentarios de la OT: de una sola vía en móvil

El detalle móvil deja **enviar** un comentario pero no muestra el hilo de comentarios existentes — mostrar el historial completo offline habría exigido cachear también `wo_comments` y sumarlo al modelo de Dexie, para un dato que rara vez necesita revisarse en campo. El técnico puede seguir viendo el hilo completo desde el escritorio.

### Firma de tareas tipo `FIRMA`: mismo botón que OK/No OK

El enum `wo_task_tipo_respuesta` incluye `FIRMA` desde la Fase 6, pero nunca tuvo una UI (ni de escritorio ni ahora). Se trató igual que `OK_NO_OK` (un botón de confirmación) en vez de construir un pad de firma dibujada — la firma "de peso" de la orden (`firmarComoEjecutor`, a nivel de OT completa) ya cubre el requisito central del prompt maestro; una tarea individual de tipo firma es un caso de uso más raro.

### Conflictos: bitácora, no fusión de tres vías

`sync_conflicts` registra qué se sobrescribió, pero no intenta combinar los dos valores — es "última escritura gana" tal como pide el prompt maestro, documentado como simplificación consciente: con el volumen esperado (normalmente una sola persona trabaja un mismo checklist) una fusión de tres vías sería sobre-ingeniería.

### Herencia de fases anteriores (sin tocar en esta entrega)

- La prueba `AUDITOR no tiene ningún permiso de escritura sensible` sigue fallando (preexistente de la Fase 1).
- `next lint` / `eslint.config.mjs` quedaron rotos por la actualización a Next 16 + ESLint 9 (`next()` del compat helper deja de ser iterable) — descubierto en esta fase al intentar correr lint sobre el código nuevo; typecheck, build y tests sí corren limpios. Pendiente de arreglo aparte, no bloquea esta entrega.

---

## 11. Siguiente paso propuesto

**Fase 12 — Automatizador, API e integraciones**: reglas tipo "si pasa X, entonces Y" (inspirado en Fracttal), API pública REST versionada con API keys por tenant, y los primeros webhooks salientes. Es la última fase que agrega superficie de producto nueva antes del endurecimiento final (Fase 13).
