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
| `simulacion`         | `Orquestador` (reloj por saltos de Sa, despacho, recarga, colapso) y su resultado. |
| `lectura`            | Lectores de los archivos de pedidos y bloqueos.                              |
| `util`               | Distancias sobre la malla con bloqueos, tiempos, turnos y fechas.            |

GA e IACO usan los mismos bloques de `planificador.comun`; nunca los duplican.

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
