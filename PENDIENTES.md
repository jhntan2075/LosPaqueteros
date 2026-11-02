# Pendientes de UX/UI — PaqTracker

Estado tras la ronda de mejoras de Pedidos, Registrar pedido, Simulación, Métricas
y consistencia visual (ver commit de esta rama). Lo siguiente **no** está implementado
todavía.

## Microcopy
- Barrido sistemático de la tabla de microcopy de la revisión original (terminología
  mezclada "corrida"/"simulación", "unidades" vs "paquetes", etc.) en todas las pantallas.

## Patrones de interacción
- Alertas globales (toast/banner) cuando entra un pedido crítico o una avería nueva.
- Sincronización hover fila↔mapa: pasar el mouse sobre una fila de una tabla resalta el
  nodo/ruta correspondiente en el mapa, y viceversa.
- Marcas del timeline en la barra de avance de `EncabezadoCorrida` clicleables (saltar
  a ese punto/evento).

## Dependientes de backend (fuera de alcance front-only)
- Diagnóstico de colapso logístico usando `causa`/`codigoPedido` reales de la API en
  vez de la heurística actual del front.
- Historial persistente de la bitácora de eventos (hoy se pierde al recargar la página;
  requiere un endpoint nuevo en el backend).
- Migrar los colores hex-literal usados en los componentes a tokens de
  `tailwind.config.js` y actualizar `docs/design-system.md` en consecuencia.
