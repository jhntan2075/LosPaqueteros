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

## Estado de la migración

Los tokens y alias `brand.*` ya existen, pero la mayoría de los componentes siguen usando hex
literales del diseño anterior (`#1E40AF`, `#64748B`, etc.). Migrarlos a las clases de token
(`bg-primary-600`, `text-neutral-500`…) es el siguiente paso; este cambio no los toca.
