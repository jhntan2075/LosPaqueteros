# Design system de PaqTracker

Fuente única de la paleta: `paqtracker-web/tailwind.config.js` (export `paleta`). Los contrastes se
verifican en `paqtracker-web/src/config/paleta.test.ts` (`npm test`).

## Principios

1. Herramienta operativa: fondos neutros y de bajo estímulo; se mira durante horas.
2. El color significa algo. La saturación se reserva para estados que piden atención.
3. En el mapa, el color de cada objeto es su semáforo (carga, stock u holgura); red vial y
   cuadrícula van en neutros.
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
| neutral-50 | `#F4F6FA` | | primary-600 | `#1B4DD9` |
| neutral-100 | `#E8ECF3` | | primary-700 | `#153CB0` |
| neutral-200 | `#D3DAE6` | | info-600 | `#1586D7` |
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

Cada objeto del mapa toma el color de su semáforo, con los mismos tres tonos de relleno
(`COLOR_NIVEL` en `src/config/colores.ts`): `ok-600`, `warn-500` y `critical-600`. Los cortes
salen de `src/config/glosario.ts` y la leyenda flotante los muestra.

| Objeto | Qué mide el color | Verde | Ámbar | Rojo |
|---|---|---|---|---|
| Unidad | Carga sobre capacidad (`RANGO_OCUPACION`) | bajo el corte ámbar | entre cortes | desde el corte rojo |
| Almacén intermedio | Stock sobre capacidad (`RANGO_INVENTARIO`) | sobre el corte ámbar | entre cortes | bajo el corte rojo |
| Pin de destino | Holgura restante del plazo (`RANGO_HOLGURA`) | sobre el corte ámbar | entre cortes | bajo el corte rojo |

- Unidad averiada: `critical-600` con ícono y pulso, sin importar su carga.
- Pedido cerrado (entregado o incumplido): `neutral-400`.
- Almacén principal, red vial y cuadrícula: neutros.
- El color nunca va solo: el tooltip y el detalle dicen el nivel en texto (`NOMBRE_HOLGURA`,
  `NOMBRE_INVENTARIO`).

## Tipografía

Fira Sans en todo el sistema (pesos y números tabulares en `paqtracker-web/README.md`). Cinco
tamaños, definidos en `tailwind.config.js` (`theme.extend.fontSize`):

| Clase | Tamaño | Uso |
|---|---|---|
| `text-caption` | 11 px | Metadatos, notas al pie, rótulos de ejes |
| `text-body` | 12 px | Texto de interfaz por defecto: tablas, paneles, botones chicos |
| `text-body-lg` | 14 px | Diálogos, formularios, títulos de sección |
| `text-title` | 18 px | Títulos de página |
| `text-display` | 22 px | Cifras y relojes destacados |

No se usan tamaños sueltos (`text-[13px]`) ni la escala por defecto de Tailwind (`text-xs`,
`text-sm`, `text-lg`…). En SVG, `fontSize` usa los mismos valores en px.

## Componentes base

En `paqtracker-web/src/components/ui/`. Aceptan `className` y lo combinan con `cn()`
(`src/lib/clases.ts`, clsx + tailwind-merge con la escala propia), así una clase del llamador
reemplaza a la del componente en vez de competir con ella.

| Componente | Variantes | Uso |
|---|---|---|
| `Boton` | `variante`: `primario`, `secundario`, `peligro`; `tamano`: `sm` (30 px), `md` (34 px), `lg` (40 px) | Toda acción. Un solo primario por vista; `peligro` solo para acciones destructivas. `type="button"` por defecto. |
| `Etiqueta` | `tono`: `neutro`, `primario`, `info`, `ok`, `atencion`, `critico`; `punto` (`true` o `'pulso'`) | Estados de pedido, corrida y ejecución. Fondo y texto ya pasan AA. |
| `Campo` (y `CLASE_CAMPO`) | — | Entradas de texto, fecha y número: 34 px, borde `neutral-300`, placeholder `neutral-500` (AA), foco `primary-600`. |
| `Tarjeta` | `elevada`; `como`: `div`, `section`, `aside` | Superficies de contenido. `elevada` para lo que flota sobre el mapa. |

Quedan fuera a propósito los botones con forma propia: íconos del mapa, pestañas, filas
seleccionables, enlaces de texto y el contorno rojo de "Detener simulación".

## Pantallas angostas

Los paneles laterales sobre el mapa miden `min(340px, 100% − 24px)`. Si junto al panel quedan
menos de 360 px de mapa, el panel se superpone y el encuadre del mapa no lo descuenta
(`panelQueDescuenta` en `GridMap.tsx`).

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

## Uso en el código

- **Clases**: los componentes usan solo clases de token (`bg-primary-600`, `text-neutral-500`,
  `border-critical-600/30`…). Texto en el tono que pasa AA sobre su fondo (por ejemplo `warn-700`,
  `ok-700` sobre `ok-50`, `neutral-600` sobre `neutral-100`); relleno, borde e ícono en el tono base.
- **SVG y estilos en línea** (mapa, símbolos, íconos recoloreados): constantes de
  `src/config/colores.ts` (`PRIMARIO`, `CRITICO`, `ATENCION`, `OK`, `NEUTRO[…]`, `COLOR_NIVEL`),
  que salen de la misma `paleta`.
- **Assets de Figma** (`src/assets/figma/pedidos/*.svg`): ya usan los valores de la paleta.
- **Guarda**: `src/config/sinColoresFijos.test.ts` falla si un componente vuelve a usar un hex
  literal, la paleta por defecto de Tailwind (`slate`, `blue`, `rose`…) o un tamaño de texto
  fuera de la escala (`text-[13px]`, `text-sm`…).

Los alias heredados `brand.*` se retiraron: ningún componente los usa.
