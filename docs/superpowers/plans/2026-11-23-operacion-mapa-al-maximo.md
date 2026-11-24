# Operación con el mapa al máximo · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar la pantalla de Operación de `paqtracker-web` para que el mapa 70 × 50 km ocupe todo el alto disponible y la información del día quede visible alrededor (barra superior y paneles laterales). Se suman además lo que requiere atención ordenado por gravedad, un buscador con sugerencias, la opción de seguir una unidad, ayuda y atajos, un lienzo legible en tema oscuro y un mínimo para celular, sin perder ningún ítem de la rúbrica 91.EvaSw (Sí3, Sí4 y Sí5).

**Architecture:** El mapa fija su tamaño por la proporción de la malla y los paneles usan solo el ancho que la malla no aprovecha. `ModuloOperacion` pasa de "mapa con panel flotante encima" a tres columnas:
- *Estado de la operación* (izquierda, nueva): recursos y requiere atención.
- *Mapa* (centro).
- *Panel lateral y barra de pestañas* (derecha): los mismos componentes de hoy, fuera del mapa.

Los indicadores globales y del día suben a la barra superior por un portal (`EnBarraSuperior`), así siguen dentro del árbol de React de Operación y las pruebas los encuentran aunque no se monte la barra. Simulación no cambia: todo prop nuevo es opcional y su valor por defecto mantiene el comportamiento actual.

**Tech Stack:** React 18 + TypeScript 6, Tailwind 3.4 (tokens propios en `tailwind.config.js`), Vitest 5 + Testing Library + jsdom, `lucide-react`, oxlint.

**Spec:** prototipo `docs/prototipos/operacion-mapa-central.html` (abrir con `?paneles=abiertos` para verlo con los paneles abiertos) y la rúbrica `docs/91.EvaSw_Autoevaluacion_Eq2B.xlsx` (hoja Davila, ítems C, D, E, F y G). El estado de cada ítem en `main` está en `REPORTE_AUTOEVAL.md`. La prueba en celular de la fase 6 está en `docs/plan-rubrica-equipo4.md`.

## Global Constraints

- Todo dentro de `paqtracker-web/`. Rutas de este plan relativas a `paqtracker-web/src/` salvo que digan otra cosa. Los comandos se corren desde `paqtracker-web/`.
- Rama `feature/rediseñomapa` (ya existe). Commits en español con el formato del repo (`feat(operacion): …`, `refactor(map): …`, `test(rubrica): …`, `docs: …`). **Sin línea `Co-Authored-By`.**
- Las pruebas de `src/test/rubrica/` son el criterio de aceptación y deben quedar en verde. Solo se editan las que este plan nombra, y solo como indica.
- Candado visual (`src/config/estilos.test.ts`): nada de hex en clases (`bg-[#…]`), `text-[Npx]`, colores por defecto de Tailwind (`slate-500`…), `font-bold` ni `bg-white`. Usar tokens (`bg-superficie`, `bg-fondo`, `text-neutral-600`, `text-critical-600`…) y la escala tipográfica (`text-caption`, `text-body-sm`, `text-body`, `text-title-sm`, `text-kpi`). Los colores del dominio (semáforo, averías, bloqueo) se importan de `lib/semaforo.ts` y `components/map/`, no se escriben.
- Textos de la interfaz en español, con mayúscula inicial y con el vocabulario de `config/glosario.ts` (`NOMBRE_CARGA`, `NOMBRE_HOLGURA`, `nombreAveria`, `alertaStockBajo`).
- El color nunca es la única señal: cada estado lleva ícono o texto además del color.
- Simulación (`components/simulacion/CorridaSimulacion.tsx`) no se toca y debe verse igual.
- Cierre de cada tarea: `npx vitest run` completo y `npm run lint` sin errores.

## Decisiones respecto del prototipo

Ya están tomadas; no se reabren:

1. **Se conserva la navegación maestro–detalle de `main`** (`useNavegacionPanel`: un clic resalta la fila, otro abre el detalle, "‹ Volver"). No se implementa la ficha fija sobre la lista: `main` ya cumple F01, F02, F03 y F05 con pruebas.
2. **Sin pestaña "Vías" ni resaltado por cifra ("foco")**. La API solo envía los bloqueos vigentes (D04), así que no hay "programados" que listar. Las cifras abren la lista que corresponde.
3. **Las pestañas Resumen e Incidencias dejan de estar en Operación** (siguen en Simulación). Su contenido pasa a la barra superior (indicadores y reporte de cierre) y al panel izquierdo (*Requiere atención*).
4. **Cumplimiento sin meta inventada**: el ícono usa `indicadores.estadoSemaforoGlobal` de la API (VERDE ✓, AMBAR ⚠, ROJO ✕).
5. **Los dos paneles empiezan cerrados (E01, C11)**. El izquierdo es una franja de 44 px con contador y el derecho es la barra de pestañas actual. El izquierdo recuerda si quedó abierto (`localStorage`); el derecho ya lo recuerda en la URL (`?panel=`).
6. **`FooterBar` no se muestra en Operación**. Sus cifras están arriba y a la izquierda, el aviso "sin actualizaciones" pasa a la insignia de conexión y la coordenada bajo el cursor se muestra sobre el mapa. En Pedidos y Métricas sigue igual.
7. **Navegación de módulos**: los módulos inactivos se muestran solo con ícono por debajo de `2xl` (nombre en `aria-label` y `title`). No hay menú desplegable.
8. **"Pedido espera unidad"**: alerta para un pedido en estado *En espera* registrado hace `UMBRAL_ESPERA_UNIDAD_MIN = 30` minutos o más. Es una constante en `config/dominio.ts`; el valor es inicial y se puede ajustar.
9. **Lienzo del mapa**: es un token semántico nuevo, `lienzo-mapa`. En tema claro vale `#FFFFFF` y en oscuro `#EEF1F5`: el mapa queda claro en los dos temas porque sus símbolos tienen colores fijos medidos sobre fondo claro.

## Review Focus

- **Pantallas de 1366 × 768 y 390 × 844 (celular)**: la barra superior no desborda ni tiene scroll horizontal; en celular el resumen del día pasa al panel de estado (Tareas 2, 10 y 14).
- **Atajos mientras se escribe**: `[`, `]`, `f`, `l`, `/` o `?` tecleados en el buscador, en un campo o con un diálogo abierto no actúan (Tarea 12).
- **`Esc` con la leyenda, los filtros o las sugerencias abiertas** cierra solo eso y no quita la selección (Tareas 5, 6 y 12).
- **Enter en el buscador sin elegir una sugerencia** busca la coincidencia exacta, como hoy (C61, C68, C74; Tarea 5).
- **Seguir una unidad y mover el mapa a mano**: arrastrar, usar la rueda o los botones de zoom deja de seguirla; si la unidad vuelve al almacén, también (Tarea 12).

---

## Mapa de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `components/layout/RelojesBarra.tsx` | Tiempos transcurridos (C13, C15); versión compacta en celular | 1 |
| `components/layout/RanuraBarraSuperior.tsx` (nuevo) | Ranura en la barra y portal `EnBarraSuperior` | 2 |
| `components/layout/TopNavbar.tsx`, `FooterBar.tsx` | Ranura, navegación compacta, aviso de dato viejo | 2 |
| `lib/formato.ts`, `components/reporte/BotonReporteCierre.tsx` (nuevo), `components/operacion/PulsoOperacion.tsx` (nuevo) | Indicadores G01–G04, resultados del día y reporte G09 | 3 |
| `tailwind.config.js`, `config/paleta.test.ts`, `components/map/GridMap.tsx` | Token `lienzo-mapa` | 4 |
| `lib/busquedaMapa.ts` (nuevo), `components/map/BuscadorMapa.tsx` (nuevo), `GridMap.tsx` | Buscador con sugerencias accesible | 5 |
| `components/map/GridMap.tsx`, `hooks/useCerrarConEscape.ts` | Opciones nuevas del mapa y su handle; `Esc` que no choca | 6 |
| `hooks/useListaEstable.ts` (nuevo), `EstadoFlota.tsx`, `ListaPedidos.tsx` | Listas que no se reordenan bajo el cursor | 7 |
| `hooks/useRegistroAveria.tsx` (nuevo), `components/operacion/ListaIncidencias.tsx` (nuevo), `PanelLateral.tsx` | Registro de avería e incidencias reutilizables | 8 |
| `types/operacion.ts`, `services/adaptadorOperacion.ts`, `config/dominio.ts`, `lib/atencion.ts` (nuevo), `components/operacion/ListaAtencion.tsx` (nuevo) | Requiere atención ordenado y filtrable | 9 |
| `hooks/useConsultaMedios.ts` (nuevo), `RecursosOperacion.tsx` (nuevo), `PanelEstado.tsx` (nuevo) | Panel izquierdo | 10 |
| `BarraPaneles.tsx`, `PanelLateral.tsx`, `hooks/useNavegacionPanel.ts` | Panel derecho como columna, "Seguir en el mapa", limpiar selección | 11 |
| `lib/preferencias.ts`, `hooks/useAtajosOperacion.ts`, `DialogoAyudaOperacion.tsx` (los tres nuevos), `ModuloOperacion.tsx` | Distribución, enfoque, atajos, ayuda, seguir | 12 |
| `App.tsx` | Conexión de todo | 13 |
| `docs/design-system.md`, `CHANGELOG.md`, `REPORTE_AUTOEVAL.md` (raíz del repo) | Documentación y verificación | 14 |

---

### Task 1: Tiempos transcurridos en los relojes de la barra (C13, C15 en Operación)

**Files:**
- Modify: `components/layout/RelojesBarra.tsx`
- Test: `test/rubrica/rubrica.tiempos-flota.test.tsx` (agregar un `describe` al final)

