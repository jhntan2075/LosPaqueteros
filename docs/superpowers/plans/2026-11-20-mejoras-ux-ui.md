# Mejoras UX/UI de PaqTracker: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar en `paqtracker-web` las mejoras de la revisión UX/UI: color y formas con un solo significado, textos y formatos únicos, pantallas usables en celular, patrones de estado y formularios comunes, arquitectura de información sin duplicados y rutas del mapa más informativas.

**Architecture:** Primero los fundamentos compartidos (`lib/semaforo.ts`, `lib/formato.ts`, `config/glosario.ts`, `components/map/simbolos.tsx`, `components/ui/`), luego cada pantalla los consume. Cada fase deja la aplicación funcionando y con las pruebas en verde; las fases 2–7 dependen solo de la 1.

**Tech Stack:** React 18 + TypeScript, Tailwind (tokens en `tailwind.config.js`), Vitest + Testing Library (jsdom por archivo con `// @vitest-environment jsdom`), lucide-react.

**Spec:** [docs/superpowers/specs/2026-11-20-mejoras-ux-ui.md](../specs/2026-11-20-mejoras-ux-ui.md)

## Global Constraints

- Todo texto visible en español de Perú; términos y formatos solo desde `config/glosario.ts` y `lib/formato.ts` (spec §3).
- Colores solo con tokens del tema o con los hex de `lib/semaforo.ts`; nada de `text-[#…]` ni `text-[Npx]` nuevos.
- Rúbrica: ruta pendiente con `stroke-dasharray`, grosor 2–4 px, destacada `stroke-width` 3 y `stroke="#1E40AF"`; leyenda de tramo pendiente `#94A3B8` / `6 4` (pruebas C30–C34).
- Áreas táctiles ≥ 44 px en celular; íconos `lucide-react` de 16/20/24 px.
- Corte celular/escritorio: 768 px (`md`).
- Commits sin línea `Co-Authored-By` (preferencia del usuario). Un commit por tarea, mensaje en español con prefijo `feat:`, `fix:` o `refactor:`.
- Pruebas: Vitest falla si la ruta empieza con `c:` en minúscula. Ejecutar siempre desde PowerShell:
  `Set-Location 'C:\Users\jhona\Desktop\LosPaqueteros\paqtracker-web'; npx vitest run <archivo>`.
  Al final de cada tarea: `npx vitest run` (todo en verde) y `npx tsc -b` (sin salida).
- Prerrequisito: la rama `feature/operacion-ia-responsive` tiene cambios sin commit. Antes de la Tarea 1, el usuario decide si los confirma ahí o si se crea una rama nueva desde ellos.

## Review Focus

1. **Vista de celular sin probar:** en jsdom `matchMedia` no existe, así que `useAnchoAngosto()` devuelve `false` y las vistas móviles nunca se renderizan en las pruebas. Las Tareas 6–8 incluyen pruebas con `matchMedia` simulado en `true`.
2. **Holgura exactamente 0:** debe leerse "0 min", no "0 min tarde" (Tarea 3).
3. **Decimales al escribir:** "1,2" y "1.2" valen 1.2; "1,2,3" es error visible, no un número truncado (Tarea 7).
4. **Movimiento reducido:** con `prefers-reduced-motion: reduce`, la ruta destacada no lleva la clase animada (Tarea 18).
5. **Agrupación de unidades:** nunca agrupa la unidad seleccionada ni las averiadas, para que siempre se vean y se puedan tocar (Tarea 21).

---

## Fase 1 · Fundamentos

### Tarea 1: Semáforo con los tokens del tema

**Files:**
- Modify: `src/lib/semaforo.ts:49-75` (`COLOR_SEMAFORO`, `TEXTO_SEMAFORO`, `BORDE_SEMAFORO`, `FONDO_SEMAFORO`)
- Modify: `src/components/map/GridMap.tsx:205` (`COLOR_NIVEL`), `src/components/map/LeyendaMapa.tsx:37-39` (`ROJO`, `VERDE`, `AMBAR`)
- Create: `src/lib/semaforo.colores.test.ts`
- Modify (expectativas de hex): `src/test/rubrica/*.test.tsx`, `src/lib/semaforo.test.ts`

**Interfaces:**
- Produces: `COLOR_SEMAFORO: Record<NivelCarga, string>` con `VACIO '#64748B'`, `VERDE '#12805C'`, `AMBAR '#B44D08'`, `ROJO '#C81E3A'` (hex del tema claro). `COLOR_HOLGURA_HEX: Record<NivelHolgura, string>` exportado desde `lib/semaforo.ts` (`VERDE/AMBAR/ROJO` iguales a los de arriba; `CERRADO '#94A3B8'`). `TEXTO_SEMAFORO` = `text-neutral-500 | text-ok-600 | text-warn-700 | text-critical-600`; `FONDO_SEMAFORO` y `BORDE_SEMAFORO` con las mismas familias.

- [ ] **Step 1: Prueba que falla**

