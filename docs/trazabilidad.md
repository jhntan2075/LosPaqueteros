# Trazabilidad: exigencias → código → pruebas

Estado al 18-09-2026 del árbol `pe.pucp.paqtracker` (GA e IACO adaptado). Ayuda a
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
| LE-057 | Sc: salto del eje de consumo | Motor | — | — |
| LE-058 | Sa: salto del algoritmo | Hecho | `Orquestador` (`saMinutos`), `PLANIFICADOR_SA_MINUTOS` | — |
| LE-059 | Ta: tiempo de cómputo por planificación | Hecho | `Orquestador.simular`, `ResultadoSimulacion.registrarTiempoComputo` | — |
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
