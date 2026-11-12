# Registro de Cambios

Formato basado en Keep a Changelog; versionado semántico (MAJOR.MINOR.PATCH).

## [Sin publicar]

### Rendimiento de la malla, despacho ante estrés y correcciones (núcleo y API)

Sale del análisis de rendimiento y de las pruebas de estrés del 12-11-2026 (meses reales hasta el colapso y
35 escenarios sintéticos de 7 días). No cambia la función objetivo, sus pesos ni los parámetros calibrados
del GA.

**Rendimiento (mismos resultados, Ta entre 14 y 40 veces menor)**
- El 97 % del tiempo de cómputo estaba en `Malla.distancia`: cada vez que un bloqueo tocaba el rectángulo de
  un tramo se lanzaba una búsqueda en amplitud sobre casi toda la malla, y el planificador repite la misma
  consulta miles de veces por ciclo.
- `MemoDistancias` (nuevo): guarda la distancia de cada consulta (origen, destino, minuto de salida,
  velocidad y grupo de refrigerio) y la devuelve cuando se repite. Tabla de tamaño fijo, unos 3 MB por malla
  con bloqueos.
- La búsqueda en amplitud de `Malla` consulta los bloqueos en una máscara de bits por tramo de tiempo y usa
  una cola de enteros.
- `BusquedaLocal` (2-opt y Or-opt) comprueba primero si el movimiento acorta la ruta y solo entonces la
  recorre con sus tiempos para contar tardanzas.
- Medido con entregas, distancia, fitness acumulado e instante de colapso idénticos antes y después: semana
  real de junio de 2026, Ta promedio de 345 a 8 ms y máximo de 4 467 a 98 ms; 200 pedidos/día con 20
  bloqueos/día, de 1 386 a 33 ms y de 9 359 a 231 ms. Antes el Ta máximo llegaba a superar Sa/k en una
  simulación de 5 días en 30 minutos.

**Mecanismos de despacho (retrasan el colapso)**
- Retención (`FiltroDespacho`, nuevo): una entrega del plan que llegaría fuera de plazo no sale mientras el
  pedido pueda esperar un ciclo y cumplir con la unidad más rápida desde el almacén más cercano. Antes, con
  las unidades rápidas en ruta, el plan la mandaba en una bicicleta que llegaba tarde y declaraba el colapso
  con 13 a 32 unidades libres.
- Rescate de última oportunidad (`Orquestador.despachar`): un pedido que sigue en la cola se despacha fuera
  del plan cuando las unidades libres lo entregan a tiempo saliendo ahora pero ya no en el ciclo siguiente,
  repartido entre varias si no cabe en una (LE-009). Cubre los pedidos de 9 o 10 paquetes, que solo caben en
  un auto y vencían en la cola con motocicletas y bicicletas libres.
- Con los datos reales ya no hay colapso de junio a noviembre de 2026 (107 a 167 pedidos/día; antes caía el
  día 16 de junio). Diciembre de 2026 (227/día) pasa del día 6 al 18 y febrero de 2027 (277/día) del día 2
  al 4. En sintético aguanta 250 pedidos/día (antes colapsaba el día 3), 200/día con todos los plazos a 4 h
  y hasta 6 averías por día.
- Sigue colapsando desde unos 300 pedidos/día (entre 60 y 70 % de los ciclos sin unidades libres), con picos
  de demanda concentrados en 1 o 2 horas y con plazos de 1 h a destinos lejanos. El rescate adelantó unas
  horas el colapso en dos meses ya saturados (diciembre de 2026 y marzo de 2027).

**Correcciones**
- Fragmentos perdidos: `Orquestador.despachar` sacaba el pedido de la cola con cualquier porción despachada
  y el resto no se entregaba nunca (hasta 11 % del producto con pedidos mayores a 24 paquetes, sin que se
  declarara incumplimiento). Ahora el pedido sigue en la cola por la cantidad que falta.
