# Design system de PaqTracker

Fuente única de la paleta: `paqtracker-web/tailwind.config.js` (export `paleta`). Los contrastes se
verifican en `paqtracker-web/src/config/paleta.test.ts` (`npm test`).

## Principios

1. Herramienta operativa: fondos neutros y de bajo estímulo; se mira durante horas.
2. El color significa algo. La saturación se reserva para estados que piden atención.
3. En el mapa llevan color las unidades, los destinos y los almacenes intermedios (semáforo); red vial y cuadrícula en neutros.
4. El color nunca es la única señal: cada estado lleva además ícono y texto (✓ / ⚠ / ✕), y cada nivel del semáforo, su propia forma (ver "Una forma por nivel").

Donde este documento y [la especificación de mejoras UX/UI](superpowers/specs/2026-11-20-mejoras-ux-ui.md)
choquen, manda la especificación.

## Logo

El cubo isométrico tiene tres caras, y cada una da origen a un rol de la paleta.

| Archivo | Uso |
|---|---|
| `src/assets/marca/logo.svg` | Fondo claro (navbar). Copia en `public/logo.svg` |
| `src/assets/marca/logo-oscuro.svg` | Fondo navy o modo oscuro (hexágono elevado con borde) |
| `src/assets/marca/logo-monocromo.svg` | Una tinta (`currentColor`): impresión, sellos |
| `public/favicon.svg` | Favicon: sin líneas punteadas, que no se leen a 16–32 px |

## Roles y paleta

| Origen en el logo | Rol | Tokens |
|---|---|---|
| Cara izquierda (azul) | Acción y marca | `primary-50/100/600/700/900` |
| Cara superior (celeste) | Información, unidad en proceso | `info-50/600/700` |
| Cara derecha (naranja) | Atención: ajustado, nivel medio | `warn-50/500/700` |
| Hexágono (navy) | Base neutra, superficies oscuras | `neutral-50…900` |
| No está en el logo | Éxito, y lo que requiere acción (crítico, retraso, stock bajo, error) | `ok-50/600/700`, `critical-50/600` |

| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| neutral-50 | `#F8F9FA` | | primary-600 | `#1B4DD9` |
| neutral-100 | `#F1F3F5` | | primary-700 | `#153CB0` |
| neutral-200 | `#E2E5E9` | | info-600 | `#1586D7` |
| neutral-400 | `#8190AA` | | info-700 | `#0F6AAE` |
| neutral-500 | `#5F6F8C` | | warn-500 | `#FB8229` |
| neutral-700 | `#2F3C57` | | warn-700 | `#B44D08` |
| neutral-900 | `#0D152E` | | ok-600 / ok-700 | `#12805C` / `#0E6B4C` |
| | | | critical-600 | `#C81E3A` |

La escala completa (con los tonos 50, 100, 300, 600, 800, 900) está en `tailwind.config.js`.

### Reglas de uso (verificadas)

| Combinación | Contraste | Uso permitido |
|---|---|---|
| `warn-500` sobre blanco | 2.52 | Solo relleno, borde o ícono. **Nunca texto.** Con texto, `neutral-900` encima (7.15) |
| `info-600` sobre blanco | 3.87 | Íconos y barras. Para texto, `info-700` (5.69) |
| `neutral-400` sobre blanco | 3.23 | Deshabilitado o decorativo |
| `ok-600` sobre `ok-50` | 4.41 | **No cumple AA.** Sobre fondo suave usar `ok-700` |

El naranja es el color de "atención", no un acento libre: no se usa en botones ni decoración dentro
de la interfaz, para no confundirlo con una alerta.

### Significado del color

Un significado por color, con los tokens del tema (`tailwind.config.js`). Mismo significado en todas
las pantallas.

| Token | Significado |
|---|---|
| `primary` | Acción, selección, foco, ruta destacada |
| `critical` | Requiere acción: crítico, retraso, stock bajo, error, destructivo |
| `warn` | Atención: ajustado, nivel medio |
| `ok` | Bien: holgado, abastecido, en plazo, éxito |
| `info` | Estado neutro en curso: en tránsito, en ejecución |
| `neutral` | Datos sin juicio, números de KPI, chips de plazo |

