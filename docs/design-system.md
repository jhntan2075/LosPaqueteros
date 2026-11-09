# Design system de PaqTracker

Fuente única de la paleta: `paqtracker-web/tailwind.config.js` (export `paleta`). Los contrastes se
verifican en `paqtracker-web/src/config/paleta.test.ts` (`npm test`).

## Principios

1. Herramienta operativa: fondos neutros y de bajo estímulo; se mira durante horas.
2. El color significa algo. La saturación se reserva para estados que piden atención.
3. En el mapa, solo las unidades llevan color; almacenes, red vial y cuadrícula van en neutros.
4. El color nunca es la única señal: cada estado lleva además ícono y texto (✓ / ⚠ / ✕).

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
| Cara derecha (naranja) | Atención, retraso | `warn-50/500/700` |
| Hexágono (navy) | Base neutra, superficies oscuras | `neutral-50…900` |
| No está en el logo | Éxito y crítico | `ok-50/600/700`, `critical-50/600` |

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

### Mapa

| Estado de la unidad | Color |
|---|---|
| Operando con normalidad | `info-600` |
| Con retraso | `warn-500` |
| Averiada | `critical-600`, con ícono y pulso |
| Entrega completada | `ok-600` |
| Almacenes, red vial, cuadrícula | neutros |

## Validación de daltonismo (simulación Machado, ΔE76)

Un ΔE menor a 20 indica colores que se confunden.

| Par | Normal | Protanopía | Deuteranopía | Tritanopía |
|---|---|---|---|---|
| verde / rojo | 104 | **16** | 28 | 114 |
| verde / celeste | 72 | 63 | 63 | **16** |
| celeste / azul | 48 | 30 | 31 | **19** |
| naranja / rojo | 48 | 53 | 37 | 28 |

Consecuencias: verde y rojo nunca deben diferenciarse solo por color; celeste y azul no se usan
juntos como único diferenciador (por ejemplo dos tipos de ruta). Es una validación preliminar:
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
`EstadoVacio` y `Pestanas`. Para combinar clases se usa `cn` (`src/lib/clases.ts`), que conoce los
tokens propios. Reglas: un `Boton primario` por vista; lo destructivo usa `peligro` y pasa por
`DialogoConfirmacion`; insignias y estados con mayúscula inicial.

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

**Valores fijados por la rúbrica.** Algunas clases y atributos llevan el color escrito porque las
pruebas de la rúbrica los buscan tal cual (`text-[#15803D]` del semáforo, `path[stroke="#1E40AF"]` de la
ruta destacada). Esos se quedan; en oscuro, `src/index.css` los reemplaza con CSS (una regla CSS manda
sobre un atributo SVG). En el mapa y los minimapas (clase `lienzo-mapa`) se reemplazan el lienzo, la
cuadrícula, los rótulos con su halo y las rutas; los símbolos con significado (semáforo, averías,
almacenes, bloqueos, vehículos) conservan su color y su contorno blanco.

**Contraste.** `paleta.test.ts` verifica en oscuro los mismos pares que en claro (texto ≥ 4,5:1,
gráficos ≥ 3:1), los reemplazos de `index.css` y que los dos temas tengan las mismas claves.
