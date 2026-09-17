# PaqTracker — Planificador de Rutas

Módulo planificador del sistema PaqTracker. Resuelve el ruteo dinámico de
entregas con flota heterogénea, múltiples almacenes, ventanas de tiempo y
bloqueos de vía programados.

El repositorio contiene **dos algoritmos metaheurísticos** que atacan el mismo
problema sobre los mismos datos, para poder compararlos:

| Algoritmo | Paquete raíz                 | Punto de entrada                            |
|-----------|------------------------------|---------------------------------------------|
| **GA** — Algoritmo Genético memético | `pe.pucp.paqtracker`      | `servicio.SimulacionDinamica`               |
| **IACO** — Improved Ant Colony Optimization | `pe.pucp.paqtracker.bancopruebasiaco` | `bancopruebasiaco.app.Main`      |

Cada algoritmo es autónomo: trae su propio modelo de dominio, sus lectores de
datos y su simulador. **No comparten código**, y esa separación es deliberada
(ver [Por qué están separados](#por-qué-están-separados)).

Como los dos árboles usan parámetros de negocio distintos, sus resultados no se
pueden comparar directamente. Para compararlos en igualdad de condiciones existe
además un **IACO adaptado al contexto del GA**:
`planificador.PlanificadorIACO` implementa `AlgoritmoMetaheuristico` y corre en el
mismo orquestador, con los mismos datos, la misma flota y los mismos bloques
comunes que el GA. Las diferencias y los cambios están en
[`docs/comparacion_ga_iaco.md`](docs/comparacion_ga_iaco.md).

## Requisitos previos

- JDK 17 o superior (se requiere el compilador `javac`, no solo el runtime).

## Estructura del repositorio

```
src/pe/pucp/paqtracker/
├── modelo/           ─┐
├── planificador/      │
│   ├── PlanificadorGA.java
│   ├── OperadoresGeneticos.java
│   ├── AlgoritmoMetaheuristico.java
│   └── comun/         ├─ ALGORITMO GENÉTICO (GA)
├── servicio/          │
├── repositorio/       │
├── util/             ─┘
└── bancopruebasiaco/  ─┐
    ├── modelo/        │
    ├── datos/         ├─ ALGORITMO IACO
    ├── servicio/      │
    │   ├── PlanificadorIACO.java
    │   ├── MemoriaFeromonas.java
    │   └── Simulador.java
    └── app/Main.java ─┘

datos/                 Dataset compartido por ambos algoritmos
├── ventas.v20260909/  Pedidos mensuales 2026–2028
├── bloqueos.v20260909/bloqueos/
└── mant.preventivo.202609-202610.txt

docs/
├── estructura.md      Capas y dependencias
└── iaco/              Resultados y calibración del IACO

scripts/               Compilación y ejecución
tests/                 Pruebas del GA
```

### Capas del GA

| Paquete              | Contenido                                                        |
|----------------------|------------------------------------------------------------------|
| `modelo`             | Entidades del dominio y configuración centralizada.              |
| `planificador`       | Algoritmo genético, interfaz común y operadores genéticos.       |
| `planificador.comun` | Bloques compartidos: construcción, reparación, búsqueda local, fitness. |
| `servicio`           | Orquestación dinámica y punto de entrada de la simulación.       |
| `repositorio`        | Lectura de los archivos de pedidos y bloqueos.                   |
| `util`               | Cálculo de distancias sobre la malla y de tiempos.               |

### Capas del IACO

| Paquete              | Contenido                                                        |
|----------------------|------------------------------------------------------------------|
| `bancopruebasiaco.modelo`        | Entidades y configuración propias del IACO.                      |
| `bancopruebasiaco.datos`         | Catálogo y lectores de ventas, bloqueos y mantenimiento.         |
| `bancopruebasiaco.servicio`      | Colonia de hormigas, feromonas, búsqueda local, simulador, métricas. |
| `bancopruebasiaco.app`           | Banco de pruebas por línea de comandos.                          |

## Por qué están separados

Ambos algoritmos definen entidades con el mismo nombre pero con contratos
distintos e incompatibles. Por ejemplo, la ruta:

```java
// GA   — pe.pucp.paqtracker.modelo.Ruta
new Ruta(Vehiculo, Almacen);                       // destino y entregas mutables

// IACO — pe.pucp.paqtracker.bancopruebasiaco.modelo.Ruta
new Ruta(Unidad, Nodo, List<Pedido>, double);      // cronograma incrustado
```

Convivir en el mismo paquete haría imposible la compilación. Aislar el IACO bajo
`pe.pucp.paqtracker.bancopruebasiaco` permite que los dos evolucionen sin romperse y que el
árbol completo compile de una sola pasada.

La unificación sobre un modelo común ya tiene una primera versión:
`planificador.PlanificadorIACO` implementa `planificador.AlgoritmoMetaheuristico`
y reutiliza `planificador.comun`. El paquete `bancopruebasiaco` se conserva intacto como
referencia del IACO v3.0 y de sus resultados publicados.

## Cómo levantarlo localmente

Compilar todo el árbol (GA e IACO) a `out/`:

```
powershell -ExecutionPolicy Bypass -File scripts\compilar.ps1
```

En Linux o macOS, el equivalente directo con el JDK:

```
javac -encoding UTF-8 -d out $(find src -name "*.java")
```

### Ejecutar el GA

```
powershell -ExecutionPolicy Bypass -File scripts\ga.ps1 datos\ventas.v20260909 datos\bloqueos.v20260909 7 202601
```

Los argumentos son `ventas bloqueos dias [mes]`. El tercero define el horizonte
de lectura desde el minuto cero; el cuarto es opcional y selecciona los archivos
`ventas.YYYYMM.txt` y `bloqueo.YYYYMM.txt`. Si se omite el mes se leen todos los
archivos, pero como los tiempos de cada uno comienzan en el día 1 se recomienda
ejecutar cada mes por separado.

Para simular un rango continuo, con fechas inclusivas en formato `dd-MM-yyyy`:

```
powershell -ExecutionPolicy Bypass -File scripts\ga.ps1 datos\ventas.v20260909 datos\bloqueos.v20260909 01-01-2026 28-02-2026
```

Los minutos de febrero se desplazan después de enero para que la simulación use
una sola línea temporal continua.

### Ejecutar el IACO adaptado en el contexto del GA

Los mismos argumentos que el GA, más `--algoritmo iaco` al final (por defecto es
`ga`):

```
powershell -ExecutionPolicy Bypass -File scripts\ga.ps1 datos\ventas.v20260909 datos\bloqueos.v20260909 7 202601 --algoritmo iaco
```

### Ejecutar el IACO

```
powershell -ExecutionPolicy Bypass -File scripts\iaco.ps1 meses
powershell -ExecutionPolicy Bypass -File scripts\iaco.ps1 simular --mes 202601 --algoritmo v30
powershell -ExecutionPolicy Bypass -File scripts\iaco.ps1 comparar --mes 202601,202602 --salida docs\iaco\resultados.md
```

| Comando        | Efecto                                                        |
|----------------|---------------------------------------------------------------|
| `meses`        | Lista los meses con datos disponibles.                        |
| `datos`        | Audita los archivos de entrada: qué trae cada mes y qué falta. |
| `simular`      | Corre un mes con una versión del algoritmo.                   |
| `comparar`     | Corre varias versiones y emite una tabla Markdown.            |
| `factibilidad` | Reporta los pedidos imposibles de atender y por qué.          |

Opciones: `--mes`, `--dias`, `--algoritmo v21|v30`, `--semilla`, `--datos <ruta>`
(por defecto `datos`) y `--sin M11..M21` para ablación, que apaga una mejora
concreta de la v3.0 y mide su aporte por separado.

## Variables de entorno

El planificador no requiere variables de entorno propias. Los parámetros de
negocio y del algoritmo se centralizan en `modelo.ConfiguracionDominio` y las
constantes de `planificador.PlanificadorGA` para el GA, y en
`bancopruebasiaco.modelo.ConfiguracionDominio` y `bancopruebasiaco.servicio.ParametrosIACO` para el
IACO. Ver `.env.example` para las variables previstas al integrarse con la API.

## Formato de datos

**Ventas** — una línea por pedido: `reg_min,x,y,cantidad,plazo_min`.
**Bloqueos** — `##d##h##m-##d##h##m:x1,y1,x2,y2,...` (ventana y polilínea).
**Mantenimiento preventivo** — `YYYYMMDD:CODIGO_UNIDAD` por línea.
