# Propuesta: unificación visual de PaqTracker

Alcance: pestañas **Pedidos**, **Simulación**, **Métricas** y **Configuración** de `paqtracker-web`
(Operación y la barra superior se usan como referencia, porque comparten los mismos problemas).
Complementa [design-system.md](design-system.md), que ya define la paleta pero todavía no se aplica.

---

## 1. Diagnóstico

**Conclusión: las cuatro pantallas no tienen un estilo uniforme.** Cada una se construyó con un
"dialecto" distinto de Tailwind y no comparten componentes base. Se nota en color, tipografía,
tamaños, bordes, íconos, encabezados y textos.

### 1.1 Cada pantalla usa su propio sistema de color

Conteo de clases en `src/components/<módulo>` (sin pruebas):

| Pantalla | Hex literales (`[#1E40AF]`…) | Clases `slate/blue/red…` de Tailwind | Tokens oficiales (`primary-600`, `neutral-500`…) |
|---|---:|---:|---:|
| Pedidos | 23 | **281** | 0 |
| Simulación | **215** | 0 | 0 |
| Configuración | 19 | 18 | 0 |
| Métricas (`App.tsx`) | 8 | 35 | 0 |

- **Ningún componente usa la paleta oficial** de `tailwind.config.js` (`primary`, `neutral`, `ok`,
  `warn`, `critical`), aunque está documentada y testeada en contraste.
- El azul de acción real es `#1E40AF` (blue‑800 de Tailwind), no el `primary-600 #1B4DD9` del logo.
  Pedidos además mezcla `blue-600` y `blue-700` en foco, enlaces e íconos.
- El "rojo" tiene tres versiones: `#B91C1C` (Simulación, Configuración), `rose-500/700` (errores de
  Pedidos) y `red-500` (barras de Métricas). El "verde", otras tres: `#15803D`, `emerald-*`
  (confirmación de pedido) y `green-500/700`.
- Los bordes de tarjeta alternan `#E2E8F0` (Pedidos, Simulación) y `#CBD5E1` (Métricas,
  Configuración).

### 1.2 Tipografía sin escala

La familia sí es única (Fira Sans + `tabular-nums`, bien resuelto). El problema es el tamaño y el peso:

| Elemento | Pedidos | Simulación | Métricas | Configuración |
|---|---|---|---|---|
| Título de página | 18 px semibold (registro) / 16 px **bold** dentro de la tarjeta (cola) | 18 px semibold | 16 px **bold** dentro de la tarjeta | 16 px **bold** sin barra |
| Título de sección | 11 px MAYÚS. semibold / 12 px MAYÚS. bold | 14 px semibold / 12 px MAYÚS. | 12 px MAYÚS. semibold | 14 px bold, sin mayúsculas |
| Texto de control | 12 px (`text-xs`) | 12–14 px (`text-[12px]`…) | 12 px | **13 px** |
| Peso de botón primario | medium | semibold | — | semibold |

Hay 11 tamaños distintos en uso (10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 26 px) y se escriben de
dos formas (`text-xs` vs `text-[12px]`), lo que impide controlarlos desde un solo lugar.

### 1.3 Tamaños, radios y sombras

- **Alturas de botón:** 28, 30, 32, 34, 36, 40, 44 px (`h-8`, `h-9`, `h-10`, `h-11`, `h-[30px]`,
  `h-[34px]`, `h-[44px]`…). El botón primario mide 36 px en la cola de Pedidos, 44 px en Registrar,
  44 px en Configuración de escenario y 32 px en Configuración.
- **Inputs:** 40 px con `rounded-lg` y anillo azul en Pedidos; 32 px con `rounded-[6px]`, sin anillo
  y borde `#CBD5E1` en Simulación; 32 px con anillo `#1E40AF/30` en Configuración.
- **Radios:** botones a 8 px (Pedidos) y 6 px (resto); tarjetas a 10 px (Pedidos, Simulación) y
  12 px (`rounded-xl`, Métricas y Configuración).