- Números de KPI en neutro; solo llevan color si hay un umbral.
- El chip "Priorizado" es neutro con ícono `Zap`; el naranja queda para "Ajustado".
- "Registrar avería" no va en rojo.
- El semáforo (`src/lib/semaforo.ts`, `COLOR_SEMAFORO`) dibuja el mapa con los hex del tema claro:
  verde `ok-600` `#12805C`, ámbar `warn-700` `#B44D08`, rojo `critical-600` `#C81E3A`; el vacío va en
  `#64748B` y se dibuja hueco. Las clases de texto, fondo y borde del semáforo (`TEXTO_SEMAFORO`,
  `FONDO_SEMAFORO`, `BORDE_SEMAFORO`) usan las clases de token y cambian solas en el tema oscuro.

### Una forma por nivel

Cada nivel tiene su forma en todas partes (mapa, leyenda, paneles, filtros), definida en
`FormaNivel` y `MarcaSemaforo` (`src/components/map/simbolos.tsx`; atributo `data-forma`). Así verde y
rojo no dependen solo del color (ver "Validación de daltonismo").

| Nivel | Forma (`data-forma`) | Unidad (carga) | Destino (holgura) | Almacén intermedio (stock) |
|---|---|---|---|---|
| Verde | círculo lleno (`circulo`) | Con espacio | Holgado | Abastecido (lleno): ≥ 50 % |
| Ámbar | triángulo (`triangulo`) | Ocupación alta | Ajustado | Stock medio: 20–50 % |
| Rojo | rombo (`rombo`) | Casi lleno | Crítico, con "!" dentro | Stock crítico (bajo): < 20 % |
| Vacío / sin dato | anillo (`anillo`) | Vacío | Cerrado | Sin stock |

- Los cortes son los de `src/config/rangosSemaforo.ts` (`RANGOS_POR_DEFECTO`) y el operador los cambia
  desde la leyenda del mapa. Valores por defecto: unidad vacío = 0, ámbar ≥ 70 %, rojo ≥ 90 %;
  holgura rojo < 15 %, ámbar 15–40 %; stock rojo < 20 %, ámbar 20–50 %, verde desde 50 %.
- En el almacén intermedio el sentido es el contrario que en la unidad, porque abastece: lleno es verde
  y bajo es rojo (`nivelDeStock`, `NOMBRE_STOCK` y `RANGO_STOCK` en `src/config/glosario.ts`).
- Los destinos son marcadores circulares centrados en el nodo de entrega (`MarcadorDestino`), con
  radio según la urgencia (`RADIO_DESTINO`): cerrado 3,5 · verde 4 · ámbar 5 · entregando 6 · rojo 7 px.
  Lo urgente se dibuja encima. "Entregando" (violeta, `COLOR_EN_ENTREGA`) es un círculo con punto blanco;
  cerrado es un anillo en gris claro.

### Mapa

| Elemento | Color |
|---|---|
| Unidades | Por carga (semáforo); en el modo "Holgura", por el pedido más urgente |
| Destinos | Holgura del pedido (semáforo) y su forma |
| Almacenes intermedios | Stock (semáforo): contorno y barra interior |
| Almacén central | Neutro oscuro (sin tope de stock) |
| Ruta destacada | `#1E40AF` (azul de acción), punteada de 3 px; las demás, en gris translúcido (rojo si son tardías en el modo "Holgura") |
| Averías | Insignia con forma y color propios por tipo (círculo, rombo, octágono), fuera del semáforo |
| Bloqueos | Magenta (`COLOR_BLOQUEO`), fuera del semáforo |
| Red vial, cuadrícula, rótulos | Neutros (variables `--mapa-*`) |

Con el mapa de menos de 640 px de ancho (`ANCHO_COMPACTO_PX`) los símbolos se dibujan al 60 %
(`ESCALA_COMPACTA`); las áreas tocables no se achican.

### Movimiento en el mapa

- **Ruta destacada:** el punteado avanza hacia el destino (clase `.ruta-fluye` en `src/index.css`,
  animación `ruta-fluye` sobre `stroke-dashoffset`). Con `prefers-reduced-motion: reduce` no se anima.
- **Flechas de sentido:** con zoom a partir de `ESCALA_DETALLE_PX_KM` (20 px/km) las rutas pendientes
  no destacadas llevan una punta de flecha cada 80 px, sin animación.
- **Rutas tardías:** en el modo de color "Holgura", la ruta de una unidad con algún pedido que llega
  tarde va en `critical` (`COLOR_SEMAFORO.ROJO`).