- Tramo sin camino: cuando los bloqueos encerraban un nodo, la malla devolvía `Integer.MAX_VALUE / 4` como
  distancia y el reloj de la ruta se desbordaba (tardanzas absurdas o `IllegalArgumentException` en
  `Tramo`). Ahora devuelve `Malla.DISTANCIA_SIN_CAMINO`, acotado, y la entrega sin camino no se despacha:
  espera en la cola a que se levante el bloqueo.
- `SeguimientoPedidos` (API): un pedido que sale por partes en ciclos distintos se daba por entregado al
  llegar la última parte en camino. Ahora exige que lo entregado cubra su cantidad.

**Pendiente**
- Validar al registrar un pedido (CU-01, CU-02) que su plazo sea alcanzable desde el almacén más cercano.
- Que el planificador conozca cuándo queda libre cada unidad en ruta.
- Prueba propia del cambio en `SeguimientoPedidos`.

### Login con la cuenta del equipo (API y web)
- Pantalla de login. En escritorio es un panel dividido: a la izquierda la ilustración de la operación (malla,
  almacenes, bloqueo y unidades en movimiento) y a la derecha la tarjeta. En celular queda solo la tarjeta.
  Sin sesión, al recargar, cuando la sesión vence o cuando la API responde 401, se vuelve al login. Hay
  botón **Salir** en la barra superior.
- Una sola cuenta compartida, configurada con `APP_USUARIO` y `APP_CLAVE_HASH` (BCrypt). No hay registro ni
  gestión de usuarios. `GeneradorHashClave` genera el hash desde el JAR.
- `GET`, `POST` y `DELETE /api/sesion`. La sesión es un token en memoria que vence a las 12 h
  (`APP_DURACION_SESION`). Tras 5 intentos fallidos seguidos el login se bloquea 30 s.
- La API pide `Authorization: Bearer <token>` en todo `/api/**` salvo `/api/sesion` y `GET /api/ejecuciones`,
  que sigue abierta para la verificación del despliegue (A20). El handshake de `/ws` sigue respondiendo 101
  (A21); STOMP pide el token en el `CONNECT`.
- Sin usar el starter de Spring Security: un filtro propio y `spring-security-crypto` solo para BCrypt. Las
  pruebas existentes corren con `paqtracker.seguridad.activa=false`.

Fase 5 del plan de la rúbrica: configuración del dominio (B02, B04, B07–B09).

### Parámetros del dominio configurables (núcleo y API)
- `ParametrosDominio` (núcleo): ubicación y capacidad de los almacenes, capacidad, velocidad y costo por km de
  cada tipo de unidad y duraciones de las averías (detención tipo 1, permanencia en el sitio, mínimo del
  tipo 3, trasvase). Se valida al construirse: nodo dentro de 70 × 50, sin almacenes repetidos, capacidades y
  velocidades en rango, trasvase más corto que cada detención, tipo 3 ≥ permanencia. `porDefecto()` reproduce
  `ConfiguracionDominio`, así la experimentación no cambia.
- `Vehiculo` lleva su capacidad, velocidad y costo; los tiempos de viaje, el costo y la capacidad máxima del
  fraccionamiento salen de la unidad y no del tipo. `Averia`, `GestorTrasbordo` y `Orquestador` reciben las
  duraciones configuradas.
- `GET`, `PUT` y `DELETE /api/configuracion/parametros` (migración V7, tabla `parametros_dominio`). Cada
  ejecución nueva copia la versión vigente al crearse; las que están en curso no cambian.
- `POST /api/ejecuciones/dia-a-dia/reiniciar`: la operación día a día toma los parámetros vigentes desde el
  minuto actual. Los pedidos registrados a mano se recuperan y se replanifican.
- `GET /api/configuracion/dominio` responde con los parámetros vigentes.

### Avería programada (API y web, B07–B09)
- `POST /api/ejecuciones/{id}/averias` acepta `instanteMs` opcional: la avería se programa para un instante
  futuro del reloj de la ejecución. Responde 400 si ya pasó o cae después del fin. Se puede deshacer hasta
  que se aplica.
- El diálogo "Registrar avería" tiene **Cuándo ocurre**: ahora o programada (fecha y hora al minuto).