- **Espaciado:** Simulación usa píxeles arbitrarios (`gap-[14px]`, `px-[15px]`, `py-[22px]`) fuera de
  la escala de 4 px que usan los demás.
- **Bug silencioso:** `shadow-xs`, `shadow-2xs` y `animate-in slide-in-from-right` **no existen en
  Tailwind 3.4** (son de la v4 o de un plugin no instalado). Verificado compilando el CSS: no generan
  ninguna regla. Las 18 tarjetas que "tienen sombra" en realidad no la tienen, y el panel de detalle
  de pedido no se anima.

### 1.4 Íconos

- La librería es única (`lucide-react`), pero la **densidad** cambia por pantalla: Pedidos usa íconos
  en casi cada botón y dato; Simulación tiene uno solo (`Download`) y resuelve el resto con
  caracteres de texto (`‹ Volver a la corrida`, `‹ Otras simulaciones`, `▲`, `→`); Métricas no tiene
  ninguno.
- Tamaños: `w-3`, `w-3.5`, `w-4`, `w-[14px]`, `w-5`, `w-6`, `w-8`, sin regla de cuándo usar cada uno.
- **Mismo concepto, distinto ícono que en Operación** (Operación es la referencia, ver 2.4):

| Concepto | Operación | Otras pantallas |
|---|---|---|
| Ordenar columna | `ArrowUpNarrowWide` / `ArrowDownWideNarrow` (Flota) | `ArrowUp` / `ArrowDown` / `ArrowUpDown` (cola de Pedidos) |
| Ir al detalle | `ArrowRight` (Resumen) | `ChevronRight` (filas de la cola de Pedidos) |
| Ver en el mapa | `MapIcon` (capas del mapa) | `MapPin` (*Ubicar en el mapa en vivo*, detalle de pedido) |
| Error | `AlertTriangle` (avisos, incidencias) | `XCircle` (Registrar pedido) |
| Advertencia en texto | `AlertTriangle` | `▲` como carácter (Diagnóstico del colapso) |
| Destino, almacén, unidad en un mapa | `simbolos.tsx` + `iconosVehiculo.ts` | SVG exportados de Figma en el minimapa de *Pedido registrado* (`pedidos/iconos.tsx`: `MarcadorAlmacen`, otro `PinDestino`, `IconoVehiculo`) |

### 1.5 Estructura de pantalla y patrones de interacción

| Patrón | Pedidos | Simulación | Métricas | Configuración |
|---|---|---|---|---|
| Barra de encabezado | Solo en registro/confirmación (74 px) | Sí (80 px) | No | No |
| Ancho del contenido | Completo | Completo | `max-w-4xl` | `max-w-5xl` |
| Volver | Botón cuadrado con ícono ← | Enlace de texto `‹ …` subrayado | — | — |
| Acciones secundarias | Botones con borde | Enlaces de texto (`Abrir`, `Recargar`) | — | Botones con borde y *ghost* |
| Pestañas | Botones tipo filtro | Segmentado (lista) **y** subrayado (informe) | — | — |
| Insignia de estado | Píldora, minúsculas | Rectángulo 4 px, **MAYÚSCULAS** (`EN EJECUCIÓN`) | — | — |
| Fila etiqueta/valor | Componente propio | `Dato` + `FilaResumen` (2 variantes) | `Indicador` | — |

La pestaña Métricas además vive dentro de `App.tsx` (no tiene carpeta propia), por eso no reutiliza
nada de los demás módulos.

### 1.6 Microcopy

> **Decisión del equipo: los términos que hoy aparecen en pantalla se mantienen tal cual.** Esta
> propuesta no renombra ningún rótulo, botón, título ni estado. Las pruebas que buscan esos textos
> (incluidas las de rúbrica) no se tocan.

Para que quede registrado, la revisión encontró estas diferencias de vocabulario. **No se cambian**,
pero se documentan en el glosario (2.7) para que el equipo pueda explicarlas en la exposición:

- "Simulación" y "corrida" conviven: *Ejecutar simulación*, *Aún no hay simulaciones*, *Informe de
  la corrida*, *Avance de la corrida*, *Ver corrida*.
- Pedidos dice **Vehículo** (columna, filtro, *Vehículo asignado*) y el resto de pantallas dice
  **unidad**. La cantidad se expresa en **"unidades de P"**.
- Métricas rotula *Resuelto* el nivel que el glosario llama *Cerrado*.
- La tabla dice *Código* y el CSV exportado, *ID*.

Lo que sí entra en la propuesta es la **forma** del texto, no las palabras:

- **Mayúsculas como énfasis** en estados (`CONECTADO`, `EN EJECUCIÓN`), cuando el resto usa
  mayúscula inicial. Las mayúsculas sostenidas se leen más lento y se perciben como alarma.
- Los botones primarios están bien redactados (verbo + objeto: *Registrar y planificar pedido*,
  *Aplicar a la operación*); conviene que esa regla se cumpla en todos.

---

## 2. Propuesta

Principio rector: **una sola fuente de verdad por decisión visual**. Hoy el estilo vive repetido en
cientos de `className`; la propuesta lo mueve a tokens (Tailwind) y a ~10 componentes base, para que
las pantallas solo compongan.

### 2.1 Color: aplicar la paleta que ya existe

No se inventa paleta nueva: se usa la de `design-system.md`, ya validada en contraste y daltonismo.
Tabla de reemplazo (aplicable con búsqueda y reemplazo, revisando caso a caso):

| Hoy | Token | Rol |
|---|---|---|
| `#0F172A`, `slate-900` | `neutral-900` | Texto principal |
| `slate-800`, `#334155`, `slate-700` | `neutral-700` | Texto de énfasis medio, botón secundario |
| `#64748B`, `slate-500`, `slate-600` | `neutral-600` | Texto secundario (cumple AA sobre blanco y sobre `neutral-50`) |
| `#94A3B8`, `slate-400` | `neutral-400` | Deshabilitado, decorativo (nunca texto informativo) |
| `#CBD5E1`, `slate-300` | `neutral-300` | Borde de control (input, botón secundario) |
| `#E2E8F0`, `slate-200` | `neutral-200` | Borde de tarjeta y separadores |
| `#F1F5F9`, `slate-100` | `neutral-100` | *Hover* de fila, fondo de pista |
| `#F8FAFC`, `slate-50` | `neutral-50` | Fondo de la app |
| `#1E40AF`, `blue-600/700` | `primary-600` | Acción principal, enlace, pestaña activa |
| `#1E3A8A`, `blue-800/900` | `primary-700` | *Hover* de la acción principal |
| `#DBEAFE`, `#EFF6FF`, `blue-50/100` | `primary-100` / `primary-50` | Fondo de selección, aviso informativo |
| `#B91C1C`, `rose-*`, `red-*` | `critical-600` (texto, borde) / `critical-50` (fondo) | Error, colapso, crítico |
| `#15803D`, `emerald-*`, `green-*` | `ok-700` (texto) / `ok-600` (relleno) / `ok-50` (fondo) | Éxito, en plazo |
| `#B45309`, `amber-*` | `warn-700` (texto) / `warn-500` (relleno) / `warn-50` (fondo) | Atención, ajustado |

Una sola decisión de color por estado, repetida en todas las pantallas:
**crítico = `critical`, atención = `warn`, correcto = `ok`, informativo = `info`, acción = `primary`.**

### 2.2 Tipografía: escala de 6 pasos

Se registra en `tailwind.config.js → theme.extend.fontSize` para que no vuelvan a escribirse píxeles:

| Token | Tamaño / interlínea | Peso | Uso |
|---|---|---|---|
| `text-caption` | 11 / 16 | 500 | Ayudas de campo, sufijos, marcas de eje |
| `text-overline` | 11 / 16, MAYÚS., `tracking-wide` | 600 | Título de grupo dentro de una tarjeta (único uso de mayúsculas) |
| `text-body-sm` | 12 / 16 | 400–500 | Tablas, listas densas, filas etiqueta/valor |
| `text-body` | 13 / 20 | 400–500 | Texto corriente, controles, botones, inputs |
| `text-title-sm` | 14 / 20 | 600 | Título de tarjeta o sección |
| `text-title` | 18 / 24 | 600 | Título de página (uno por pantalla) |
| `text-kpi` | 22 / 28 | 600 | Cifra destacada (indicadores, reloj de la corrida) |

Reglas: tres pesos (400, 500, 600); `font-bold` desaparece. Cifras, horas y códigos siempre con
`tabular-nums` (ya se cumple). 13 px como cuerpo de controles equilibra densidad operativa y
legibilidad para una herramienta que se mira durante horas.

### 2.3 Forma, tamaño y elevación

| Token | Valor | Uso |
|---|---|---|
| `rounded-control` | 6 px | Botón, input, select, pestaña segmentada |
| `rounded-card` | 10 px | Tarjeta, panel, diálogo, cajón lateral |
| `rounded-full` | — | Insignia de estado, contador, punto |
| Altura `sm` | 28 px (`h-7`) | Barras de herramientas y filtros densos |
| Altura `md` | 32 px (`h-8`) | **Por defecto** para botones e inputs |
| Altura `lg` | 40 px (`h-10`) | Acción final de un formulario o flujo (*Registrar y planificar pedido*, *Ejecutar simulación*) |
| `shadow-xs` | `0 1px 2px rgb(13 21 46 / .06)` | Tarjeta (definirlo en la config: hoy no existe) |
| `shadow-overlay` | `0 8px 24px rgb(13 21 46 / .16)` | Cajón, popover, diálogo |

Espaciado: solo la escala de 4 px de Tailwind (`gap-2/3/4/6`, `p-4/6`); se eliminan los
`[14px]`, `[15px]`, `[22px]`. Área táctil mínima de 28 px en escritorio y 40 px en móvil.

### 2.4 Íconos: los de Operación son la referencia

Decisión del equipo: **se mantienen los íconos que hoy se ven en Operación** (barra superior, mapa,
barra de paneles, panel lateral). Las demás pantallas se alinean a ellos. Si Operación ya tiene un
ícono para un concepto, se usa ese. Solo se agrega uno nuevo cuando Operación no tiene equivalente.

#### a) Íconos de interfaz (`lucide-react`), tal como están en Operación

| Concepto | Ícono | Dónde está en Operación |
|---|---|---|
| Operación · Pedidos · Simulación · Métricas · Configuración | `LayoutGrid` · `Package` · `PlayCircle` · `BarChart3` · `Settings` | Barra superior |
| Reloj / hora / plazo · Conexión · Salir | `Clock` · `Radio` · `LogOut` | Barra superior |
| Resumen · Incidencias · Pedidos · Flota · Almacenes · Bitácora | `BarChart3` · `AlertTriangle` · `Package` · `Truck` · `Warehouse` · `ScrollText` | Barra de paneles |
| Unidad (UT) | `Truck` | Flota |
| Buscar | `Search` | Buscador del mapa, selector de unidad |
| Filtros | `ListFilter` | Mapa |
| Capas y leyenda / ver en el mapa | `MapIcon` | Mapa |
| Acercar · alejar · encuadrar | `ZoomIn` · `ZoomOut` · `Maximize2` | Mapa |
| Cerrar | `X` | Paneles, leyenda, diálogos |
| Opción marcada | `Check` | Chips de filtros |
| Desplegar | `ChevronDown` | Selector de unidad |
| Ir al detalle / ver más | `ArrowRight` | Resumen |
| Ordenar ascendente · descendente | `ArrowUpNarrowWide` · `ArrowDownWideNarrow` | Flota |
| Reporte / planificación | `ClipboardList` | Resumen |
| Error o atención · éxito | `AlertTriangle` · `CheckCircle2` | Avisos (`layout/Avisos.tsx`) |

#### b) Símbolos del dominio, tal como están en Operación

