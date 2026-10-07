# Trazabilidad: exigencias → código → pruebas

Estado al 06-10-2026: núcleo `paqtracker-planificador-nucleo` y API `paqtracker-api`. Ayuda a
cerrar DEF-08: cada exigencia apunta a la clase que la implementa y a la prueba que
la verifica. Donde la exigencia no tiene un id de LE confirmado se cita el caso de
uso (CU).

Estados: **Hecho** · **Parcial** (existe, pero no cubre toda la exigencia) ·
**Pendiente** · **Motor** (le corresponde al motor de ejecución de `paqtracker-api`,
no al núcleo del planificador).

| Exigencia | Descripción | Estado | Implementación | Prueba |
|---|---|---|---|---|
| LE-009 | Fragmentación de pedidos por capacidad de unidad | Hecho | `planificador.comun.Fragmentador` | `FragmentadorTest` |
| LE-020 | Capacidad por tipo de unidad | Hecho | `ConfiguracionDominio.CAPACIDAD_*`, `TipoVehiculo` | `TipoVehiculoTest` |
| LE-021 | Velocidad por tipo de unidad | Hecho | `ConfiguracionDominio.VELOCIDAD_*`, `CalculadoraTiempos` | `TipoVehiculoTest`, `CalculadoraTiemposTest` |
| LE-022 | Costo por km por tipo de unidad | Hecho (solo reporte) | `ConfiguracionDominio.COSTO_KM_*`, `Orquestador.registrarSalida` | `TipoVehiculoTest` |
| LE-023 | Turnos de 8 h | Hecho | `util.CalendarioTurnos` | `CalendarioTurnosTest` |
| LE-024 | Refrigerio escalonado | Hecho | `util.CalendarioTurnos`, `Orquestador.actualizarEstadosPorTurno` | `CalendarioTurnosTest` |
| LE-025 | Tiempo de acondicionamiento por entrega (60 min) | Hecho | `ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS` | `EvaluadorFitnessTest` (indirecta) |
| LE-026 | Dos algoritmos metaheurísticos en Java | Hecho | `PlanificadorGA`, `PlanificadorIACO` sobre `AlgoritmoMetaheuristico` | — (falta `PlanificadorGATest`) |
| LE-032 | Rutas dentro del plazo; colapso si no hay plan factible | Parcial | `EvaluadorFitness` (penalización), `Orquestador` (registro) | `EvaluadorFitnessTest` |
| LE-041 / LE-042 | Reasignación de carga en camino al pedido más crítico | Pendiente / Motor | — | — |
| LE-055 | Media vuelta ante nodo bloqueado | Motor | Hoy `util.Malla` solo rodea el bloqueo al planificar | — |
| LE-057 | Sc: salto del eje de consumo | Hecho | `MotorEjecucion` (tick cada `APP_SC_SEGUNDOS`) | `MotorEjecucionTest` |
| LE-058 | Sa: salto del algoritmo | Hecho | `Orquestador` (`saMinutos`), `PLANIFICADOR_SA_MINUTOS` | — |
| LE-059 | Ta: tiempo de cómputo por planificación | Hecho | `Orquestador.simular`, `ResultadoSimulacion.registrarTiempoComputo` | — |
| LE-006 / LE-007 | Carga de archivos con validación | Hecho | `CargadorPedidos.validar`, `CargadorBloqueos.validar`, `CasoUsoImportarPedidos`, `CasoUsoImportarBloqueos` | `CargadorPedidosTest`, `CargadorBloqueosTest`, `CasoUsoImportarPedidosTest` |
| LE-012 | Registro manual de pedidos en el día a día | Hecho | `CasoUsoRegistrarPedido` (replanifica de inmediato) | `IntegracionPedidosTest`, `MotorEjecucionTest` |
| LE-019 / LE-051 | Configuración de la flota al inicio | Hecho | `ConfiguracionDominio.crearFlota(central, a, m, b)`, `ComposicionFlota`, `CodigosFlota` | `ConfiguracionDominioTest`, `MotorEjecucionTest`, `IntegracionApiTest` |
| LE-043 – LE-047, LE-056 | Escenarios concurrentes difundidos por STOMP | Hecho | `MotorEjecucion` (un hilo por ejecución), `ServicioDifusion`, `PublicadorStomp` | `IntegracionApiTest` |
| LE-064 | Tramo en curso: origen, destino, salida y llegada | Hecho | `Tramo` (con camino real), `CalculadoraTiempos.trazar`, `Malla.camino` | `CalculadoraTiemposTest`, `MallaTest` |
| LE-077 / LE-082 | Detalle y estado de pedidos | Hecho | `SeguimientoPedidos` (hitos), `CasoUsoConsultarDetallePedido`, `CasoUsoConsultarPedidos` | `MotorEjecucionTest`, `IntegracionPedidosTest` |
| LE-078 / LE-080 | Semáforo de inventario de intermedios | Hecho (backend) | `ConstructorInstantanea.nivelInventario` | — |
| LE-083 | Bloqueos visibles | Hecho (backend) | `Bloqueo.getPolilinea`, `BloqueoEnMapa`, eventos de bloqueo | `MotorEjecucionTest` |
| LE-085 / LE-089 | Relojes simulado y real con tiempo transcurrido | Hecho (backend) | `RelojEjecucion`, `MensajeEstadoEjecucion` | `MotorEjecucionTest`, `RelojEjecucionTest` |
| LE-086 | Indicador de cumplimiento de plazos | Hecho (backend) | `SeguimientoPedidos.indicadores` | `SeguimientoPedidosTest` |
| LE-092 | Ruta planificada depurada de lo recorrido | Hecho (backend) | `ConstructorInstantanea.rutaRestante`, `RecorridoCamino` | `ConstructorInstantaneaTest`, `RecorridoCaminoTest` |
| LE-063 | Retorno al almacén con stock alcanzable, si no el central | Parcial | `Reparador.almacenValido` (más cercano con stock; no valida el turno) | — |
| LE-067 | Criterio de colapso logístico | Hecho | `ResultadoSimulacion.registrarColapso` | — |
| LE-101 | Ruta de la unidad de origen tras una reasignación | Pendiente / Motor | — | — |
| CU-11 | Recarga diaria de intermedios a las 23:59:59 | Hecho | `Almacen.descontar` / `recargar`, `Orquestador.recargarAlmacenes` | `AlmacenTest` |
| CU-11 | Stock de intermedios como restricción dura | Hecho | `Reparador` (fase 2), `InventarioProyectado` | `InventarioProyectadoTest` |
| CU-12 | Bloqueos programados (nodo no transitable) | Hecho | `modelo.Bloqueo`, `util.Malla` | — |
| CU-13 | Averías tipo 1, 2 y 3 | Pendiente / Motor | Solo el estado `EstadoVehiculo.AVERIADA` y el punto de disparo `Orquestador.replanificar` | — |

## Pruebas que faltan

`PlanificadorGATest`, `OperadoresGeneticosTest`, `ReparadorTest`, `BusquedaLocalTest`,
`ConstructorSolucionesTest`, `MallaTest` y `OrquestadorTest`. El estándar 62 exige
una clase de prueba por cada clase con lógica de negocio.
