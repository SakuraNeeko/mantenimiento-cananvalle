# ENTREGA — FASE 1.b · CIERRE DE DEUDA TÉCNICA

Cierra las tres notas `⚠️ SOLUCIÓN RÁPIDA` de `ENTREGA-FASE-1.md` §6 y el CRUD de usuarios que quedó pendiente. No se tocó ningún módulo de fases futuras.

---

## 1. Árbol de archivos creados o modificados

```
gmao/
├── src/
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── config.ts          ← MODIFICADO: callback jwt compara tokenVersion contra la BD
│   │   │   ├── password.ts        ← MODIFICADO: re-exporta la política desde password-policy.ts
│   │   │   └── password-policy.ts ← NUEVO: política de contraseñas, JS puro (apto para cliente)
│   │   └── validators/
│   │       └── usuario.ts         ← NUEVO: esquemas Zod compartidos (cliente + servidor)
│   ├── components/ui/
│   │   └── dialog.tsx              ← NUEVO: primitivo Dialog (Radix), no existía en Fase 1
│   └── app/
│       ├── api/usuarios/[id]/invalidar-sesiones/
│       │   └── route.ts            ← NUEVO: POST, cierra sesión en todos los dispositivos
│       └── (app)/administracion/usuarios/
│           ├── actions.ts          ← NUEVO: Server Actions (crear, editar, activar, eliminar…)
│           ├── usuario-form.tsx    ← NUEVO: formulario reutilizable (Dialog + react-hook-form + Zod)
│           ├── usuarios-table.tsx  ← MODIFICADO: conecta el formulario y añade menú de acciones por fila
│           └── page.tsx            ← MODIFICADO: carga roles y sedes para pasarlos al formulario
```

**9 archivos**: 6 nuevos, 3 modificados.

---

## 2. Qué cierra cada cambio

### D-07 — Invalidación de `tokenVersion` (antes ⚠️ SOLUCIÓN RÁPIDA)

`src/lib/auth/config.ts`: el callback `jwt` ahora, en cada request que **no** sea el login mismo, compara `token.tokenVersion` contra `users.token_version` con una lectura HTTP (`db`, no `dbTx` — sigue siendo edge-safe, el driver de neon-http usa `fetch`). Si difieren, o el usuario ya no está activo, la sesión se invalida devolviendo `null`.

Se añadió el endpoint documentado en la Fase 1: `POST /api/usuarios/[id]/invalidar-sesiones`, que incrementa `token_version` y escribe auditoría CRÍTICA. Tres acciones lo disparan ahora:
- El botón "Cerrar sesiones" del menú de cada usuario.
- Cambiar la contraseña de alguien desde el formulario de edición.
- Desactivar una cuenta.

De regalo, se corrigió un bug de tipos preexistente en `config.ts`: el callback `session` tipaba `token` como `unknown` porque TypeScript infiere las propiedades de un parámetro desestructurado contra un tipo unión (la firma real de NextAuth cubre tanto estrategia JWT como database) como `unknown` cuando la propiedad no está en todas las ramas de la unión. `pnpm typecheck` nunca se había corrido limpio sobre el entregable de Fase 1; ahora sí.

### Formulario reutilizable de alta/edición

No existía `Dialog` como primitivo (`@radix-ui/react-dialog` estaba en `package.json` pero sin envoltorio). Se creó `src/components/ui/dialog.tsx` siguiendo el mismo patrón que `select.tsx` y `dropdown-menu.tsx`.

`usuario-form.tsx` es un único componente para crear y editar: react-hook-form + `zodResolver`, con los mismos campos para ambos modos (nombre, correo, cargo, teléfono, sede por defecto, roles, sedes con acceso, contraseña). En edición, la contraseña es opcional — dejarla vacía no la cambia; si se llena, invalida las sesiones abiertas (D-07).

La política de contraseñas (`checkPasswordPolicy`) se separó de `password.ts` a un módulo nuevo, `password-policy.ts`, porque `password.ts` importa `@node-rs/argon2` (binario nativo) y el formulario cliente necesita la misma regla para validar en el navegador. Importarla desde un componente `'use client'` habría arrastrado el binario al bundle del navegador.

### CRUD de usuarios

`actions.ts` — seis Server Actions, todas empiezan con `requirePermission('admin.usuarios.gestionar')`:

| Acción | Qué hace |
|---|---|
| `crearUsuario` | Inserta usuario + roles + sedes de acceso en una transacción (`dbTx`) |
| `actualizarUsuario` | Igual, más reconciliación exacta de roles/sedes (borra y reinserta, como el seed) |
| `cambiarEstadoUsuario` | Activa/desactiva; al desactivar, invalida sesiones |
| `eliminarUsuario` | Borrado lógico (`deleted_at`), invalida sesiones |
| `obtenerUsuarioParaEditar` | Alimenta el formulario al abrir en modo edición |

Todas devuelven `{ ok: true } | { ok: false, error }` en vez de lanzar, salvo los errores de permisos (`ForbiddenError`/`UnauthorizedError`), que sí se propagan — la UI ya oculta las acciones sin permiso, así que llegar ahí es indicio de manipulación, no un caso de uso normal.

Un usuario no puede desactivarse ni eliminarse a sí mismo (evita bloqueos accidentales).

