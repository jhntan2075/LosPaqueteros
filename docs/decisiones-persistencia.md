# Persistencia de pedidos y ejecuciones

Decisiones del equipo del 11 y 12 de noviembre de 2026, implementadas en la rama
`feature/persistencia-pedidos-ejecuciones`. Antes de este cambio, la base solo guardaba los pedidos manuales y
una fila de resumen por ejecución. Todo lo que se veía en pantalla salía de la memoria del API, que leía los
pedidos de los archivos en cada ejecución.

## Qué cambia

| Antes | Ahora |
|---|---|
| Los pedidos de los archivos se leían de la carpeta en cada ejecución. | Se cargan **una vez** a la tabla `pedido` al arrancar el API. Después el sistema los lee de la base. |
| Subir un archivo de ventas reemplazaba el archivo del mes para todos. | El archivo subido queda en la base como un **lote** que usa **solo** la simulación que se crea con él. No reemplaza nada. |
| El día a día guardaba solo los pedidos manuales y no sabía cuáles había entregado. | Guarda los pedidos manuales y, en cada paso, el **avance** de cada pedido. Tras un reinicio retoma lo pendiente. |
| La fila de la ejecución guardaba entregas, incumplimientos y fecha de colapso, y nadie la leía. | Guarda el resultado completo, la causa del colapso y el contexto para reproducir la corrida. La lista de ejecuciones muestra también las pasadas. |
| El día a día tenía una sola fila (`dia-a-dia`) que cada reinicio pisaba. | Una fila por mes (`dia-a-dia-AAAAMM`) que acumula el resultado entre reinicios. |

Los **bloqueos no cambian**: siguen en la carpeta, y un archivo de bloqueos subido reemplaza el del mes. El
**módulo de experimentación** sigue leyendo los archivos, para que el experimento GA vs IACO sea reproducible
sin API ni base.

## Pedidos

### De dónde sale cada pedido (`pedido.origen`)

| Origen | `lote` | Quién lo usa |
|---|---|---|
| `ARCHIVO_SISTEMA` | `SISTEMA` | El día a día y todas las simulaciones de su fecha. |
| `MANUAL` | vacío | El día a día del mes en que se registró. |
| `ARCHIVO_CORRIDA` | `corrida-<id>` | Solo la simulación que se creó con ese lote. |

- **Carga inicial** (`CargaPedidosSistema`, al arrancar, antes que el día a día):
  - recorre la carpeta `APP_DATOS_VENTAS` y carga cada mes que la base todavía no tiene;
  - es idempotente: la primera vez carga los 36 meses del curso (unos 160 000 pedidos) y las siguientes no hace nada;
  - un archivo con errores se informa en el log y se salta;
  - la restricción `uq_pedido_archivo (lote, mes_archivo, orden)` impide duplicar un mes.
- **Archivo subido para una corrida** (`POST /api/archivos/pedidos`):
  - se valida igual que antes y, si no tiene errores, se guarda como lote nuevo;
  - la respuesta trae el `lote`, y el front lo envía al crear la simulación (`lotePedidos`);
  - al crearla, el lote queda atado a la ejecución;
  - los lotes que ninguna simulación usó (por ejemplo, si eligieron un archivo y cancelaron) se borran al arrancar el API.
- **Simulación con un lote:**
  - en el mes que trae el lote usa sus pedidos;
  - los demás meses del periodo salen del sistema (si cruza de mes y solo subieron uno);
  - si el lote no existe, ya lo usa otra corrida o es de un mes fuera del periodo, se rechaza con 400.
- **Manuales:** se insertan primero en la base y después entran al motor con el mismo id, porque con ese id se retoman tras un reinicio.
- **Simulaciones y manuales:** las simulaciones no usan pedidos manuales. Así son reproducibles y comparables.

### Id del pedido

El id de un pedido en el motor es su id en la base. El código visible sigue siendo `P-%05d` y crece a más
dígitos si hace falta (`P-123456`). Un mismo pedido del sistema tiene el mismo código en todas las corridas.

### Avance (solo el día a día)

Columnas `estado`, `cantidad_entregada`, `entregado_en` y `retraso_minutos`:

- `estado` toma los valores `REGISTRADO`, `EN_TRANSITO`, `ENTREGADO` o `INCUMPLIDO`.
- Se escriben en cada paso, solo para los pedidos que cambiaron (`SeguimientoPedidos.tomarCambios`).
- Si la base falla, se registra en el log y la operación sigue. Cada avance lleva el estado completo del
  pedido, así que su siguiente cambio lo deja al día.
- Las simulaciones no escriben avance: serían miles de escrituras por corrida, y su resultado ya queda en `ejecucion`.

