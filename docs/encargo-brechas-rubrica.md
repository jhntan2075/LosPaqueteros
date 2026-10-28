# Encargo: brechas de la rúbrica de evaluación (c.1inf54.26-2)

**Para:** Jhonatan
**De:** Diego
**Rama base:** `feature/test` (ahí están las pruebas de la rúbrica)

## Contexto

Escribimos pruebas automáticas para cada criterio de la rúbrica marcado "Sí" (mapa, panel, tiempos,
flota, simulación). Casi todo cumple, pero hay **9 criterios que el producto aún no cumple**. Cada uno
tiene su prueba escrita con `it.fails`, que hoy "pasa" porque el comportamiento falla.

**Cómo saber que terminaste un punto:** cambia su `it.fails(` por `it(` en el archivo de prueba
indicado y corre `npm test`. Si pasa, está listo. Si corriges algo y te olvidas de cambiarlo, Vitest
también te avisa: un `it.fails` que deja de fallar se marca en rojo.

Antes de subir, corre en `paqtracker-web`: `npm run lint`, `npm test` y `npm run build`.

Las pruebas están en `paqtracker-web/src/test/rubrica/`. El escenario de datos que usan (unidades,
almacenes y pedidos) está en `escenario.ts`.

---

## Prioridad alta (rápidos, solo front)

### C61 · Buscar un almacén desde el buscador del mapa
- **Hoy:** el buscador solo encuentra pedidos y unidades; "Central" dice "No hay pedidos ni unidades…".
- **Dónde:** `components/map/GridMap.tsx`, función `buscar()`.
- **Idea:** si el término coincide con `ALMACENES` (por `nombre` o `id`, sin distinguir mayúsculas),
  llamar `onSeleccionar({ tipo: 'almacen', codigo })` y `centrarEn(almacen.ubicacion)`. Conviene
  agregar los almacenes al `<datalist>` y actualizar el placeholder.
- **Prueba:** `rubrica.panel.test.tsx` → `C61 (brecha)`. Busca "Central" y espera el panel "Almacén Central".

### C64 · La lista de averías debe indicar la ubicación
- **Hoy:** "Bicicleta B-01 · Tipo 1 · Menor · vuelve hoy 10:10", sin el nodo.
- **Dónde:** `components/operacion/PanelLateral.tsx`, `ListaIncidencias`, el `detalle` de cada averiada.
- **Idea:** agregar `· (x,y)` con `u.posicion` redondeado (la posición puede ser fraccionaria).
- **Prueba:** `rubrica.panel.test.tsx` → `C64 (brecha)`. Espera `(10,10)` en la fila.

### C9 y C16 · Tooltip del almacén con los pedidos que salen
- **Hoy:** al pasar el mouse por el central solo dice "Stock ilimitado". Por un intermedio dice
  "Stock 10 % · …". En ninguno aparece la lista de pedidos.
- **Dónde:** `components/map/GridMap.tsx`, función `contenidoTooltip`, rama `objeto.tipo === 'almacen'`.
- **Idea:** con `datos.unidades` (ya trae `origen` y `paradas`), juntar los códigos de pedido de las
  unidades con `origen === a.id`. Mostrar los primeros 3–4 y "+N" si hay más, por ejemplo
  `Salen: #1001, #1002 +3`. El tooltip es de una línea con `whitespace-nowrap`: ojo con el ancho.
- **Pruebas:** `rubrica.mapa.test.tsx` → `C9 (brecha)` espera `#1001` en el tooltip del central, y
  `C16 (brecha)` espera `#1002` en el del Intermedio 2.

### C37 · Segundos en el tiempo simulado transcurrido (menor)
- **Hoy:** `formatearDiasHoras` devuelve `1 d 02 h 03 m`.
- **Dónde:** `lib/formato.ts`. Se usa en `EncabezadoCorrida.tsx` y en `InformeCorrida.tsx`.
- **Idea:** agregar los segundos (`1 d 02 h 03 m 04 s`), ya sea en la misma función o con una
  variante. Revisa `lib/formato.test.ts`, que puede tener casos de esta función.
- **Prueba:** `rubrica.tiempos-flota.test.tsx` → `C37 (brecha menor)`. Espera `04 s`.

---

## Prioridad media

