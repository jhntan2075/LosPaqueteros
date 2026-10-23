# paqtracker-web

Front de PaqTracker: Registro de pedidos y Visualizador. React 18 + TypeScript + Vite.
Consume `paqtracker-api` por REST (`/api`) y STOMP sobre WebSocket (`/ws`).

## Ejecutar

```bash
npm ci
npm run dev        # http://localhost:5173 · Vite reenvía /api y /ws a 127.0.0.1:3000
npm run lint
npm run build      # dist/ para Nginx
```

La API debe estar en marcha (`docker compose up --build` desde la raíz).

## Cómo llegan los datos

```
services/clienteApi.ts      REST tipado (contrato en types/api.ts)
services/clienteStomp.ts    una conexión STOMP por navegador; suscripción por tópico y
                            re-suscripción automática al reconectar
services/adaptadorOperacion.ts  instantánea de la API → modelos de vista (types/operacion.ts)
hooks/useEstadoEjecucion    instantánea por REST + tópicos /estado y /eventos de una ejecución
hooks/useRelojSimulado      reloj interpolado entre instantáneas con el factor k
hooks/useDatosOperacion     arma DatosOperacion y lo reparte por contexto
```

- **Sin polling:**
  - el estado llega por STOMP en cada Sc (1 s);
  - la cola de pedidos se vuelve a pedir cuando la instantánea indica que cambió algún pedido;
  - la trazabilidad de un pedido se pide al abrir su detalle.
- **Movimiento:** el reloj y las unidades se interpolan en el cliente cada 100 ms. Cada unidad
  avanza sobre el camino real de su tramo en curso (origen, destino, salida y llegada; rodea los
  bloqueos). La ruta dibujada es la ruta restante: lo recorrido se depura.
- **Cualquier dispositivo, cualquier escenario:**
  - Operación y Pedidos muestran la operación día a día (`dia-a-dia`).
  - Simulación lista las simulaciones del servidor y abre cualquiera. Todos los navegadores que
    la abren ven la misma corrida.

## Pantallas

| Pestaña | Contenido |
|---|---|
| Operación | Mapa en vivo del día a día; incidencias, flota y bitácora en el panel lateral del mapa |
| Pedidos | Cola (CU-04), registro manual con replanificación inmediata (CU-01, CU-12) |
| Simulación | Crear o abrir una simulación de 5 días o hasta el colapso, corrida en vivo, diagnóstico e informe |
| Métricas | Cumplimiento, unidades en ruta y planificador (Ta, planificaciones, distancia) del día a día |

No hay controles de velocidad: el factor k lo fija el servidor y es el mismo para todos los
que observan una ejecución.

## Tipografía

Una sola familia en todo el sistema: **Fira Sans** (Google Fonts, cargada en `index.html`). No se
usa fuente monoespaciada.

| Peso | Clase | Uso |
|---|---|---|
| 400 | `font-normal` | Texto corrido, ayudas, valores de tablas |
| 500 | `font-medium` | Botones, pestañas, etiquetas de estado, datos destacados |
| 600 | `font-semibold` | Títulos de sección y de panel, cifras de KPI |
| 700 | `font-bold` | Títulos de página y cifras principales |

- **Datos numéricos** (horas, fechas, cifras, códigos como `#1088` o `A-04`, coordenadas):
  clase `tabular-nums`, para que los dígitos tengan el mismo ancho y las columnas y relojes no
  "bailen" al cambiar de valor. Los rótulos SVG del mapa la heredan de `index.css`.
- Solo se cargan los pesos 400 a 700; si una pantalla necesita otro peso o cursiva, se agrega
  primero a la URL de la fuente en `index.html` y a esta tabla.
- No se usan `font-mono` ni otras familias: `tailwind.config.js` solo define `sans`.
- Tamaños: cinco clases (`text-caption`, `text-body`, `text-body-lg`, `text-title`,
  `text-display`); escala y componentes base en `docs/design-system.md`.

## Variables

| Variable | Por defecto | Uso |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | URL base de la API REST |
| `VITE_WS_URL` | `/ws` | Endpoint STOMP; relativa se resuelve contra el host de la página |