```ts
it('el semáforo usa los colores del tema y las clases de token', () => {
  expect(COLOR_SEMAFORO).toEqual({ VACIO: '#64748B', VERDE: '#12805C', AMBAR: '#B44D08', ROJO: '#C81E3A' });
  expect(TEXTO_SEMAFORO.ROJO).toBe('text-critical-600');
  expect(Object.values(TEXTO_SEMAFORO).join(' ')).not.toMatch(/\[#/);
  expect(COLOR_HOLGURA_HEX.ROJO).toBe(COLOR_SEMAFORO.ROJO);
});
```

- [ ] **Step 2:** `npx vitest run src/lib/semaforo.colores.test.ts` → FAIL (colores viejos).
- [ ] **Step 3:** Cambiar los cuatro mapas y crear `COLOR_HOLGURA_HEX`. `GridMap` (`COLOR_NIVEL`) y `LeyendaMapa` importan los colores desde ahí; se borran sus constantes locales.
- [ ] **Step 4:** Reemplazar en las pruebas existentes los hex viejos (`#15803D`, `#B45309`, `#B91C1C` y sus `text-[#…]`) por `COLOR_SEMAFORO.*` o la clase de token. `npx vitest run` → PASS. Verificar también `src/config/paleta.test.ts` (contrastes) en verde.
- [ ] **Step 5:** Commit `refactor: semáforo con los colores del tema`.

### Tarea 2: Una forma por nivel

**Files:**
- Modify: `src/components/map/simbolos.tsx` (`MarcaSemaforo` :104, `MarcadorDestino` :59, `RADIO_DESTINO` :51)
- Modify: `src/components/layout/FooterBar.tsx` (leyenda de holgura), `src/components/operacion/ResumenOperacion.tsx` ("Saturación" con `▲` de texto)
- Test: `src/components/map/simbolos.test.tsx` (nuevo)

**Interfaces:**
- Produces: `FormaNivel: React.FC<{ nivel: 'VACIO' | 'VERDE' | 'AMBAR' | 'ROJO'; radio: number; color: string; conSigno?: boolean }>`. Dibuja centrado en (0,0) con `data-forma="circulo" | "triangulo" | "rombo" | "anillo"`. `MarcaSemaforo` y `MarcadorDestino` la usan. `MarcadorDestino` mantiene sus props y su `data-marcador`. El crítico usa `conSigno` ("!"). `ENTREGA` sigue siendo un círculo morado con punto blanco.

- [ ] **Step 1: Prueba que falla**

```tsx
it.each([['VERDE', 'circulo'], ['AMBAR', 'triangulo'], ['ROJO', 'rombo'], ['VACIO', 'anillo']] as const)(
  'el nivel %s se dibuja como %s en la marca y en el destino', (nivel, forma) => {
    const { container } = render(<svg><MarcaSemaforo nivel={nivel} /></svg>);
    expect(container.querySelector(`[data-forma="${forma}"]`)).toBeTruthy();
    if (nivel !== 'VACIO') {
      const destino = render(<svg><MarcadorDestino variante={nivel} color="#000" /></svg>);
      expect(destino.container.querySelector(`[data-forma="${forma}"]`)).toBeTruthy();
    }
  });
```

- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar `FormaNivel`. Triángulo y rombo tienen la misma área aproximada que el círculo de igual `radio`. La leyenda de `FooterBar` y la de `LeyendaMapa` usan `MarcaSemaforo`, y el `▲` de texto de Resumen pasa a `MarcaSemaforo`. Actualizar las filas de destinos de la leyenda (siguen siendo cuatro).
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat: una forma por nivel del semáforo en todo el sistema`.

### Tarea 3: Formatos únicos (holgura, duración, números, moneda, instante)

**Files:**
- Modify: `src/lib/formato.ts`
- Test: `src/lib/formato.test.ts` (crear si no existe, o extender)

**Interfaces:**
- Produces:
  - `formatearHolguraLegible(minutos: number): string`: `67 → "1 h 07 min"`, `0 → "0 min"`, `-67 → "1 h 07 min tarde"`. Reutiliza `formatearDuracion`.
  - `formatearNumero(valor: number, decimales = 0): string`: coma decimal y espacio de miles (`formatearNumero(2464) → "2 464"`, `formatearNumero(65.42, 1) → "65,4"`).
  - `formatearSoles(valor: number): string`: `1.2 → "S/ 1,20"`.
  - `leerDecimal(texto: string): number | null`: acepta `"1,2"` y `"1.2"`; devuelve `null` para `"1,2,3"`, `""` y `"abc"`.
  - `formatearInstante(fecha: Date, referencia: Date): string`: `"13:15"` si es el mismo día; si no, `"20/11 13:15"`.

- [ ] **Step 1: Pruebas que fallan** con exactamente los ejemplos de arriba, incluido `formatearHolguraLegible(0) === '0 min'` (Review Focus 2) y `leerDecimal('1,2,3') === null` (Review Focus 3).
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar las cinco funciones en `lib/formato.ts`. `formatearHolgura` se conserva (la usan pruebas de rúbrica) hasta la Tarea 4.
- [ ] **Step 4:** Ejecutar → PASS.
- [ ] **Step 5:** Commit `feat: funciones de formato legibles (holgura, números, soles, instante)`.

### Tarea 4: Glosario único y textos visibles

**Files:**
- Modify: `src/config/glosario.ts` (nuevo `NOMBRE_ESTADO_SIMULACION`; `NOMBRE_HOLGURA.CERRADO = 'Cerrado'`)
- Modify:
  - `src/services/adaptadorOperacion.ts:121,179`, `src/services/servicioPedidos.ts:42`: `holgura` con `formatearHolguraLegible`; además `Parada.holguraMinutos`.
  - `src/types/operacion.ts:57-66`: agregar `holguraMinutos: number` a `Parada`.
  - `src/components/metricas/ModuloMetricas.tsx:13`: usar `NOMBRE_HOLGURA`.
  - `src/components/simulacion/estadoCorrida.ts`, `ResultadoHistorico.tsx:9-15`, `ConfiguracionEscenario.tsx` (lista de existentes): usar `NOMBRE_ESTADO_SIMULACION`.
  - `ConfiguracionEscenario.tsx:266`: título "Nueva simulación". `:380`: "Resumen de la simulación". Quitar la frase "Las averías se incorporan en una entrega posterior.". Etiquetas de archivo con ejemplo: "Pedidos (ej.: ventas.202611.txt)", "Bloqueos (ej.: bloqueo.2611.txt)".
  - "unidades de P" → "paquetes": `PanelLateral.tsx:165`, `DetallePedido.tsx:170`, `PedidoRegistrado.tsx:150`, `RegistrarPedido.tsx:268,290` (etiqueta "Cantidad (paquetes)").
  - "Vehículo asignado/os" → "Unidad asignada/s": `DetallePedido.tsx:178`, `PanelLateral.tsx:196`; filtro y columna "Vehículo" → "Unidad" en `ColaPedidos.tsx`.
  - "En camino" → "En tránsito": `ListaPedidos.tsx:30`, `ListaAlmacenes.tsx:141`, chip del vehículo en `DetallePedido`.
  - "Destino (malla)" → "Destino": `DetallePedido.tsx:171`.
  - Columna "Cant." de Pedidos: valores en "paq.". CSV: encabezado "Código" en lugar de "ID".
  - `RecuadroHolgura.tsx`: título "Holgura restante" si `holguraMinutos ≥ 0` y "Retraso estimado" si `< 0`; se quita el porcentaje negativo.
  - Incidencias (`PanelLateral.tsx:579`): `detalle = `${p.holgura} · llega ${hora}``. Si no tiene unidad: "Sin unidad asignada · vence en {duración}".
- Create: `src/test/textos.test.ts` (guardia de textos prohibidos)

**Interfaces:**
- Produces: `NOMBRE_ESTADO_SIMULACION: Record<'EN_CURSO' | 'COMPLETADA' | 'DETENIDA' | 'COLAPSADA', string>` = `En curso · Completada · Detenida · Colapsada`. `Parada.holguraMinutos: number`. `PedidoEnCola.holgura` y `Parada.holgura` pasan a texto legible.

- [ ] **Step 1: Prueba que falla**: recorre `src/**/*.tsx` (sin `*.test.tsx`) con `fs` y `fast-glob` o `import.meta.glob('/src/**/*.tsx', { as: 'raw', eager: true })`:

```ts
const PROHIBIDOS = ['unidades de P', "'Resuelto'", 'Interrumpida', 'entrega posterior', 'Resumen de la corrida',
  'Configuración de escenario"', 'Destino (malla)', 'Vehículo asignado'];