### Distancias en km en la lista de unidades (web y API, nivel 5)
- Búsqueda por **minutos o km** al destino inmediato o desde el origen inmediato (E06–E09).
- Filtro permanente por rangos de km al destino: 0–10, 10–20, 20–40 y 40–200 km. Se combina con la búsqueda y
  se recuerda al cerrar el panel (E11).
- Orden por **km por recorrer** y **km recorridos** de la ruta en curso (E16, E17). Cada fila muestra
  "Ruta: recorrió X km · faltan Y km".
- `UnidadEnMapa.distanciaRutaKm`: longitud de la ruta en curso, para calcular lo recorrido.

### Pantalla Configuración (web)
- Pestaña nueva **Configuración**: almacenes (con vista previa en la malla), unidades, averías y acceso a los
  rangos del semáforo. Valida junto al campo con las mismas reglas que la API. Incluye "Restablecer valores
  por defecto" y "Aplicar a la operación día a día", los dos con confirmación.
- El front lee los parámetros vigentes al arrancar y, al cambiarlos, actualiza el mapa, los paneles y las
  duraciones de avería que muestra.

## [0.6.0] — 2026-11-07

Rúbrica de autoevaluación 91.EvaSw para un equipo de 4 (plan en `docs/plan-rubrica-equipo4.md`).

### Fracciones de pedido y ventanas de 4 h (API)
- `SeguimientoPedidos` lleva las **fracciones** de cada pedido: la parte que lleva una unidad, con su almacén de
  origen, salida (puede ser futura), llegada y estado (`PROGRAMADA`, `EN_CAMINO`, `ENTREGADA`, `LIBERADA`). Se
  actualizan en los despachos, las entregas, las averías (liberación y respaldo) y los trasvases.
- `PedidoEnMapa` y `RespuestaPedido` agregan `entregaMs` y `fracciones`.
- La instantánea agrega `entregadosRecientes`: pedidos entregados en las últimas 4 h simuladas.

### Última planificación estable (API, G08–G10)
- El motor guarda una copia inmutable del plan después de cada planificación que termina sin colapso.
- `GET /api/ejecuciones/{id}/plan-estable`: rutas por unidad con sus paradas pendientes y pedidos sin asignar;
  si la ejecución colapsó después, trae el instante y el pedido del colapso. 404 si aún no planificó.

### Panel del mapa (web)
- Pestañas nuevas **Pedidos** (E31, con filtros de 4 h E32/E33) y **Almacenes** (E18, E19). El indicador
  global "Almacenes" abre la lista; "Flota" abre la Flota.
- Detalle del almacén: **En camino**, **Por salir · 4 h** y **Entregados · 4 h** (E20–E22).
- Selección compartida mapa ↔ listas (F01, F05): con una lista abierta, tocar el objeto en el mapa marca su
  fila; un clic en la fila lo resalta y centra en el mapa, y otro clic (o ›) abre el detalle.
- Una **fracción** se puede elegir: resalta solo la ruta de su unidad (F02); el pedido entero resalta todas
  (F03). "‹ Volver" dice adónde vuelve y recorre los detalles anteriores.
- Cola de pedidos: columnas **Salida** y todas las unidades de un pedido fraccionado (también en el CSV).

### Reportes (web)
- "Última planificación estable" en el informe de la simulación (G08) y del colapso (G10).
- "Generar reporte de cierre" en Resumen de la operación día a día, sin detenerla (G09). Exportar CSV e
  imprimir.

### Versión
- La versión del front y el commit del build se ven en el pie de página (A01).
- `docs/diagramas.md`: consumo Sc/Sa, varios navegadores y componentes (A22, A23).

### Registro de averías en el front (CU-13)
- Diálogo "Registrar avería" desde el detalle del vehículo o desde Incidencias:
  - tipo sin valor por defecto, con ejemplo, duración y la reincorporación que estima el
    servidor (`GET /api/ejecuciones/{id}/averias/estimacion`, no registra nada);
  - impacto sobre los pedidos a bordo antes de confirmar;
  - combobox con búsqueda para elegir la unidad en flotas grandes (hasta 150), con las ya
    averiadas o por aplicarse visibles pero no elegibles.