- Mapa: `map/simbolos.tsx` (`PinDestino`, `AlmacenCentral`, `AlmacenIntermedio`, `MarcaSemaforo`,
  `InsigniaStockBajo`, `InsigniaAveria`, `MarcaBloqueo`, `LineaBloqueo`) y `map/iconosVehiculo.ts`
  (auto, moto, bicicleta; colores de D11 y C24).
- Nivel de holgura: `PuntoHolgura` (punto de 7 px), que Operación ya usa en Resumen, Pedidos y en el
  panel lateral.
- Cualquier mapa o minimapa fuera de Operación dibuja con **estos mismos símbolos**. El minimapa de
  *Pedido registrado* deja los SVG de Figma (`MarcadorAlmacen`, el otro `PinDestino` e
  `IconoVehiculo` de `pedidos/iconos.tsx`) y pasa a `MiniMapaMalla` + `simbolos.tsx`, como ya hace
  Configuración. Después se borran los SVG de `assets/figma/pedidos` que queden sin uso, salvo los
  del punto de holgura.

#### c) Cambios en las otras pantallas

| Pantalla | Hoy | Pasa a (como en Operación) |
|---|---|---|
| Pedidos · cola | `ArrowUp` / `ArrowDown` / `ArrowUpDown` para ordenar | `ArrowUpNarrowWide` / `ArrowDownWideNarrow` |
| Pedidos · cola | `ChevronRight` al final de cada fila | `ArrowRight` |
| Pedidos · detalle y confirmación | `MapPin` en *Ubicar en el mapa* | `MapIcon` |
| Pedidos · registro | `XCircle` en el error de factibilidad | `AlertTriangle` (con tono crítico) |
| Pedidos · detalle | `Truck` en azul junto a la unidad | `Truck` en neutro, como en Flota |
| Simulación · diagnóstico | `▲` como carácter | `AlertTriangle` |
| Simulación · encabezado, informe | `‹ Otras simulaciones`, `‹ Volver a …` | Botón con ícono (ver nota) |
| Simulación · estado | Punto `span` de 6 px | Se mantiene para estados de la simulación. Para holgura, `PuntoHolgura` |
| Métricas | Sin íconos | `TituloGrupo` con el ícono del panel equivalente: `Truck` (flota), `Package` (pedidos por holgura), `Warehouse` (stock) |

Nota: Operación no tiene un "volver" porque no tiene subpantallas. Se usa `ArrowLeft`, que ya está en
Pedidos y es el par de `ArrowRight`. Otros íconos que Operación no tiene y se agregan con el mismo
estilo: `Plus` (registrar), `Download` (exportar), `Save`, `RotateCcw` (restablecer), `RefreshCw`
(recargar/aplicar), `SlidersHorizontal` (rangos), `User` (cliente) y `Play`/`Square` (iniciar/detener
simulación).

#### d) Tamaño y trazo (los de Operación)

| Tamaño | Clase | Uso en Operación |
|---|---|---|
| 12 px | `size-3` | Dentro de chips y junto a enlaces cortos (`Check`, `ArrowRight`) |
| 14 px | `size-3.5` | **Por defecto**: botones `sm/md`, buscadores, cerrar paneles, ordenar |
| 16 px | `size-4` | Botones `lg`, barra superior, controles del mapa, cerrar diálogos, avisos |
| 18 px | `size-[18px]` | Solo la barra vertical de paneles (ícono sobre la etiqueta) |

- El trazo queda en el valor por defecto. La única excepción es la barra superior, que lo engrosa en
  la pestaña activa (1.8 → 2.2) y se mantiene así.
- El color sigue al texto que acompaña (`neutral-600` en reposo, `primary-600` activo). El ícono
  solo lleva color de estado cuando ese ícono *es* el estado (aviso, incidencia).
- Ícono decorativo siempre con `aria-hidden`. Botón de solo ícono siempre con `aria-label` y `title`
  (como los controles del mapa).