it.each(PROHIBIDOS)('ningún texto visible usa "%s"', (texto) => {
  const conTexto = Object.entries(fuentes).filter(([, codigo]) => codigo.includes(texto)).map(([ruta]) => ruta);
  expect(conTexto).toEqual([]);
});
```

- [ ] **Step 2:** Ejecutar → FAIL con la lista de archivos.
- [ ] **Step 3:** Aplicar los cambios de textos listados. Ajustar las pruebas de rúbrica que leen esos textos ("-01:07" → "1 h 07 min tarde", nombres de estado). Los comentarios con "corrida" pueden quedar; la guardia solo revisa las cadenas listadas.
- [ ] **Step 4:** `npx vitest run` → PASS; `npx tsc -b` sin salida.
- [ ] **Step 5:** Commit `feat: glosario único y retrasos en palabras`.

---

## Fase 2 · Celular

### Tarea 5: Hook de pantalla angosta y encabezado de página responsive

**Files:**
- Create: `src/hooks/useAnchoAngosto.ts`, `src/hooks/useAnchoAngosto.test.tsx`
- Modify: `src/components/ui/EncabezadoPagina.tsx:20-…`
- Test: `src/components/ui/ui.test.tsx`

**Interfaces:**
- Produces: `useAnchoAngosto(): boolean`. Es `true` con `matchMedia('(max-width: 767px)')`, se actualiza con el evento `change` y devuelve `false` si `matchMedia` no existe.
- Produces: `EncabezadoPagina` pone el bloque de título con `basis-full md:basis-auto md:flex-1`, y las acciones con `w-full md:w-auto`, con el botón primario a lo ancho en celular. La descripción no se limita a una línea.

- [ ] **Step 1:** Pruebas del hook (con `vi.stubGlobal('matchMedia', …)` en `true` y en `false`, y sin `matchMedia`), y prueba de `EncabezadoPagina`: el contenedor del título tiene la clase `basis-full`.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Ejecutar → PASS. Verificación manual: Pedidos a 390 px, la descripción en una o dos líneas a lo ancho y los botones debajo.
- [ ] **Step 5:** Commit `fix: encabezado de página usable en celular`.

### Tarea 6: Pedidos en celular: tarjetas y hoja de filtros

**Files:**
- Create: `src/components/pedidos/TarjetaPedido.tsx`, `src/components/pedidos/HojaFiltrosPedidos.tsx`
- Modify: `src/components/pedidos/ColaPedidos.tsx` (encabezado :279-288, barra de filtros, tabla :409-505)
- Test: `src/components/pedidos/ColaPedidos.movil.test.tsx`

**Interfaces:**
- Consumes: `useAnchoAngosto()` (Tarea 5), `formatearHolguraLegible`, `formatearInstante` (Tarea 3).
- Produces: `TarjetaPedido: React.FC<{ pedido: PedidoEnCola; referencia: Date; onAbrir: (codigo: string) => void }>`, un `<button>` de ancho completo con nombre accesible `Pedido {codigo}`. Muestra, en este orden: código; holgura legible con `MarcaSemaforo`; "cliente · N paq. · plazo"; "Unidad X · llega HH:MM"; chip de estado.
- Produces: `HojaFiltrosPedidos: React.FC<{ abierta: boolean; filtros: Filtros; onCambiar: (f: Filtros) => void; onCerrar: () => void }>`, un diálogo modal inferior con los selectores Estado, Holgura, Plazo y Unidad, y el botón "Ver {n} pedidos".
- Los filtros rápidos "Críticos" y "En espera" pasan a chips con `aria-pressed` y check, en escritorio y celular.

- [ ] **Step 1: Pruebas que fallan** (con `matchMedia` en `true`):
  - se renderizan `getAllByRole('button', { name: /^Pedido P-/ })` y no hay `table`;
  - el botón "Filtros" muestra el contador ("Filtros (1)" tras elegir Estado);
  - "Exportar CSV" no está visible y aparece en el menú "Más acciones";
  - con `matchMedia` en `false`, sigue la `table` (sin regresión).
  - El chip "Críticos" tiene `aria-pressed="true"` tras pulsarlo.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar. En celular el encabezado lleva solo "Registrar pedido" (primario, a lo ancho) y "⋯" con "Exportar CSV".
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat: pedidos en celular con tarjetas y hoja de filtros`.

### Tarea 7: Configuración: campos legibles y moneda

**Files:**
- Modify: `src/components/configuracion/ModuloConfiguracion.tsx:246-330` (filas de almacenes y unidades), `:387-422` (barra de acciones)
- Modify: `src/lib/parametrosDominio.ts` (lectura con `leerDecimal`)
- Test: `src/components/configuracion/ModuloConfiguracion.test.tsx` (extender o crear)

**Interfaces:**
- Consumes: `leerDecimal`, `formatearNumero` (Tarea 3), `useAnchoAngosto` (Tarea 5), `DialogoConfirmacion` con `tono` (Tarea 10; si aún no existe, esta tarea va después de la 10).
- Filas: `grid-cols-2 md:grid-cols-[110px_repeat(3,auto)]`. El nombre va en `col-span-2 md:col-span-1`. Campos `w-24` (coordenadas y capacidades) y `w-28` (costos). El costo lleva el prefijo "S/" antes del campo y muestra `formatearNumero(valor, 2)`.
- En celular, la barra fija lleva solo "Guardar cambios" y un "⋯" con "Descartar cambios" y "Restablecer valores por defecto".