- Deshacer mientras la avería sigue programada: "Cancelar avería" en el detalle y "Deshacer"
  en el aviso (`DELETE /api/ejecuciones/{id}/averias/{averiaId}`; 409 si ya se aplicó).
  Migración V4: columna `averia.cancelada_en`; la avería cancelada queda en la bitácora.
- La instantánea incluye la avería vigente de cada unidad (`UnidadEnMapa.averia`): el detalle
  del vehículo, Incidencias, Flota y el mapa muestran el tipo y cuándo vuelve a operar.
- Bitácora: `UNIDAD_AVERIADA`, `TRASBORDO` y `UNIDAD_REINCORPORADA` con texto propio; un tipo
  de evento desconocido ya no rompe la bitácora.
- Aviso no bloqueante (snackbar) reutilizable; foco atrapado y devuelto al cerrar en los
  diálogos modales.

### Revisión de usabilidad del front (`paqtracker-web`)
- Glosario único (`config/glosario.ts`): holgura Crítico/Ajustado/Holgado, estados de pedido y
  de unidad, plazos y averías con un solo nombre en todas las pantallas.
- Navegación: pestañas Operación, Pedidos, Simulación y Métricas; Incidencias, Flota y
  Bitácora son pestañas del panel lateral del mapa en Operación y en Simulación.
- Mapa: pines y almacenes con la geometría de Figma, tooltip propio por objeto, detalle de
  almacén en el panel, leyenda como panel flotante y barra de escala.
- Flota: los seis estados de unidad del servidor, capacidad desde la API y carga a bordo por
  tipo con el semáforo de carga; el color de los vehículos sigue la carga en toda la interfaz.
- Pedidos: formulario sin valores precargados, "Ubicar en el mapa" que abre y centra el pedido,
  tabla alineada y detalle que se actualiza en vivo.
- Simulación: confirmación al detener, estado "Detenida" y bitácora propia de la corrida.
- Accesibilidad: foco visible, contraste AA, radios nativos, texto seleccionable y tipografía
  única Fira Sans con números tabulares.

### Pruebas del front
- Vitest + Testing Library (`npm test`); el workflow `web.yml` corre las pruebas entre el lint
  y el build.

### Design system
- Logo y favicon; paleta derivada del logo con `tailwind.config.js` como fuente única y
  contrastes WCAG verificados (`docs/design-system.md`). Los componentes aún usan colores fijos:
  su migración a los tokens queda pendiente.

### Averías: trasvase a unidades en ruta y respaldo desde almacén
- El mismo procedimiento para los tres tipos de avería en ruta:
  1. tipo 1: lo que llega a tiempo esperando las 2 h sigue a bordo;
  2. lo demás (y todo lo de tipo 2 y 3) se trasvasa a unidades **en ruta**: prefiltro con
     Manhattan (espacio libre, holgura propia que cubra el desvío, llegada a tiempo) y trazado
     exacto de las 5 que llegan antes. Cada entrega va a la receptora que la entrega antes, solo
     si llega a tiempo y sin dejar tarde las entregas propias de la receptora (LE-041/042);
  3. lo que no se trasvasa sale, si llega a tiempo, en una unidad libre del almacén con stock
     que llegue antes, con producto nuevo;
  4. lo que queda sigue a bordo (tipo 1) o vuelve a la cola del siguiente Sa (tipo 2 y 3).
- El trasvase toma 30 min (`TRASVASE_MINUTOS`, tramo `TRASVASE`) y debe terminar antes de que
  la averiada se vaya: 2 h en tipo 1 y 4 h (traslado al central) en tipo 2 y 3.
- Tipo 2 y 3 ya no devuelven la carga al almacén de origen: va con la unidad al central.
- El paso que dispara una avería en vivo ya no replanifica la cola; esta espera al siguiente Sa.
- Las unidades libres en almacén ya no son receptoras de trasbordo: las reemplaza el respaldo.
- Seguimiento de pedidos: hitos `Trasvasado`, `Desvio por trasvase` y `Respaldo por averia`;
  el evento `UNIDAD_AVERIADA` agrega `pedidosRespaldados` y `unidadesRespaldo`.

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
