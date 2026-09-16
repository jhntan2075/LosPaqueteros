# PaqTracker — Planificador de Rutas (GA)

Módulo planificador del sistema PaqTracker. Resuelve el ruteo dinámico de
entregas con flota heterogénea, múltiples almacenes, ventanas de tiempo y
bloqueos de vía programados, mediante un Algoritmo Genético memético.

## Descripción del servicio

El planificador recibe la cola de pedidos vigentes y las unidades disponibles en
un instante dado, y produce un plan de rutas que retrasa el colapso logístico
(el primer incumplimiento de plazo). El orquestador simula la operación en el
tiempo, replanificando cada Sa minutos sobre lo nuevo en cola.

## Requisitos previos

- JDK 17 o superior (se requiere el compilador `javac`, no solo el runtime).

## Estructura del código

El código se organiza por capas dentro del paquete raíz `pe.pucp.paqtracker`:

| Paquete                 | Contenido                                                        |
|-------------------------|------------------------------------------------------------------|
| `modelo`                | Entidades del dominio y configuración centralizada.              |
| `planificador`          | Algoritmo genético, interfaz común y operadores genéticos.       |
| `planificador.comun`    | Bloques compartidos: construcción, reparación, búsqueda local, fitness. |
| `servicio`              | Orquestación dinámica y punto de entrada de la simulación.       |
| `repositorio`           | Lectura de los archivos de pedidos y bloqueos.                   |
| `util`                  | Cálculo de distancias sobre la malla y de tiempos.               |

Los bloques compartidos residen en `planificador.comun` y son invocados por el
GA; una futura implementación (IACO) los reutiliza sin duplicarlos, de modo que
la comparación experimental mida la estrategia metaheurística y no diferencias
de ingeniería.

## Cómo levantarlo localmente

Desde la carpeta `src`, compilar todo el árbol de paquetes:

```
javac -d ../out $(find pe -name "*.java")
```

Ejecutar la simulación dinámica sobre datos reales (el archivo de ventas debe
tener el instante de registro en minutos absolutos del mes):

```
java -cp ../out pe.pucp.paqtracker.servicio.SimulacionDinamica ventas_abs.txt bloqueo_2601.txt 7
```

Tambien se pueden usar carpetas versionadas. Para una estructura como:

```
ventas.v20260909/
	ventas.202601.txt
	ventas.202602.txt
bloqueos.v20260909/
	bloqueos/
		bloqueo.202601.txt
		bloqueo.202602.txt
```

Desde la raiz del proyecto, compilar y ejecutar un mes especifico con:

```
javac -d out $(find src -name "*.java")
java -cp out pe.pucp.paqtracker.servicio.SimulacionDinamica ventas.v20260909 bloqueos.v20260909 7 202601
```

Los argumentos son `ventas bloqueos dias mes`. El cuarto argumento (`dias`)
define el horizonte de lectura desde el minuto cero; el quinto (`mes`) es
opcional y selecciona los archivos `ventas.YYYYMM.txt` y `bloqueo.YYYYMM.txt`.
Por ejemplo, `202601` lee enero de 2026. Si se omite `mes`, se leen todos los
archivos encontrados, pero como los tiempos de cada archivo comienzan en el
dia 1, se recomienda ejecutar cada mes por separado.

Para simular un rango continuo entre fechas, se pueden leer varios archivos
mensuales con fechas inclusivas en formato `dd-MM-yyyy`:

```
java -cp out pe.pucp.paqtracker.servicio.SimulacionDinamica ventas.v20260909 bloqueos.v20260909 01-01-2026 28-02-2026
```

En este modo se leen `ventas.202601.txt`, `ventas.202602.txt` y sus archivos
de bloqueos correspondientes. Los minutos de febrero se desplazan despues de
enero para que la simulacion use una sola linea temporal continua.

## Comandos principales

| Comando                                                             | Efecto                                  |
|--------------------------------------------------------------------|-----------------------------------------|
| `SimulacionDinamica <ventas> <bloqueos> <dias>`                    | Corre la simulación dinámica.           |

## Variables de entorno

El planificador no requiere variables de entorno propias; los parámetros de
negocio y del algoritmo se centralizan en `modelo.ConfiguracionDominio` y en las
constantes de `planificador.PlanificadorGA`. Ver `.env.example` para las
variables previstas al integrarse con la API.

## Formato de datos

**Ventas** — una línea por pedido: `reg_min,x,y,cantidad,plazo_min`.
**Bloqueos** — `##d##h##m-##d##h##m:x1,y1,x2,y2,...` (ventana y polilínea).