### C36 · Fecha y hora real actual en el encabezado de la corrida
- **Hoy:** solo se muestra el tiempo real transcurrido; no la fecha-hora real.
- **Dónde:** `components/simulacion/EncabezadoCorrida.tsx`.
- **Idea:** agregar un `Bloque` con la etiqueta **"Fecha y hora real"** que muestre
  `formatearFechaLarga(new Date())` (con segundos) y se actualice cada segundo con un `setInterval`.
  También puede ir en `TopNavbar` para Operación.
- **Prueba:** `rubrica.tiempos-flota.test.tsx` → `C36 (brecha)`. Busca el texto `Fecha y hora real`.

### C26 · El ícono del vehículo debe indicar la dirección
- **Hoy:** el `<image>` de la unidad no tiene `transform`; el auto "mira" siempre hacia el mismo lado.
- **Dónde:** `components/map/GridMap.tsx`, `CapasMapa`, en el bloque que dibuja las unidades.
- **Idea:** sacar la dirección de `u.ruta[0] → u.ruta[1]` (la ruta empieza en la posición actual).
  Al ir hacia el oeste, espejar con `scale(-1, 1)`; al ir hacia el norte o el sur, rotar o dejarlo
  como está, lo que quede mejor. El `transform` va en el `<image>`, con centro en el anclaje del ícono.
- **Prueba:** `rubrica.mapa.test.tsx` → `C26 (brecha)`. Espera que el `<image>` de A-01, que va
  hacia el sur, tenga un `transform` con `rotate` o `scale`. Si decides no transformar en vertical,
  ajusta la prueba para que A-01 vaya hacia el oeste.

### C67 · Pedido fraccionado: resaltar todas las rutas que lo llevan
- **Hoy:** al seleccionar un pedido se resalta una sola unidad (`destinos.find(...)`), aunque el
  pedido vaya repartido entre varias.
- **Dónde:** `components/map/GridMap.tsx`, `unidadDestacada` en `CapasMapa`. Pasarla a un conjunto
  (`destinos.filter(d => d.pedido === codigo).map(d => d.unidad)`) y usar `.has(...)` donde hoy se
  compara con `===`.
- **Ojo:** en `ModuloOperacion.tsx` y `CorridaSimulacion.tsx` los `destinos` pueden repetir el
  código de pedido. En `GridMap` el pin usa `key={d.pedido}`: cámbialo a `${d.pedido}-${d.unidad}`
  para evitar el aviso de keys duplicadas.
- **Prueba:** `rubrica.panel.test.tsx` → `C67 (brecha)`. Pone #1001 en A-01 y en M-01 y espera dos
  rutas resaltadas.

---

## Requiere front + back

### C1 · Pedir también la hora de inicio de la simulación
- **Hoy:** solo hay `input type="date"`. La simulación arranca siempre a las 00:00 (`${fecha}T00:00`).
- **Front:** `components/simulacion/ConfiguracionEscenario.tsx`, sección "02 Periodo". Agregar un
  `input type="time"` con la etiqueta **"Hora de inicio"** y enviarla en la solicitud.
- **Back:** `fechaInicio` hoy es `yyyy-MM-dd` (`SolicitudEjecucionApi` en el front y su DTO en
  `paqtracker-api`, módulo `ejecucion`). Hay que aceptar la hora (un campo `horaInicio` o un
  `LocalDateTime`) y usarla en el `LineaTiempo` y en el reloj de la ejecución. Revisa también
  `IntegracionApiTest` y `RubricaCriteriosGeneralesTest`, que crean ejecuciones con solo la fecha:
  que el campo nuevo sea opcional, con 00:00 por defecto.
- **Prueba:** `rubrica.simulacion.test.tsx` → `C1 (brecha)`. Busca la etiqueta `Hora de inicio`.
  Al terminar, conviene extender la prueba `C1` para que verifique que la hora se envía en la solicitud.

---

## Para consultar con el equipo (no requieren código por ahora)

- **C15 / C64 "cancelaciones":** en las pruebas las tomamos como **averías** (registrar o cancelar),
  porque la rúbrica es genérica y habla de vuelos. Confirmar si se responde así en la evaluación.
- **C70 / C71 "lista de unidades con carga":** la única lista por unidad con su carga está dentro del
  diálogo "Registrar avería". Pasa la prueba, pero en la evaluación quizá esperen verla en la pestaña
  **Flota**. Si hay tiempo, agregar ahí una lista de unidades (código, estado y carga) que abra el
  detalle de cada una.
