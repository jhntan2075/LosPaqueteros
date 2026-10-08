# paqtracker-api

API de operación de PaqTracker: monolito modular Spring Boot 4 (Java 21) con
arquitectura hexagonal ligera. Depende solo de `paqtracker-planificador-nucleo`.

## Módulos (`pe.pucp.paqtracker.modulos`)

| Módulo          | Casos de uso | Piezas principales |
|-----------------|--------------|--------------------|
| `pedidos`       | CU-01, CU-02, CU-04 | `CasoUsoRegistrarPedido`, `CasoUsoImportarPedidos`, `CasoUsoConsultarPedidos` |
| `planificacion` | CU-06, CU-07, CU-12 | `ServicioPlanificacion` (fachada), `FabricaAlgoritmo` (GA / IACO) |
| `ejecucion`     | CU-15, CU-16, CU-17 | `MotorEjecucion`, `RelojEjecucion`, `SeguimientoPedidos`, casos de uso de cada escenario |
| `difusion`      | CU-25 | `ServicioDifusion`, `ConstructorInstantanea`, `PublicadorStomp` |
| `configuracion` | (lectura) | `ServicioConfiguracion` |

Cada módulo tiene las capas `presentacion → aplicacion → dominio ← infraestructura`.
Lo transversal (WebSocket, errores, archivos, línea de tiempo) vive en `comun/`.

## Cómo funciona una ejecución

Cada ejecución tiene su propio **motor** con un hilo propio, su copia de almacenes,
flota y malla, y su `SimulacionEnCurso` del núcleo:

1. Cada **Sc** (1 s real) el motor lee su reloj simulado (`minuto = inicio + tiempo real × k`).
2. Ejecuta los pasos **Sa** (30 min simulados) que ya vencieron. En cada paso el núcleo
   incorpora pedidos, planifica (GA o IACO), despacha y reporta entregas.
3. Difunde la instantánea completa (flota con su tramo en curso, almacenes, pedidos
   activos, KPI y semáforo) y los eventos del paso.

Los tres escenarios corren a la vez:

| Escenario | Cómo nace | Reloj |
|---|---|---|
| `DIA_A_DIA` (id fijo `dia-a-dia`) | Arranca solo con la API sobre el mes en curso | k = 1 |
| `SIMULACION_PERIODO` | `POST /api/ejecuciones` | k = `APP_FACTOR_PERIODO` |
| `COLAPSO_LOGISTICO` | `POST /api/ejecuciones`; se detiene en el primer incumplimiento | k = `APP_FACTOR_COLAPSO` |

Un pedido registrado a mano (CU-01) entra a la operación día a día en el minuto
actual y **replanifica de inmediato** (CU-12), sin esperar el siguiente Sa.

El estado vivo está en memoria. Al arrancar, la API cierra en la base las
ejecuciones que quedaron sin terminar y el día a día recupera los pedidos manuales
del mes cuyo plazo aún no vence.

## REST (`/api`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/ejecuciones` | Lista de ejecuciones con reloj y KPI |
| POST | `/ejecuciones` | Crea una simulación: `{tipoEscenario, fechaInicio: "2027-03-01", dias?, algoritmo?, flota?: {autos, motos, bicicletas}}` |
| GET | `/ejecuciones/{id}` | Resumen de una ejecución |
| GET | `/ejecuciones/{id}/estado` | Última instantánea (para quien se conecta tarde) |
| POST | `/ejecuciones/{id}/iniciar` · `/pausar` · `/detener` | Control del reloj |
| POST | `/pedidos` | CU-01: `{cliente, x, y, cantidad, plazoHoras}` |
| GET | `/pedidos?ejecucionId=dia-a-dia` | CU-04: pedidos con estado, unidad, ETA y holgura |
| GET | `/pedidos/{codigo}?ejecucionId=` | Detalle de un pedido con su trazabilidad (hitos) |
| POST | `/archivos/pedidos` | CU-02: multipart `file` + `mes` (YYYYMM); devuelve `lineasInvalidas` |
| POST | `/archivos/bloqueos` | Igual que el anterior, para el archivo de bloqueos del mes |
| GET | `/configuracion/dominio` | Malla, almacenes, flota, plazos y turnos |

Los errores responden `{estado, error, mensaje, detalles}` con 400, 404 o 409.

## STOMP (`/ws`, WebSocket nativo, sin SockJS)