- [ ] **Step 1: Pruebas que fallan**:
  - el campo X del Central muestra `"27"` completo (`toHaveValue('27')`) y su clase incluye `w-24`;
  - escribir `"1,5"` en "Costo por km" de Moto no muestra error, y al guardar el costo de Moto enviado al servicio es `1.5`;
  - escribir `"1,2,3"` muestra "Ingresa un número válido." (Review Focus 3);
  - el costo se presenta como `"0,60"` con el texto "S/" antes del campo.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx vitest run` → PASS. Verificación manual a 390 px: se ven todos los valores.
- [ ] **Step 5:** Commit `fix: configuración legible en celular y montos en soles`.

### Tarea 8: Simulación y Operación en celular

**Files:**
- Modify: `src/components/simulacion/ConfiguracionEscenario.tsx` (aside :380-410)
- Modify: `src/lib/malla.ts:78` (`vistaCompleta`), `src/lib/malla.test.ts`
- Test: `src/components/simulacion/ConfiguracionEscenario.movil.test.tsx`

**Interfaces:**
- Produces: `vistaCompleta(lienzo: Lienzo, opciones?: { llenarAlto?: boolean }): Vista`. Con `llenarAlto` y `lienzo.alto > lienzo.ancho`, la escala es la que hace caber la malla en el **alto** (`lienzo.alto / MALLA_ALTO_KM` con el mismo margen que hoy), y la vista queda centrada en el almacén central en X. `GridMap` la llama con `llenarAlto: true` cuando el lienzo mide menos de 768 px de ancho.
- En celular, Simulación muestra una barra inferior fija (`fixed inset-x-0 bottom-0 md:hidden`) con "Ejecutar simulación" y, si falta algo, el mismo motivo del aviso actual.

- [ ] **Step 1: Pruebas que fallan**:
  - `vistaCompleta({ ancho: 390, alto: 700 }, { llenarAlto: true }).escala` es mayor que `vistaCompleta({ ancho: 390, alto: 700 }).escala`, y la malla proyectada cubre el alto útil;
  - en Simulación con `matchMedia` en `true`, hay exactamente un botón "Ejecutar simulación" y está dentro de `[data-barra-fija]`.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar. `limitarVista` debe permitir desplazar en X esa vista.
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat: simulación y mapa aprovechan la pantalla del celular`.

---

## Fase 3 · Componentes de estado y confirmación

### Tarea 9: EstadoCarga y EstadoError

**Files:**
- Create: `src/components/ui/EstadoCarga.tsx`, `src/components/ui/EstadoError.tsx`; exportar en `src/components/ui/index.ts`
- Modify: `ModuloConfiguracion.tsx:159`, `ColaPedidos.tsx:482-505`, `ReportePlanificacion.tsx:123`, lista de simulaciones en `ConfiguracionEscenario.tsx:168`, `App.tsx` (`sinDatos` de Métricas)
- Test: `src/components/ui/ui.test.tsx`

**Interfaces:**
- Produces: `EstadoCarga: React.FC<{ texto: string; filas?: number }>`, con `role="status"`, `aria-live="polite"`, el texto visible y `filas` barras de esqueleto (por defecto 3).
- Produces: `EstadoError: React.FC<{ titulo: string; descripcion?: string; onReintentar?: () => void }>`, con `role="alert"`, ícono `AlertTriangle` y botón secundario "Reintentar" si hay `onReintentar`.
- `EstadoVacio` de Pedidos pasa a ícono `Package` (vacío) o `SearchX` (sin coincidencias), en lugar de la lupa para todo.

- [ ] **Step 1:** Pruebas de ambos componentes: rol, texto y que "Reintentar" llama a la función. Además, una prueba de que la lista de simulaciones muestra `role="status"` mientras carga.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar y reemplazar los textos sueltos listados.
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat: estados de carga y error comunes`.

### Tarea 10: Confirmación con tono y "Descartar cambios" confirmado

**Files:**
- Modify: `src/components/modals/DialogoConfirmacion.tsx:10-69`
- Modify: `src/components/configuracion/ModuloConfiguracion.tsx` ("Aplicar y reiniciar", "Descartar cambios")
- Test: `src/components/modals/DialogoConfirmacion.test.tsx`

**Interfaces:**
- Produces: `DialogoConfirmacionProps.tono?: 'peligro' | 'normal'` (por defecto `'peligro'`). Con `'normal'`, el botón de confirmar usa `variante="primario"` y el diálogo usa `role="dialog"` en vez de `alertdialog`.

- [ ] **Step 1:** Pruebas:
  - con `tono="normal"`, el botón confirmar no tiene la clase de peligro (comprobar la clase que pone `Boton` para `peligro`);
  - en Configuración, pulsar "Descartar cambios" con cambios abre "¿Descartar los cambios?" y no descarta hasta confirmar.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat: confirmaciones con tono según la acción`.

---

## Fase 4 · Formularios

### Tarea 11: Registrar pedido: validación al enviar, mapa grande y un solo estado vacío

**Files:**
- Modify: `src/components/pedidos/RegistrarPedido.tsx` (botón :355-373, cantidad :280-295, panel de factibilidad)
- Test: `src/components/pedidos/RegistrarPedido.test.tsx` (extender o crear)

**Interfaces:**
- El botón "Registrar y planificar pedido" está siempre habilitado, salvo mientras se envía. Si falta algo, al pulsarlo:
  1. cada campo faltante muestra su error en `Campo` ("Ingresa el cliente.", "Elige un destino dentro de la malla.", "Elige un plazo de entrega.");
  2. el foco va al primer campo con error;
  3. bajo el botón aparece "Falta: cliente, destino y plazo" (solo lo que falta, unido con `unirAlternativas(…, 'y')`).
- Cantidad fuera de 1–999: el valor no se corrige solo; se muestra "Debe estar entre 1 y 999 paquetes.".
- Panel de factibilidad: el minimapa ocupa el ancho de la tarjeta (`MiniMapaMalla` con `alto` = 220 px y cursor en cruz). Los dos recuadros de "Elige…" se unen en una lista de requisitos con ✓ en los cumplidos.