**Interfaces:**
- Produces: `RelojesBarra` con props `{ operacion: string; transcurridoOperacionMs?: number; inicioReal?: Date | null }`. Los grupos conservan sus `aria-label`: `'Reloj de la operación día a día'` y `'Fecha y hora real'`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```tsx
describe('Rúbrica · C13 y C15 · tiempos transcurridos en Operación', () => {
  it('C13 · el reloj de la operación muestra el tiempo transcurrido desde su inicio', () => {
    const ms = ((1 * 1440 + 2 * 60 + 3) * 60 + 4) * 1000;
    render(<RelojesBarra operacion="28 oct 2026 · 15:04:05" transcurridoOperacionMs={ms} />);
    expect(screen.getByRole('group', { name: 'Reloj de la operación día a día' }).textContent).toContain('+1 d 02 h 03 m');
  });
  it('C15 · el reloj real muestra el tiempo real transcurrido y avanza cada segundo', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 9, 28, 15, 4, 5));
    try {
      render(<RelojesBarra operacion="28 oct 2026 · 15:04:05" inicioReal={new Date(2026, 9, 28, 14, 0, 0)} />);
      const real = () => screen.getByRole('group', { name: 'Fecha y hora real' }).textContent;
      expect(real()).toContain('+1:04:05');
      act(() => vi.advanceTimersByTime(1000));
      expect(real()).toContain('+1:04:06');
    } finally {
      vi.useRealTimers();
    }
  });
  it('sin datos de inicio no muestra transcurridos', () => {
    render(<RelojesBarra operacion="28 oct 2026 · 15:04:05" />);
    expect(screen.getByRole('group', { name: 'Reloj de la operación día a día' }).textContent).not.toContain('+');
  });
  it('en celular la fecha y el transcurrido de la operación se ocultan (sm)', () => {
    render(<RelojesBarra operacion="28 oct 2026 · 15:04:05" transcurridoOperacionMs={60_000} />);
    expect(screen.getByText('+0 d 00 h 01 m').className).toContain('hidden sm:inline');
  });
});
```

Importar `RelojesBarra` y, si falta, `act`.

- [ ] **Step 2: Confirmar que fallan.** `npx vitest run src/test/rubrica/rubrica.tiempos-flota.test.tsx` → FAIL en las pruebas nuevas.

- [ ] **Step 3: Implementarlo**

`Reloj` recibe un `transcurrido?: string` y lo muestra junto a la hora en `<span className="hidden sm:inline text-caption text-neutral-600 tabular-nums">`. Los textos son:
- operación: `'+' + formatearDiasHoras(transcurridoOperacionMs)`;
- real: `'+' + formatearCronometro(ahora.getTime() - inicioReal.getTime())`, con `ahora` de `useAhora()`.

El `span` de la fecha de operación también lleva `hidden sm:inline`. El reloj real ya se oculta bajo `md`.

- [ ] **Step 4: Confirmar que pasan.** El mismo comando → PASS (C35–C41 y C16 siguen en verde).

- [ ] **Step 5: Commit.** `git commit -m "feat(layout): tiempos transcurridos de la operación y real en la barra"` (con los dos archivos).

---

### Task 2: Ranura en la barra superior y barra compacta

**Files:**
- Create: `components/layout/RanuraBarraSuperior.tsx`
- Modify: `components/layout/TopNavbar.tsx`, `components/layout/FooterBar.tsx` (agregar `export` a `SEGUNDOS_SIN_ACTUALIZAR`)
- Test: `components/layout/RanuraBarraSuperior.test.tsx` y `components/layout/TopNavbar.test.tsx` (nuevos)

**Interfaces:**
- Consumes: `RelojesBarra` (Tarea 1).
- Produces:
  - `export const ID_RANURA_BARRA_SUPERIOR = 'ranura-barra-superior'`
  - `export const RanuraBarraSuperior: React.FC` → `<div id={ID_RANURA_BARRA_SUPERIOR} className="flex-1 min-w-0 flex items-center justify-center px-2" />`
  - `export const EnBarraSuperior: React.FC<{ visible?: boolean; children: React.ReactNode }>` (`visible` vale `true` por defecto)
  - `TopNavbar` con props opcionales nuevas `transcurridoOperacionMs?: number`, `inicioReal?: Date | null` y `segundosDesdeActualizacion?: number`

- [ ] **Step 1: Escribir las pruebas que fallan**

```tsx
// RanuraBarraSuperior.test.tsx
it('con la ranura montada, el contenido va dentro de la ranura', () => {
  render(<><RanuraBarraSuperior /><div data-testid="otro"><EnBarraSuperior><span>Pulso</span></EnBarraSuperior></div></>);
  expect(document.getElementById(ID_RANURA_BARRA_SUPERIOR)!.textContent).toBe('Pulso');
  expect(screen.getByTestId('otro').textContent).toBe('');
});
it('sin ranura, el contenido se muestra en su lugar', () => {
  render(<div data-testid="otro"><EnBarraSuperior><span>Pulso</span></EnBarraSuperior></div>);
  expect(screen.getByTestId('otro').textContent).toBe('Pulso');
});
it('con visible=false no muestra nada', () => {
  render(<><RanuraBarraSuperior /><EnBarraSuperior visible={false}><span>Pulso</span></EnBarraSuperior></>);
  expect(screen.queryByText('Pulso')).toBeNull();
});

// TopNavbar.test.tsx
it('incluye la ranura', () => {
  render(<TopNavbar tabActiva="operacion" onCambiarTab={() => {}} />);
  expect(document.getElementById(ID_RANURA_BARRA_SUPERIOR)).toBeTruthy();
});
it('los módulos inactivos muestran su nombre desde 2xl y lo conservan como nombre accesible', () => {
  render(<TopNavbar tabActiva="operacion" onCambiarTab={() => {}} />);
  expect(screen.getByRole('button', { name: 'Pedidos' }).querySelector('span')!.className).toContain('hidden 2xl:inline');
  expect(screen.getByRole('button', { name: 'Operación' }).querySelector('span')!.className).toContain('hidden xl:inline');
});
it('avisa cuando no llegan instantáneas hace 10 s o más', () => {
  render(<TopNavbar tabActiva="operacion" onCambiarTab={() => {}} segundosDesdeActualizacion={15} />);
  expect(screen.getByText('Sin datos hace 15 s')).toBeTruthy();
});
it('pasa los tiempos transcurridos a los relojes', () => {
  render(<TopNavbar tabActiva="operacion" onCambiarTab={() => {}} relojSimulado="28 oct 2026 · 15:04:05" transcurridoOperacionMs={3_600_000} />);
  expect(screen.getByRole('group', { name: 'Reloj de la operación día a día' }).textContent).toContain('+0 d 01 h 00 m');
});
```

- [ ] **Step 2: Confirmar que fallan.** `npx vitest run src/components/layout` → FAIL.

- [ ] **Step 3: Implementar `EnBarraSuperior`**

Un estado `destino: HTMLElement | null | undefined` (`undefined` = todavía no se buscó) que se fija en un `useLayoutEffect` con `document.getElementById(ID_RANURA_BARRA_SUPERIOR)`. El render devuelve:
- `null` si `!visible` o si `destino === undefined`;
- `createPortal(children, destino)` si hay ranura;
- `<div className="shrink-0 px-2 pt-2">{children}</div>` si no la hay.

- [ ] **Step 4: Implementar los cambios de `TopNavbar`**

- Poner `<RanuraBarraSuperior />` entre el grupo izquierdo y el derecho, y quitar `overflow-x-auto` del izquierdo.
- El `span` del rótulo de cada módulo lleva `esActivo ? 'hidden xl:inline' : 'hidden 2xl:inline'`. Cada botón lleva `aria-label={item.label}` y `title={item.label}`.
- "PaqTracker" pasa a `hidden 2xl:inline` y la insignia de turno a `hidden 2xl:inline-flex`. En el contenedor derecho, `gap-1 sm:gap-3`.
- Los props `transcurridoOperacionMs` e `inicioReal` se pasan a `RelojesBarra`.
- Si `conectado && segundosDesdeActualizacion >= SEGUNDOS_SIN_ACTUALIZAR`, la insignia de conexión usa `tono="warn"` y muestra `Sin datos hace ${s} s` (`${Math.floor(s / 60)} min` desde 60 s).

- [ ] **Step 5: Confirmar que pasan.** `npx vitest run src/components/layout src/test/rubrica/rubrica.tiempos-flota.test.tsx` → PASS (C36 sigue en verde).

- [ ] **Step 6: Commit.** `git commit -m "feat(layout): ranura en la barra superior y navegación compacta"`

---

### Task 3: Pulso de la operación (G01–G04, resultados del día, G09)

**Files:**
- Modify: `lib/formato.ts`, `lib/formato.test.ts`, `components/metricas/ModuloMetricas.tsx` (reemplazar su `formatoPorcentaje` local), `components/operacion/ResumenOperacion.tsx`
- Create: `components/reporte/BotonReporteCierre.tsx`, `components/operacion/PulsoOperacion.tsx`
- Test: `components/operacion/PulsoOperacion.test.tsx` (nuevo)

**Interfaces:**
- Produces:
  - `export const formatearPorcentaje = (valor: number): string`. Recibe 0–100: `100` → `"100,0 %"`.
  - `export const BotonReporteCierre: React.FC<{ compacto?: boolean }>`. Usa `useDatosOperacion()`. Su nombre accesible es `'Generar reporte de cierre'` en el día a día y `'Ver la última planificación'` en otra ejecución. Abre `DialogoReporteCierre` igual que hoy.
  - `export const PulsoOperacion: React.FC<{ onSeleccionar: (s: SeleccionPanel) => void }>`

- [ ] **Step 1: Escribir las pruebas que fallan**

En `lib/formato.test.ts`: `formatearPorcentaje(100)` → `'100,0 %'`; `formatearPorcentaje(94.25)` → `'94,3 %'`.

`PulsoOperacion.test.tsx` usa `renderConDatos`, `datosRubrica` y `prepararEntornoMapa` de `src/test/rubrica/`:

