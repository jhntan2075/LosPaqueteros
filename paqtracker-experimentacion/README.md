# paqtracker-experimentacion

Banco de experimentos por línea de comandos. Depende solo del núcleo y **no** forma
parte del artefacto desplegado.

## Contenido

| Paquete (`pe.pucp.paqtracker`) | Contenido |
|---|---|
| `experimentacion` | `SimulacionDinamica` (simulación completa), `CorredorExperimento`, `BarridoCalibracion`, `GeneradorEscenarios`, `VerificadorInvariantes`, `RegistroCsv`. |
| `bancopruebasiaco` | IACO v3.0 autónomo de referencia, con su propio modelo, lectores y simulador. |

`bancopruebasiaco` define entidades homónimas a las del núcleo (`Ruta`, `Almacen`,
`Pedido`, `ConfiguracionDominio`) con contratos incompatibles, por eso no hay imports
cruzados entre ambos árboles. El IACO que se compara con el GA en igualdad de
condiciones es `planificador.PlanificadorIACO` del núcleo
(ver [`docs/comparacion_ga_iaco.md`](../docs/comparacion_ga_iaco.md)).

## Compilar

```bash
./mvnw -pl paqtracker-experimentacion -am package
```

Los scripts de `scripts/` compilan solos si no encuentran las clases y usan como
classpath `paqtracker-experimentacion/target/classes;paqtracker-planificador-nucleo/target/classes`.

## Simulación dinámica (GA o IACO adaptado)

```
powershell -ExecutionPolicy Bypass -File scripts\ga.ps1 datos\ventas.v20260909 datos\bloqueos.v20260909 7 202601
powershell -ExecutionPolicy Bypass -File scripts\ga.ps1 datos\ventas.v20260909 datos\bloqueos.v20260909 01-01-2026 28-02-2026
powershell -ExecutionPolicy Bypass -File scripts\ga.ps1 datos\ventas.v20260909 datos\bloqueos.v20260909 7 202601 --algoritmo iaco
```

Argumentos: `ventas bloqueos dias [mes]` o `ventas bloqueos dd-MM-yyyy dd-MM-yyyy`,
más `--algoritmo ga|iaco` y `--detener-en-colapso` (CU-17). Variables opcionales
(la línea de comandos tiene prioridad):

| Variable | Por defecto | Uso |
|---|---|---|
| `PLANIFICADOR_ALGORITMO` | `GA` | `GA` o `IACO` |
| `PLANIFICADOR_SEMILLA` | `1` | Semilla base (reproducibilidad) |
| `PLANIFICADOR_SA_MINUTOS` | `30` | Salto del algoritmo Sa, en minutos simulados |

El informe final registra entregas, incumplimientos, instante de colapso,
replanificaciones, pico de unidades en uso, uso por tipo, distancia, costo total y
**Ta** (tiempo de cómputo por planificación, promedio y máximo; LE-059). La condición
de desempeño es Ta < Sa / k.

## Experimento numérico

```
powershell -ExecutionPolicy Bypass -File scripts\generar-escenarios.ps1
powershell -ExecutionPolicy Bypass -File scripts\experimento.ps1 --escenario esc-01 --algoritmo GA --semilla 1 --repeticion 1 --dias 30 --salida resultados\corridas.csv
powershell -ExecutionPolicy Bypass -File scripts\barrido.ps1 --peso SIN_RUTEAR_BASE --valores "1000,2500,5000" --dias 7 --repeticiones 5 --salida resultados\calibracion.csv
powershell -ExecutionPolicy Bypass -File scripts\invariantes.ps1
```

Cada script documenta sus opciones en la cabecera.

## IACO de referencia

```
powershell -ExecutionPolicy Bypass -File scripts\iaco.ps1 meses
powershell -ExecutionPolicy Bypass -File scripts\iaco.ps1 simular --mes 202601 --algoritmo v30
powershell -ExecutionPolicy Bypass -File scripts\iaco.ps1 comparar --mes 202601,202602 --salida docs\iaco\resultados.md
```

Comandos: `meses`, `datos`, `simular`, `comparar`, `factibilidad`. Opciones: `--mes`,
`--dias`, `--algoritmo v21|v30`, `--semilla`, `--datos <ruta>` y `--sin M11..M21`
(ablación).

## Pendiente

Los CLI todavía escriben su informe con `System.out` (los scripts capturan esa
salida, p. ej. el CSV de `CorredorExperimento`). Pasarlos al logger requiere
separar antes el informe de la bitácora.