| Tópico | Contenido |
|---|---|
| `/topic/ejecuciones/{id}/estado` | `MensajeEstadoEjecucion` en cada Sc |
| `/topic/ejecuciones/{id}/eventos` | `NUEVO_PEDIDO`, `PLAN_ACTUALIZADO`, `PEDIDO_ENTREGADO`, `BLOQUEO_INICIADO`, `BLOQUEO_LEVANTADO`, `ALERTA_COLAPSO`, `EJECUCION_FINALIZADA` |

El `detalle` de `ALERTA_COLAPSO` identifica el pedido que declara el colapso (LE-067):

| Campo | Contenido |
|---|---|
| `codigoPedido` | Pedido que incumple su plazo, p. ej. `P-00001` |
| `causa` | `ENTREGA_TARDIA` (salió en una unidad que llega tarde) o `PLAZO_VENCIDO_SIN_DESPACHO` (venció esperando en la cola) |
| `instanteColapsoMs` | Instante del colapso: la salida de la unidad o la hora límite del pedido vencido |
| `horaLimiteMs` | Hora límite del pedido |
| `llegadaEstimadaMs`, `retrasoMinutos`, `unidad` | Solo con `ENTREGA_TARDIA`: llegada estimada al cliente, minutos de retraso y código de la unidad |

Los instantes simulados van en epoch ms. La instantánea trae:

- **Relojes** (LE-085, LE-089): `relojSimuladoMs`, `relojSimuladoInicioMs`,
  `tiempoSimuladoTranscurridoMs`, `relojRealInicioMs` y `tiempoRealTranscurridoMs`.
- **Unidades** (LE-095): código, tipo, estado, `cargaActual`, `ocupacion`,
  `ubicacionActual` y `paradas`.
  - `tramoEnCurso` incluye origen, destino, salida, llegada y su `camino` real, que rodea
    los bloqueos (LE-064).
  - `rutaRestante` es la ruta planificada desde la posición actual hasta el almacén de
    retorno, ya depurada de lo recorrido (LE-092).
- **Almacenes:** stock y `nivelInventario` VERDE/AMBAR/ROJO en los intermedios (LE-078).
- **Bloqueos vigentes:** polilínea, inicio y fin (LE-083).
- **Pedidos activos:** estado, unidad, ETA y nivel de holgura.
- **Indicadores:** entregas a tiempo o con retraso, `porcentajeCumplimiento` (LE-086),
  Ta, distancia y semáforo global.

## Ejecutar

```bash
cp .env.example .env              # desde la raíz; completar contraseñas
docker compose up --build         # MySQL + API en 127.0.0.1:3000
```

Sin Docker para la API:

```bash
docker compose up mysql
./mvnw -pl paqtracker-api -am package -DskipTests
java -jar paqtracker-api/target/paqtracker-api.jar
```

El esquema lo crea Flyway (`src/main/resources/db/migracion`); Hibernate solo valida.
Variables en [`.env.example`](../.env.example).

## Pruebas

```bash
./mvnw -pl paqtracker-api -am test
```

- Usan H2 en memoria en modo MySQL y los fixtures de `tests-resources/datos`.
- `tests-resources/config/application.yml` se superpone al `application.yml` principal.
- `MotorEjecucionTest` controla el reloj, así que no hay esperas.
- `IntegracionApiTest` levanta el servidor y verifica la difusión por STOMP de punta a punta.

## Despliegue

El despliegue en la VM (Nginx + systemd + MySQL, sin Docker) está en
[`paqtracker-infra/README.md`](../paqtracker-infra/README.md).

## Limitaciones conocidas

- La posición se interpola a velocidad constante sobre el camino del tramo; si el
  refrigerio cae a mitad de un tramo, la pausa se reparte a lo largo del tramo.
- El camino se calcula al despachar y esquiva los bloqueos que la unidad encontraría
  al pasar por cada nodo, incluso los que empiezan durante el viaje. Los bloqueos de una
  ejecución se fijan al crearla; si se llegaran a registrar en vivo (CU-12), haría falta
  la media vuelta (LE-055, pendiente). Por la interpolación lineal de arriba, en un tramo
  con refrigerio el dibujo puede mostrar la unidad atrasada respecto de su avance real.
- La operación día a día cubre el mes en curso y termina al cerrar el mes.
- Averías y la edición de parámetros (CU-26 a CU-28) quedan para la siguiente entrega.