```tsx
it('G01–G04 · incluye los indicadores globales', () => {
  renderConDatos(<PulsoOperacion onSeleccionar={() => {}} />);
  const g = within(screen.getByRole('region', { name: 'Ocupación global' }));
  expect(g.getByRole('button', { name: /^Flota: 78 %/ })).toBeTruthy();
  expect(g.getByRole('button', { name: /^Almacenes: 25 %/ })).toBeTruthy();
});
it('muestra los resultados del día de la API', () => {
  renderConDatos(<PulsoOperacion onSeleccionar={() => {}} />);
  const dia = within(screen.getByRole('region', { name: 'Resultados del día' }));
  expect(dia.getByRole('button', { name: /^Cumplimiento: 100,0 %/ })).toBeTruthy();
  expect(dia.getByRole('button', { name: /^En camino: 2 pedidos/ })).toBeTruthy();
  expect(dia.getByRole('button', { name: /^En espera de unidad: 1/ })).toBeTruthy();
  expect(dia.getByRole('button', { name: /^Entregados hoy: 1, 0 con retraso/ })).toBeTruthy();
});
it('los resultados abren Pedidos; los indicadores, Flota y Almacenes', () => {
  const onSeleccionar = vi.fn();
  renderConDatos(<PulsoOperacion onSeleccionar={onSeleccionar} />);
  fireEvent.click(screen.getByRole('button', { name: /^En camino/ }));
  expect(onSeleccionar).toHaveBeenLastCalledWith({ tipo: 'pedidos' });
  fireEvent.click(screen.getByRole('button', { name: /^Almacenes: 25 %/ }));
  expect(onSeleccionar).toHaveBeenLastCalledWith({ tipo: 'almacenes' });
});
it('prioridad en pantallas angostas', () => {
  renderConDatos(<PulsoOperacion onSeleccionar={() => {}} />);
  expect(screen.getByRole('button', { name: /^En espera/ }).className).toContain('hidden xl:flex');
  expect(screen.getByRole('button', { name: /^Entregados hoy/ }).className).toContain('hidden 2xl:flex');
});
it('G09 · el reporte de cierre está en el pulso', () => {
  renderConDatos(<PulsoOperacion onSeleccionar={() => {}} />, datosRubrica({ tipoEscenario: 'DIA_A_DIA' }));
  expect(screen.getByRole('button', { name: 'Generar reporte de cierre' })).toBeTruthy();
});
```

- [ ] **Step 2: Confirmar que fallan.** `npx vitest run src/lib/formato.test.ts src/components/operacion/PulsoOperacion.test.tsx` → FAIL.

- [ ] **Step 3: Implementar `formatearPorcentaje` y usarlo en `ModuloMetricas`.**

- [ ] **Step 4: Sacar `BotonReporteCierre` de `ResumenOperacion`**

El estado `generadoEn`, el `Boton` (`icono={ClipboardList}`) y el `DialogoReporteCierre` se mueven tal cual. Con `compacto`, el botón usa `tamano="sm"` y `variante="secundario"`, muestra el texto "Reporte de cierre" en un `span` `hidden xl:inline` y conserva el nombre completo en `aria-label`. `ResumenOperacion` usa `<BotonReporteCierre />` y mantiene su párrafo explicativo.

- [ ] **Step 5: Implementar `PulsoOperacion`**

Una fila `flex items-center gap-2` con:
1. `<IndicadoresGlobales flota={ocupacionFlota(datos.flota)} almacenes={ocupacionAlmacenes(datos.almacenes)} onAbrirFlota={() => onSeleccionar({ tipo: 'flota' })} onAbrirAlmacenes={() => onSeleccionar({ tipo: 'almacenes' })} />`.
2. `<section aria-label="Resultados del día">`: una píldora `h-8` con el estilo de `IndicadoresGlobales` y cuatro botones que llaman a `onSeleccionar({ tipo: 'pedidos' })`. Cada botón tiene una etiqueta `text-caption` y una cifra `text-body` semibold tabular:

| Rótulo | Cifra | `aria-label` | Visibilidad |
|---|---|---|---|
| Cumplimiento | `formatearPorcentaje(i.porcentajeCumplimiento)` y la marca del semáforo global: VERDE `✓` en `text-ok-700`, AMBAR `⚠` en `text-warn-700`, ROJO `✕` en `text-critical-600` | `Cumplimiento: ${pct}. Ver pedidos` | siempre |
| En camino | `i.pedidosEnTransito` y, si `resumenRiesgo(datos).rojo > 0`, `Insignia tono="critical"` con `✕ ${rojo}` | `En camino: ${n} pedidos, ${rojo} críticos. Ver pedidos` | siempre |
| En espera | `i.pedidosPendientes` | `En espera de unidad: ${n}. Ver pedidos` | `hidden xl:flex` |
| Entregados hoy | `aTiempo + conRetraso` y `${conRetraso} tarde` en `text-caption` | `Entregados hoy: ${total}, ${conRetraso} con retraso. Ver pedidos` | `hidden 2xl:flex` |

`i` es `datos.indicadores`.
3. `<BotonReporteCierre compacto />`.

- [ ] **Step 6: Confirmar que pasan.** `npx vitest run src/lib src/components/operacion src/test/rubrica` → PASS.

- [ ] **Step 7: Commit.** `git commit -m "feat(operacion): pulso del día con indicadores globales y reporte de cierre"`

---

### Task 4: Lienzo del mapa claro en los dos temas

**Files:**
- Modify: `tailwind.config.js` (raíz de `paqtracker-web/`), `config/paleta.test.ts`, `components/map/GridMap.tsx` (solo la clase del contenedor raíz)

**Interfaces:**
- Produces: la clase `bg-lienzo-mapa`, con el valor `'lienzo-mapa'` en `semanticos.claro` (`'#FFFFFF'`) y en `semanticos.oscuro` (`'#EEF1F5'`).

- [ ] **Step 1: Escribir la prueba que falla** en `config/paleta.test.ts`, con el helper de contraste que ya usa ese archivo:

```ts
it('el lienzo del mapa es claro también en el tema oscuro y los símbolos contrastan ≥ 3:1', () => {
  const lienzo = semanticos.oscuro['lienzo-mapa'];
  expect(lienzo).toBeDefined();
  [...Object.values(COLOR_SEMAFORO), ...Object.values(COLOR_AVERIA), COLOR_BLOQUEO, '#0F172A'].forEach((color) =>
    expect(contraste(color, lienzo)).toBeGreaterThanOrEqual(3),
  );
});
```

(`COLOR_SEMAFORO` de `lib/semaforo.ts`, `COLOR_AVERIA` de `components/map/iconosVehiculo.ts`, `COLOR_BLOQUEO` de `components/map/simbolos.tsx`. `#0F172A` es el almacén central. Si el helper del archivo se llama distinto, usar ese.)

- [ ] **Step 2: Confirmar que falla.** `npx vitest run src/config/paleta.test.ts` → FAIL (`undefined`).

- [ ] **Step 3: Implementarlo.** Agregar `'lienzo-mapa'` a los dos objetos de `semanticos`, con un comentario en la lista de colores por función: "lienzo-mapa: fondo del mapa; claro en los dos temas porque los símbolos tienen colores fijos". En el contenedor raíz de `GridMap`, `bg-superficie` pasa a `bg-lienzo-mapa`.

- [ ] **Step 4: Confirmar que pasa.** `npx vitest run src/config src/test/rubrica/rubrica.mapa.test.tsx` → PASS.

- [ ] **Step 5: Commit.** `git commit -m "feat(ui): lienzo del mapa claro en los dos temas"`

---

### Task 5: Buscador del mapa con sugerencias

**Files:**
- Create: `lib/busquedaMapa.ts`, `lib/busquedaMapa.test.ts`, `components/map/BuscadorMapa.tsx`, `components/map/BuscadorMapa.test.tsx`
- Modify: `components/map/GridMap.tsx` (reemplazar el `<form>` del buscador y su `datalist`)

**Interfaces:**
- Produces:
  - `export interface OpcionBusqueda { tipo: 'pedido' | 'vehiculo' | 'almacen'; codigo: string; etiqueta: string; detalle: string; punto: Coordenada }`
  - `export function opcionesBusqueda(destinos: DestinoMapa[], unidades: UnidadOperacion[]): OpcionBusqueda[]`. Una opción por pedido distinto (`etiqueta` = código, `detalle` = `Pedido · holgura ${holgura} · ${unidad}`); una por unidad (`etiqueta` = código, `detalle` = `${capitalizar(UNIDADES[tipo].nombre)} · ${SITUACION_UNIDAD[situacion]} · ${carga}/${capacidad}`); una por almacén de `ALMACENES` (`codigo` = id, `etiqueta` = nombre, `detalle` = `Almacén`).
  - `export function filtrarOpciones(opciones: OpcionBusqueda[], termino: string, limite = 8): OpcionBusqueda[]`. Compara sin mayúsculas ni tildes, con `includes` sobre `codigo`, `etiqueta` y el nombre corto del almacén. Las que empiezan con el término van primero. Un término vacío devuelve `[]`.
  - `export function coincidenciaExacta(opciones: OpcionBusqueda[], termino: string): OpcionBusqueda | undefined`: la regla de hoy de `buscar` en `GridMap` (pedido normalizado a `#123`, unidad por código exacto, almacén por id, nombre o nombre corto).
  - `export const BuscadorMapa: React.FC<{ opciones: OpcionBusqueda[]; onElegir: (o: OpcionBusqueda) => void; refEntrada?: React.Ref<HTMLInputElement> }>`

- [ ] **Step 1: Escribir las pruebas que fallan**

`busquedaMapa.test.ts` (fabricar `DestinoMapa` y unidades con `datosRubrica()`):
- `filtrarOpciones(o, 'a-0')` devuelve `A-01` primero;
- `filtrarOpciones(o, 'interm')` devuelve los dos intermedios;
- `filtrarOpciones(o, '')` devuelve `[]`;
- `coincidenciaExacta(o, '1002')?.codigo` es `'#1002'`;
- `coincidenciaExacta(o, 'central')?.codigo` es `'CENTRAL'`.

`BuscadorMapa.test.tsx`:

```tsx
it('sigue el patrón combobox: escribir abre las sugerencias y las flechas las recorren', () => {
  const onElegir = vi.fn();
  render(<BuscadorMapa opciones={opciones} onElegir={onElegir} />);
  const entrada = screen.getByRole('combobox', { name: 'Buscar pedido o unidad en el mapa' });
  fireEvent.change(entrada, { target: { value: 'a-0' } });
  expect(entrada.getAttribute('aria-expanded')).toBe('true');
  fireEvent.keyDown(entrada, { key: 'ArrowDown' });
  const activa = screen.getAllByRole('option')[0];
  expect(entrada.getAttribute('aria-activedescendant')).toBe(activa.id);
  expect(activa.getAttribute('aria-selected')).toBe('true');
  fireEvent.keyDown(entrada, { key: 'Enter' });
  expect(onElegir).toHaveBeenCalledWith(expect.objectContaining({ codigo: 'A-01' }));
});
it('Enter sin sugerencia activa busca la coincidencia exacta (como hoy)', () => {
  const onElegir = vi.fn();
  render(<BuscadorMapa opciones={opciones} onElegir={onElegir} />);
  const entrada = screen.getByLabelText('Buscar pedido o unidad en el mapa');
  fireEvent.change(entrada, { target: { value: 'Central' } });
  fireEvent.submit(entrada.closest('form')!);
  expect(onElegir).toHaveBeenCalledWith(expect.objectContaining({ codigo: 'CENTRAL' }));
});
it('sin resultados lo dice y sugiere un ejemplo', () => {
  render(<BuscadorMapa opciones={opciones} onElegir={() => {}} />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzz' } });
  expect(screen.getByRole('status').textContent).toMatch(/No hay pedidos, unidades ni almacenes en el mapa con «zzz»/);
});
it('Esc cierra las sugerencias y marca el evento como atendido', () => {
  render(<BuscadorMapa opciones={opciones} onElegir={() => {}} />);
  const entrada = screen.getByRole('combobox');
  fireEvent.change(entrada, { target: { value: 'a-0' } });
  const evento = createEvent.keyDown(entrada, { key: 'Escape' });
  fireEvent(entrada, evento);
  expect(evento.defaultPrevented).toBe(true);
  expect(entrada.getAttribute('aria-expanded')).toBe('false');
});
```

