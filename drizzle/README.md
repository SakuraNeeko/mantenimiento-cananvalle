# Migraciones

Generadas por `drizzle-kit`. **Nunca se editan a mano** una vez aplicadas:
si necesitas un cambio, modifica el esquema en `src/db/schema/` y ejecuta
`pnpm db:generate` para producir una nueva migración incremental.

| Archivo | Contenido |
|---|---|
| `0000_fase1_nucleo.sql` | Fase 1 — 8 tipos ENUM y las 19 tablas del módulo Núcleo y Seguridad, con sus índices (incluidos los únicos parciales `WHERE deleted_at IS NULL`) y claves foráneas. |