- Íconos más grandes (24–32 px en estados vacíos y confirmaciones) pasan a `size-5` (20 px) dentro de
  un círculo `size-10`, para que no compitan con el título.

### 2.5 Componentes base (`src/components/ui/`)

Cada uno reemplaza variantes que hoy están copiadas en varios archivos:

| Componente | Variantes | Reemplaza |
|---|---|---|
| `Boton` | `primario`, `secundario`, `fantasma`, `peligro` × `sm/md/lg`, con `icono` opcional y estado `cargando` | ~40 botones escritos a mano |
| `Campo` | etiqueta + input/select + ayuda + error (con `aria-describedby`) | `Etiqueta` de Simulación, `CampoNumero` de Configuración, campos de Registrar pedido |
| `Insignia` | tono (`neutral/info/ok/warn/critical/primary`) + punto opcional | `ESTADO_CORRIDA`, `estadoInfo.badge`, chips de plazo, estado de conexión |
| `Tarjeta` | encabezado con `titulo`, `descripcion`, `acciones`; cuerpo | Secciones de Métricas, Configuración, Simulación y Pedidos |
| `EncabezadoPagina` | `volver`, `titulo`, `descripcion`, `acciones`, `estado` | `EncabezadoPedidos`, encabezados de Configuración de escenario e Informe |
| `TituloGrupo` | con dato a la derecha | `TituloSeccion` (Operación), `Titulo` (Diagnóstico), `h4` de Pedidos |
| `FilaDato` | etiqueta / valor, separador opcional | `Dato`, `FilaResumen`, filas del detalle de pedido |
| `Indicador` | etiqueta, valor `kpi`, detalle, tono | `Indicador` de Métricas, `CeldaKpi` de Pedidos |
| `Aviso` | `info/ok/warn/critical`, con ícono y acción opcional | Bordes izquierdos de 3 px, caja azul de Configuración, errores en rojo sueltos |
| `EstadoVacio` | ícono, título, texto, acción | Vacío de la cola, *Aún no hay simulaciones*, `EstadoConexion` |
| `Pestanas` | `subrayado` (navegación de contenido) y `segmentado` (cambio de modo) | Pestañas de Simulación e Informe, filtros rápidos de Pedidos |

Regla de uso: `Boton primario` **uno por vista** (la acción más probable); la acción destructiva usa
`peligro` y siempre pasa por `DialogoConfirmacion` (ya se hace al detener una corrida).

### 2.6 Patrón de pantalla común

```
┌──────────────────────────────────────────────────────────────────┐
│ TopNavbar (global)                                               │
├──────────────────────────────────────────────────────────────────┤
│ EncabezadoPagina   h 64 px · fondo blanco · borde inferior       │
│  [← Volver]  Título (18/600)                [Secundaria] [Primaria]│
│              Descripción (13, neutral-600)                       │
├──────────────────────────────────────────────────────────────────┤
│ Contenido   p-6 · gap-4 · fondo neutral-50                       │
│  ┌ Tarjeta ───────────────┐  ┌ Tarjeta ───────────────┐          │
│  │ Título (14/600)  [acc.]│  │ OVERLINE (11/600)      │          │
│  │ …                      │  │ …                      │          │
│  └────────────────────────┘  └────────────────────────┘          │
├──────────────────────────────────────────────────────────────────┤
│ Barra de acciones fija (solo formularios con cambios sin guardar)│
└──────────────────────────────────────────────────────────────────┘
```

- **Todas** las pestañas abren con `EncabezadoPagina`. La cola de Pedidos saca el título "Pedidos"
  y sus botones de la tarjeta y los sube al encabezado; Métricas y Configuración ganan su barra.
- Ancho: vistas de datos densos (cola de Pedidos, corrida de Simulación) a ancho completo; vistas de
  lectura o formulario (Métricas, Configuración, Configuración de escenario, Registrar pedido,
  Informe) a `max-w-6xl` centrado. Una sola medida en lugar de 4xl/5xl/sin límite.