- [ ] **Step 2: Confirmar que fallan.** `npx vitest run src/lib/busquedaMapa.test.ts src/components/map/BuscadorMapa.test.tsx` → FAIL.

- [ ] **Step 3: Implementar `lib/busquedaMapa.ts`**, moviendo la regla de `buscar` a `coincidenciaExacta`.

- [ ] **Step 4: Implementar `BuscadorMapa`** con el patrón combobox de WAI-ARIA:
- `<form role="search">` con el mismo estilo de píldora que hoy.
- `input` con `role="combobox"`, `aria-label="Buscar pedido o unidad en el mapa"`, `aria-expanded`, `aria-controls={idLista}`, `aria-autocomplete="list"` y `aria-activedescendant`.
- `ul role="listbox"` debajo, con `caja`, `shadow-overlay`, `max-h-72` y scroll. Cada `li role="option"` tiene un `id` estable, la `etiqueta` en `font-medium` y el `detalle` en `text-caption`.
- Flechas arriba y abajo mueven la activa. Enter con una activa la elige; sin activa, envía el formulario, que usa `coincidenciaExacta` o muestra el aviso de sin resultados en el `role="status"` actual, con el texto de hoy más " Prueba con un código como A-01 o #1001.".
- `Esc` cierra la lista y hace `preventDefault()`.
- El clic en una opción usa `onMouseDown` con `preventDefault()` y la elige. Al elegir, se vacía el campo.

- [ ] **Step 5: Usarlo en `GridMap`**

`<BuscadorMapa opciones={useMemo(() => opcionesBusqueda(destinos, unidades), [destinos, unidades])} onElegir={elegirOpcion} refEntrada={refBuscador} />`, donde `elegirOpcion` hace lo mismo que las ramas de `buscar` de hoy (seleccionar y `centrarEn(o.punto)`). Borrar `buscar`, `terminoBusqueda`, `sinResultados` y el `datalist`. Crear `refBuscador = useRef<HTMLInputElement>(null)`; la Tarea 6 lo usa.

- [ ] **Step 6: Confirmar que pasan.** `npx vitest run src/lib src/components/map src/test/rubrica` → PASS (C61, C68 y C74 siguen en verde).

- [ ] **Step 7: Commit.** `git commit -m "feat(map): buscador con sugerencias accesible"`

---

### Task 6: Opciones nuevas de `GridMap` y `Esc` sin choques

**Files:**
- Modify: `components/map/GridMap.tsx`, `hooks/useCerrarConEscape.ts`
- Test: `components/map/GridMap.opciones.test.tsx` (nuevo), `hooks/useCerrarConEscape.test.ts` (nuevo)

**Interfaces:**
- Consumes: `refBuscador` (Tarea 5).
- Produces:
  - Props opcionales de `GridMapProps`:
    - `indicadoresEnMapa?: boolean` (`true` por defecto). Con `false` se ocultan las píldoras de riesgo, bloqueos y averías y los `IndicadoresGlobales`.
    - `mostrarCoordenadas?: boolean` (`false` por defecto). Con `true` y el cursor sobre el mapa, muestra `<span role="status" aria-label="Nodo bajo el cursor">x {x} · y {y} km</span>` en `absolute right-3 bottom-3`, con el estilo de la barra de escala.
    - `controlesExtra?: React.ReactNode`: al final de la pila de zoom, después de "Ver la malla completa".
    - `onVistaMovida?: () => void`: se llama cuando el usuario mueve la vista (arrastre que supera `TOLERANCIA_CLIC_PX`, rueda, teclas `+` `-` `0` y flechas, botones Acercar, Alejar y Ver la malla completa). No se llama al centrar por código (`centrarEn`).
  - `GridMapHandle` suma `enfocarBuscador: () => void` y `alternarLeyenda: () => void`.
  - `useCerrarConEscape` escucha en fase de captura (`addEventListener('keydown', fn, true)`) y llama a `evento.preventDefault()` cuando cierra.

- [ ] **Step 1: Escribir las pruebas que fallan**

`useCerrarConEscape.test.ts`: con un componente de prueba abierto, un `keydown` `Escape` en `window` llama a `onCerrar` y el evento queda con `defaultPrevented === true`.

`GridMap.opciones.test.tsx` usa `renderConDatos` y `prepararEntornoMapa()`, con `base = { unidades: [], destinos: [], bloqueos: [], seleccion: null, riesgo: { rojo: 0, ambar: 0 }, onSeleccionar: () => {}, onAbrirIncidencias: () => {} }`:

```tsx
it('por defecto conserva los indicadores sobre el mapa (Simulación)', () => {
  renderConDatos(<GridMap {...base} />);
  expect(screen.getByRole('region', { name: 'Ocupación global' })).toBeTruthy();
  expect(screen.getByRole('button', { name: /pedidos críticos/ })).toBeTruthy();
});
it('indicadoresEnMapa=false deja solo el buscador arriba', () => {
  renderConDatos(<GridMap {...base} indicadoresEnMapa={false} />);
  expect(screen.queryByRole('region', { name: 'Ocupación global' })).toBeNull();
  expect(screen.queryByRole('button', { name: /pedidos críticos/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /averiadas/ })).toBeNull();
  expect(screen.getByLabelText('Buscar pedido o unidad en el mapa')).toBeTruthy();
});
it('mostrarCoordenadas indica el nodo bajo el cursor', () => {
  const { container } = renderConDatos(<GridMap {...base} mostrarCoordenadas />);
  const mapa = container.querySelector('.cursor-grab')!;
  fireEvent.pointerEnter(mapa);
  fireEvent.pointerMove(mapa, { clientX: 200, clientY: 200 });
  expect(screen.getByRole('status', { name: 'Nodo bajo el cursor' }).textContent).toMatch(/^x -?\d+ · y -?\d+ km$/);
});
it('controlesExtra se suma a la pila de zoom', () => {
  renderConDatos(<GridMap {...base} controlesExtra={<button type="button">Extra</button>} />);
  expect(screen.getByRole('button', { name: 'Ver la malla completa' }).parentElement!.contains(screen.getByRole('button', { name: 'Extra' }))).toBe(true);
});
it('onVistaMovida avisa al acercar con el botón, pero no al centrar por código', () => {
  const onVistaMovida = vi.fn();
  const ref = createRef<GridMapHandle>();
  renderConDatos(<GridMap {...base} ref={ref} onVistaMovida={onVistaMovida} />);
  act(() => { ref.current!.centrarEn({ x: 10, y: 10 }); });
  expect(onVistaMovida).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));
  expect(onVistaMovida).toHaveBeenCalledTimes(1);
});
it('el handle enfoca el buscador y alterna la leyenda', () => {
  const ref = createRef<GridMapHandle>();
  renderConDatos(<GridMap {...base} ref={ref} />);
  act(() => ref.current!.enfocarBuscador());
  expect(document.activeElement).toBe(screen.getByLabelText('Buscar pedido o unidad en el mapa'));
  act(() => ref.current!.alternarLeyenda());
  expect(screen.getByRole('region', { name: 'Capas y leyenda' })).toBeTruthy();
});
```

- [ ] **Step 2: Confirmar que fallan.** `npx vitest run src/components/map/GridMap.opciones.test.tsx src/hooks/useCerrarConEscape.test.ts` → FAIL.

- [ ] **Step 3: Implementarlo.** Envolver las píldoras y los indicadores en `{indicadoresEnMapa && …}`. Agregar el `span` de coordenadas y `controlesExtra`. Llamar a `onVistaMovida?.()` en cada punto de interacción listado. Ampliar el `useImperativeHandle` con `enfocarBuscador: () => refBuscador.current?.focus()` y `alternarLeyenda: () => alternarLeyenda(!leyendaAbierta)`. Cambiar `useCerrarConEscape` a fase de captura con `preventDefault()`.

- [ ] **Step 4: Confirmar que pasan.** `npx vitest run src/components src/hooks src/test/rubrica` → PASS.

- [ ] **Step 5: Commit.** `git commit -m "feat(map): opciones de Operación en el mapa y Escape sin choques"`

---

### Task 7: Listas que no se reordenan bajo el cursor

**Files:**
- Create: `hooks/useListaEstable.ts`, `hooks/useListaEstable.test.ts`
- Modify: `components/operacion/EstadoFlota.tsx` (lista "Todas las unidades"), `components/operacion/ListaPedidos.tsx`

**Interfaces:**
- Produces: `export function useListaEstable<T>(items: T[], clave: (t: T) => string): { items: T[]; propsContenedor: { onPointerEnter: () => void; onPointerLeave: () => void; onFocus: () => void; onBlur: (e: React.FocusEvent) => void } }`.
  - Mientras el puntero está sobre el contenedor o el foco está dentro, devuelve los ítems nuevos (objetos frescos) en el **orden anterior de claves**: los que desaparecieron se quitan y los nuevos van al final.
  - Fuera de ese estado, devuelve `items` tal cual. `onBlur` solo libera si `relatedTarget` queda fuera del contenedor.

- [ ] **Step 1: Escribir la prueba que falla** (con `renderHook` y `rerender`):

```ts
it('congela el orden mientras se interactúa y lo libera al salir', () => {
  const clave = (x: { id: string }) => x.id;
  const { result, rerender } = renderHook(({ items }) => useListaEstable(items, clave), { initialProps: { items: [{ id: 'a' }, { id: 'b' }] } });
  act(() => result.current.propsContenedor.onPointerEnter());
  rerender({ items: [{ id: 'c' }, { id: 'b' }, { id: 'a' }] });
  expect(result.current.items.map(clave)).toEqual(['a', 'b', 'c']);
  act(() => result.current.propsContenedor.onPointerLeave());
  expect(result.current.items.map(clave)).toEqual(['c', 'b', 'a']);
});
```