- **Paradas:** las de la ruta destacada se numeran (1, 2, 3…) con su hora estimada.
- **Vista lejana** (escala menor que `ESCALA_DETALLE_PX_KM`): las unidades a 10 px o menos entre sí
  (`RADIO_AGRUPACION_PX`) se agrupan en un ícono con su número; tocarlo acerca el mapa. Las unidades
  seleccionadas, destacadas, averiadas o bajo el cursor siguen sueltas. Lógica en
  `src/lib/agrupacion.ts`.

## Validación de daltonismo (simulación Machado, ΔE76)

Un ΔE menor a 20 indica colores que se confunden.

| Par | Normal | Protanopía | Deuteranopía | Tritanopía |
|---|---|---|---|---|
| verde / rojo | 104 | **16** | 28 | 114 |
| verde / celeste | 72 | 63 | 63 | **16** |
| celeste / azul | 48 | 30 | 31 | **19** |
| naranja / rojo | 48 | 53 | 37 | 28 |

Consecuencias: verde y rojo nunca deben diferenciarse solo por color; celeste y azul no se usan
juntos como único diferenciador (por ejemplo dos tipos de ruta). Por eso cada nivel del semáforo tiene
además su propia forma. Es una validación preliminar:
falta revisarla en pantalla (Chrome DevTools → Rendering → Emulate vision deficiencies) y con
personas con daltonismo.

## Tipografía

Fira Sans, tres pesos (400, 500, 600; sin `font-bold`). Cifras, horas y códigos con `tabular-nums`.
Escala única definida en `tailwind.config.js` (`theme.extend.fontSize`); no se escribe `text-[Npx]`.

| Clase | Tamaño / interlínea | Uso |
|---|---|---|
| `text-caption` | 11 / 16 | Ayudas de campo, sufijos, marcas de eje |
| `text-overline` + `uppercase` | 11 / 16, 600, tracking 0.06em | Título de grupo (único uso de mayúsculas sostenidas) |
| `text-body-sm` | 12 / 16 | Tablas, listas densas, filas etiqueta/valor |
| `text-body` | 13 / 20 | Texto corriente, botones, inputs |
| `text-title-sm` | 14 / 20, 600 | Título de tarjeta o sección |
| `text-title` | 18 / 24, 600 | Título de página (uno por pantalla) |
| `text-kpi` | 22 / 28, 600 | Cifra destacada |

## Forma, tamaño y elevación

| Token | Valor | Uso |
|---|---|---|
| `rounded-control` | 6 px | Botón, input, select, pestaña |
| `rounded-card` | 10 px | Tarjeta, panel, diálogo, cajón |
| `rounded` / `rounded-full` | 4 px / píldora | Chips pequeños / insignias, puntos |
| `h-7` · `h-8` · `h-10` | 28 · 32 · 40 px | Control `sm` (barras densas) · `md` (por defecto) · `lg` (acción final de un flujo) |
| `shadow-xs` | sombra mínima | Tarjeta |
| `shadow-overlay` | sombra de capa | Cajón, popover, diálogo |
| `motion-safe:animate-entrar-derecha` | 200 ms | Entrada de cajones laterales |

Espaciado solo en la escala de 4 px de Tailwind.

## Componentes base

Las pantallas componen con `src/components/ui` en lugar de repetir clases: `Boton` (primario,
secundario, fantasma, peligro, peligro-secundario × sm/md/lg), `Campo` + `Entrada`/`Selector`,
`Insignia`, `Tarjeta`, `EncabezadoPagina`, `TituloGrupo`, `FilaDato`, `Indicador`, `Aviso`,
`EstadoCarga`, `EstadoError`, `EstadoVacio` y `Pestanas`. Para combinar clases se usa `cn` (`src/lib/clases.ts`), que conoce los
tokens propios. Reglas: un `Boton primario` por vista; lo destructivo usa `peligro` y pasa por
`DialogoConfirmacion`; insignias y estados con mayúscula inicial.

## Patrones

### Estados de carga, error y vacío

`EstadoCarga` (texto anunciado y barras de esqueleto), `EstadoError` (causa y siguiente paso, con
"Reintentar" solo si la pantalla sabe volver a pedir los datos) y `EstadoVacio` viven en
`src/components/ui`. Toda lista o pantalla que carga datos usa uno de los tres: no hay "Cargando…"
suelto. El esqueleto no se anima con `prefers-reduced-motion`.