### Qué pasa al reiniciar el API (o al pulsar "reiniciar" para aplicar parámetros)

El día a día lee los pedidos del mes (del sistema y manuales) y los clasifica por su avance guardado:

| Pedido | Qué se hace |
|---|---|
| Registrado después del instante actual | Entra entero, como siempre. |
| Registrado antes del **primer arranque del mes** | No se operó: se ignora. |
| Ya entregado o incumplido | No vuelve. |
| Pendiente con plazo vencido | Se marca `INCUMPLIDO` y suma un incumplimiento al resultado del mes. |
| Pendiente con plazo vigente | Entra por la cantidad que le falta (`cantidad − cantidad_entregada`). |

- El primer arranque del mes es el `creada_en` de la fila `dia-a-dia-AAAAMM`. La fila conserva ese instante
  aunque se vuelva a guardar.
- Los pedidos que llegaron mientras el API estaba caído entran si su plazo sigue vigente.

## Ejecuciones

### Qué se guarda de cada una (`ejecucion`)

- **Configuración**, como antes: escenario, algoritmo, fechas, flota y factor k. Ahora también el `nombre`.
- **Resultado:**
  - entregas, incumplimientos y entregas tarde;
  - km y costo de operación;
  - paquetes entregados y fuera de plazo, y retraso total y ponderado por paquete;
  - planificaciones, tiempo de cómputo máximo y total, y planificaciones medidas (de ahí sale el promedio);
  - pico de unidades en ruta, rutas por tipo de unidad y averías atendidas.
- **Colapso:** instante, causa (`ENTREGA_TARDIA` o `PLAZO_VENCIDO_SIN_DESPACHO`), pedido, unidad, hora límite y llegada estimada.
- **Contexto:** origen de los datos (`SISTEMA` o `ARCHIVO`), semilla, parámetros del dominio y rangos del semáforo vigentes (JSON) y hasta dónde llegó el reloj simulado.

### Cuándo se guarda

Al prepararla, en cada cambio de estado, al terminar y además **cada minuto real**. Así, si el API se cae a
mitad de una corrida, la fila conserva un resultado de hace como mucho un minuto.

### Historial

- `GET /api/ejecuciones` devuelve las ejecuciones guardadas que ya no están en memoria, marcadas como
  `historica: true` y con su `resultado`, seguidas de las vivas.
- `GET /api/ejecuciones/{id}` también responde por una corrida pasada.
- El front abre una corrida histórica en una vista de resultado (`ResultadoHistorico`), sin mapa ni repetición:
  la base no guarda las instantáneas.

### Día a día

- Su id en memoria sigue siendo `dia-a-dia`, porque lo usan el front y los tópicos.
- Su fila en la base es `dia-a-dia-AAAAMM`.
- Al reiniciar, el resultado del mes sigue sumando sobre lo guardado (`ResultadoEjecucion.sumar`): los
  contadores se suman y los máximos se comparan.
- Ese total puede quedarse corto en lo operado durante el último minuto antes de una caída.

## Mantenimiento

- **Nueva versión de los archivos del curso:**
  1. reemplazar la carpeta de ventas;
  2. borrar de la base los pedidos del sistema de esos meses: `DELETE FROM pedido WHERE lote = 'SISTEMA' AND mes_archivo IN (...)`;
  3. reiniciar el API.

  No hay botón de administración para esto (decisión del 11-11).
- **Conexión MySQL:** la URL lleva `rewriteBatchedStatements=true` para que la carga inicial vaya por lotes.
- **Fechas:** las escrituras por JDBC usan la misma conversión que Hibernate con
  `hibernate.jdbc.time_zone: UTC`. Si no, con la JVM en hora de Lima, las filas quedarían corridas 5 h respecto
  de lo que lee JPA.

## Pendiente o simplificado

- **Migración V8 sin probar en MySQL real:** las pruebas corren sobre H2 en modo MySQL. Usa
  `ALTER TABLE ... DROP CONSTRAINT`, que MySQL acepta desde la 8.0.19, y el compose usa la 8.0.40. Conviene
  correrla una vez en la VM antes de la evaluación.
- **No se guardan los hitos ni las unidades de cada pedido** (decisión del 11-11). Tras un reinicio, el detalle
  del pedido empieza de cero, y los pedidos ya entregados no vuelven a la lista del día a día.
- **Cantidad tras un reinicio:** un pedido retomado a medias aparece en el mapa con la cantidad que le falta,
  no con la original. La base sí conserva la original y lo entregado.
- **Corrida histórica:** no muestra los saltos del reloj (Sc y Sa) en su informe, porque no se guardan. La
  semilla y los parámetros del dominio sí.
- **Averías:** siguen sin recuperarse tras un reinicio, como antes de este cambio.
