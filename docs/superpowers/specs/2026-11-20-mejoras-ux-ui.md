# Mejoras UX/UI de PaqTracker: especificación

Fecha: 20-11-2026. Fuente: revisión heurística (Nielsen) de todas las pantallas de `paqtracker-web`
en escritorio, celular y modo oscuro. Complementa [design-system.md](../../design-system.md) y
[propuesta-unificacion-ui.md](../../propuesta-unificacion-ui.md); donde choquen, manda este documento.

## Decisiones ya tomadas (no se reabren)

- Almacenes intermedios: verde = lleno, ámbar = medio, rojo = stock bajo (cortes del inventario).
- Destinos del mapa como marcadores circulares; rutas translúcidas; símbolos al 60 % con mapa < 640 px.
- Celular: menú de módulos "≡ Módulo ▾"; pestaña del panel "Envíos" (no "Pedidos").
- Operación no lleva la barra inferior de estado (decisión previa del equipo, ver `App.tsx`).
- Rúbrica: la ruta pendiente es punteada, de 2–4 px; la destacada mide 3 px; leyenda con el mismo trazo.

## 1. Color

Un significado por color, con los tokens del tema (`tailwind.config.js`):

| Token | Significado |
|---|---|
| `primary` | acción, selección, foco, ruta destacada |
| `critical` | requiere acción: crítico, retraso, stock bajo, error, destructivo |
| `warn` | atención: ajustado, nivel medio |
| `ok` | bien: holgado, abastecido, en plazo, éxito |
| `info` | estado neutro en curso: en tránsito, en ejecución |
| `neutral` | datos sin juicio, números de KPI, chips de plazo |

- El semáforo (`lib/semaforo.ts`) y la holgura del mapa (`COLOR_NIVEL`) usan los hex de los tokens de
  tema claro (`ok-600`, `warn-700`, `critical-600`); las clases de texto/fondo/borde usan las clases
  de token (cambian solas en modo oscuro).
- Números de KPI en neutro; color solo si hay umbral.
- Chip "Priorizado" neutro con ícono `Zap`; el naranja queda solo para "Ajustado".
- "Registrar avería" no va en rojo.

## 2. Formas de nivel (una por nivel, en todas partes)

| Nivel | Forma |
|---|---|
| Bien (VERDE) | círculo lleno |
| Atención (AMBAR) | triángulo |
| Crítico (ROJO) | rombo |
| Vacío / sin dato (VACIO) | anillo |

En el mapa los destinos usan estas formas (tamaño según urgencia); el crítico lleva "!" dentro.

## 3. Textos y formatos

| Concepto | Término único | Se retira |
|---|---|---|
| Vehículo | Unidad | Vehículo |
| Cantidad | paquetes / paq. | unidades de P, u. |
| Ejecución de simulación | Simulación | corrida (en textos visibles) |
| Pedido en ruta | En tránsito | En camino |
| Estado de simulación | En curso · Completada · Detenida · Colapsada | En ejecución, Finalizada, Interrumpida, Colapso detectado |
| Nivel de holgura cerrado | Cerrado | Resuelto |

- Holgura: `≥ 0` → "1 h 07 min" / "38 min"; `< 0` → "1 h 07 min tarde". Nunca "-01:07" ni porcentaje negativo.
- Duraciones: "19 h 19 min", nunca "1159 min".
- Números: coma decimal y espacio de miles; moneda "S/ 1,20".
- Instantes de operación: "13:15" si es el mismo día que la referencia, "20/11 13:15" si no.
- Fuera de la interfaz: notas internas ("…entrega posterior"), patrones de archivo sin ejemplo.
- Título del módulo Simulación: "Nueva simulación" (no "Configuración de escenario").

## 4. Celular (< 768 px)

- `EncabezadoPagina`: título y descripción a lo ancho; acciones debajo.
- Pedidos: tarjetas en vez de tabla; búsqueda + botón "Filtros (n)" que abre una hoja inferior.
- Configuración: un bloque por fila, campos de ancho fijo, valores completos visibles.
- Simulación: barra inferior fija con "Ejecutar simulación" y el motivo si falta algo.
- Operación: en vertical, la vista inicial llena el alto disponible.

## 5. Componentes y patrones

- `EstadoCarga` y `EstadoError` (con "Reintentar") junto al `EstadoVacio` existente; sin "Cargando…" suelto.
- `DialogoConfirmacion` con `tono: 'peligro' | 'normal'`; "Aplicar y reiniciar" es normal;
  "Descartar cambios" pide confirmación.
- Filtros rápidos como chips con `aria-pressed` y check.
- Formularios: botón principal habilitado; al enviar se marcan los errores en los campos y el foco va
  al primero; sin correcciones silenciosas.
- Métricas: "actualizado hace N s", duraciones legibles, sección "Rendimiento del planificador".

## 6. Arquitectura de información

- Alertas: bloque de la columna del mapa + insignia de Incidencias; el Resumen no repite "en riesgo".
- "Generar reporte de cierre": al final del Resumen, como acción secundaria.
- Un solo panel lateral a la vez en escritorio: abrir un panel derecho colapsa la columna izquierda.

## 7. Mapa: rutas

- Ruta destacada: el punteado avanza hacia el destino (CSS, `stroke-dashoffset`); sin animación con
  `prefers-reduced-motion: reduce`.
- Paradas de la ruta destacada numeradas (1, 2, 3…) con su hora estimada.
- Con zoom ≥ `ESCALA_DETALLE_PX_KM`: flechas de dirección sobre el tramo pendiente, sin animación.
- Modo de color "Holgura": la ruta de una unidad con algún pedido que llega tarde va en `critical`.
- Vista lejana: unidades a ≤ 10 px entre sí se agrupan en un ícono con número; tocarlo acerca el mapa.
