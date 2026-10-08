# Registro de Cambios

Formato basado en Keep a Changelog; versionado semántico (MAJOR.MINOR.PATCH).

## [Sin publicar]

### Front conectado a la API (`paqtracker-web`)
- Los mocks se reemplazan por datos en vivo:
  - capa `services/` (cliente REST, cliente STOMP único con re-suscripción, adaptador de la
    instantánea a los modelos de vista);
  - hooks `useEstadoEjecucion`, `useRelojSimulado`, `useDatosOperacion`, `useColaPedidos`,
    `useEjecuciones`, `useTrazabilidadPedido`.
- Operación, Pedidos y la barra superior/inferior muestran la operación día a día. Simulación
  crea o abre cualquier simulación del servidor (varios dispositivos ven la misma corrida),
  sube archivos de pedidos y bloqueos validados por la API y permite configurar la flota.
- Movimiento interpolado en el cliente sobre el camino real del tramo en curso; ruta
  restante depurada; relojes simulado y real con tiempo transcurrido; diagnóstico del
  colapso, informe y detalle de pedido con trazabilidad calculados con datos reales.
- Se quitan los controles de velocidad (fuera del alcance de la entrega).
- `docker-compose.yml`: el healthcheck de MySQL hace ping por TCP y la API se reinicia
  si falla. Antes, con una base recién creada, la API arrancaba antes de tiempo y moría.

### Cambiado
- El repositorio pasa a ser un monorepo Maven (POM padre + Maven Wrapper 3.9.12):
  `paqtracker-planificador-nucleo` (Java puro), `paqtracker-api` (Spring Boot 4.0.1,
  esqueleto) y `paqtracker-experimentacion` (CLI, no se despliega). Los archivos se
  movieron con `git mv` y conservan su historial.
- Paquetes renombrados: `servicio` → `simulacion` (núcleo; `SimulacionDinamica` va a
  experimentación), `repositorio` → `lectura`, `experimento` → `experimentacion`.
- Las pruebas corren con Maven (`./mvnw test`); se retira el JUnit standalone de `lib/`.
- `Dockerfile` movido a `paqtracker-api/` (imagen de la API) y `docker-compose.yml`
  raíz con MySQL 8.0 + API. `.env.example` unificado en la raíz.
- `paqtracker-infra/init-db/01-init.sql` ya no crea tablas: el esquema es de Flyway.

- `ContadorEvaluaciones` deja de ser estático: cada simulación crea su contador y lo
  pasa a `PlanificadorGA`/`PlanificadorIACO` (nuevos constructores) y a
  `EvaluadorFitness`. Necesario para correr varias ejecuciones a la vez en la API.
- `Orquestador.simular` es ahora un bucle sobre `SimulacionEnCurso`; los resultados
  son idénticos a los anteriores (verificado en enero 2026, estrés con colapso e IACO).

### Añadido
- CI en `.github/workflows/` (`java.yml`, `web.yml`) con filtros por ruta.
- `simulacion.SimulacionEnCurso` (`Orquestador.iniciar`): simulación que avanza paso a
  paso con un reloj externo, admite pedidos registrados en vivo (`agregarPedido`) y
  devuelve un `ResultadoPaso` con pedidos incorporados, entregas completadas, unidades
  liberadas y despachadas, Ta, fitness y colapso.
- API de operación (`paqtracker-api`), con tres escenarios concurrentes:
  - día a día con reloj real, que arranca solo;
  - simulación de periodo y simulación hasta el colapso, con reloj acelerado.

  Cada ejecución tiene su motor con hilo propio. Difunde por STOMP (`/ws`,
  `/topic/ejecuciones/{id}/estado|eventos`) cada Sc y planifica cada Sa con GA o IACO.
  Incluye CU-01 (con replanificación inmediata, CU-12), CU-02 (validación línea por
  línea), CU-04, CU-15, CU-16, CU-17, CU-25 y la consulta de configuración del dominio.
  Persistencia en MySQL con Flyway (`V1__crear_tablas.sql`).
- Lo que el visualizador necesita para el alcance sem08 (desde la API):
  - **Rutas y movimiento:** camino real de cada tramo, que rodea los bloqueos
    (`Malla.camino`), y ruta restante por unidad.
  - **Relojes:** con tiempo transcurrido simulado y real.
  - **Mapa y KPI:** bloqueos vigentes con su polilínea y eventos de inicio y fin;
    semáforo de inventario; porcentaje de cumplimiento.
  - **Pedidos:** detalle de pedido con trazabilidad.
  - **Archivos:** carga de bloqueos y números de línea inválidos en las importaciones.
- Flota configurable al crear una simulación (LE-019), con códigos de unidad por
  ejecución y migración `V2__agregar_flota_ejecucion.sql`.
- Despliegue en la VM (`paqtracker-infra/`):
  - Nginx como proxy de la SPA, `/api` y `/ws`.
  - Unidad systemd de la API.
  - Script de base y usuario MySQL de permisos mínimos.
  - Script de despliegue idempotente.
