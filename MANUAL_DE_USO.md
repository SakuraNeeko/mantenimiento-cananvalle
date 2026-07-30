# MANUAL DE USO — Sistema GMAO Cananvalle Flowers

Guía completa del sistema de Gestión de Mantenimiento Asistido por Ordenador (GMAO) de Cananvalle Flowers: qué hace cada módulo, cómo se usa paso a paso, qué significa cada campo, cómo se relacionan los módulos entre sí, y qué hacer cuando algo no sale como se esperaba.

Este manual describe el sistema tal como quedó construido al cierre de la **Fase 12** (de 13 fases planificadas — ver `README.md` para el estado exacto de cada una). Si tu versión del sistema es más nueva, algunas pantallas pueden tener más funciones de las descritas aquí.

---

## Índice

1. [Primeros pasos](#1-primeros-pasos)
2. [Roles, permisos y alcance](#2-roles-permisos-y-alcance)
3. [Infraestructura — los catálogos base](#3-infraestructura--los-catálogos-base)
4. [Activos](#4-activos)
5. [Almacén — materiales, kárdex e inventario](#5-almacén--materiales-kárdex-e-inventario)
6. [Solicitudes de servicio](#6-solicitudes-de-servicio)
7. [Órdenes de trabajo](#7-órdenes-de-trabajo)
8. [Planes de mantenimiento](#8-planes-de-mantenimiento)
9. [Paros y averías](#9-paros-y-averías)
10. [Historia y KPIs](#10-historia-y-kpis)
11. [Combustibles y Tecnovigilancia](#11-combustibles-y-tecnovigilancia-módulos-opcionales)
12. [Automatizador](#12-automatizador)
13. [API pública e integraciones](#13-api-pública-e-integraciones)
14. [PWA móvil para técnicos](#14-pwa-móvil-para-técnicos)
15. [Administración](#15-administración)
16. [Casos completos de punta a punta](#16-casos-completos-de-punta-a-punta)
17. [Solución de problemas frecuentes](#17-solución-de-problemas-frecuentes)
18. [Glosario](#18-glosario)

---

## 1. Primeros pasos

### 1.1 Iniciar sesión

Entra a la URL de la aplicación (en producción, algo como `https://mantenimiento-cananvalle.vercel.app`) y usa tu correo y contraseña. Si te equivocas 5 veces en 15 minutos, el sistema bloquea temporalmente ese intento — es una protección contra adivinar contraseñas, no un error del sistema; espera unos minutos y vuelve a intentar.

Si olvidaste tu contraseña, pide a un administrador que te la restablezca desde `Administración → Usuarios` (no hay autoservicio de "olvidé mi contraseña" en esta versión).

### 1.2 La pantalla principal

- **Barra lateral (sidebar)**, a la izquierda: todos los módulos a los que tienes acceso, agrupados por tema (Operación, Recursos, Análisis, Complementarios, Sistema). Solo ves los módulos para los que tienes permiso — si no ves algo que crees que deberías ver, pide a un administrador que revise tu rol.
- **Barra superior (topbar)**: selector de sede (si tienes acceso a más de una), buscador global (⌘K — aún en construcción en esta versión), campana de notificaciones, y tu menú de usuario (arriba a la derecha) con acceso a tu perfil, el **Portal de solicitudes**, la **Vista móvil** (si trabajas en campo) y cerrar sesión.
- **Alternador de tema**: el ícono de sol/luna en la topbar cambia entre modo claro y oscuro.

### 1.3 Patrones que vas a ver en todas las pantallas

- **Tablas con filtros y orden**: casi todos los listados (Órdenes, Activos, Materiales…) tienen una barra de búsqueda, un botón "Filtros" (para filtrar por columna con operadores), y las columnas se pueden ordenar haciendo clic en el encabezado. El botón de columnas te deja elegir qué columnas ver.
- **Estados vacíos explicados**: si un listado está vacío, el sistema te dice qué es ese módulo y qué hacer — nunca una pantalla en blanco sin explicación.
- **Errores en español, con código de referencia**: si algo falla, ves un mensaje humano y un número de referencia (útil si necesitas pedir ayuda técnica), nunca un mensaje críptico en inglés con el código fuente expuesto.
- **Borrado lógico**: "Eliminar" casi nunca borra de verdad — desactiva el registro (`deleted_at`), que deja de aparecer en los listados pero sigue existiendo por si se necesita para auditoría o para deshacer un error. Los administradores con el permiso adecuado pueden ver/recuperar estos registros por soporte técnico si hace falta.

---

## 2. Roles, permisos y alcance

### 2.1 Los 8 roles

| Rol | Para quién es | Puede, en resumen |
|---|---|---|
| **ADMIN** | Administrador del sistema | Todo — los 97 permisos del sistema. |
| **GERENTE** | Jefatura de mantenimiento | Ve costos, aprueba, cierra OT, ve reportes completos. No gestiona usuarios/roles. |
| **PLANIF** | Planificador de mantenimiento | Crea y planifica OT, gestiona planes de mantenimiento, ve costos. |
| **SUPERV** | Supervisor de campo | Asigna y ejecuta OT, gestiona activos y medidores, firma como ejecutor y aprobador. |
| **TECNICO** | Técnico de campo | Ejecuta OT, registra el checklist, su propia mano de obra, firma como ejecutor. Es quien más usa la [PWA móvil](#14-pwa-móvil-para-técnicos). |
| **ALMACEN** | Bodeguero | Gestiona materiales, kárdex, lotes e inventario físico. |
| **SOLIC** (Solicitante) | Cualquier empleado que necesita reportar una falla | Solo el [Portal de solicitudes](#6-solicitudes-de-servicio) — nada más del sistema. |
| **AUDITOR** | Auditoría/cumplimiento | Solo lectura: ve todo (activos, costos, órdenes, historia) pero no puede crear ni editar nada. |

Un usuario puede tener **más de un rol** (por ejemplo, un supervisor que también hace de planificador). Los permisos se acumulan: si cualquiera de sus roles le da un permiso, lo tiene.

### 2.2 Alcance: qué registros ve cada quien

Además de "qué puede hacer" (el rol), cada asignación rol↔usuario tiene un **alcance**:

- **PROPIO** — solo ve/gestiona lo que le pertenece a él (sus propias OT asignadas, sus propias solicitudes).
- **SEDE** — ve/gestiona lo de las sedes a las que tiene acceso (`Administración → Usuarios`, sección de sedes accesibles).
- **TENANT** — ve/gestiona todo, de todas las sedes.

Ejemplo concreto: dos técnicos con el rol TECNICO y alcance PROPIO, cada uno ve **solo** las OT donde él es el responsable principal — no ven las OT del otro compañero, aunque ambos tengan exactamente el mismo rol.

### 2.3 Cómo asignar roles

`Administración → Usuarios` → abre un usuario → pestaña de roles → agrega el rol y elige su alcance (PROPIO/SEDE/TENANT) y, si es SEDE, a qué sede(s) concreta(s) queda limitado.

**Permisos "sensibles"** (marcados así en el catálogo — cerrar una OT, eliminar un activo, ver costos, cambiar roles…) quedan registrados en la Auditoría cada vez que se usan, con más detalle que un cambio normal.

---

## 3. Infraestructura — los catálogos base

`Infraestructura` es la pantalla genérica donde se administran **25 catálogos** de apoyo — las "listas desplegables" que usa el resto del sistema. Ningún catálogo se carga solo por SQL: todos son creables/editables desde aquí (crear, editar, activar/desactivar, eliminar, e importar/exportar por Excel).

### 3.1 Catálogos disponibles

| Catálogo | Para qué sirve | Ejemplo |
|---|---|---|
| Tipos de trabajo | Clasifica las OT | Mecánico, Eléctrico, Hidráulico |
| Tipos de mantenimiento | Preventivo/correctivo/etc. | PREV, CORR |
| Tipos de actividad | Clasifica tareas dentro de una OT | — |
| Otros conceptos de costo | Costos de una OT que no son mano de obra ni materiales | Alquiler de grúa |
| Causas de OT pendiente | Por qué una OT queda pendiente | Esperando repuesto en bodega |
| Causas de cierre de OT | Motivo con el que se cierra | Reparación completada satisfactoriamente |
| Acciones técnicas | Qué se hizo al ejecutar la OT | Reemplazo de repuesto, Ajuste y calibración |
| Causas de falla | Por qué ocurrió la falla | Desgaste normal por uso |
| Efectos de falla | Qué provocó la falla | Fuga de fluido, Rendimiento reducido |
| Operaciones | Procesos productivos a los que sirve un activo | — |
| Regímenes tributarios | Clasificación tributaria de terceros | — |
| Estados adicionales | Estados genéricos para uso futuro | — |
| Combustibles | Tipos de combustible (Fase 10) | Diésel, Extra |
| Tipos de residuo | Clasificación de residuos | — |
| Riesgos | Matriz probabilidad × impacto (1-5) | Falla de bomba en temporada alta |
| Magnitudes | Variables medibles | Temperatura, Vibración |
| Características biomédicas | Riesgo/clase/registro sanitario (Tecnovigilancia) | — |
| Referencias de repuesto | Referencia de un material por proveedor | — |
| **Centros de costo** (jerárquico) | Estructura contable, con padre/hijo | Producción → Poscosecha |
| **Centros responsables** (jerárquico) | Estructura de responsabilidad operativa | — |
| **Ubicaciones** (jerárquico) | Árbol de ubicaciones físicas | Finca 1 → Cuarto de bombas |
| Oficios y cargos técnicos | Costo hora normal/extra/nocturna | Mecánico, Electricista |
| Terceros | Proveedores, contratistas, fabricantes, clientes | Repuestos Agrícolas del Valle |
| **Responsables** | Personas que ejecutan trabajos (vinculadas o no a un usuario del sistema) | Carlos Núñez |
| Contratos | Vigencia, monto, alcance, alerta de vencimiento | — |
| Almacenes | Uno o más por sede | Bodega Finca 1 |
| Unidades de medida | Con factor de conversión | UN, GAL, KG |
| Monedas | El historial de tasas se administra aparte | USD, EUR |
| Contadores | Horómetro, odómetro, ciclos… | HORO, ODO |
| Características | Plantillas de atributos dinámicos por clase de activo | Voltaje, Placa |
| Conceptos de kárdex | Define cada tipo de movimiento y su signo | Entrada por compra (+) |

### 3.2 Cómo crear/editar un registro

1. Entra a `Infraestructura`, elige el catálogo de la lista.
2. Botón **"Nuevo"** (arriba a la derecha) → llena el formulario (los campos varían según el catálogo — código y nombre son casi siempre obligatorios) → **Guardar**.
3. Para editar: menú de tres puntos en la fila → **Editar**.
4. Para desactivar sin borrar: menú → **Desactivar** (deja de aparecer como opción en otros formularios, pero no rompe nada de lo que ya lo usa).
5. Para eliminar de verdad: menú → **Eliminar** (borrado lógico — ver §1.3).

### 3.3 Catálogos jerárquicos

Centros de costo, Centros responsables y Ubicaciones se muestran como **árbol**, no como tabla: cada fila puede tener hijos (botón "+" al pasar el mouse), se puede expandir/contraer, y un registro no puede ser su propio padre (el sistema lo evita solo).

### 3.4 Importar y exportar

El botón de descarga exporta el catálogo actual (con los filtros aplicados) a Excel. El botón de subida importa un Excel con las mismas columnas que exporta: **el código existente actualiza, el código nuevo crea** — una fila con error no detiene las demás, al final ves un resumen de cuántas filas se guardaron bien y cuáles fallaron y por qué.

---

## 4. Activos

### 4.1 Qué es un activo

Un activo es cualquier equipo, vehículo, herramienta o infraestructura que se mantiene: una bomba, una caldera, un tractor, un cuarto frío, un desfibrilador. Cada uno tiene una **clase** (EQUIPO, VEHICULO, HERRAMIENTA, INFRAESTRUCTURA, BIOMEDICO…), una **criticidad** (A = alta/rojo, B = media/ámbar, C = baja/verde — el mismo código de color se usa en todo el sistema) y pertenece a una ubicación, un centro de costo y un centro responsable.

### 4.2 Ficha del activo — las pestañas

Al abrir un activo (`Activos → [uno de la lista]`) ves varias pestañas:

- **General**: código, nombre, clase, criticidad, fabricante, modelo, año, ubicación, centro de costo, estado (operativo / en mantenimiento / fuera de servicio / dado de baja), y el contrato asociado si lo tiene.
- **Características**: atributos dinámicos según la clase del activo (definidos en Infraestructura → Características) — por ejemplo, un motor tendrá Voltaje/Potencia, un vehículo tendrá Placa/Cilindraje.
- **Medidores**: horómetro, odómetro u otros contadores asignados a este activo, con su valor actual y el historial de lecturas. Estos medidores alimentan los disparadores por contador de los Planes de mantenimiento (§8) y, desde la Fase 12, pueden tener un **rango normal** (mínimo/máximo) para el disparador de Automatizador "medidor fuera de rango".
- **Documentos**: manuales técnicos, fichas, fotos — se suben como archivo (PDF, Word, Excel o imagen, máx. 15 MB) y quedan enlazados al activo.
- **Traslados**: historial de cambios de ubicación/centro de costo (útil cuando un equipo se mueve entre fincas).
- **Historial de estado**: cuándo pasó de operativo a en mantenimiento y viceversa, con el motivo.
- **Código QR**: botón para generar/imprimir/descargar un QR que enlaza directo a la ficha del activo — pégalo físicamente en el equipo. Se escanea desde la [PWA móvil](#14-pwa-móvil-para-técnicos).
- **Despiece**: los repuestos habituales de este activo (del catálogo de Materiales), para saber qué pedir sin tener que consultarlo cada vez.

### 4.3 Relación con otros módulos

Un activo se relaciona con: **Órdenes de trabajo** (cada OT casi siempre tiene un activo), **Paros** (un paro ocurre sobre un activo), **Planes de mantenimiento** (un plan puede ser para un activo único o para un grupo por clase/criticidad/ubicación), **Historia** (la "hoja de vida" es el historial completo de OT cerradas de ese activo), **Combustibles** (si el activo consume combustible) y **Tecnovigilancia** (si es de clase BIOMEDICO).

---

## 5. Almacén — materiales, kárdex e inventario

### 5.1 Materiales

El catálogo de materiales (repuestos, insumos, EPP) vive en `Almacén → Materiales`, con su unidad de medida, categoría, si es crítico, si maneja lote (para control de vencimiento) y si está activo. Desde la ficha de un material puedes ver sus **referencias de proveedor** (a qué precio y con qué código lo vende cada proveedor, y su tiempo de entrega).

### 5.2 Kárdex — el corazón del control de existencias

Cada entrada o salida de material es un **movimiento de kárdex**, con un **concepto** (Infraestructura → Conceptos de kárdex) que define si suma o resta existencia (ENTRADA/SALIDA) y si exige una OT o un tercero. El costo se calcula con **costo promedio ponderado**: cada entrada recalcula el costo promedio de ese material en ese almacén; cada salida se valoriza a ese promedio vigente.

Reglas que el sistema aplica solas:
- No se puede sacar más de lo que hay, salvo que el almacén tenga "permite existencias negativas" activado.
- Un movimiento se puede dejar en borrador y **confirmarlo** después — solo al confirmar impacta de verdad las existencias y el costo promedio.
- Si la existencia cae bajo el mínimo configurado, queda disponible para el Automatizador (§12) como disparador.

### 5.3 Inventario físico

`Almacén → Inventario físico` registra un conteo real contra lo que dice el sistema, línea por línea (cantidad de sistema vs. cantidad contada), y lo deja **confirmado** — las diferencias quedan documentadas (no se ajustan solas: eso es una decisión operativa de cada empresa).

### 5.4 Lotes

Los materiales que "maneja lote" (por ejemplo, un lubricante con fecha de vencimiento) llevan su existencia repartida en lotes con fecha de vencimiento, para poder alertar antes de que un lote caduque.

---

## 6. Solicitudes de servicio

### 6.1 Qué es y quién la usa

Cualquier empleado puede reportar una falla o pedir un trabajo, sin necesitar acceso al resto del sistema — eso es el **Portal de solicitudes** (`/mis-solicitudes`, `/nueva-solicitud`), pensado para el rol SOLIC pero accesible a cualquiera desde el menú de usuario.

### 6.2 Ciclo de vida

`BORRADOR → ENVIADA → EN_REVISION → APROBADA (o RECHAZADA) → ASIGNADA → EN_ATENCION → RESUELTA → CERRADA` — o, si se resuelve sin necesitar una OT formal, **ATENCIÓN DIRECTA** (con calificación del solicitante). Una solicitud aprobada también se puede **convertir en Orden de trabajo** (arrastra activo, descripción, prioridad y solicitante, y mantiene el vínculo en ambos sentidos: desde la OT se ve de qué solicitud vino, y desde la solicitud se ve en qué OT terminó).

### 6.3 Ejemplo

> Un operario de Finca 1 nota que la caldera del Invernadero 1 no enciende. Entra a `Nueva solicitud`, elige el activo "Caldera de invernadero", prioridad URGENTE, describe el problema, y la envía. Un supervisor la revisa, la aprueba, y la convierte en una Orden de trabajo — desde ahí sigue el ciclo normal de OT (§7). El operario ve el avance desde `Mis solicitudes` y, al cerrarse, puede calificar la atención recibida.

---

## 7. Órdenes de trabajo

Es el módulo más grande y central del sistema — casi todo lo demás termina aquí o sale de aquí.

### 7.1 Ciclo de vida (kanban)

```
BORRADOR → PLANIFICADA → ASIGNADA → EN_EJECUCION → PENDIENTE ⇄ EN_EJECUCION → EJECUTADA → LIQUIDADA → CERRADA → EN_HISTORIA
```
(o **CANCELADA** en cualquier punto, con motivo).

- **BORRADOR**: sin consecutivo todavía — se puede editar/eliminar libremente.
- **PLANIFICADA**: ya tiene consecutivo (`OT-2026-000123`), fecha programada y almacén asignado.
- **ASIGNADA**: tiene un responsable principal.
- **EN_EJECUCION**: el técnico ya empezó — aquí se completa el checklist, se registra mano de obra y se solicitan materiales.
- **PENDIENTE**: se detuvo por una causa concreta (ej. esperando un repuesto) — se reanuda cuando se resuelve.
- **EJECUTADA**: el checklist crítico está completo (el sistema no deja marcarla ejecutada si falta una tarea crítica) y el ejecutor firmó.
- **LIQUIDADA**: se consolidaron los costos (mano de obra + materiales + terceros + otros) y se confirmaron las salidas de kárdex pendientes.
- **CERRADA**: exige causa de cierre y la firma del ejecutor.
- **EN_HISTORIA**: se envió a la "hoja de vida" inmutable del activo (§10).

### 7.2 Las pestañas de una OT

General (descripción, activo, prioridad, criticidad, fechas) · **Tareas** (el checklist: cada tarea puede ser OK/No OK, un valor numérico, texto libre, una foto, o una confirmación tipo firma) · **Mano de obra** (horas propias y de terceros, valorizadas por el costo hora del oficio) · **Materiales** (se solicitan, se entregan, y al liquidar generan el movimiento de kárdex real) · **Costos** (el desglose consolidado) · **Historial** (cada cambio de estado, con quién y cuándo).

### 7.3 Orígenes de una OT

Una OT puede originarse de 5 formas, visibles en el campo "Origen": **MANUAL** (alguien la creó directo), **PLAN** (generada automáticamente desde un Plan de mantenimiento, §8), **SS** (convertida desde una Solicitud de servicio, §6), **PARO** (creada desde un Paro no programado, §9), o **AUTOMATIZACION** (creada por una regla del Automatizador, §12).

### 7.4 Ejemplo completo

> "Mantenimiento preventivo trimestral de la bomba de riego principal" nace **PLAN** (el Plan de mantenimiento la generó sola, según su disparador de calendario). Se planifica para dentro de 3 días, se asigna a Carlos Núñez (Mecánico). El día que corresponde, Carlos la inicia desde su OT móvil o de escritorio: marca "OK" en "Verificar nivel de aceite hidráulico" y "Revisar fugas", registra 3 horas de su propia mano de obra, y confirma que se usaron 2 galones de aceite y 1 filtro (que salen del kárdex al liquidar). Marca la OT como ejecutada, firma como ejecutor, un supervisor la liquida y la cierra con causa "Reparación completada satisfactoriamente". Más adelante se envía a Historia (§10) y queda para siempre en la hoja de vida de esa bomba.

---

## 8. Planes de mantenimiento

### 8.1 Qué resuelve

En vez de crear cada OT preventiva a mano, un **Plan de mantenimiento** la genera solo, según uno o varios **disparadores**:

- **Calendario**: cada X días/semanas/meses desde una fecha base, con días de anticipación y modo de reprogramación **fijo** (siempre la misma fecha del ciclo) o **flotante** (cuenta desde que se cerró la última).
- **Contador**: cuando un medidor del activo (horómetro, odómetro…) está por alcanzar un intervalo, proyectando la fecha probable según el promedio de uso diario del activo.
- (Condición y Evento están contemplados en el diseño para futuras fases; hoy los disparadores activos son Calendario y Contador.)

### 8.2 Alcance del plan

Un plan aplica a **un activo único** o a un **grupo** (por clase, criticidad y/o ubicación) — un mismo plan de "Inspección mensual de vehículos" puede generar una OT distinta para cada vehículo del grupo.

### 8.3 Generación

- **Automática**: un cron diario evalúa todos los planes activos y genera las OT que correspondan, evitando duplicados (nunca dos OT abiertas del mismo plan y activo a la vez) y copiando las tareas y materiales estimados del plan a la OT.
- **Manual**: `Planes → Generar` deja **previsualizar** qué se generaría antes de confirmar — útil para revisar antes de que se creen decenas de OT.

### 8.4 Ejemplo

> El plan "PLAN-0001 — Mantenimiento preventivo trimestral de la bomba de riego principal" tiene un disparador de calendario (cada 3 meses) y uno de contador (cada 500 horas de uso, avisando 50 horas antes). El que se cumpla primero genera la OT — y queda registrado en el "Log de generación" del plan, con la fecha proyectada y el resultado.

---

## 9. Paros y averías

Un **paro** es una detención de un activo — **programado** (mantenimiento planeado) o **no programado** (falla). Se registra con fecha de inicio, causa y efecto de falla, y el impacto estimado (unidades no producidas, costo). Un paro no programado puede generar directamente una **OT correctiva**, heredando la causa y el efecto de falla — así no hay que volver a describir el problema dos veces.

Los paros son la base de **MTBF** y **MTTR** (§10): cuánto dura un activo funcionando entre fallas, y cuánto tarda en repararse.

---

## 10. Historia y KPIs

### 10.1 Envío a Historia

Una OT cerrada se puede **enviar a Historia**, en lote y con validación previa: se genera una copia **inmutable** (un "snapshot" — tareas, mano de obra, materiales, costos, comentarios, todo tal cual quedó) que ya no cambia aunque la OT original se edite después. Esta copia es la **hoja de vida** de cada activo: su historial completo de mantenimiento, para siempre.

### 10.2 KPIs (con la fórmula exacta)

| Indicador | Fórmula | Qué te dice |
|---|---|---|
| **MTBF** | Tiempo total de operación ÷ número de fallas | Qué tan seguido falla un activo |
| **MTTR** | Tiempo total de reparación ÷ número de reparaciones | Qué tan rápido se repara |
| **Disponibilidad** | MTBF ÷ (MTBF + MTTR) × 100 | % del tiempo que el activo está disponible |
| **Cumplimiento del plan** | OT preventivas ejecutadas a tiempo ÷ programadas × 100 | Qué tan bien se sigue el plan preventivo |
| **Índice preventivo/correctivo** | Horas o costo preventivo ÷ total × 100 | Si se previene o se apaga incendios |
| **Backlog** | Horas de trabajo pendiente ÷ horas-hombre disponibles por semana | Cuántas semanas de trabajo acumulado hay |
| **Costo por activo** | Suma de costos de OT cerradas en el periodo | Cuánto cuesta mantener cada equipo |
| **Rotación de inventario** | Costo de salidas ÷ valor promedio del inventario | Qué tan bien circula el stock de repuestos |
| **Cumplimiento de SLA** | SS atendidas a tiempo ÷ total × 100 | Qué tan rápido se atiende al solicitante |

### 10.3 Balance periódico y reportes

`Reportes → Balance` calcula estos indicadores para un periodo (mes/trimestre/año) y los guarda — así el histórico de indicadores no depende de recalcular todo cada vez. El dashboard ejecutivo, el análisis de Pareto (por costo, frecuencia, tiempo de paro, activo o causa) y los demás reportes obligatorios del prompt maestro se exportan a Excel/PDF.

---

## 11. Combustibles y Tecnovigilancia (módulos opcionales)

Estos dos, junto con el Automatizador, son **módulos que cada empresa activa o no** desde `Administración → Módulos opcionales` — no todas las empresas de mantenimiento tienen flota con combustible que controlar, ni equipos biomédicos que vigilar.

### 11.1 Combustibles

Registra cada abastecimiento (activo, tipo de combustible, cantidad, costo, lectura de odómetro/horómetro, proveedor, conductor, factura). `Combustibles → Rendimiento` calcula automáticamente km/gal u h/gal entre cargas consecutivas del mismo activo, y marca "Anómalo" cuando el rendimiento se desvía más de 30% del promedio de cargas anteriores — una alerta temprana de que algo no anda bien (una fuga, un robo de combustible, un motor que empieza a fallar).

### 11.2 Tecnovigilancia

Para activos de clase **BIOMEDICO** (como un desfibrilador): registra eventos adversos/incidentes propios y alertas de fabricante/recall, con ciclo `ABIERTO → EN_GESTION → CERRADO` (exige causa raíz y acciones correctivas para cerrar) y, si corresponde, el reporte formal a la autoridad sanitaria (un permiso aparte, más sensible que solo gestionar el evento).

---

## 12. Automatizador

### 12.1 Qué es

Reglas del tipo **"si pasa X, entonces Y"**, sin escribir código: un **disparador** (qué observar), unas **condiciones** opcionales (filtros sobre ese evento) y una o más **acciones** (qué hacer). Se evalúan **una vez al día** (no en tiempo real — ver §17 si esperabas una reacción instantánea).

### 12.2 Los 8 disparadores

| Disparador | Se dispara cuando… | Se repite… |
|---|---|---|
| Se crea una OT | Aparece una OT nueva | Una vez, para siempre |
| Una OT cambia de estado | Cualquier transición del kanban de OT | Una vez por cada cambio |
| Se crea una SS | Aparece una solicitud nueva | Una vez, para siempre |
| Medidor fuera de rango | Una lectura de medidor sale del rango configurado en el activo | Una vez por cada lectura fuera de rango |
| Stock bajo mínimo | Un material queda bajo su mínimo configurado | Una vez por día mientras siga bajo |
| OT vencida | Pasó la fecha programada sin cerrar | Una vez por día mientras siga vencida |
| Contrato por vencer | Faltan menos días que los configurados en el contrato | Una vez por día mientras esté por vencer |
| Paro excede X horas | Un paro sigue ABIERTO más de un umbral de horas configurado en la regla | Una vez por día mientras siga abierto |

### 12.3 Las 6 acciones

Enviar un correo (requiere `RESEND_API_KEY`/`EMAIL_FROM` configurados) · Notificar dentro del sistema (aparece en la campana del usuario elegido) · Crear una orden de trabajo (en borrador, con el activo del evento si aplica) · Cambiar el responsable de la OT · Escalar la prioridad de la OT un nivel (Baja→Media→Alta→Urgente) · Llamar un webhook (POST a una URL externa, con bitácora de éxito/error).

### 12.4 Ejemplo

> Regla "Aviso de stock crítico": disparador "Un material queda bajo su mínimo", sin condiciones, acción "Notificar dentro del sistema" al jefe de bodega. Cada mañana el cron revisa el almacén; si el filtro de aceite hidráulico bajó de 3 unidades, el jefe de bodega recibe una notificación — una vez ese día, y de nuevo al día siguiente si nadie repuso el stock.

### 12.5 Bitácora

Cada regla tiene su propia bitácora de ejecución (`Automatizador → [regla] → Ver bitácora`) — qué se evaluó, si se ejecutó o dio error, y el detalle de cada acción. Es el primer lugar para revisar "¿por qué no se disparó mi regla?".

---

## 13. API pública e integraciones

### 13.1 Para qué sirve

Permite que un sistema externo (un ERP, un SCADA, un sensor con salida HTTP) lea o cree información sin que una persona tenga que iniciar sesión — usando una **API key** en vez de un usuario/contraseña.

### 13.2 Crear una API key

`Administración → Integraciones → Nueva API key` — dale un nombre y elige su alcance (`activos.leer`, `ordenes.leer`, `ordenes.crear`, `solicitudes.crear`). El valor completo de la clave **se muestra una única vez** — cópialo de inmediato, no se puede volver a ver (si lo pierdes, revoca esa clave y crea una nueva).

### 13.3 Endpoints disponibles

| Endpoint | Método | Alcance requerido | Qué hace |
|---|---|---|---|
| `/api/v1/activos` | GET | `activos.leer` | Lista activos (filtra por `?codigo=`) |
| `/api/v1/ordenes` | GET | `ordenes.leer` | Lista órdenes de trabajo |
| `/api/v1/ordenes` | POST | `ordenes.crear` | Crea una OT en borrador |
| `/api/v1/solicitudes` | POST | `solicitudes.crear` | Crea una solicitud de servicio |

Autenticación: header `Authorization: Bearer <tu api key>`. Límite: 60 solicitudes por minuto por clave.

### 13.4 Ejemplo con `curl`

```bash
curl https://mantenimiento-cananvalle.vercel.app/api/v1/activos \
  -H "Authorization: Bearer gmao_live_xxxxxxxx"

curl -X POST https://mantenimiento-cananvalle.vercel.app/api/v1/ordenes \
  -H "Authorization: Bearer gmao_live_xxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"descripcionProblema": "Alarma de vibración del SCADA", "assetCodigo": "ACT-0001", "prioridad": "ALTA"}'
```

### 13.5 Bitácora de uso y webhooks

`Administración → Integraciones` también muestra las últimas llamadas a webhooks salientes del Automatizador (URL, si respondió bien, y el error si falló) — útil para depurar una integración que no está reaccionando como se esperaba.

---

## 14. PWA móvil para técnicos

### 14.1 Cómo entrar

Desde el menú de usuario (escritorio) → **"Vista móvil (técnicos)"**, o directo a `/movil/mis-ordenes` desde el celular. En un navegador Chrome/Edge aparece la opción de **"Instalar app"** — instálala para que quede como un ícono más en el teléfono, con su propia pantalla (sin la barra del navegador).

### 14.2 Las 4 secciones

- **Mis OT**: tus órdenes asignadas, con el avance del checklist.
- **Escanear**: apunta la cámara al QR de un activo (el mismo que se genera en Activos → Código QR) y abre su ficha directo; si tu navegador no soporta escaneo (típico en iPhone/Safari), hay un buscador manual por código.
- **Solicitudes**: reporta una falla desde el celular, con el activo precargado si vienes de escanearlo.
- **Perfil**: tu sesión, y el estado de sincronización.

### 14.3 Lo importante: funciona sin señal

Puedes completar el checklist, tomar fotos de evidencia, firmar como ejecutor y cambiar el estado de la OT **aunque no tengas señal** — Wi-Fi débil en el invernadero, zona sin cobertura, modo avión. Todo lo que haces se guarda en el teléfono y se envía solo en cuanto vuelve la conexión (mira el número en el ícono de "Perfil": son tus cambios pendientes de subir). También puedes forzar la sincronización con el botón "Sincronizar ahora" en Perfil.

Si dos personas cambiaron lo mismo mientras una estaba sin señal (poco común, pero puede pasar), gana la escritura que se sincroniza — y queda un aviso en Perfil de que hubo un conflicto y qué se sobrescribió, para que lo revises si hace falta.

---

## 15. Administración

- **Usuarios**: crear/editar usuarios, asignarles roles y su alcance (§2), y a qué sedes tienen acceso.
- **Roles y permisos**: ver y ajustar qué permisos tiene cada rol (con cuidado — un cambio aquí afecta a todos los usuarios con ese rol).
- **Auditoría**: quién cambió qué, cuándo y desde dónde — cada acción sensible queda aquí, con el detalle de qué valor tenía antes y después.
- **Módulos opcionales**: activa/desactiva Combustibles, Tecnovigilancia y Automatizador por empresa.
- **Integraciones**: API keys y bitácora de webhooks (§13).

---

## 16. Casos completos de punta a punta

### Caso A — Una falla reportada por un operario hasta quedar en la hoja de vida del activo

1. Un operario reporta "La caldera del Invernadero 1 no enciende" en el Portal de solicitudes.
2. Un supervisor la revisa, la aprueba y la **convierte en OT**.
3. La OT se planifica y se asigna a un electricista.
4. El electricista la ejecuta desde la PWA móvil (posiblemente sin señal en el invernadero), completa el checklist, registra 2 horas de mano de obra, y firma como ejecutor.
5. Un supervisor la marca ejecutada, la liquida (consolidando costos) y la cierra con causa de cierre.
6. Se envía a Historia — queda para siempre en la hoja de vida de esa caldera, y entra en el próximo cálculo de MTBF/MTTR del balance periódico.

### Caso B — Mantenimiento preventivo que se genera solo

1. Un Plan de mantenimiento con disparador de calendario (cada 3 meses) llega a su fecha.
2. El cron diario lo detecta, genera la OT (origen PLAN), copiando las tareas y materiales estimados del plan.
3. Sigue el mismo ciclo de vida que cualquier OT (§7).
4. Al cerrarse, el plan queda listo para su próximo ciclo (fijo o flotante, según cómo se configuró).

### Caso C — Una regla de Automatizador que evita quedarse sin repuestos

1. Se crea una regla: disparador "Stock bajo mínimo", acción "Notificar" al jefe de bodega.
2. Una OT consume el último filtro de aceite disponible, y la existencia queda bajo el mínimo.
3. Al día siguiente, el cron del Automatizador lo detecta, y el jefe de bodega recibe una notificación — con tiempo de reponer antes de que falte para la próxima OT que lo necesite.

---

## 17. Solución de problemas frecuentes

**"No veo un módulo que debería poder usar."**
Revisa con un administrador que tu rol tenga el permiso correspondiente (`Administración → Roles`), y si el módulo es opcional (Combustibles, Tecnovigilancia, Automatizador), que esté activado en `Administración → Módulos opcionales`.

**"Cambié algo pero otro usuario no lo ve."**
Revisa el **alcance** (§2.2) de ese usuario — si es PROPIO o SEDE, puede que ese registro simplemente no le corresponda ver, no es un error.

**"Mi regla de Automatizador no se disparó."**
Recuerda que el Automatizador evalúa **una vez al día**, no al instante — puede tardar hasta 24 horas en reaccionar. Revisa la bitácora de la regla (§12.5): si no hay ninguna fila, o la regla está inactiva, o las condiciones no se cumplieron, o ya se disparó hoy (para disparadores de nivel, una vez por día es el máximo).

**"No me llegó el correo de una regla del Automatizador."**
El envío de correo depende de que `RESEND_API_KEY` y `EMAIL_FROM` estén configurados en el entorno — si no lo están, la bitácora de la regla muestra el error concreto.

**"Subí una foto/documento y no se guardó."**
La subida de archivos depende de que `BLOB_READ_WRITE_TOKEN` esté configurado en el entorno de despliegue — si falta, verás un error explicándolo, no una pantalla en blanco.

**"La API pública me devuelve 401."**
La API key está mal copiada, revocada, expirada, o no tiene el alcance que ese endpoint exige — revisa `Administración → Integraciones`.

**"La API pública me devuelve 429."**
Superaste las 60 solicitudes por minuto de esa API key — espera un minuto.

**"En la PWA móvil, una pantalla dice 'sin conexión' y no abre."**
Esa pantalla en concreto nunca se abrió antes con señal, así que no quedó guardada para uso sin conexión. Las OT ya cacheadas en "Mis OT" siguen funcionando normalmente.

**"El encabezado del sistema muestra un nombre de empresa que no es el nuestro."**
El nombre de la empresa activa depende de la variable de entorno `COMPANY_CODE` del despliegue — si aparece un nombre genérico como "Mi Empresa S.A.", esa variable no está apuntando al tenant correcto en ese entorno (revisar con quien administra el despliegue en Vercel).

---

## 18. Glosario

- **Tenant**: la empresa que usa el sistema. Esta instalación es de una sola empresa (Cananvalle Flowers), determinada por la variable `COMPANY_CODE`.
- **Consecutivo**: el número de documento con formato de la empresa (`OT-2026-000123`, `SS-2026-000045`) — se asigna al confirmar/enviar el documento, no siempre al crearlo.
- **Alcance (scope)**: PROPIO/SEDE/TENANT — qué registros puede ver/gestionar un usuario, además de qué permisos tiene (§2.2).
- **Criticidad**: A (rojo) / B (ámbar) / C (verde) — qué tan crítico es un activo, consistente en toda la app.
- **Borrado lógico**: "eliminar" desactiva el registro (`deleted_at`) en vez de borrarlo de la base de datos.
- **Kárdex**: el registro de cada movimiento (entrada/salida) de materiales, con su efecto en existencias y costo promedio.
- **Costo promedio ponderado**: método de valorización de inventario — cada entrada recalcula el costo promedio del material.
- **MTBF / MTTR**: tiempo medio entre fallas / tiempo medio de reparación — los dos indicadores base de confiabilidad (§10.2).
- **Snapshot (Historia)**: copia inmutable de una OT cerrada, que ya no cambia aunque la OT original se edite después.
- **Disparador (Automatizador)**: el evento o condición que el Automatizador vigila para decidir si ejecuta una regla.
- **API key**: credencial para que un sistema externo use la API pública, sin ser un usuario humano logueado.
- **PWA (Progressive Web App)**: una aplicación web que se puede instalar como app y funcionar sin conexión — la Vista móvil de este sistema.

---

*Este manual describe el sistema al cierre de la Fase 12. Para el detalle técnico de cada fase (qué se construyó, qué se simplificó a propósito y por qué, y qué falta), consulta los archivos `ENTREGA-FASE-1.md` a `ENTREGA-FASE-12.md` en la raíz del proyecto.*