- [ ] **Step 1:** Pruebas:
  - pulsar el botón con el formulario vacío no llama al servicio, marca los tres errores y deja el foco en "Cliente";
  - escribir `1500` en cantidad muestra el error y conserva `1500`;
  - con cliente y destino, el resumen dice "Falta: plazo".
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat: registrar pedido con validación al enviar`.

### Tarea 12: Nueva simulación: fecha obligatoria y flota sin correcciones silenciosas

**Files:**
- Modify: `src/components/simulacion/ConfiguracionEscenario.tsx` (Periodo, Flota :257, aviso :407-410)
- Test: `src/components/simulacion/ConfiguracionEscenario.test.tsx` (extender)

**Interfaces:**
- "Fecha de inicio" con `obligatorio` en `Campo`. "Ejecutar simulación" se mantiene habilitado; si falta la fecha, al pulsarlo se muestra el error "Elige la fecha de inicio." en el campo y el foco va a él.
- Flota: un valor negativo o mayor que 50 muestra en el campo "Debe estar entre 0 y 50 unidades." y no se corrige solo.

- [ ] **Step 1:** Pruebas de los dos comportamientos (y que no se crea la simulación).
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat: validación en el campo al crear una simulación`.

---

## Fase 5 · Color, tipografía y métricas

### Tarea 13: Métricas con contexto

**Files:**
- Modify: `src/components/metricas/ModuloMetricas.tsx`
- Test: `src/components/metricas/ModuloMetricas.test.tsx` (crear)

**Interfaces:**
- Consumes: `formatearDuracion`, `formatearNumero` (Tarea 3), `MarcaSemaforo` (Tarea 2).
- "Tiempo promedio de entrega" con `formatearDuracion` ("19 h 19 min").
- Todos los valores de KPI en `text-neutral-900`, salvo "Entregas en plazo", que toma el tono `ok`/`warn`/`critical` según los cortes de holgura vigentes.
- "Planificaciones ejecutadas" y "Tiempo de la última planificación" pasan a una tarjeta "Rendimiento del planificador" al final.
- La columna "Carga a bordo" lleva `MarcaSemaforo` con `nivelDeOcupacion`.
- En el `estado` del encabezado: "Actualizado hace N s", con la misma antigüedad que muestra la barra superior (prop `segundosDesdeActualizacion` desde `App.tsx`).

- [ ] **Step 1:** Pruebas:
  - con `tiempoPromedioEntregaMin = 1159` se muestra "19 h 19 min";
  - el valor "25 / 37" no tiene clases `text-primary-*`;
  - existe el `heading` "Rendimiento del planificador";
  - se muestra "Actualizado hace 3 s".
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat: métricas legibles y con contexto`.

### Tarea 14: Chips neutros, acciones sin rojo y tipografía con tokens

**Files:**
- Modify: `src/components/pedidos/estilos.ts` y donde se pinta el chip de plazo (`ColaPedidos`, `RegistrarPedido`, `DetallePedido`)
- Modify: `src/components/operacion/PanelLateral.tsx:418,601` ("Registrar avería"), `:573-…` (encabezados de sección de Incidencias)
- Modify: los 8 usos de `text-[Npx]` (`grep -rn "text-\[[0-9]*px\]" src`) → tokens `text-title`, `text-title-sm`, `text-body`, `text-caption`
- Test: `src/test/textos.test.ts` (extender la guardia)

**Interfaces:**
- Chip de plazo: `Insignia tono="neutral"`; "Priorizado" con ícono `Zap` de 12 px. Ningún chip de plazo usa `warn`.
- "Registrar avería": `Boton variante="secundario" tamano="sm" icono={Plus}`.
- Secciones de Incidencias (En riesgo, Averías, Bloqueos): `TituloGrupo` con el contador como `Insignia`, y estado vacío en texto ("Ninguna unidad averiada.", "Ningún bloqueo activo.").

- [ ] **Step 1:** Extender la guardia con dos casos: ningún `.tsx` contiene `text-[` seguido de dígitos y `px]`, y ningún `.tsx` combina `text-critical-600` con "Registrar avería" en la misma línea.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `refactor: chips, acciones y tipografía con los tokens`.

---

## Fase 6 · Arquitectura de información

### Tarea 15: Alertas sin duplicar y reporte de cierre al final

**Files:**
- Modify: `src/components/operacion/ResumenOperacion.tsx` (acción :70, tarjeta de incidencias, "Saturación" :126)
- Test: `src/components/operacion/ModuloOperacion.ia.test.tsx` (extender)

**Interfaces:**
- Resumen: se quita la fila "N en riesgo · … Ver en Incidencias".
- "Generar reporte de cierre" pasa al final del panel como `Boton variante="secundario"`.
- "Saturación de la flota" se renombra "Unidades en ruta" con el valor "25 de 37 (68 %)", el mismo término que en Métricas.

- [ ] **Step 1:** Pruebas:
  - el panel Resumen no contiene el texto "en riesgo";
  - el último botón del panel es "Generar reporte de cierre";
  - existe "Unidades en ruta" y no "Saturación".
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat: resumen sin alertas repetidas`.