- `CargadorPedidos.validar` y `ResultadoValidacion` (errores por línea para CU-02) y
  `RangoFechas.de(LocalDate, LocalDate)`.
- `modelo.Tramo` / `TipoTramo` y `CalculadoraTiempos.trazar`: tramos de cada ruta
  despachada (viaje, servicio y retorno, con salida y llegada) para que el visualizador
  interpole la posición de las unidades. `UnidadEnTransito` guarda origen, salida y tramos.
- `simulacion.ColapsoLogistico`: el colapso guarda el pedido que lo declara, su causa
  (`ENTREGA_TARDIA` o `PLAZO_VENCIDO_SIN_DESPACHO`), la hora límite y, si salió, la llegada
  estimada y la unidad. `ResultadoSimulacion.getColapso()` lo expone y el evento
  `ALERTA_COLAPSO` lo difunde en su `detalle` (LE-067).

### Corregido
- Un pedido que vencía en la cola sin despacharse solo se detectaba al cerrar el horizonte,
  así que la simulación hasta el colapso seguía corriendo después del colapso real. Ahora
  cada paso revisa la cola y declara el colapso en la hora límite del pedido. En las
  corridas de experimentación esto solo puede adelantar `getInstanteColapso()`; el resto de
  las métricas no cambia.
- Las unidades cruzaban bloqueos que empezaban durante el viaje: el camino y la distancia de
  cada tramo se calculaban con los bloqueos vigentes al salir (en octubre 2026, 5 % de los
  tramos de auto, 7 % de moto y 11 % de bicicleta). Como los bloqueos se conocen de antemano,
  `Malla.distancia`/`Malla.camino` reciben ahora la unidad y evalúan cada nodo en el minuto
  en que esta llegaría (velocidad y refrigerio, igual que `CalculadoraTiempos`). Un bloqueo
  que termina antes de que la unidad llegue ya no la desvía. GA e IACO evalúan con la misma
  distancia; la matriz del primer tramo de IACO sigue siendo una estimación en un instante.
  Costo: Ta promedio de 500 a 784 ms en 7 días de octubre 2026 (semilla 1), lejos de
  Sa/k = 10 s; con las semillas 2 a 4 el cumplimiento sigue en 100 %.
- Al subir un archivo de pedidos o bloqueos, si el movimiento del temporal al destino fallaba
  quedaba un `archivo*.tmp` huérfano en la carpeta de datos (llegaron 8 al repositorio).
  `AlmacenArchivosLocal` ahora lo borra, `*.tmp` queda en el `.gitignore` y se retiran los
  que se habían versionado.

## [0.5.0] — 2026-09-18

### Añadido
- Consumo real del stock de los almacenes intermedios: `Almacen.descontar` al
  despachar y `Almacen.recargar` a su capacidad máxima cada día a las 23:59:59
  (`Orquestador.recargarAlmacenes`). El planificador proyecta desde el stock
  disponible del momento y ya no desde el inicial.
- Costo por km por tipo de unidad (`ConfiguracionDominio.COSTO_KM_*`, provisional,
  tomado del banco de pruebas del IACO) y costo total en el informe.
- Medición de Ta por planificación (promedio y máximo) en el informe (LE-059).
- Lectura de `PLANIFICADOR_ALGORITMO`, `PLANIFICADOR_SEMILLA` y
  `PLANIFICADOR_SA_MINUTOS` en `SimulacionDinamica`.
- Pruebas: `AlmacenTest`, `TipoVehiculoTest`, `CalculadoraTiemposTest`,
  `InventarioProyectadoTest`, `EvaluadorFitnessTest`, `MallaTest`.
- Opcion `--detener-en-colapso` y sobrecarga `Orquestador.simular(horizonte,
  detenerEnColapso)` para terminar la ejecucion en el primer incumplimiento
  (CU-17).
- `docs/trazabilidad.md` (exigencias → clases → pruebas), `.gitattributes`
  (LF), `.dockerignore`.

### Corregido
- `util.Malla` reconstruia el conjunto de nodos bloqueados en **cada** consulta
  de distancia, recorriendo la lista completa de bloqueos del horizonte. En una
  corrida de un anio eran 7246 bloqueos recorridos por consulta para descubrir
  que solo uno estaba vigente (16 nodos), y el planificador hace millones de
  consultas por ciclo. Ahora la linea de tiempo se parte en tramos delimitados
  por el inicio y el fin de cada bloqueo, y el conjunto de cada tramo se calcula
  una sola vez. `caminoDirectoBloqueado` tambien recorre lo mas pequeno entre
  los nodos bloqueados y las celdas del rectangulo. Medido: la consulta de
  distancia con el anio cargado pasa de 42,1 us a 0,195 us (216 veces mas
  rapida) y una planificacion de 100 entregas de 45,6 s a 1,6 s (29 veces mas
  rapida), con soluciones identicas.