- [ ] **Step 2: Confirmar que falla.** `npx vitest run src/hooks/useListaEstable.test.ts` → FAIL.

- [ ] **Step 3: Implementar el hook** guardando en un `useRef` las claves en el orden visible y un estado booleano `congelada`.

- [ ] **Step 4: Usarlo.** En `EstadoFlota`, sobre `unidadesFiltradas`, con `clave = (u) => u.codigo`; `propsContenedor` va en la `<ul>` de "Todas las unidades". En `ListaPedidos`, sobre `pedidos`, con `clave = (p) => p.codigo`, en su lista. Al cambiar el criterio de orden o el filtro, el usuario hace clic fuera de la lista, así que el orden nuevo se aplica.

- [ ] **Step 5: Confirmar que pasan.** `npx vitest run src/hooks src/components/operacion src/test/rubrica` → PASS (E13–E17 y E31–E33 siguen en verde).

- [ ] **Step 6: Commit.** `git commit -m "feat(operacion): listas que no se mueven bajo el cursor"`

---

### Task 8: Registro de avería e incidencias reutilizables

**Files:**
- Create: `hooks/useRegistroAveria.tsx`, `components/operacion/ListaIncidencias.tsx`
- Modify: `components/operacion/PanelLateral.tsx` (usarlos y borrar lo que se movió)
- Test: como red de regresión, `PanelLateral.averias.test.tsx` y `PanelLateral.pedido.test.tsx` sin cambios

**Interfaces:**
- Produces:
  - `export type AbrirRegistroAveria = (unidad?: string) => void` (sale de `PanelLateral.tsx`).
  - `export function useRegistroAveria(onRegistrada: (codigoUnidad: string) => void): { abrir: AbrirRegistroAveria; deshacer: (codigoUnidad: string) => Promise<void>; dialogo: React.ReactNode }`. Contiene el estado `registro`, `deshacerAveria` y el JSX de `DialogoRegistrarAveria` con su aviso y su "Deshacer", movidos tal cual. `onRegistrada` reemplaza a `onSeleccionar({ tipo: 'vehiculo', … })`.
  - `export const ListaIncidencias` con los mismos props y el mismo contenido de hoy. Simulación la sigue usando en su pestaña Incidencias.

- [ ] **Step 1: Mover el código** (refactor puro: ninguna prueba debe cambiar).
- [ ] **Step 2: En `PanelLateral`:** `const registro = useRegistroAveria((u) => onSeleccionar({ tipo: 'vehiculo', codigo: u }))`. Reemplazar `abrirRegistro` por `registro.abrir`, `deshacerAveria` por `registro.deshacer` y el bloque del diálogo por `{registro.dialogo}`.
- [ ] **Step 3: Confirmar que no cambió nada.** `npx vitest run src/components/operacion src/test/rubrica` → PASS.
- [ ] **Step 4: Commit.** `git commit -m "refactor(operacion): registro de avería e incidencias reutilizables"`

---

### Task 9: "Requiere atención" ordenado por gravedad y con filtros

**Files:**
- Modify: `types/operacion.ts`, `services/adaptadorOperacion.ts`, `services/adaptadorOperacion.test.ts`, `config/dominio.ts`
- Create: `lib/atencion.ts`, `lib/atencion.test.ts`, `components/operacion/ListaAtencion.tsx`, `components/operacion/ListaAtencion.test.tsx`

**Interfaces:**
- Consumes: `useRegistroAveria`, `AbrirRegistroAveria` (Tarea 8); `useListaEstable` (Tarea 7).
- Produces:
  - `PedidoOperacion.registroFecha: Date`, que el adaptador llena con `new Date(pedido.registroMs)` junto a `registrado`.
  - `export const UMBRAL_ESPERA_UNIDAD_MIN = 30` en `config/dominio.ts`.
  - En `lib/atencion.ts`:
    ```ts
    export type GrupoAlerta = 'pedidos' | 'flota' | 'almacenes' | 'vias';
    export interface AlertaOperacion {
      id: string;
      grupo: GrupoAlerta;
      gravedad: 'critica' | 'aviso';
      titulo: string;
      detalle: string;
      momento?: string;
      accion: { tipo: 'seleccionar'; seleccion: SeleccionResaltable } | { tipo: 'centrar'; punto: Coordenada };
    }
    export function alertasOperacion(datos: DatosOperacion): AlertaOperacion[];
    export function conteoAtencion(datos: DatosOperacion): number; // cantidad de alertas 'critica'
    ```
  - `export const ListaAtencion: React.FC<{ onSeleccionar: (s: SeleccionPanel) => void; onCentrar: (p: Coordenada) => void; onRegistrarAveria: AbrirRegistroAveria }>`

**Orden y contenido de `alertasOperacion`:**

| # | Gravedad | Grupo | Condición | Título | Detalle | Acción |
|---|---|---|---|---|---|---|
| 1 | critica | flota | unidad `AVERIADA` | `nombreUnidad(u)` | `${nombreAveria(tipo)} · vuelve ${formatearMomento(vuelve, reloj)} · (${x},${y})`; `'Fuera de servicio · (x,y)'` sin avería | seleccionar vehículo |
| 2 | critica | pedidos | `pedidosEnRiesgo` con nivel `ROJO`, por `holguraMinutos` ascendente | `${codigo} · ${unidad}` | `holgura ${holgura} · llega ${eta}`; `momento` = `holgura` | seleccionar pedido |
| 3 | critica | almacenes | almacén con `stockBajo` | nombre de `ALMACENES` | `${stock}/${capacidad} · ${alertaStockBajo()}` | seleccionar almacén |
| 4 | aviso | pedidos | estado `'En espera'` y `minutosEntre(registroFecha, reloj) >= UMBRAL_ESPERA_UNIDAD_MIN`, la espera más larga primero | `${codigo} espera unidad` | `desde ${formatearHora(registroFecha)} · ${cantidad} paq.` | seleccionar pedido |
| 5 | aviso | almacenes | `nivelStock === 'ROJO'` (casi lleno) | `Casi lleno · ${nombre}` | `${pct} % de ocupación` | seleccionar almacén |
| 6 | aviso | pedidos | `pedidosEnRiesgo` con nivel `AMBAR` | igual que la fila 2 | igual que la fila 2 | seleccionar pedido |
| 7 | aviso | vias | un bloqueo por `idOriginal` con algún tramo de `rutasAfectadas > 0` | `Bloqueo (${desde})–(${hasta})` | `hasta ${fin} · ${n} rutas afectadas` | centrar en el punto medio |

- [ ] **Step 1: Escribir las pruebas que fallan**

- En `adaptadorOperacion.test.ts`: `registroFecha.getTime()` es igual al `registroMs` del pedido de la API.
- En `lib/atencion.test.ts`, con `datosRubrica()`:
  - las alertas críticas van antes que los avisos;
  - la primera es la avería de `Bicicleta B-01`, su detalle contiene `'hoy 10:10'` y `'(10,10)'`;
  - hay una alerta `almacenes` crítica para `Intermedio 2` y ninguna para `Intermedio 1`;
  - `conteoAtencion(d) === resumenRiesgo(d).rojo + 2`;
  - con un pedido `'En espera'` cuyo `registroFecha` es `reloj − 45 min`, aparece `'#… espera unidad'` y desaparece con `reloj − 10 min`. Construir el pedido con spread sobre uno del escenario.
- En `ListaAtencion.test.tsx`:

```tsx
it('lista por gravedad y filtra por tipo', () => {
  renderConDatos(<ListaAtencion onSeleccionar={() => {}} onCentrar={() => {}} onRegistrarAveria={() => {}} />);
  const filtros = within(screen.getByRole('group', { name: 'Tipo de alerta' }));
  expect(filtros.getByRole('button', { name: /^Todas \d+/ }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(filtros.getByRole('button', { name: /^Almacenes/ }));
  expect(screen.getAllByRole('listitem').every((li) => /Intermedio/.test(li.textContent ?? ''))).toBe(true);
});
it('la fila de una avería abre la unidad', () => {
  const onSeleccionar = vi.fn();
  renderConDatos(<ListaAtencion onSeleccionar={onSeleccionar} onCentrar={() => {}} onRegistrarAveria={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /Bicicleta B-01/ }));
  expect(onSeleccionar).toHaveBeenCalledWith({ tipo: 'vehiculo', codigo: 'B-01' });
});
it('ofrece registrar una avería cuando la ejecución lo admite', () => {
  const onRegistrarAveria = vi.fn();
  renderConDatos(<ListaAtencion onSeleccionar={() => {}} onCentrar={() => {}} onRegistrarAveria={onRegistrarAveria} />, datosRubrica({ tipoEscenario: 'DIA_A_DIA' }));
  fireEvent.click(screen.getByRole('button', { name: '+ Registrar avería' }));
  expect(onRegistrarAveria).toHaveBeenCalled();
});
```

- [ ] **Step 2: Confirmar que fallan.** `npx vitest run src/services src/lib/atencion.test.ts src/components/operacion/ListaAtencion.test.tsx` → FAIL.

- [ ] **Step 3: Implementar `registroFecha`, la constante, `lib/atencion.ts` y `ListaAtencion`**

`ListaAtencion` tiene:
- **Fila superior:** `<div role="group" aria-label="Tipo de alerta">` con chips `Todas {n}` y uno por grupo con alertas (Pedidos, Flota, Almacenes, Vías), con `aria-pressed`. A la derecha, "+ Registrar avería" o el `motivo` de `admisionDeAverias(datos)`, igual que en `ListaIncidencias`.
- **Lista:** `<ul>` con `useListaEstable(alertas, (a) => a.id)`. Cada `<li>` lleva un `<button>` con una franja izquierda de 4 px (`bg-critical-600` o `bg-warn-500`), el ícono del grupo (`XCircle`, `Clock`, `Warehouse` u `OctagonX`, en 12 px), el `titulo` en `text-body-sm font-medium`, el `detalle` en `text-caption` y el `momento` a la derecha. La `accion` decide si llama a `onSeleccionar` o a `onCentrar`.
- **Vacía:** "Nada requiere atención ahora." con el ícono `Check`.

- [ ] **Step 4: Confirmar que pasan.** `npx vitest run src/services src/lib src/components/operacion src/test/rubrica` → PASS.

