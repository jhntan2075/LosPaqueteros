# GA frente a IACO: verificación del contexto común y adaptación del IACO

Informe del 16-09-2026, rama `hotfix/Comparacion-IACO`.

## 1. Resumen

- **Estado previo:** los dos algoritmos están desarrollados y cada uno corre por
  separado, pero **no se podían probar con los mismos parámetros ni en el mismo
  contexto de uso**. El IACO (PR #8) es un árbol paralelo,
  `pe.pucp.paqtracker.iaco`. Tiene su propio modelo, sus propios lectores de datos,
  su propio simulador y sus propias métricas, y no implementa
  `planificador.AlgoritmoMetaheuristico`. Aunque lea los mismos archivos de
  `datos/`, resuelve otro problema: otra flota, otros almacenes, turnos,
  mantenimiento y otro criterio de cumplimiento.
- **Qué se hizo:** se adaptó el IACO v3.0 al contexto del GA en tres clases nuevas
  de `planificador`: `PlanificadorIACO`, `OperadoresColonia` y `MemoriaFeromonas`.
  El IACO adaptado implementa la interfaz común y corre en el mismo
  `Orquestador`. Usa la misma fragmentación, reparación, búsqueda local y función
  de fitness que el GA, **sin modificarlas**. Entre GA e IACO solo cambia la
  metaheurística.
- **Qué se conservó:** el paquete `pe.pucp.paqtracker.iaco` queda intacto, como
  referencia del IACO original y de los resultados de `docs/iaco/resultados.md`.

## 2. Verificación: por qué no eran comparables

### 2.1 Parámetros de negocio

| Aspecto | GA (`pe.pucp.paqtracker`) | IACO original (`pe.pucp.paqtracker.iaco`) |
|---|---|---|
| Almacén central | (27,14), ilimitado | (25,15), ilimitado |
| Almacenes intermedios | (12,38) y (57,27), 1000 paquetes | (12,38) y (55,27), 1000 paquetes |
| Composición de flota | 10 autos, 15 motos, 12 bicicletas (en código) | 10 TA, 15 TM, 12 TB (censo del archivo de mantenimiento) |
| Auto | 24 paquetes, 20 km/h | 30 paquetes, 40 km/h, 1,20 por km |
| Moto | 8 paquetes, 40 km/h | 15 paquetes, 35 km/h, 0,60 por km |
| Bicicleta | 4 paquetes, 14 km/h | 8 paquetes, 20 km/h, 0,15 por km |
| Costo por kilómetro | no existe | sí; el objetivo minimiza costo |
| Tiempo de servicio | 60 min | 60 min |

### 2.2 Reglas de operación

| Aspecto | GA | IACO original |
|---|---|---|
| Cumplimiento | la **llegada** al cliente debe ser ≤ hora límite | el **fin** de la hora de entrega (llegada + 60 min) debe ser ≤ hora límite |
| Turnos | no existen | turnos de 8 h (07:00, 15:00, 23:00); la unidad debe volver a un almacén antes del cambio |
| Refrigerio | no existe | 1 h escalonada en tres grupos; detiene la ruta |
| Mantenimiento preventivo | no existe | unidades fuera de servicio por día, proyectadas desde `mant.preventivo` |
| Bloqueos | rodeo por búsqueda en amplitud en `util.Malla`; si no hay camino, distancia "infinita" | A* dependiente del tiempo **con espera** en el nodo; los almacenes nunca se bloquean |
| Stock intermedio | cada ciclo parte del stock inicial | se descuenta al despachar y se repone a medianoche |
| Pedidos mayores a la capacidad | `Fragmentador` los divide antes de planificar | no se fragmentan |
| Pedidos urgentes (≤ 8 h) | despacho directo fuera del GA | rescate individual M9/M10 dentro del planificador |
| Despacho del plan | toda ruta propuesta sale en el ciclo | puerta de consolidación (60 % de carga), anti-inanición de 24 ciclos, control de turno y de stock |
| Reubicación en vacío | no existe | reserva mínima de unidades por almacén (M8) |
| Almacén de retorno | elegido según stock proyectado (`Reparador`) | el más cercano |

### 2.3 Algoritmo y medición

| Aspecto | GA | IACO original |
|---|---|---|
| Función objetivo | `EvaluadorFitness`: km + 5000·inc² + 50·espera ponderada + 20·holgura² | `FuncionAptitud` v2.1: costo + 5000·inc² + atraso + holgura lineal + diferidos; lexicográfica; lineal en saturación |
| Búsqueda local | `BusquedaLocal` común: 2-opt + Or-opt hacia unidades de igual o menor capacidad | propia: 2-opt + reinserción intra-ruta + reubicación e intercambio entre rutas |
| Tiempos dentro del algoritmo | reales, con malla, en fitness y reparación | Manhattan en la colonia; reales solo en el pulido final (M7) |
| Horizonte | días pedidos o rango de fechas + 3000 min | mes, sin el último día si el archivo está cortado, + 1 día |
| Semilla | 1 + instante del ciclo | 7, combinada con ciclo, iteración y hormiga |
| Métricas | `ResultadoSimulacion`: entregas, incumplimientos, colapso, pico de unidades, uso por tipo, distancia | `Metricas`: en plazo, tardíos, sin entregar, km, costo, holgura, tiempo por plan |
| Punto de entrada | `servicio.SimulacionDinamica` | `iaco.app.Main` |

**Conclusión:** con dos modelos de dominio distintos, cualquier diferencia de
resultados mezcla el efecto del algoritmo con el de la flota, los turnos, el
criterio de cumplimiento y el simulador. Por eso las cifras de
`docs/iaco/resultados.md` no se pueden comparar con las del GA.

## 3. Cambios realizados

Criterio: el GA fija el contexto (datos, flota, reglas, orquestador y métricas) y
el IACO se adapta a él. Los bloques de `planificador.comun` dicen explícitamente
"no debe duplicarse ni modificarse localmente", así que no se tocaron.

| Archivo | Cambio |
|---|---|
| `planificador/MemoriaFeromonas.java` (nuevo) | Puerto de `iaco.servicio.MemoriaFeromonas` al modelo común. Zonas de 10 × 10 km (8 × 6 = 48) calculadas desde `ConfiguracionDominio`; rastros de arco (zona→zona) y de siembra (zona × tipo de vehículo); MAX-MIN, evaporación global y local, suavizado y factor de convergencia. Se crea una por simulación, así la feromona persiste entre ciclos (M3). |
| `planificador/OperadoresColonia.java` (nuevo) | Equivalente de `OperadoresGeneticos` para la colonia: construcción de una hormiga sobre `EscenarioOperativo` (entregas, vehículos, almacenes), depósito y evaporación local. Precalcula por ciclo el orden por hora límite, la lista de candidatos cercanos y la distancia real del primer tramo desde cada almacén. |
| `planificador/PlanificadorIACO.java` (nuevo) | Implementa `AlgoritmoMetaheuristico`. Bucle de la colonia con los parámetros de `ParametrosIACO.v30()`. Cada hormiga pasa por `Reparador` y `EvaluadorFitness`; las 4 mejores de cada iteración pasan por `reparar → BusquedaLocal.optimizar → reparar → evaluar`, la misma secuencia que aplica el GA a cada individuo. |
| `servicio/Orquestador.java` | Tenía `new PlanificadorGA(...)` fijo en `replanificar`. Ahora recibe una `LongFunction<AlgoritmoMetaheuristico>` que crea el algoritmo de cada ciclo a partir de la semilla. El constructor anterior se mantiene y delega con `PlanificadorGA::new`. |
| `servicio/SimulacionDinamica.java` | Nueva opción `--algoritmo ga|iaco` (por defecto `ga`), que se quita de los argumentos antes del parseo posicional. El informe indica el algoritmo. |
| `README.md`, `CHANGELOG.md`, `docs/estructura.md`, `docs/iaco/README.md` | Referencias al IACO adaptado y a este informe. |

No se modificó nada en `src/pe/pucp/paqtracker/iaco/` ni en
`src/pe/pucp/paqtracker/planificador/comun/`.

### 3.1 Parámetros del IACO adaptado

Son los de la versión publicada `ParametrosIACO.v30()`:

| Parámetro | Valor | Parámetro | Valor |
|---|---|---|---|
| Hormigas | 20 | Iteraciones máximas | 30 |
| α (feromona) | 1,0 | β (visibilidad) | 2,0 |
| γ (urgencia) | 1,0 | ρ (evaporación) | 0,10 |
| Élite que deposita | 5 | τmin / τmax | 0,05 / 1,0 |
| Candidatos K | 12 | Búsqueda local sobre las mejores | 4 |
| q0 | 0,35 | ξ local | 0,10 |
| Estancamiento / parada | 4 / 6 iteraciones | Umbral de convergencia | 0,92 |
| Holgura de seguridad | 45 min | | |

## 4. Mejoras del IACO: qué se portó y qué no

| Mejora | Estado | Motivo o forma de adaptación |
|---|---|---|
| M1 siembra por urgencia con feromona zona–tipo | **Portada** | La visibilidad `(1/costo)·(1+holgura/600)` pasa a `(1/(distancia+1))·(1+holgura/600)`, porque el GA no tiene costo por km. La holgura negativa se trunca a 0 para que la visibilidad nunca sea negativa. |
| M2 candidatos K = 12 y visibilidad `urg^γ / d` | **Portada** | Con la holgura medida hasta la **llegada**, el criterio de cumplimiento del GA. |
| M3 feromona zonal persistente | **Portada** | Una `MemoriaFeromonas` por simulación, compartida por los planificadores de cada ciclo. |
| M4 MAX-MIN con reinicio parcial | **Portada** | Sin cambios. |
| M5 holgura de seguridad de 45 min | **Portada** | Se aplica a la llegada, no al fin de servicio. |
| M6 primer tramo con tiempo real | **Adaptada** | En lugar del A* con espera, se precalcula por ciclo la distancia de `CalculadoraTiempos.distancia` (malla del GA) desde cada almacén hasta cada entrega. Si no hay camino, la unidad no se ofrece para esa siembra. |
| M7 pulido con tiempos reales | **Descartada** | `EvaluadorFitness` y `Reparador` ya usan la malla con bloqueos, así que no hay estimación que corregir. |
| M8 reserva de flota y reubicación en vacío | **Descartada** | El orquestador del GA no tiene reubicaciones en vacío; agregarlas cambiaría el contexto común. |
| M9 / M10 rescate de pedidos sin salida y espera útil | **Descartadas** | En el GA los pedidos de plazo ≤ 8 h los atiende el despacho directo del orquestador, igual para ambos algoritmos. M10 depende de turnos. |
| M11 búsqueda local entre rutas | **Sustituida** | Se usa `BusquedaLocal` común (2-opt + Or-opt entre rutas). También se sustituye la reinserción intra-ruta del IACO. |
| M12 lista de candidatos precalculada | **Portada** | Vecinos por distancia Manhattan, calculados una vez por ciclo. |
| M13 colonia paralela | **Descartada** | El GA corre en un solo hilo. Paralelizar solo el IACO le daría más cómputo por ciclo y la comparación de tiempos dejaría de ser justa. Con un hilo, además, el resultado es determinista (verificado). |
| M14 comparación lexicográfica | **Descartada** | Exige otro criterio de orden que la función objetivo común. Con el peso cuadrático de 5000 por incumplimiento el efecto es casi el mismo, y ambos algoritmos quedan con la misma función objetivo. |
| M15 regla q0 y evaporación local | **Portada** | La evaporación local se aplica en orden de hormiga. |
| M16 suavizado por factor de convergencia | **Portada** | Sin cambios. |
| M17 hormiga 0 codiciosa | **Portada** | Sin cambios. |
| M18 reserva dinámica | **Descartada** | Depende de M8; ya estaba apagada en la v3.0. |
| M19 modo saturación | **Descartada** | Cambia los pesos de la función objetivo (penalización lineal) y relaja restricciones de turno; eso exigiría modificar `EvaluadorFitness`. |
| M20 siembra por rendimiento | **Descartada** | Forma parte del modo saturación. |
| M21 prioridad a pedidos recuperables | **Descartada** | Forma parte del modo saturación y depende de los turnos. |
| Turnos, refrigerio, mantenimiento, costo por km, puerta de consolidación | **Descartados** | No existen en el contexto del GA. |

## 5. Resultados en el mismo contexto

Mismas condiciones para ambos: `SimulacionDinamica` con `Orquestador`, ciclo de
30 min, semilla base 1, 37 unidades, bloqueos del mes, despacho directo de
urgentes (≤ 8 h) y misma función de fitness. JDK 25, un hilo por planificador.
El tiempo es de pared e incluye el arranque de la JVM.

| Ventana | Algoritmo | Entregas | Incumpl. | Colapso | Replanif. | Pico unidades | Rutas (auto / bici / moto) | Distancia | Tiempo |
|---|---|---|---|---|---|---|---|---|---|
| Ene 2026, 7 días | GA | 116 / 116 | 0 | no | 91 | 4 | 111 (32 / 37 / 42) | **5 034** | 9,9 s |
| Ene 2026, 7 días | IACO | 116 / 116 | 0 | no | 70 | 2 | 113 (29 / 25 / 59) | 5 333 | **5,3 s** |
| Ene 2026, 31 días | GA | 641 / 641 | 0 | no | 455 | 4 | 604 (150 / 193 / 261) | **27 455** | 39,5 s |
| Ene 2026, 31 días | IACO | 641 / 641 | 0 | no | 369 | 3 | 601 (154 / 90 / 357) | 28 198 | **12,0 s** |
| Feb 2026, 28 días | GA | 953 / 953 | 0 | no | 579 | 4 | 874 (244 / 295 / 335) | **39 364** | 59,9 s |
| Feb 2026, 28 días | IACO | 953 / 953 | 0 | no | 518 | 4 | 865 (281 / 147 / 437) | 41 194 | **20,5 s** |

### 5.1 Lectura

- **Cumplimiento:** empate. Ninguno incumple ni colapsa en estas ventanas. Con la
  demanda de enero y febrero (≈ 21 y 34 pedidos por día) la flota está holgada:
  el pico de uso es de 2 a 4 unidades de 37. Estas ventanas no discriminan entre
  los algoritmos por cumplimiento.
- **Distancia:** el GA gana en las tres ventanas. El IACO recorre un 5,9 % más en
  7 días, un 2,7 % más en enero y un 4,6 % más en febrero.
- **Tiempo de cómputo:** el IACO es entre 1,9 y 3,3 veces más rápido. Construye
  como máximo 600 soluciones por ciclo con búsqueda local solo sobre 4 por
  iteración y se detiene al estancarse; el GA aplica búsqueda local a los 50
  individuos de cada una de sus 70 generaciones.
- **Mezcla de flota:** el IACO usa la mitad de bicicletas (15–17 % de las rutas
  frente a 32–34 % del GA) y más motos. Interpretación, no verificada por
  separado: en la siembra del IACO la holgura pesa en la visibilidad y la moto
  (40 km/h) llega con más margen que la bicicleta (14 km/h). En el GA, el tope
  de carga del constructor y el Or-opt hacia unidades de igual o menor capacidad
  empujan a las unidades pequeñas. Esa diferencia de mezcla explica
  probablemente buena parte de la distancia extra del IACO.
- **Determinismo:** dos corridas del IACO con la misma semilla (7 días de enero)
  dieron salida idéntica.
- **No regresión del GA:** la corrida de 7 días de enero con el `Orquestador`
  refactorizado es idéntica, línea por línea, a la corrida previa al cambio.

### 5.2 Enero a junio 2026 y corrección del despacho de urgentes

Comando:

```
java -cp out pe.pucp.paqtracker.servicio.SimulacionDinamica datos/ventas.v20260909 datos/bloqueos.v20260909/bloqueos 01-01-2026 30-06-2026 --algoritmo iaco
```

| Corrida (181 días, 11 107 pedidos) | Incumpl. | Colapso | Rutas (auto / bici / moto) | Urgentes repartidos | Distancia | Tiempo |
|---|---|---|---|---|---|---|
| GA, antes de la corrección | 0 | no | 2 657 / 2 980 / 3 602 | — | **440 230** | ≈ 99 min |
| IACO, antes de la corrección | 1 | día 173 | 2 763 / 1 524 / 4 730 | — | 459 691 | no medido |
| IACO, con la corrección | **0** | no | 2 749 / 1 518 / 4 756 | 4 | 459 768 | **7,3 min** |

Las corridas por rango son más lentas que las mensuales: la malla recibe los
bloqueos de los seis meses y los recorre en cada consulta de distancia.

**Qué pasó.** El pedido `22d12h12m:02,47,c5382,09,04` de `ventas.202606.txt`
(9 paquetes, destino (2,47), plazo 4 h, límite 16:12) llegó a las 16:45, 33 min
tarde. Causa:

1. Solo un AUTO puede llevar 9 paquetes (la moto carga 8 y la bicicleta 4), y es
   una de las unidades más lentas (20 km/h).
2. En el ciclo de las 12:30 no había ningún auto libre, así que esperó un ciclo.
3. A las 13:00 el único auto libre estaba en el almacén este (57,27), a 75 km
   (225 min). Desde el central (58 km) o el norte (19 km) habría llegado a tiempo.

El despacho de urgentes es el mismo para ambos algoritmos. Lo que cambia es dónde
quedan los autos al terminar sus rutas: el IACO los dejó mal ubicados en ese
momento y el GA no. Pero el punto débil era común.

**Corrección** (`Orquestador`, igual para GA e IACO):

- Si una sola unidad libre llega a tiempo, se despacha como antes.
- Si no, el pedido se reparte entre varias unidades libres que lleguen **todas**
  dentro del plazo. Primero se toman las de mayor capacidad, y se respeta el stock
  de cada almacén. En el caso de junio bastan dos motos desde el central: 87 min.
- Si tampoco así llega, se despacha como antes en la unidad que llega primero.
- El pedido repartido cuenta como una sola entrega. El informe de consola agrega
  la línea "Urgentes repartidos en varias unidades".

Efecto: el IACO pasa de 1 incumplimiento a 0, con 4 pedidos repartidos en seis
meses y 77 km más (+0,02 %). Las corridas de 7 días de enero de ambos algoritmos
dan resultados idénticos a los anteriores, porque ahí el reparto no se activa.
El GA de enero a junio no se volvió a correr con la corrección (tarda unos 99 min).
Antes ya tenía 0 incumplimientos, pero sus cifras pueden variar un poco si hubo
ciclos sin auto libre que ahora se resuelven repartiendo.

### 5.3 Ventanas no evaluadas

Se intentó octubre 2026, el mes cargado del análisis de sensibilidad de
`TipoVehiculo`, y se interrumpió por su duración. Queda pendiente una comparación
en un mes con saturación, donde sí se esperan diferencias de cumplimiento; para
limitar el tiempo conviene una ventana corta (por ejemplo, 7 días de 202610).

## 6. Cómo reproducir

```
powershell -ExecutionPolicy Bypass -File scripts\compilar.ps1
powershell -ExecutionPolicy Bypass -File scripts\ga.ps1 datos\ventas.v20260909 datos\bloqueos.v20260909 7 202601
powershell -ExecutionPolicy Bypass -File scripts\ga.ps1 datos\ventas.v20260909 datos\bloqueos.v20260909 7 202601 --algoritmo iaco
```

La opción `--algoritmo` también funciona con rango de fechas
(`01-01-2026 28-02-2026 --algoritmo iaco`).

## 7. Limitaciones

- La comparación mide **las metaheurísticas** dentro del modelo del GA, no el
  IACO v3.0 tal como fue calibrado. Las mejoras descartadas (sección 4) pueden
  valer más en el dominio original.
- El presupuesto de cómputo no es idéntico. El GA evalúa 50 individuos por 70
  generaciones con búsqueda local sobre cada uno. El IACO construye hasta 20
  hormigas por 30 iteraciones, con búsqueda local solo sobre las 4 mejores y
  parada temprana. Por eso se informa también el tiempo de pared.
- Los tests JUnit del repositorio (`tests/`) no tienen runner configurado (no hay
  Maven ni Gradle). No se agregaron tests nuevos; la verificación se hizo con
  corridas completas.