`usuarios-table.tsx` añade una columna de acciones (`id: '__acciones'`, ya excluida de los filtros por el toolbar original, que la anticipaba) con: Editar, Activar/Desactivar, Cerrar sesiones, Eliminar. Las dos últimas piden confirmación con `window.confirm` — no se construyó un `ConfirmDialog` genérico para una sola pantalla; si un segundo módulo lo necesita, ahí sí se justifica extraerlo.

---

## 3. Migraciones y variables de entorno

Ninguna. Todo el esquema necesario (`token_version`, `user_roles`, `user_site_access`) ya existía desde `0000_fase1_nucleo.sql`.

---

## 4. Comandos exactos

```bash
cd gmao
pnpm install
pnpm typecheck   # limpio
pnpm test        # 10/11 — ver nota abajo
pnpm dev
```

---

## 5. Checklist de pruebas manuales

### Invalidación de sesión

- [ ] Inicia sesión en dos pestañas con el mismo usuario. Desde una, edítate la contraseña de otro usuario de prueba (no la tuya). En la pestaña de ese usuario de prueba, recarga: debe volver a `/login`.
- [ ] Con el admin, abre el menú de un usuario de prueba → "Cerrar sesiones". Con ese usuario logueado en otra pestaña, recarga: debe caer a `/login`.
- [ ] Desactiva un usuario de prueba mientras tiene sesión abierta en otra pestaña: al recargar, cae a `/login` (antes había que esperar 12 h).

### CRUD

- [ ] "Nuevo usuario": crea uno con un rol `TECNICO` y una sede. Verifica que aparece en el listado con su badge de rol.
- [ ] Contraseña débil (ej. `abc123`): el formulario la rechaza antes de enviar, con los motivos concretos.
- [ ] Correo duplicado: el servidor responde "Ya existe un usuario con ese correo" sin reventar.
- [ ] Edita ese usuario, cambia su sede por defecto a una que **no** esté en "Sedes con acceso": el formulario lo bloquea antes de enviar.
- [ ] Edítalo de nuevo dejando la contraseña vacía: no cambia; confírmalo intentando iniciar sesión con la anterior.
- [ ] Desactívalo: desaparece de la vista por defecto si filtras por "Estado = Activo"; ya no puede iniciar sesión.
- [ ] Elimínalo: ya no aparece en el listado. Repite `pnpm db:seed`: no revive (el seed no toca usuarios existentes fuera del admin).
- [ ] Intenta desactivarte o eliminarte a ti mismo: el sistema lo rechaza con un mensaje claro.
- [ ] `/administracion/auditoria`: cada alta, edición, cambio de estado, invalidación de sesión y borrado aparece con nivel CRÍTICO.

---

## 6. Notas de deuda técnica

### Confirmaciones con `window.confirm`

Desactivar, cerrar sesiones y eliminar usan el diálogo nativo del navegador en vez de un componente de confirmación propio. Es intencional: el sistema de diseño no tenía ninguno todavía y construir uno para una sola pantalla habría sido una abstracción prematura. Si Fase 2 o 3 necesitan confirmar otra acción destructiva (eliminar un catálogo, un activo), ahí se justifica extraer `ConfirmDialog` de `components/ui/`.

### ⚠️ Hallazgo fuera de alcance — prueba de AUDITOR vs permisos sensibles

`pnpm test` deja `tests/permissions.test.ts` en 10/11: el caso "AUDITOR no tiene ningún permiso de escritura sensible" falla porque el catálogo marca `infra.tarifas.ver`, `activos.costos.ver`, `almacen.costos.ver`, `ordenes.costos.ver` y `reportes.costos.ver` como `sensible: true` aunque son de solo lectura, y AUDITOR sí los tiene. Es preexistente de la Fase 1, no algo que haya tocado esta entrega — no lo corregí porque implica una decisión de producto (si "sensible" debe cubrir *confidencialidad de lectura* además de *escritura crítica*) que no me correspondía tomar unilateralmente. Quedó registrada como tarea aparte.

### ⚠️ Hallazgo fuera de alcance — CVE-2025-66478 en Next.js

`pnpm install` advierte que `next@15.1.4` (versión fijada sin caret) tiene una vulnerabilidad conocida. Actualizar implica validar compatibilidad con `next-auth@5.0.0-beta.25` y no era parte de esta entrega; quedó registrada como tarea aparte.

### Lint no verificable en este entorno

`pnpm lint` (`next lint`) falla con *"Failed to patch ESLint because the calling module was not recognized"* — una incompatibilidad conocida entre `@rushstack/eslint-patch` (del que depende `eslint-config-next@15.1.4`) y la estructura de `node_modules` de pnpm en Windows. Se intentó fijar `eslint` a la versión exacta declarada (`9.17.0`) sin éxito: el problema es de resolución de módulos, no de versión. `pnpm typecheck` sí corre limpio y es, en la práctica, la señal de tipos más fuerte que da esta base de código (`strict: true`, sin `any`).

---

## 7. Siguiente paso

**Fase 2 — Infraestructura**: los 34 catálogos con la pantalla genérica por metadatos, árboles de ubicaciones y centros de costo, y el importador Excel (adelantado a esta fase por la respuesta P-05).