- [ ] **Step 5: Commit.** `git commit -m "feat(operacion): requiere atención ordenado por gravedad y con filtros"`

---

### Task 10: Panel izquierdo "Estado de la operación" (con resumen del día en celular)

**Files:**
- Create: `hooks/useConsultaMedios.ts`, `components/operacion/RecursosOperacion.tsx`, `components/operacion/PanelEstado.tsx`
- Test: `hooks/useConsultaMedios.test.ts`, `components/operacion/PanelEstado.test.tsx` (nuevos)

**Interfaces:**
- Consumes: `ListaAtencion`, `conteoAtencion` (Tarea 9); `useRegistroAveria` (Tarea 8); `PulsoOperacion` (Tarea 3); `estadoFlota`, `cantidadBloqueos` (`lib/operacion.ts`); `MarcaSemaforo`; `nivelDeStock`, `FONDO_SEMAFORO` (`lib/semaforo.ts`); `NOMBRE_CARGA`.
- Produces:
  - `export function useConsultaMedios(consulta: string): boolean`. Si `typeof window.matchMedia !== 'function'`, devuelve `false`; si no, se suscribe a `change`.
  - `export const CONSULTA_CELULAR = '(max-width: 639px)'`, exportada desde el mismo hook.
  - `export const RecursosOperacion: React.FC<{ onSeleccionar: (s: SeleccionPanel) => void }>`
  - `export const PanelEstado: React.FC<{ abierto: boolean; onAlternar: () => void; onSeleccionar: (s: SeleccionPanel) => void; onCentrar: (p: Coordenada) => void; className?: string }>`. `className` se combina con `cn` sobre la raíz en los dos estados.

- [ ] **Step 1: Escribir las pruebas que fallan**

`useConsultaMedios.test.ts`: sin `matchMedia`, devuelve `false`; con `vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))`, devuelve `true`.

`PanelEstado.test.tsx` (con `prepararEntornoMapa`):

```tsx
it('cerrado: franja con el contador', () => {
  const onAlternar = vi.fn();
  renderConDatos(<PanelEstado abierto={false} onAlternar={onAlternar} onSeleccionar={() => {}} onCentrar={() => {}} />);
  expect(screen.queryByRole('complementary', { name: 'Estado de la operación' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /^Abrir estado de la operación, \d+ requieren atención$/ }));
  expect(onAlternar).toHaveBeenCalled();
});
it('abierto: recursos y requiere atención', () => {
  renderConDatos(<PanelEstado abierto onAlternar={() => {}} onSeleccionar={() => {}} onCentrar={() => {}} />);
  const panel = within(screen.getByRole('complementary', { name: 'Estado de la operación' }));
  expect(panel.getByRole('heading', { name: 'Requiere atención' })).toBeTruthy();
  expect(panel.getByRole('group', { name: 'Tipo de alerta' })).toBeTruthy();
  expect(panel.getByRole('button', { name: 'Cerrar estado de la operación' })).toBeTruthy();
  expect(panel.queryByRole('region', { name: 'Resultados del día' })).toBeNull();
});
it('en celular, el resumen del día va dentro del panel', () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === CONSULTA_CELULAR, addEventListener() {}, removeEventListener() {} }));
  renderConDatos(<PanelEstado abierto onAlternar={() => {}} onSeleccionar={() => {}} onCentrar={() => {}} />);
  expect(within(screen.getByRole('complementary', { name: 'Estado de la operación' })).getByRole('region', { name: 'Resultados del día' })).toBeTruthy();
});
it('recursos: flota por estado, almacenes con semáforo y red vial', () => {
  const onSeleccionar = vi.fn();
  renderConDatos(<RecursosOperacion onSeleccionar={onSeleccionar} />);
  const estados = screen.getByRole('group', { name: 'Unidades por estado' }).textContent;
  ['2 En ruta', '1 Disponibles', '1 Averiadas'].forEach((t) => expect(estados).toContain(t));
  fireEvent.click(screen.getByRole('button', { name: 'Intermedio 1: 40 %, con espacio' }));
  expect(onSeleccionar).toHaveBeenCalledWith({ tipo: 'almacen', codigo: 'INTERMEDIO_1' });
  expect(screen.getByRole('button', { name: 'Intermedio 2: 10 %, con espacio, stock bajo' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Central: sin tope' })).toBeTruthy();
  expect(screen.getByText(/bloqueos activos/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Ver la flota' }));
  expect(onSeleccionar).toHaveBeenLastCalledWith({ tipo: 'flota' });
});
it('sin unidades fuera del almacén muestra — en vez de NaN', () => {
  renderConDatos(<RecursosOperacion onSeleccionar={() => {}} />, { ...datosRubrica(), flota: [] });
  expect(document.body.textContent).not.toContain('NaN');
  expect(screen.getByRole('group', { name: 'Carga a bordo por tipo' }).textContent).toContain('—');
});
```

- [ ] **Step 2: Confirmar que fallan.** `npx vitest run src/hooks/useConsultaMedios.test.ts src/components/operacion/PanelEstado.test.tsx` → FAIL.

- [ ] **Step 3: Implementar `RecursosOperacion`**

Tres bloques, cada uno con `TituloSeccion`:
- **"Flota · {total} unidades"**, con un botón enlace "Ver la flota" (`{ tipo: 'flota' }`).
  - `<div role="group" aria-label="Unidades por estado">` con cinco ítems `"{n} {Etiqueta}"` en este orden: En ruta, Refrigerio, Disponibles, Fuera de turno, Averiadas. `estadoFlota` devuelve arrays para `enRefrigerio` y `averiadas`. Cada ítem lleva un cuadrado de 8 px: `bg-info-600`, `bg-neutral-400`, `bg-neutral-200`, `bg-neutral-100` con borde y `bg-critical-600`.
  - `<div role="group" aria-label="Carga a bordo por tipo">` con una línea por tipo: `"{Auto|Moto|Bici} {enRuta}/{total}"` más `MarcaSemaforo` y `"{pct} %"`, o `"—"` si `cargaABordo === null`.
- **"Almacenes"**: un botón por almacén de `ALMACENES`. El intermedio muestra el nombre corto, una barra de 6 px con la clase `FONDO_SEMAFORO[nivel]`, `MarcaSemaforo`, `"{pct} %"` y, si `stockBajo`, una insignia `!` en `bg-neutral-900 text-sobre-color`. Su `aria-label` es `"{nombre}: {pct} %, {NOMBRE_CARGA[nivel] en minúscula}{', stock bajo' si aplica}"`. El central muestra "sin tope" (`aria-label="Central: sin tope"`). El clic abre `{ tipo: 'almacen', codigo: id }`.
- **"Red vial"**: `"{cantidadBloqueos(datos)} bloqueos activos"`.

- [ ] **Step 4: Implementar `PanelEstado`**

- **Cerrado**: `<div className="w-11 shrink-0 bg-superficie border border-neutral-200 rounded-card shadow-xs flex flex-col items-center py-2 gap-1.5">` con dos botones. El primero tiene ícono `AlertTriangle` y `aria-label="Abrir estado de la operación, {conteoAtencion} requieren atención"`, con el contador en una insignia roja si es mayor que 0, como en `BarraPaneles`. El segundo tiene ícono `BarChart3` y `aria-label="Abrir recursos"`. Los dos llaman a `onAlternar`.
- **Abierto**: `<aside aria-label="Estado de la operación" className="flex-1 min-w-[264px] max-w-[440px] h-full bg-superficie border border-neutral-200 rounded-card shadow-xs flex flex-col overflow-hidden">` con:
  - encabezado `h-11` con `<h2>` "Estado de la operación" y el botón `aria-label="Cerrar estado de la operación"` (ícono `ChevronLeft`);
  - un cuerpo con scroll: si `useConsultaMedios(CONSULTA_CELULAR)`, primero `<PulsoOperacion onSeleccionar={onSeleccionar} />` envuelto en `flex-wrap`; luego `<RecursosOperacion>`; luego `<h3>` "Requiere atención" con su contador y `<ListaAtencion onRegistrarAveria={registro.abrir} …>`;
  - `{registro.dialogo}`, donde `registro = useRegistroAveria((u) => onSeleccionar({ tipo: 'vehiculo', codigo: u }))`.

- [ ] **Step 5: Confirmar que pasan.** `npx vitest run src/hooks src/components/operacion src/config/estilos.test.ts` → PASS.

- [ ] **Step 6: Commit.** `git commit -m "feat(operacion): panel de estado con recursos y lo que requiere atención"`

---

### Task 11: Panel derecho como columna, "Seguir en el mapa" y limpiar selección

**Files:**
- Modify: `components/operacion/BarraPaneles.tsx`, `components/operacion/PanelLateral.tsx`, `hooks/useNavegacionPanel.ts`
- Test: `components/operacion/BarraPaneles.test.tsx` y `hooks/useNavegacionPanel.test.ts` (nuevos); agregar casos a `components/operacion/PanelLateral.pedido.test.tsx`

**Interfaces:**
- Produces:
  - `BarraPaneles`: props `pestanas?: PestanaPanel[]` (por defecto, las seis de hoy, en el mismo orden) y `className?: string`, que se combina con `cn` después de sus clases.
  - `PanelLateral`:
    - `variante?: 'flotante' | 'columna'` (por defecto `'flotante'`). `'columna'` cambia `absolute right-3 top-0 bottom-0 z-20 w-[340px]` por `relative h-full w-full`. El `aria-label` `'Incidencias, flota y bitácora'` no cambia.
    - `siguiendo?: string | null` y `onSeguir?: (codigo: string | null) => void`. Si hay `onSeguir` y la unidad del detalle está `fueraDelAlmacen`, `DetalleVehiculo` muestra en `Acciones`, junto a "Centrar en el mapa", un `Boton variante="secundario"` con `aria-pressed={siguiendo === codigo}` y el texto "Seguir en el mapa" o "Dejar de seguir".
  - `useNavegacionPanel`:
    - opción `pestanaInicial?: PestanaPanel` (por defecto `'incidencias'`), que es el valor inicial de `ultimaPestana`;
    - `limpiar: () => void` en `NavegacionPanel`. Con un detalle abierto: `detalle = null`, `pila = []`, `resaltado = null` y `abrirPestana(ultimaPestana)`. Sin detalle: solo `resaltado = null`.

- [ ] **Step 1: Escribir las pruebas que fallan**

