# paqtracker-planificador-nucleo

Núcleo del planificador de rutas en **Java puro** (sin Spring ni otro framework).
Lo consumen `paqtracker-api` y `paqtracker-experimentacion`; no depende de ningún
otro módulo.

## Paquetes (`pe.pucp.paqtracker`)

| Paquete              | Contenido                                                                    |
|----------------------|------------------------------------------------------------------------------|
| `modelo`             | Contrato común: Pedido, Vehiculo, Almacen, Bloqueo, Ruta, EscenarioOperativo, SolucionRuteo, enums y `ConfiguracionDominio`. |
| `planificador`       | `AlgoritmoMetaheuristico`, `PlanificadorGA`, `PlanificadorIACO` y sus operadores. |
| `planificador.comun` | Bloques compartidos: construcción, reparación, 2-Opt + one-move, fitness.    |
| `simulacion`         | `Orquestador` (reloj por saltos de Sa, despacho, recarga, colapso), `SimulacionEnCurso` (avance paso a paso para la API) y sus resultados. |
| `lectura`            | Lectores de los archivos de pedidos y bloqueos.                              |
| `util`               | Distancias sobre la malla con bloqueos, tiempos, turnos y fechas.            |

GA e IACO usan los mismos bloques de `planificador.comun`; nunca los duplican.

## Simulación en vivo

```java
SimulacionEnCurso simulacion = orquestador.iniciar(detenerEnColapso);
ResultadoPaso paso = simulacion.avanzar(instante);   // instante múltiplo de Sa
simulacion.agregarPedido(pedido);                    // pedido registrado en vivo
simulacion.getUnidadesEnTransito();                  // cada una con sus tramos
```

`Orquestador.simular` es el mismo bucle de una sola vez. Cada simulación debe tener
sus propios almacenes, flota, malla y orquestador (`ConfiguracionDominio.crearAlmacenes`
y `crearFlota` devuelven instancias nuevas), y la debe conducir un solo hilo.

## Parámetros

- Negocio (almacenes, flota, capacidades, velocidades, costos, turnos, plazos):
  `modelo.ConfiguracionDominio`.
- Algoritmo: `planificador.ParametrosGA`, `planificador.ParametrosIACO` y
  `planificador.comun.PesosFitness`.

## Pruebas

```bash
./mvnw -pl paqtracker-planificador-nucleo test
```

Las pruebas viven en `tests/` (mismo paquete que la clase probada) y usan semilla fija.
