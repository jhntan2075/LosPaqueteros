# Registro de Cambios

Formato basado en Keep a Changelog; versionado semántico (MAJOR.MINOR.PATCH).

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
  `InventarioProyectadoTest`, `EvaluadorFitnessTest`.
- `docs/trazabilidad.md` (exigencias → clases → pruebas), `.gitattributes`
  (LF), `.dockerignore`.

### Corregido
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