- `BarraPaneles`: con `pestanas={['flota', 'pedidos', 'almacenes', 'bitacora']}`, los textos de `getAllByRole('tab')` son `['Flota', 'Pedidos', 'Almacenes', 'Bitácora']`; sin `pestanas`, hay 6 pestañas.
- `useNavegacionPanel` (con `renderHook`):
  - `pestanaInicial: 'flota'` deja `pestanaActiva === 'flota'`;
  - tras `seleccionar({ tipo: 'vehiculo', codigo: 'A-01' })`, `limpiar()` deja `detalle === null` y `resaltado === null`, y llama a `abrirPestana('flota')`.
- `PanelLateral` montado directamente con `renderConDatos`:
  - con `seleccion={{ tipo: 'pedidos' }}` y `variante="columna"`, el `complementary` no tiene `absolute` y sí `h-full`;
  - con `seleccion={{ tipo: 'vehiculo', codigo: 'A-01' }}` y `onSeguir={spy}`, el clic en "Seguir en el mapa" llama a `spy('A-01')`;
  - con `siguiendo="A-01"`, el botón dice "Dejar de seguir" y el clic llama a `spy(null)`;
  - sin `onSeguir`, el botón no existe.

- [ ] **Step 2: Confirmar que fallan.** `npx vitest run src/components/operacion src/hooks/useNavegacionPanel.test.ts` → FAIL.

- [ ] **Step 3: Implementar los props y `limpiar`.** En `BarraPaneles`, filtrar `PESTANAS` respetando el orden de `pestanas`.

- [ ] **Step 4: Confirmar que pasan y que Simulación no cambió.** `npx vitest run src/components src/hooks src/test/rubrica` → PASS.

- [ ] **Step 5: Commit.** `git commit -m "feat(operacion): panel lateral como columna y seguir una unidad"`

---

### Task 12: Distribución de Operación, enfoque, atajos, ayuda y seguimiento

**Files:**
- Create: `lib/preferencias.ts`, `hooks/useAtajosOperacion.ts`, `components/operacion/DialogoAyudaOperacion.tsx`
- Modify: `components/operacion/ModuloOperacion.tsx`
- Modify (tests nombrados): `test/rubrica/rubrica.mapa.test.tsx` (C4), `test/rubrica/rubrica.panel.test.tsx` (`CENTRO_LIBRE`, C54 de averías, C64 ×2)
- Test: `components/operacion/ModuloOperacion.distribucion.test.tsx` (nuevo)

**Interfaces:**
- Consumes: Tareas 2 a 11.
- Produces:
  - `lib/preferencias.ts`: `leerPreferencia(clave: string): boolean` y `guardarPreferencia(clave: string, valor: boolean): void`, con `try/catch` como `leerLeyendaAbierta` en `GridMap.tsx` (`'1'` = verdadero).
  - `hooks/useAtajosOperacion.ts`: `useAtajosOperacion(activo: boolean, acciones: Record<'alternarEstado' | 'alternarPanel' | 'alternarEnfoque' | 'alternarLeyenda' | 'buscar' | 'ayuda' | 'limpiar', () => void>): void`.
    - Escucha `keydown` en `window`, en fase de burbuja, solo si `activo`.
    - Ignora el evento si `defaultPrevented`; si lleva `ctrlKey`, `metaKey` o `altKey`; si el `target` es `input`, `textarea`, `select` o `[contenteditable]`; o si hay `[role="dialog"]` en el documento.
    - Teclas: `[` → `alternarEstado`; `]` → `alternarPanel`; `f`/`F` → `alternarEnfoque`; `l`/`L` → `alternarLeyenda`; `/` → `buscar` con `preventDefault()`; `?` → `ayuda`; `Escape` → `limpiar`.
  - `DialogoAyudaOperacion: React.FC<{ onCerrar: () => void }>`: `role="dialog"`, `aria-modal`, título "Ayuda · Operación", `useFocoAtrapado`, `useCerrarConEscape` y el mismo estilo que `DialogoConfirmacion`. Contiene un párrafo sobre las zonas (arriba, izquierda, centro, derecha) y una `<table>` de atajos: `/`, `+`, `−`, `0`, flechas, `[`, `]`, `F`, `L`, `?`, `Esc`.
  - `ModuloOperacion`: prop nueva `visible?: boolean` (por defecto `true`); `onHoverCoordenada` pasa a ser opcional.

- [ ] **Step 1: Escribir las pruebas nuevas que fallan**

`ModuloOperacion.distribucion.test.tsx`, con el mismo `beforeEach` y `afterEach` que `rubrica.panel.test.tsx` más `localStorage.clear()`:

```tsx
const estado = () => screen.queryByRole('complementary', { name: 'Estado de la operación' });
const panel = () => screen.queryByRole('complementary', { name: 'Incidencias, flota y bitácora' });

it('E01 · los dos paneles empiezan cerrados', () => {
  montarOperacion();
  expect(estado()).toBeNull();
  expect(panel()).toBeNull();
  expect(screen.getByRole('button', { name: /^Abrir estado de la operación/ })).toBeTruthy();
  expect(screen.getByRole('tablist', { name: 'Paneles del mapa' })).toBeTruthy();
});
it('Operación ofrece Flota, Pedidos, Almacenes y Bitácora', () => {
  montarOperacion();
  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Flota', 'Pedidos', 'Almacenes', 'Bitácora']);
});
it('los indicadores están una sola vez, fuera del mapa', () => {
  montarOperacion();
  expect(screen.getAllByRole('region', { name: 'Ocupación global' })).toHaveLength(1);
  expect(screen.getByRole('region', { name: 'Resultados del día' })).toBeTruthy();
});
it('[ abre y cierra el estado y se recuerda', () => {
  const { unmount } = montarOperacion();
  fireEvent.keyDown(window, { key: '[' });
  expect(estado()).toBeTruthy();
  unmount();
  montarOperacion();
  expect(estado()).toBeTruthy();
  fireEvent.keyDown(window, { key: '[' });
  expect(estado()).toBeNull();
});
it('] abre el panel derecho en Flota y lo cierra', () => {
  montarOperacion();
  fireEvent.keyDown(window, { key: ']' });
  expect(within(panel()!).getByRole('heading', { name: 'Flota' })).toBeTruthy();
  fireEvent.keyDown(window, { key: ']' });
  expect(panel()).toBeNull();
});
it('los atajos no actúan mientras se escribe', () => {
  montarOperacion();
  fireEvent.keyDown(screen.getByLabelText('Buscar pedido o unidad en el mapa'), { key: '[' });
  expect(estado()).toBeNull();
});
it('/ enfoca el buscador y ? abre la ayuda', () => {
  montarOperacion();
  fireEvent.keyDown(window, { key: '/' });
  expect(document.activeElement).toBe(screen.getByLabelText('Buscar pedido o unidad en el mapa'));
  (document.activeElement as HTMLElement).blur();
  fireEvent.keyDown(window, { key: '?' });
  expect(screen.getByRole('dialog', { name: 'Ayuda · Operación' })).toBeTruthy();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('L abre la leyenda; Esc la cierra sin quitar la selección', () => {
  const { container } = montarOperacion();
  tocar(objetoMapa(container, 'vehiculo:A-01')!);
  fireEvent.keyDown(window, { key: 'l' });
  expect(screen.getByRole('region', { name: 'Capas y leyenda' })).toBeTruthy();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('region', { name: 'Capas y leyenda' })).toBeNull();
  expect(within(panel()!).getByRole('heading', { name: /Auto A-01/ })).toBeTruthy();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(within(panel()!).getByRole('heading', { name: 'Flota' })).toBeTruthy();
});
it('F activa el modo enfoque y otra F lo quita', () => {
  montarOperacion();
  fireEvent.keyDown(window, { key: 'f' });
  expect(screen.queryByRole('tablist', { name: 'Paneles del mapa' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Modo enfoque' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.keyDown(window, { key: 'F' });
  expect(screen.getByRole('tablist', { name: 'Paneles del mapa' })).toBeTruthy();
});
it('seguir una unidad la centra y mover el mapa a mano lo cancela', async () => {
  const { container } = montarOperacion();
  tocar(objetoMapa(container, 'vehiculo:A-01')!);
  fireEvent.click(within(panel()!).getByRole('button', { name: 'Seguir en el mapa' }));
  expect(screen.getByRole('status', { name: 'Siguiendo A-01' })).toBeTruthy();
  await esperarCentrado(container, 'vehiculo:A-01');
  fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));
  expect(screen.queryByRole('status', { name: 'Siguiendo A-01' })).toBeNull();
});
it('enlaces viejos ?panel=incidencias abren el panel de estado', () => {
  montarOperacion({ subvista: 'incidencias' });
  expect(estado()).toBeTruthy();
  expect(panel()).toBeNull();
});
it('con visible=false no responde a atajos ni muestra el pulso', () => {
  renderConDatos(<ModuloOperacion subvista="vivo" onCambiarSubvista={() => {}} visible={false} />);
  fireEvent.keyDown(window, { key: '[' });
  expect(estado()).toBeNull();
  expect(screen.queryByRole('region', { name: 'Resultados del día' })).toBeNull();
});
it('el mapa queda en una columna con la proporción de la malla', () => {
  const { container } = montarOperacion();
  expect(container.querySelector('[data-columna="mapa"]')!.className).toContain('aspect-[74/54]');
});
```

`tocar` y `esperarCentrado` se copian de `rubrica.panel.test.tsx`, con `CENTRO_LIBRE = { x: ANCHO_MAPA / 2, y: ALTO_MAPA / 2 }`.

- [ ] **Step 2: Actualizar las pruebas de rúbrica nombradas**

- `rubrica.mapa.test.tsx` C4: después de `montarOperacion()`, agregar `expect(screen.queryByRole('complementary', { name: 'Estado de la operación' })).toBeNull();`.
- `rubrica.panel.test.tsx`:
  - `CENTRO_LIBRE = { x: ANCHO_MAPA / 2, y: ALTO_MAPA / 2 }`, con el comentario "El panel ya no tapa el mapa: se centra en el lienzo completo".
  - Agregar `const estado = () => within(screen.getByRole('complementary', { name: 'Estado de la operación' }));`.
  - En C54 "desde la lista de averías…", el clic en `Bicicleta B-01` pasa a `estado()`. El `heading` y "Centrar en el mapa" siguen en `panel()`.
  - En las dos C64, `panel()` pasa a `estado()`.