### Tarea 16: Un panel a la vez y leyenda completa

**Files:**
- Modify: `src/components/operacion/ModuloOperacion.tsx` (apertura de paneles), `src/components/map/ColumnaMapa.tsx` (estado colapsado controlado)
- Modify: `src/components/map/LeyendaMapa.tsx` (filas que se cortan con "…")
- Test: `src/components/operacion/ModuloOperacion.ia.test.tsx`

**Interfaces:**
- Produces: `ColumnaMapaProps.colapsada: boolean` y `onCambiarColapsada(c: boolean)` (pasa a ser controlado). Abrir un panel derecho en escritorio pone `colapsada = true`. Volver a expandir la columna no cierra el panel (el usuario manda).
- Leyenda: el detalle va en una segunda línea (`text-caption`), sin `truncate`.

- [ ] **Step 1:** Pruebas:
  - al pulsar la pestaña "Flota", la columna queda colapsada (botón "Mostrar controles del mapa" visible);
  - expandirla deja abierto el panel Flota;
  - la fila "Almacén intermedio" de la leyenda contiene su detalle completo.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat: un panel a la vez para dar espacio al mapa`.

---

## Fase 7 · Mapa: rutas y unidades

### Tarea 17: Utilidades geométricas de ruta

**Files:**
- Modify: `src/lib/malla.ts`, `src/lib/malla.test.ts`

**Interfaces:**
- Produces: `flechasDeRecorrido(puntos: Coordenada[], vista: Vista, separacionPx: number): { x: number; y: number; angulo: number }[]`. Recorre el trazo proyectado y devuelve un punto cada `separacionPx` píxeles de longitud acumulada. `angulo` va en grados (0 = hacia +x, 90 = hacia +y), según el tramo donde cae. Devuelve `[]` si el trazo mide menos que `separacionPx`.

- [ ] **Step 1:** Pruebas:
  - recorrido `[(0,0),(10,0),(10,10)]` con `escala 10` y `separacionPx 50` → puntos en (50,0) ángulo 0, (100,0) ángulo 0 o 90 según el tramo, y (100,50) ángulo 90;
  - recorrido de 3 px → `[]`.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Ejecutar → PASS.
- [ ] **Step 5:** Commit `feat: puntos de flecha a lo largo de una ruta`.

### Tarea 18: Ruta destacada animada, flechas y rutas tardías

**Files:**
- Modify: `src/components/map/GridMap.tsx` (bloque RUTAS, ~:1150-1175)
- Modify: `src/index.css` (animación y su versión con movimiento reducido)
- Modify: `src/components/map/LeyendaMapa.tsx` (dos filas nuevas)
- Test: `src/test/rubrica/rubrica.mapa.test.tsx` (nuevo `describe('Rutas dinámicas')`)

**Interfaces:**
- Consumes: `flechasDeRecorrido` (Tarea 17), `Parada.holguraMinutos` (Tarea 4), `COLOR_SEMAFORO.ROJO` (Tarea 1).
- CSS: la clase `.ruta-fluye` anima `stroke-dashoffset` de 0 a `-12` (el largo de "7 5") en 1,2 s, lineal e infinita. Dentro de `@media (prefers-reduced-motion: reduce)` lleva `animation: none`.
- El path de la ruta destacada lleva `className="ruta-fluye"` solo si `!prefiereMenosMovimiento()`. Esa función se exporta desde `src/lib/movimiento.ts` y reemplaza el `sinAnimacion` local de `useDeslizamientoUnidades`.
- Con `vista.escala ≥ ESCALA_DETALLE_PX_KM`: en cada ruta pendiente (no destacada), un `<path data-flecha d="M-3 -3 L1 0 L-3 3">` por punto de `flechasDeRecorrido(…, 80)`, rotado según `angulo`, con el color y la opacidad de la ruta.
- Con `modoColor === 'holgura'`: si alguna parada de la unidad tiene `holguraMinutos < 0`, su ruta no destacada usa `stroke={COLOR_SEMAFORO.ROJO}` y lleva `data-ruta-tardia`.
- Leyenda: "La ruta seleccionada avanza hacia su destino" y "Ruta con un pedido que llega tarde (modo Holgura)".

- [ ] **Step 1:** Pruebas:
  - tras seleccionar A-01, la ruta con `stroke="#1E40AF"` tiene la clase `ruta-fluye`;
  - con `matchMedia('(prefers-reduced-motion: reduce)')` en `true`, no la tiene (Review Focus 4);
  - con zoom ≥ detalle (pulsar "Acercar" hasta superarlo), existe `[data-flecha]`; en la vista inicial no;
  - en modo Holgura, con una parada de M-01 de `holguraMinutos: -10`, su ruta tiene `data-ruta-tardia`;
  - las pruebas C30–C34 siguen en verde.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat: ruta seleccionada animada, flechas de sentido y rutas tardías`.