- El despacho directo de urgentes estimaba la llegada sin la pausa de
  refrigerio introducida en el PR #11. Elegía unidades que parecían llegar a
  tiempo y llegaban tarde por la hora de refrigerio: en enero de 2026 una
  moto llegaba 14 min tarde y se declaraba el colapso el día 2.
  `Orquestador.estimarLlegada` usa ahora `CalendarioTurnos.avanzarConPausa`.

### Cambiado
- Capacidad y velocidad de cada tipo de unidad pasan a `ConfiguracionDominio`;
  `TipoVehiculo` las toma de ahí.
- Java 21: el Dockerfile usa Temurin 21 Alpine con versión fija y usuario no root,
  y los scripts compilan con `--release 21`.
- `.env.example` y `docker-compose.yml` usan los nombres `PLANIFICADOR_*` y la red
  `paqtracker-red`.
- Documentación alineada con las velocidades vigentes (auto 40, moto 25 y bici
  12 km/h) y con el stock real de los almacenes.

## [0.4.0] — 2026-09-16

### Añadido
- `planificador.PlanificadorIACO`, `OperadoresColonia` y `MemoriaFeromonas`: la
  colonia de hormigas IACO v3.0 adaptada al contexto del GA. Implementa
  `AlgoritmoMetaheuristico` y reutiliza `Reparador`, `BusquedaLocal` y
  `EvaluadorFitness` sin modificarlos.
- Opción `--algoritmo ga|iaco` en `SimulacionDinamica`.
- Informe `docs/comparacion_ga_iaco.md` con las diferencias entre ambos
  contextos, los cambios de la adaptación y los resultados comparados.

### Corregido
- Despacho directo de urgentes: si ninguna unidad sola llega a tiempo, el pedido
  se reparte entre varias unidades libres que lleguen todas dentro del plazo. Un
  pedido de 9 paquetes con plazo de 4 h dependía de un único auto libre en el
  almacén más lejano y llegaba 33 min tarde (IACO, enero–junio 2026).

### Cambiado
- `Orquestador` recibe una fábrica de `AlgoritmoMetaheuristico`; el constructor
  anterior se conserva y sigue usando el GA, con resultados idénticos.

## [0.3.0] — 2026-09-15

### Añadido
- Reorganización del planificador a la estructura de paquetes por capas del
  estándar de programación: `modelo`, `planificador`, `planificador.comun`,
  `servicio`, `repositorio`, `util`.
- Interfaz `AlgoritmoMetaheuristico` para intercambiar algoritmos (prepara la
  incorporación de IACO reutilizando los bloques comunes).
- Configuración de negocio centralizada en `ConfiguracionDominio`.
- Excepciones propias del dominio: `CapacidadExcedidaException`,
  `RutaNoFactibleException`.
- Archivos de proyecto del estándar: README, .gitignore, .env.example,
  Dockerfile, docker-compose.yml y este CHANGELOG.

### Corregido
- Búsqueda de camino con destino sobre nodo bloqueado: antes devolvía una
  penalización desproporcionada que inflaba las distancias; ahora se aproxima al
  vecino transitable más cercano.
- Construcción abandonaba pedidos grandes cuando el tope aleatorio de carga
  resultaba menor que la cantidad del pedido; ahora el tope nunca excluye un
  pedido que quepa en la unidad mayor y se fuerza una entrega mínima si el
  cluster queda vacío.
- Agrupamiento asignaba un pedido al almacén más cercano con "alguna" unidad
  aunque esa unidad no tuviera capacidad suficiente, dejándolo en espera
  indefinida; ahora se agrupa solo a un almacén con capacidad suficiente.

### Cambiado
- El logging deja de usar `System.out` y pasa al logger del módulo.

## [0.2.0] — 2026-09-14

### Añadido
- Orquestador dinámico con reloj (Sa=30 min), salida inmediata de unidades y
  retorno al quedar libres; cola ordenada por urgencia.
- Búsqueda local memética (2-opt y Or-opt restringido por capacidad).
- Población inicial híbrida (golosa y aleatoria).

## [0.1.0] — 2026-09-13

### Añadido
- Versión inicial del algoritmo genético estático con función de fitness de
  cuatro términos y reparador de restricciones duras.

## Pendiente

- Pruebas de `Reparador`, `BusquedaLocal`, `ConstructorSoluciones`,
  `OperadoresGeneticos`, `PlanificadorGA`, `Malla` y `Orquestador`.
- Averías tipo 1, 2 y 3 como disparador de replanificación (el orquestador ya
  expone el punto de disparo).
- Media vuelta ante un nodo bloqueado (LE-055) y reasignación de carga en camino
  (LE-041, LE-042, LE-101), a definir entre el núcleo y el motor de `paqtracker-api`.
- El porcentaje de cumplimiento del informe puede salir negativo: resta a las
  entregas los incumplimientos de pedidos que nunca se despacharon.
- Volver a medir el techo de la flota y la comparación GA/IACO con las velocidades
  vigentes.