### Confirmaciones

`DialogoConfirmacion` (`src/components/modals/DialogoConfirmacion.tsx`) recibe
`tono: 'peligro' | 'normal'`. `peligro` (por defecto, `alertdialog`) es para lo que no se puede
deshacer; `normal` (`dialog`) para lo reversible, por ejemplo "Aplicar y reiniciar". "Descartar
cambios" pide confirmación. El foco arranca en "Cancelar" con cualquier tono.

### Formularios

- El botón principal está habilitado; al enviar se marcan los errores en cada campo y el foco va al
  primero. No se deshabilita el botón para "avisar" que falta algo.
- El error se escribe en el campo: `Campo` (`src/components/ui/Campo.tsx`) pone `aria-invalid` y
  `aria-describedby` al control y muestra el mensaje en lugar de la ayuda.
- Sin correcciones silenciosas: si un valor no es válido se dice cuál es el problema; la interfaz no
  lo cambia por su cuenta. Los decimales se leen con `leerDecimal` (acepta "1,2" y "1.2").

### Celular (menos de 768 px)

El corte es el `md` de Tailwind y se lee con `useAnchoAngosto` (`src/hooks/useAnchoAngosto.ts`).
Las áreas táctiles miden al menos 44 px (`h-11` / `size-11` en el menú de módulos, la barra superior y
los menús de acciones). Reglas por pantalla en la especificación (§4): encabezado a lo ancho con las
acciones debajo, tarjetas en vez de tablas, filtros en una hoja inferior, y una barra fija con la
acción principal en Simulación.

### Textos y formatos

Un solo término por concepto (`src/config/glosario.ts`; si un término cambia, cambia ahí):

| Concepto | Término único | Se retira |
|---|---|---|
| Vehículo | Unidad | Vehículo |
| Cantidad | paquetes / paq. | unidades de P, u. |
| Ejecución de simulación | Simulación | corrida (en textos visibles) |
| Pedido en ruta | En tránsito | En camino |
| Estado de simulación (`NOMBRE_ESTADO_SIMULACION`) | En curso · Completada · Detenida · Colapsada | En ejecución, Finalizada, Interrumpida, Colapso detectado |
| Nivel de holgura cerrado | Cerrado | Resuelto |

Los formatos salen de `src/lib/formato.ts`; no se arman a mano:

| Dato | Función | Ejemplo |
|---|---|---|
| Holgura | `formatearHolguraLegible` | "1 h 07 min", "38 min", "1 h 07 min tarde" (nunca "-01:07" ni % negativo) |
| Duración | `formatearDuracion` | "19 h 19 min" (nunca "1159 min") |
| Número | `formatearNumero` | "2 464", "65,4" (coma decimal, espacio de miles) |
| Moneda | `formatearSoles` | "S/ 1,20" |
| Instante de operación | `formatearInstante` | "13:15" el mismo día que la referencia; "20/11 13:15" si no |

## Íconos

`lucide-react` con trazo por defecto. La referencia son los íconos de Operación (tabla en
`propuesta-unificacion-ui.md` §2.4): mismo concepto, mismo ícono en todas las pestañas. Tamaños:
12 px (`size-3`, en chips), 14 px (`size-3.5`, por defecto), 16 px (`size-4`, botones `lg`, barra
superior, controles del mapa) y 18 px (solo la barra de paneles). Los símbolos del mapa
(`map/simbolos.tsx`, `map/iconosVehiculo.ts`) se usan en todo mapa o minimapa.

## Candado

`src/config/estilos.test.ts` falla si en `src/components` o `App.tsx` aparece un color hex en una
clase (`bg-[#…]`), un `text-[Npx]`, una clase de color por defecto de Tailwind (`slate-500`,
`blue-600`…), `font-bold`, `bg-white` (va `bg-superficie`), o un color hex como texto fuera del
dibujo del dominio (`components/map/` y la ilustración del login, que declaran colores de SVG como
dato). Las pocas excepciones están listadas en la propia prueba, cada una con la prueba de rúbrica que
verifica ese valor literal.

## Tema oscuro