- Volver: siempre `Boton fantasma` con `ArrowLeft` + el texto que ya tiene hoy (*Volver a la cola de
  pedidos*, *Volver a la corrida*, *Otras simulaciones*; el carácter `‹` se reemplaza por el ícono), a
  la izquierda del título. Nunca enlace subrayado.
- Acciones: en botones, no en enlaces de texto. El enlace queda solo para navegar a otro lugar
  dentro de un texto.
- Barra inferior (`FooterBar`): ya sigue una regla coherente (estado del día a día; se oculta en
  Simulación por tener otro reloj y en Configuración por su barra de acciones). Se documenta tal cual.
- Métricas pasa a `src/components/metricas/ModuloMetricas.tsx`, como los demás módulos.

### 2.7 Microcopy

#### Términos: se mantienen los de pantalla

Los términos visibles **quedan como están hoy**: no se renombra ningún rótulo, botón, título,
columna ni estado. Los componentes nuevos (`EncabezadoPagina`, `Tarjeta`, `Boton`…) reciben el mismo
texto que muestra hoy cada pantalla. Al migrar, el texto se copia tal cual.

Como referencia para la exposición, esta es la equivalencia entre la rúbrica 91.EvaSw y lo que se ve
en pantalla ([plan-rubrica-equipo4.md §1.1](plan-rubrica-equipo4.md),
[REPORTE_AUTOEVAL.md](../REPORTE_AUTOEVAL.md)):

| Término de la rúbrica | En pantalla (se mantiene) |
|---|---|
| UT | *unidad* (Operación, Métricas, Configuración) y *Vehículo* (Pedidos) |
| Envío | *pedido* |
| Producto (con ID) | *fracción* del pedido, código `#1088·2` |
| Producto (unidad física) | *unidades de P* |
| Almacén principal / intermedio | *Central*, *Intermedio 1* y *Intermedio 2* |
| Planificación estable (G08–G10) | *Última planificación estable* |
| Simulación (de periodo / colapso) | *simulación* y *corrida* |
| Colapso | *colapso* (y *quiebre* en el diagnóstico) |

Lo único que se pide sobre los términos es no **sumar** variantes nuevas: un texto nuevo usa la
palabra que ya se ve en esa misma pantalla.

#### Reglas de redacción (forma, no palabras)

Estas reglas cambian cómo se presenta el texto, nunca las palabras:

1. Mayúscula inicial en insignias, estados y banners. Mayúsculas sostenidas solo en `text-overline`
   (títulos de grupo y encabezados de tabla). **Ya aplicado** (las mismas palabras, solo cambia la caja):
   - Barra superior: *Conectado*, *Sin conexión*.
   - Estados de la simulación (`estadoCorrida.ts`, encabezado e informe): *En ejecución*,
     *Completada*, *Detenida*, *Colapso detectado*.
   - Banner de la corrida: *Simulación 7 días*, *Simulación — hasta el colapso*, *Simulación — colapso*.
   - Chip del plazo en Registrar pedido: *Regular*, *Priorizado* (se quitó el `uppercase` de CSS).
   - También se quitó el espaciado extra entre letras (`tracking`) que acompañaba a las mayúsculas.
2. Los textos nuevos de botones siguen el patrón que ya usa la app: verbo en infinitivo + objeto
   (*Registrar pedido*, *Ejecutar simulación*, *Exportar CSV*, *Aplicar a la operación*).
3. Los textos nuevos de error dicen qué pasó y qué hacer, siguiendo el patrón existente (*No se pudo
   abrir esta simulación*) y agregando la siguiente acción.
4. Los estados vacíos llevan el mensaje actual y, al lado, el botón de la acción siguiente (por
   ejemplo, *Aún no hay simulaciones.* + botón para configurar una).
5. Tuteo consistente (ya se usa: *Ábrelas*, *Elige*), sin mezclar con usted.
6. Cargas con gerundio y puntos suspensivos tipográficos: *Registrando…*, *Abriendo…* (ya se
   cumple; se mantiene).
7. Números con formato local único desde `lib/formato.ts`: `87,5 %`, `1 250 km`, `14:05`.