- [ ] **Step 3: Confirmar que fallan.** `npx vitest run src/components/operacion/ModuloOperacion.distribucion.test.tsx src/test/rubrica/rubrica.panel.test.tsx src/test/rubrica/rubrica.mapa.test.tsx` → FAIL.

- [ ] **Step 4: Implementar `lib/preferencias.ts`, `useAtajosOperacion` y `DialogoAyudaOperacion`.**

- [ ] **Step 5: Reescribir `ModuloOperacion`**

Constantes:

```ts
const PESTANAS_OPERACION: PestanaPanel[] = ['flota', 'pedidos', 'almacenes', 'bitacora'];
const SUBVISTAS_DE_ESTADO: SubvistaOperacion[] = ['resumen', 'incidencias'];
// Ancho reservado junto al mapa (px): el mapa toma el resto hasta llenar el alto.
const RESERVA = { estadoAbierto: 264, estadoCerrado: 44, panel: 300, barraPaneles: 64, separacion: 8 };
const CLAVE_ESTADO = 'paqtracker.estadoAbierto';
```

Estado y derivados:
- `estadoAbierto`: `useState(() => SUBVISTAS_DE_ESTADO.includes(subvista) || leerPreferencia(CLAVE_ESTADO))`. Cada cambio llama a `guardarPreferencia`.
- `enfoque`: `useState(false)`. `ayudaAbierta`: `useState(false)`. `siguiendo`: `useState<string | null>(null)`.
- `pestanaPanel`: `null` si `subvista` es `'vivo'` o está en `SUBVISTAS_DE_ESTADO`; si no, `subvista`.
- `nav = useNavegacionPanel({ pestana: pestanaPanel, …, pestanaInicial: 'flota' })`. Si llega una subvista de `SUBVISTAS_DE_ESTADO`, un `useEffect` llama a `onCambiarSubvista('vivo')`.
- Funciones:
  - `alternarPanel`: si `nav.panelAbierto`, llama a `nav.cerrar()`; si no, a `nav.seleccionar({ tipo: nav.pestanaActiva })`.
  - `limpiar`: `setSiguiendo(null)` y `nav.limpiar()`.
- `useAtajosOperacion(visible, { alternarEstado, alternarPanel, alternarEnfoque, alternarLeyenda: () => mapaRef.current?.alternarLeyenda(), buscar: () => mapaRef.current?.enfocarBuscador(), ayuda: () => setAyudaAbierta(true), limpiar })`.
- **Seguir**: un `useEffect` sobre `[datos, siguiendo]`. Si la unidad seguida no existe o no está `fueraDelAlmacen`, hace `setSiguiendo(null)`; si no, llama a `mapaRef.current?.centrarEn(unidad.posicion)`.
- `reserva`: `(estadoAbierto ? 264 : 44) + (nav.panelAbierto ? 300 : 0) + 64 + 3 * 8`. En enfoque vale `0`.

Estructura (atributos `aria` y `data` y clases nombradas en las pruebas, obligatorios):

```tsx
<div className="flex-1 flex flex-col min-h-0 min-w-0 bg-fondo">
  <EnBarraSuperior visible={visible && !esCelular}><PulsoOperacion onSeleccionar={nav.seleccionar} /></EnBarraSuperior>
  <div className="relative flex-1 flex justify-center gap-2 p-2 min-h-0 min-w-0">
    {!enfoque && <PanelEstado abierto={estadoAbierto} … className={CLASES_FLOTANTE_IZQ} />}
    <div data-columna="mapa"
         className="relative h-full min-w-0 shrink aspect-[74/54] max-w-[calc(100%-var(--reserva))] bg-lienzo-mapa border border-neutral-200 rounded-card shadow-xs overflow-hidden flex max-lg:flex-1 max-lg:aspect-auto max-lg:max-w-none"
         style={{ '--reserva': `${reserva}px` } as React.CSSProperties}>
      <GridMap … anchoPanelDerecho={0} indicadoresEnMapa={false} mostrarCoordenadas onVistaMovida={() => setSiguiendo(null)}
               controlesExtra={<>{botón Modo enfoque}{botón Ayuda}</>} />
      {siguiendo && <span role="status" aria-label={`Siguiendo ${siguiendo}`} className="absolute top-14 left-1/2 -translate-x-1/2 …píldora…">Siguiendo {siguiendo} <button aria-label="Dejar de seguir">✕</button></span>}
    </div>
    {!enfoque && nav.panelAbierto && (
      <div className={`flex-1 min-w-[300px] max-w-[440px] h-full ${CLASES_FLOTANTE_DER}`}>
        <PanelLateral variante="columna" siguiendo={siguiendo} onSeguir={setSiguiendo} … (los props de hoy) />
      </div>
    )}
    {!enfoque && <BarraPaneles pestanas={PESTANAS_OPERACION} className="h-full rounded-card border border-neutral-200 overflow-hidden" conteos={{ flota: averiadas, pedidos: riesgo.rojo, almacenes: almacenesConStockBajo }} … />}
  </div>
  {ayudaAbierta && <DialogoAyudaOperacion onCerrar={() => setAyudaAbierta(false)} />}
</div>
```

- `esCelular = useConsultaMedios(CONSULTA_CELULAR)`.
- Clases de los paneles flotantes:
  - `CLASES_FLOTANTE_DER = 'max-lg:absolute max-lg:inset-y-2 max-lg:right-[80px] max-lg:z-30 max-lg:w-[min(360px,calc(100%-96px))] max-lg:max-w-none max-lg:shadow-overlay max-sm:inset-x-2 max-sm:w-auto'`;
  - `CLASES_FLOTANTE_IZQ` es igual, con `max-lg:left-2` en lugar de `max-lg:right-[80px]`. Se aplican solo con el panel abierto.
- Botones de la pila de zoom, de 32 × 32 y con el estilo de los de zoom:
  - "Modo enfoque": ícono `Focus`, `aria-label="Modo enfoque"`, `aria-pressed={enfoque}`, `title="Modo enfoque (F)"`;
  - "Ayuda": ícono `CircleHelp`, `aria-label="Ayuda y atajos"`, `title="Ayuda (?)"`.
- Borrar `ANCHO_PANEL_PX`. Se conservan el efecto de `pedidoAEnfocar` y el centrado.

- [ ] **Step 6: Confirmar que pasan.** `npx vitest run src/components/operacion src/test/rubrica` → PASS (G01–G04 y G09, ahora en el pulso; C54 y C64, en el panel de estado).

- [ ] **Step 7: Lint y commit.** `npm run lint` sin errores. `git commit -m "feat(operacion): mapa al centro con paneles laterales, atajos, ayuda y seguimiento"`

---

### Task 13: Conectar en `App.tsx`

**Files:**
- Modify: `App.tsx`

**Interfaces:**
- Consumes: `TopNavbar` (Tarea 2) y `ModuloOperacion` (Tarea 12).

- [ ] **Step 1: Hacer los cambios**

- `<ModuloOperacion … visible={tabActiva === 'operacion'} />` y quitar `onHoverCoordenada`.
- Junto a `relojDiaADia`, derivar `const diaADiaVisible = datos && tabActiva !== 'simulacion' ? datos : null;` y pasar a `TopNavbar` `transcurridoOperacionMs={diaADiaVisible?.transcurridoSimuladoMs}`, `inicioReal={diaADiaVisible?.relojRealInicio}` y `segundosDesdeActualizacion={datos ? segundosActualizado : undefined}`.
- Agregar `tabActiva !== 'operacion'` a la condición de `FooterBar` y quitar su `nodoSeleccionado`.
- Borrar `nodoHover`, `setNodoHover` y `enLienzo`, que quedan sin uso.

- [ ] **Step 2: Verificar.** `npm run build && npm run lint && npx vitest run` → compila, lint limpio y todo en verde.

- [ ] **Step 3: Commit.** `git commit -m "feat(app): Operación sin barra inferior y con el pulso en la barra superior"`

---

### Task 14: Documentación y verificación final

**Files:**
- Modify (raíz del repo): `docs/design-system.md`, `CHANGELOG.md`, `REPORTE_AUTOEVAL.md`

- [ ] **Step 1: Documentar**

- `docs/design-system.md`:
  - sección "Pantalla de Operación" con la regla "el mapa manda" (alto completo, proporción 74:54, paneles en el ancho que sobra, los dos cerrados al inicio) y la distribución: arriba los indicadores, a la izquierda el estado y requiere atención, a la derecha las listas y el detalle;
  - tabla de atajos;
  - el token `lienzo-mapa` en la tabla de colores por función;
  - el comportamiento en celular.
- `CHANGELOG.md`: bajo `## [Sin publicar]`, la subsección "Operación con el mapa al máximo".
- `REPORTE_AUTOEVAL.md`: actualizar la evidencia de E01, C11, C13, C15, G01–G04 y G09 (nuevo lugar y prueba).

- [ ] **Step 2: Verificación completa.** `npm run lint && npx vitest run && npm run build` → todo en verde. Copiar el resumen de vitest en el commit.

- [ ] **Step 3: Revisión visual**

Levantar la API (`docker compose up` en la raíz del repo, o según `paqtracker-api/README.md`) y `npm run dev`. Revisar con DevTools en 1920 × 1080, 1366 × 768 y 390 × 844 (iPhone 12), en tema claro y oscuro:
1. no hay scroll horizontal en la página ni en la barra superior en ninguno de los tres tamaños;
2. el mapa llena el alto y, en 1920 px, no cambia de tamaño al abrir los dos paneles;
3. en 1366 px se ven Ocupación flota, Ocupación almacenes, Cumplimiento, En camino, los dos relojes y el reporte (como ícono);
4. en 390 px el resumen del día aparece dentro del panel de estado, los paneles ocupan la pantalla y se puede **registrar una avería** desde "Requiere atención";
5. en tema oscuro el mapa queda claro y sus símbolos se leen;
6. las sugerencias del buscador, la ayuda (`?`) y "Seguir en el mapa" funcionan.

Comparar con `docs/prototipos/operacion-mapa-central.html?paneles=abiertos` y anotar las diferencias en la descripción del PR. Si en 390 px algo desborda, ocultarlo con `max-sm:hidden`, en este orden: insignia de conexión (queda el punto), selector de tema y botón Salir (pasa a solo ícono).

- [ ] **Step 4: Commit.** `git add ../docs/design-system.md ../CHANGELOG.md ../REPORTE_AUTOEVAL.md && git commit -m "docs: pantalla de Operación con el mapa al máximo"`