Se activa con la clase `oscuro` en `<html>`. El usuario elige en el selector de la barra superior
(`layout/SelectorTema.tsx`): claro, oscuro o automático (el del sistema operativo, por defecto, que se
sigue también con la aplicación abierta). La elección se guarda en el navegador (`paqtracker.tema`) y un
script en `index.html` la aplica antes de dibujar la página, para que no destelle en blanco.

**Cómo funciona.** `tailwind.config.js` tiene los dos temas en hexadecimal (`paleta` y
`paletaOscura`, más los colores por función de `semanticos`) y un plugin genera con ellos las variables
CSS (`--color-neutral-50: 248 249 250`). Las clases leen la variable del tema activo, así que los
componentes no cambian: `text-neutral-900` es casi negro en claro y casi blanco en oscuro. Al imprimir
rige siempre el claro.

**Escala neutra invertida.** En oscuro, `neutral-50…200` son superficies y bordes oscuros y
`neutral-600…900`, textos claros. Los colores de estado suben de brillo (`primary-600` #5B85F7,
`critical-600` #F2627A, `ok-600` #2DB07F…) y sus fondos `-50` son tonos oscuros del mismo color.

**Colores por función** (no son un tono de la escala):

| Token | Uso | Claro | Oscuro |
| --- | --- | --- | --- |
| `fondo` | Lienzo de la aplicación | `#FFFFFF` | `#0B1120` |
| `superficie` | Tarjetas, paneles, diálogos | `#FFFFFF` | `#111A2C` |
| `inverso` / `sobre-inverso` | Avisos y descripciones emergentes, y su texto | `#0D152E` / blanco | `#E8ECF3` / `#0D152E` |
| `sobre-color` | Texto sobre un relleno de color (botón primario, contador) | blanco | `#0B1120` |
| `velo` | Capa detrás de un diálogo (`bg-velo/40`) | `#0D152E` | negro |
| `marca` | Panel de marca del login, igual en los dos temas | `#0D152E` | `#0D152E` |

**Valores fijados por la rúbrica.** Algunos valores llevan el color escrito porque las pruebas de la
rúbrica los buscan tal cual: `bg-[#1E40AF]` del hito más reciente de la trazabilidad y el azul
`#1E40AF` de la ruta destacada y la selección del mapa (`path[stroke="#1E40AF"]`). Esos se quedan; en
oscuro, `src/index.css` los reemplaza con CSS (una regla CSS manda sobre un atributo SVG). El semáforo
ya no está entre ellos: usa los tokens de tema.

### Mapa y tema oscuro

Los colores propios del lienzo del mapa y los minimapas (clase `lienzo-mapa`) son variables `--mapa-*`
declaradas en `:root` (claro) y redefinidas en `:root.oscuro` en `src/index.css`:

| Variable | Qué pinta |
|---|---|
| `--mapa-cuadricula` | Cuadrícula |
| `--mapa-borde` | Borde de la malla y fondo de las barras de carga |
| `--mapa-rotulo` | Rótulos secundarios (carga de las unidades, nombre de los almacenes) |
| `--mapa-rotulo-fuerte` | Hora de regreso de las averías y de las paradas |
| `--mapa-eje` | Rótulos de los ejes |
| `--mapa-halo` | Contorno de los rótulos |
| `--mapa-ruta` | Tramo pendiente y su muestra en la leyenda (igual en ambos temas) |
| `--mapa-recorrido` | Tramo ya recorrido |
| `--mapa-sobre-acento` | Número dentro de la insignia de parada, sobre el azul de la ruta |

`GridMap`, `MiniMapaMalla` y `LeyendaMapa` las usan como atributos de presentación
(`stroke="var(--mapa-cuadricula)"`). **Regla:** no se agregan reemplazos oscuros que busquen un hex
exacto para un color del lienzo; si el mapa necesita un color nuevo, se agrega una variable `--mapa-*`
con su valor claro y su valor oscuro. Quedan como reemplazo por hex solo el azul `#1E40AF` (la rúbrica
lo lee en el DOM), el fondo y la cuadrícula del minimapa y el centro del destino cerrado. Los símbolos
con significado (semáforo, averías, almacenes, bloqueos, vehículos) conservan su color y su contorno
blanco.

**Contraste.** `paleta.test.ts` verifica en oscuro los mismos pares que en claro (texto ≥ 4,5:1,
gráficos ≥ 3:1), los reemplazos de `index.css` y que los dos temas tengan las mismas claves.