---

## 3. Plan de implementación

> **Estado (08-11-2026): fases 0 a 6 completas** en la rama `feature/unificacion-ui`. Suite del front en
> verde (367 pruebas, sin editar ninguna prueba existente), `tsc -b`, `oxlint` y `vite build` sin errores.
> El candado vive en `src/config/estilos.test.ts` y su lista de excepciones (5, todas fijadas por
> pruebas que verifican el valor literal). Detalle del sistema resultante en
> [design-system.md](design-system.md).

Por fases cortas para no frenar el resto del trabajo; cada una es un PR revisable y no cambia
comportamiento.

| Fase | Contenido | Resultado visible |
|---|---|---|
| **0. Fundaciones** | En `tailwind.config.js`: `fontSize`, `borderRadius`, `boxShadow` (incluye `shadow-xs` que hoy no existe). Quitar `animate-in` o añadir una animación propia. | Vuelven las sombras de las tarjetas |
| **1. Componentes base** | `src/components/ui/` con los 11 componentes de 2.5 y sus pruebas (variantes, foco, `aria-*`). | Ninguno (aún no se usan) |
| **2. Configuración y Métricas** | Las más pequeñas: validan la API de los componentes. Métricas sale de `App.tsx`. | Encabezado y tarjetas uniformes |
| **3. Simulación** | Mayor volumen de hex literales (215). Enlaces → botones, `‹` y `▲` → íconos de 2.4, insignias en mayúscula inicial. Textos sin cambios. | Botones e íconos alineados con Operación |
| **4. Pedidos** | `slate/blue/rose/emerald` → tokens; título de la cola al encabezado; íconos según 2.4 c); minimapa con `simbolos.tsx`. Textos sin cambios. | Misma paleta e íconos que Operación |
| **5. Barra superior, Operación y mapa** | Solo color y tipografía (tokens). **Sus íconos no cambian**: son la referencia. | App completa uniforme |
| **6. Candados** | Eliminar alias `brand.*`; prueba o paso de CI que falle si aparece `\[#[0-9a-fA-F]{3,6}\]`, `text-\[\d+px\]` o `(slate|blue|red|green|amber|rose|emerald)-\d` en `src/components`. Actualizar `design-system.md`. | Evita la regresión |

### Criterios de aceptación

- 0 hex literales y 0 clases de color de Tailwind por defecto en `src/components` (salvo SVG del
  mapa, listados como excepción).
- Solo los 7 tamaños de texto de la escala; solo 3 alturas de control; solo 2 radios + `full`.
- Las cuatro pestañas abren con `EncabezadoPagina` y usan `Boton`, `Tarjeta`, `Insignia` y `Campo`.
- Ningún texto visible cambia de palabras (solo la caja de las insignias, ya aplicada según la regla 1
  de 2.7). Las pruebas que buscan textos, incluidas las de rúbrica, pasan sin modificarlas.
- Ningún ícono de Pedidos, Simulación, Métricas o Configuración contradice la tabla 2.4 a). Ningún
  mapa fuera de Operación usa SVG de `assets/figma/pedidos` (salvo el punto de holgura).
- Contraste AA verificado por `paleta.test.ts` para cada combinación texto/fondo usada por los
  componentes base.
- Revisión manual con Chrome DevTools (*Emulate vision deficiencies*) en las cuatro pestañas.

### Riesgo principal

Como los textos no cambian, las pruebas que buscan textos (por ejemplo *Informe de la corrida* en C79,
*Avance de la corrida*, *Hora de inicio* en C1, *Última planificación estable* en G08–G10) siguen
pasando. El riesgo pasa a la **estructura**: al mover un título a `EncabezadoPagina` o un botón a
`Boton`, hay que conservar su rol accesible y su nombre (`heading`, `button`, `progressbar`, sus
`aria-label`), porque las pruebas los buscan por ahí. Cada fase debe terminar con `npm test` en verde
sin editar ninguna prueba de `src/test/rubrica`.
