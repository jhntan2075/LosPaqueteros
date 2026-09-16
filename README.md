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