### Tarea 19: Paradas numeradas de la ruta destacada

**Files:**
- Modify: `src/components/map/GridMap.tsx` (después de las rutas, antes de los destinos)
- Test: `src/test/rubrica/rubrica.mapa.test.tsx`

**Interfaces:**
- Para cada unidad en `unidadesDestacadas`, en cada `paradas[i]` dibuja `<g data-parada={i + 1}>`: un círculo de radio 8 en `#1E40AF` con el número en blanco (11 px) y, a su derecha, la hora (la parte "HH:MM" de `parada.eta`) en `text-caption` con halo. No se dibuja nada si no hay selección.

- [ ] **Step 1:** Pruebas:
  - sin selección, no hay `[data-parada]`;
  - tras seleccionar A-01, hay tantos `[data-parada]` como paradas tiene, con los textos "1", "2"… y la hora de la primera.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat: paradas numeradas con hora en la ruta seleccionada`.

### Tarea 20: Modo oscuro del mapa con variables

**Files:**
- Modify: `src/index.css:46-59` y los colores que `GridMap` usa para el lienzo (fondo, cuadrícula, borde, rótulos, halo, ruta pendiente y recorrida)
- Test: `src/test/rubrica/rubrica.mapa.test.tsx`

**Interfaces:**
- Produces: variables `--mapa-cuadricula`, `--mapa-rotulo`, `--mapa-halo`, `--mapa-ruta`, `--mapa-recorrido` en `:root` y `:root.oscuro`. `GridMap` usa `stroke="var(--mapa-cuadricula)"`, etc. Se borran las reglas que reemplazan colores buscando un hex exacto, salvo las de símbolos con significado. Las pruebas que leen `stroke="#9EABBA"` o `#94A3B8` pasan a leer la variable. La leyenda (C32) también usa `var(--mapa-ruta)`, así que la prueba C32 se actualiza para esperar `var(--mapa-ruta)` en vez de `#94A3B8`.

- [ ] **Step 1:** Prueba: ninguna `line` de la cuadrícula tiene un atributo `stroke` que empiece con `#`.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar. Los valores claros son los actuales; los oscuros, los de `index.css`.
- [ ] **Step 4:** `npx vitest run` → PASS. Verificación manual en modo oscuro: cuadrícula tenue y rutas visibles.
- [ ] **Step 5:** Commit `refactor: colores del mapa con variables de tema`.

### Tarea 21: Unidades agrupadas en la vista lejana

**Files:**
- Create: `src/lib/agrupacion.ts`, `src/lib/agrupacion.test.ts`
- Modify: `src/components/map/GridMap.tsx` (`enCalle` y su dibujo)

**Interfaces:**
- Produces: `agruparCercanas<T extends { codigo: string }>(items: T[], posicion: (t: T) => { x: number; y: number }, radioPx: number, excluir: (t: T) => boolean): { centro: { x: number; y: number }; miembros: T[] }[]`. Es una agrupación codiciosa en el orden recibido: cada ítem se une al primer grupo cuyo centro está a ≤ `radioPx`; si no, abre un grupo nuevo. Los ítems excluidos forman siempre un grupo propio.
- En `GridMap`, con `vista.escala < ESCALA_DETALLE_PX_KM`, `radioPx = 10`. Se excluyen las seleccionadas o destacadas, las averiadas y la que está bajo el cursor (Review Focus 5). Un grupo de un solo miembro se dibuja igual que hoy. Uno de dos o más se dibuja como `<g data-objeto="grupo:{codigos unidos con ,}">`: ícono del primer miembro, insignia con el número de miembros y área táctil de 28 px. Al tocarlo, la vista se acerca ×2 centrada en el grupo (reutilizar la función de zoom de los botones).

- [ ] **Step 1:** Pruebas de `agruparCercanas`:
  - tres puntos a 4 px forman un grupo de 3;
  - un punto a 30 px queda solo;
  - un excluido a 2 px de otro queda en su propio grupo.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar la función y su uso en `GridMap`.
- [ ] **Step 4:** `npx vitest run` → PASS. A-01 y M-01 siguen con su propio `data-objeto` en las pruebas de rúbrica.
- [ ] **Step 5:** Commit `feat: unidades cercanas agrupadas en la vista lejana`.

---

## Fase 8 · Documentación

### Tarea 22: Actualizar el sistema de diseño

**Files:**
- Modify: `docs/design-system.md`:
  - el principio 3 pasa a "En el mapa llevan color las unidades, los destinos y los almacenes intermedios (semáforo); red vial y cuadrícula en neutros";
  - tabla de significado por color (spec §1);
  - formas por nivel (spec §2);
  - regla de movimiento (spec §7).
- Modify: `docs/propuesta-unificacion-ui.md`: nota al inicio que remite a la spec de 20-11-2026 para lo que esta cambia.

- [ ] **Step 1:** Editar ambos documentos.
- [ ] **Step 2:** Revisar que todos los enlaces relativos funcionen.
- [ ] **Step 3:** Commit `docs: sistema de diseño alineado con las mejoras UX/UI`.
