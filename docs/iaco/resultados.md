# IACO v3.0 en Java — resultados sobre los 36 meses de datos

Implementación Java del planificador de PaqTracker. La IACO v2.1 (calibrada en el
prototipo Python) es la línea base; la v3.0 es la propuesta de este trabajo. Mismo
simulador para ambas, mismo escenario, ciclo de replanificación de 30 minutos,
37 unidades, criterio estricto de cumplimiento ("fin de la hora de entrega").

Corridas en JDK 25, colonia paralela sobre los núcleos disponibles.

---

## 1. Qué traen los datos

```
java -cp out pe.pucp.paqtracker.bancopruebasiaco.app.Main datos --datos datos
```

- **36 meses de ventas y 36 de bloqueos**: enero 2026 – diciembre 2028. Están todos.
- **160 010 pedidos**, cantidad media **5,50 paquetes** por pedido.
- **Solo 8 meses traen el mes completo**: enero–agosto 2026. Los otros 28 archivos
  están cortados en exactamente 5 000 registros, siempre a media jornada. El corte se
  ve en la propia serie: 202612 trae ~239 pedidos/día del 1 al 21 y el día 22 solo 45;
  202812 trae ~918/día y el día 6 solo 231.
- **Un solo archivo de mantenimiento preventivo**, con 37 intervenciones repartidas en
  setiembre y octubre de 2026 — exactamente una por unidad. De ahí sale también el
  censo de flota: **37 unidades (10 autos, 15 motos, 12 bicicletas)**.

En cada mes se descarta el último día (parcial) y se simula la ventana de demanda
completa; la columna `Días` de las tablas dice esa ventana. Eso convierte la serie en
algo más útil que 36 meses sueltos: una **rampa de demanda de 21 a 954 pedidos/día
sobre la misma flota**, que es justo lo que hace falta para encontrar el punto de
quiebre del planificador.

> **Supuesto explícito.** El plan de taller solo cubre set–oct 2026. Por omisión se
> proyecta al resto de meses por día del mes (`--mantenimiento proyectado`), que es
> como se calibró el banco de pruebas. Con `--mantenimiento real` solo se programa
> taller en 202609 y 202610.

---

## 2. Validación del puerto

El indicador más exigente no es el kilometraje sino **qué pedidos llegan tarde**. La
cota de factibilidad (`factibilidad`) identifica los pedidos que ningún planificador
podría entregar a tiempo, relajando todo lo relajable: cualquier almacén, el vehículo
más rápido con capacidad suficiente, el mejor grupo de refrigerio y cualquier salida
desde el primer ciclo.

| Mes | Pedidos | Imposibles (turno / bloqueo) | Ids |
|---|---|---|---|
| Enero 2026 | 641 | 1 (1 / 0) | 558 |
| Febrero | 953 | 1 (1 / 0) | 213 |
| Marzo | 1 544 | 3 (3 / 0) | 160, 284, 776 |
| Abril | 2 033 | 1 (1 / 0) | 343 |
| Mayo | 2 724 | 9 (5 / 4) | 484, 864, 1331, 1455, 1476, 1646, 1946, 1979, 2320 |
| Junio | 3 212 | 11 (6 / 5) | 178, 746, 782, 882, 1165, 1329, 2202, 2584, 2664, 3111, 3189 |

Coincide pedido por pedido con lo que reporta el prototipo Python, incluido el caso
2202 de junio, que no tiene salida a tiempo en ningún horario. **En esos seis meses la
lista de tardíos de ambas versiones es exactamente la lista de imposibles**: las dos
entregan a tiempo el 100 % de los pedidos alcanzables.

**Lo que el puerto no reproduce.** Volviendo a correr el prototipo Python sobre estos
mismos datos, enero da costo 8 074 frente a los 8 278 del puerto Java de la v2.1: un
2,5 % de diferencia, con cumplimiento idéntico. Son otro generador aleatorio y otros
desempates. Por eso **la comparación válida de este trabajo es Java v2.1 vs Java
v3.0** —mismo código, mismo simulador, solo interruptores de mejora— y no Java v3.0
contra los números publicados del prototipo.

---

## 3. La rampa de demanda: dónde se rompe cada versión

| Mes | Días | Pedidos | Ped./día | v2.1 en plazo | v3.0 en plazo | v2.1 sin entregar | v3.0 sin entregar | v2.1 costo | v3.0 costo |
|---|---|---|---|---|---|---|---|---|---|
| 2026-01 | 31 | 641 | 21 | 99,84 % | 99,84 % | 0 | 0 | 8 278 | **8 067** |
| 2026-02 | 28 | 953 | 34 | 99,90 % | 99,90 % | 0 | 0 | **11 766** | 11 936 |
| 2026-03 | 31 | 1 544 | 50 | 99,81 % | 99,81 % | 0 | 0 | 19 561 | **18 353** |
| 2026-04 | 30 | 2 033 | 68 | 99,95 % | 99,95 % | 0 | 0 | 27 695 | **26 142** |
| 2026-05 | 31 | 2 724 | 88 | 99,67 % | 99,67 % | 0 | 0 | 37 488 | **35 796** |
| 2026-06 | 30 | 3 212 | 107 | 99,66 % | 99,66 % | 0 | 0 | 49 272 | **46 579** |
| 2026-07 | 31 | 4 103 | 132 | 99,73 % | 99,71 % | 0 | 0 | 65 999 | **65 609** |
| 2026-08 | 31 | 4 800 | 155 | 99,67 % | 99,67 % | 0 | 0 | 81 732 | **76 263** |
| 2026-09 | 28 | 4 936 | 176 | 99,80 % | 99,80 % | 0 | 0 | 84 200 | **78 934** |
| 2026-10 | 26 | 4 992 | 192 | 99,72 % | 99,70 % | 0 | 0 | 88 073 | **82 705** |
| 2026-11 | 22 | 4 893 | 222 | 99,69 % | 99,69 % | 0 | 0 | 86 949 | **84 107** |
| 2026-12 | 21 | 4 955 | 236 | 99,48 % | **99,52 %** | 0 | 0 | 90 355 | **85 822** |
| 2027-01 | 19 | 4 955 | 261 | 99,31 % | **99,39 %** | 0 | 0 | 92 077 | **86 131** |
| 2027-02 | 17 | 4 754 | 280 | 98,97 % | **99,18 %** | 0 | 0 | 89 467 | **84 885** |
| 2027-03 | 16 | 4 888 | 306 | 98,36 % | **99,16 %** | 0 | 0 | 88 861 | **82 651** |
| 2027-04 | 15 | 4 953 | 330 | 96,12 % | **98,34 %** | 0 | 0 | 87 145 | **81 819** |
| 2027-05 | 13 | 4 777 | 367 | 68,75 % | **96,92 %** | 144 | **0** | 91 571 | **71 774** |
| 2027-06 | 12 | 4 833 | 403 | 23,71 % | **95,51 %** | 968 | **0** | 96 710 | **66 701** |
| 2027-07 | 11 | 4 738 | 431 | 17,94 % | **92,21 %** | 1 229 | 108 | 91 166 | **59 986** |
| 2027-08 | 11 | 4 929 | 448 | 13,17 % | **88,74 %** | 1 433 | 212 | 92 798 | **59 271** |
| 2027-09 | 10 | 4 643 | 464 | 18,57 % | **86,95 %** | 1 375 | 262 | 82 408 | **54 120** |
| 2027-10 | 9 | 4 445 | 494 | 21,24 % | **84,93 %** | 1 408 | 410 | 72 962 | **49 199** |
| 2027-11 | 9 | 4 837 | 537 | 16,54 % | **79,33 %** | 1 868 | 740 | 74 825 | **46 975** |
| 2027-12 | 9 | 4 858 | 540 | 8,44 % | **78,88 %** | 2 000 | 721 | 78 407 | **46 968** |
| 2028-01 | 8 | 4 602 | 575 | 6,91 % | **76,66 %** | 2 002 | 821 | 70 498 | **42 428** |
| 2028-03 | 8 | 4 701 | 588 | 8,98 % | **74,49 %** | 2 052 | 897 | 70 145 | **42 547** |
| 2028-02 | 7 | 4 385 | 626 | 9,76 % | **72,50 %** | 2 067 | 1 001 | 62 370 | **36 416** |
| 2028-04 | 7 | 4 814 | 688 | 5,34 % | **65,62 %** | 2 501 | 1 328 | 63 034 | **36 208** |
| 2028-05 | 7 | 4 911 | 702 | 5,21 % | **65,61 %** | 2 604 | 1 445 | 62 768 | **35 391** |
| 2028-07 | 6 | 4 492 | 749 | 5,05 % | **64,14 %** | 2 475 | 1 443 | 56 279 | **30 845** |
| 2028-08 | 6 | 4 669 | 778 | 4,67 % | **60,25 %** | 2 653 | 1 555 | 55 964 | **30 779** |
| 2028-06 | 6 | 4 780 | 797 | 6,44 % | **59,90 %** | 2 737 | 1 702 | 54 591 | **30 851** |
| 2028-09 | 6 | 4 917 | 820 | 4,49 % | **58,69 %** | 2 892 | 1 818 | 55 062 | **30 707** |
| 2028-10 | 5 | 4 115 | 823 | 5,27 % | **59,05 %** | 2 379 | 1 437 | 48 101 | **26 246** |
| 2028-11 | 5 | 4 517 | 903 | 4,49 % | **56,05 %** | 2 775 | 1 817 | 47 961 | **25 437** |
| 2028-12 | 5 | 4 769 | 954 | 3,75 % | **51,86 %** | 3 033 | 2 046 | 47 886 | **25 860** |

*(Ordenada por demanda diaria, no cronológicamente: 2028-03 y 2028-06 tienen menos
pedidos/día que el mes que les precede en el calendario.)*

Hasta unos 330 pedidos/día las dos versiones cumplen y la diferencia es de costo
(−5 % en promedio a favor de la v3.0). A partir de ahí la v2.1 **se desploma**: pierde
30 puntos en mayo de 2027 y 75 en junio, y deja casi mil pedidos sin entregar. Nunca
se recupera: **en los 18 meses por encima de 430 pedidos/día se queda entre el 3,75 % y
el 21,24 %**, mientras la v3.0 va del 92,21 % al 51,86 %.

La diferencia es de 40 a 74 puntos porcentuales en cada uno de esos meses, y la v3.0
además opera entre un 34 % y un 46 % más barato — porque entregar en rutas de una sola
parada es, además de ineficaz, caro.

### Por qué se desploma la v2.1

La métrica que lo explica es **paradas por ruta**:

| Mes | Ped./día | paradas/ruta v2.1 | paradas/ruta v3.0 | uso de flota v2.1 | uso de flota v3.0 |
|---|---|---|---|---|---|
| 2026-01 | 21 | 1,29 | 1,28 | 6,9 % | 6,8 % |
| 2026-06 | 107 | 1,50 | 1,49 | 33,0 % | 32,2 % |
| 2027-01 | 261 | 1,90 | 1,87 | 68,6 % | 65,9 % |
| 2027-05 | 367 | 1,64 | **2,17** | 89,4 % | **83,3 %** |
| 2027-06 | 403 | **1,19** | **2,27** | 89,3 % | 88,8 % |

Cuando la cola se desborda, las rutas de la v2.1 **se fragmentan** en lugar de
agruparse: caen de 1,90 a 1,19 paradas justo cuando más falta hace consolidar. Con la
flota igual de ocupada (89 %), mueve la mitad de paquetes por ruta. La v3.0 sube a
2,27 paradas y entrega lo mismo usando **menos** flota.

Son tres defectos que se refuerzan entre sí, todos heredados de un diseño pensado para
operar con holgura:

1. **El filtro de plazo en la construcción.** Un candidato solo se acepta si llega
   45 minutos antes de su plazo. Cuando todo va tarde, ningún candidato pasa el filtro
   y cada ruta queda con una sola parada.
2. **El rescate individual (M9).** Cada pedido sin salida a tiempo se despachaba en una
   unidad propia. Con cientos de pedidos vencidos, eso consume la flota entera en
   entregas de un solo paquete.
3. **La penalización cuadrática por incumplimiento.** Cobra 25·β a una ruta de cinco
   paradas tarde y 5·β a cinco rutas de una parada: empuja a fragmentar exactamente
   cuando hay que agrupar.

---

## 4. Las mejoras

La v2.1 ya traía M1–M10 (siembra por urgencia, feromona zonal, MAX-MIN, holgura de
seguridad, primer tramo con tiempo real, pulido final, reserva de flota, rescate de
pedidos sin salida y espera útil). La v3.0 agrega:

### Mejoras de calidad (M11–M18)

| | Mejora | Qué hace |
|---|---|---|
| **M11** | Búsqueda local entre rutas | Reubicación e intercambio de paradas *entre* rutas. En la v2.1 una parada mal asignada solo podía reordenarse dentro de su ruta; nunca podía pasar a la unidad correcta. |
| **M12** | Listas de candidatos precalculadas | El orden por distancia entre pendientes se calcula una vez por ciclo, no en cada paso de cada hormiga. |
| **M13** | Colonia paralela | Hormigas en paralelo, con semilla determinista por (corrida, ciclo, iteración, hormiga): el resultado no depende del número de hilos. |
| **M14** | Comparación lexicográfica | Ordena por incumplimientos, luego atraso, luego costo, en vez de una suma con peso 5 000. |
| **M15** | Regla q0 y evaporación local (ACS) | Con probabilidad 0,35 la hormiga explota el mejor arco; la evaporación local se aplica al cerrar la iteración, en orden de hormiga, para no depender del entrelazado de hilos. |
| **M16** | Suavizado por convergencia | Suaviza los rastros cuando el factor de convergencia MAX-MIN supera 0,92. |
| **M17** | Hormiga codiciosa | La primera hormiga de cada iteración es determinista: la colonia nunca queda por debajo de la solución codiciosa. |
| **M18** | Reserva de flota dinámica | Ajusta la reserva por almacén según la demanda reciente. **Apagada por omisión.** |

### Mejoras de régimen (M19–M21)

El planificador detecta cuándo la cola pendiente supera lo que la flota libre puede
absorber (más de 4 paradas por unidad libre) y **cambia de objetivo**.

| | Mejora | Qué hace |
|---|---|---|
| **M19** | Modo saturación | Acepta paradas fuera de plazo en la construcción, pasa a penalización **lineal** por incumplimiento, suspende el rescate individual y acota el pulido final a la única restricción dura: volver a un almacén antes del cambio de turno. |
| **M20** | Siembra por rendimiento | En saturación prioriza capacidad × velocidad en vez de costo por km. |
| **M21** | Prioridad al recuperable | EDF minimiza el retraso *máximo*, no el *número* de incumplimientos. Se atiende primero a los pedidos que alguna unidad libre todavía puede entregar a tiempo; los ya perdidos van detrás. Es la idea de Moore–Hodgson aplicada al ruteo. |

---

## 5. Ablaciones

Cada fila apaga una sola mejora. Todas las filas de una tabla vienen del mismo lote.

### Régimen de saturación — junio 2027 (403 pedidos/día)

| Configuración | En plazo | Tardíos | Sin entregar | Paradas/ruta | Costo |
|---|---|---|---|---|---|
| **v3.0 completa** | **95,51 %** | 217 | 0 | 2,27 | 66 701 |
| sin M19 | 29,30 % | 2 546 | 871 | **1,24** | 95 129 |
| sin M21 | 80,74 % | 931 | 0 | 2,30 | 65 575 |
| sin M20 | 95,14 % | 235 | 0 | 2,28 | 67 828 |

- **M19 es lo que evita el colapso**: sin él las rutas caen a 1,24 paradas y el
  cumplimiento se hunde 66 puntos. Es el arreglo estructural.
- **M21 aporta 14,8 puntos** sobre M19. Atender primero al recuperable es lo que
  convierte "no colapsar" en "cumplir".
- **M20 aporta 0,4 puntos** y −1,7 % de costo. Marginal: mi hipótesis inicial de que el
  cuello era la capacidad en paquetes resultó falsa, y esta mejora la refleja.

### Calidad de solución — junio 2026 (107 pedidos/día)

| Configuración | Tardíos | km | Costo | Δ costo | t/plan medio | Corrida |
|---|---|---|---|---|---|---|
| **v3.0 completa** | 11 | 111 552 | **46 579** | — | 11 ms | 15,1 s |
| sin M11 | 11 | 115 170 | 48 347 | **+3,8 %** | 11 ms | 14,4 s |
| sin M17 | 11 | 111 568 | 47 151 | **+1,2 %** | 11 ms | 15,1 s |
| colonia de la v2.1 (15 × 25) | 11 | 111 726 | 46 964 | **+0,8 %** | 9 ms | 11,9 s |
| sin M15 | 11 | 111 608 | 46 870 | **+0,6 %** | 11 ms | 15,1 s |
| sin M12 | 11 | 111 552 | 46 579 | 0 % | 12 ms | 16,1 s |
| sin M13 | 11 | 111 552 | 46 579 | 0 % | **21 ms** | **27,5 s** |
| sin M14 | 11 | 111 552 | 46 579 | 0 % | 12 ms | 15,7 s |
| sin M16 | 11 | 111 552 | 46 579 | 0 % | 12 ms | 15,4 s |

Lectura honesta:

- **M11 es la mejora que paga**: de los 2 693 puntos de costo que la v3.0 ahorra en
  junio, 1 768 (dos tercios) vienen solo de M11. Es el único operador que corrige una
  asignación de parada equivocada, que es justo lo que la v2.1 no podía deshacer.
- **M13 casi duplica la velocidad** (21 → 11 ms por plan) sin tocar el resultado: los
  46 579 idénticos confirman que la reproducibilidad por semilla se mantiene al
  paralelizar.
- **M12, M14 y M16 no cambiaron el resultado** en ningún mes de 2026. M12 da el mismo
  conjunto de candidatos por construcción (su valor es de costo computacional, y a esta
  escala de cola no llega a notarse); M14 solo desempata cuando dos soluciones difieren
  en incumplimientos, algo que con holgura casi no ocurre; y el disparador de M16 nunca
  se activa porque el reinicio por estancamiento de la v2.1 actúa antes. Se quedan como
  red de seguridad, no como fuente de la mejora medida.
- **M18 quedó apagada.** En su primera forma ahorraba kilómetros en junio pero costaba
  una entrega evitable en abril; forzada a no bajar del mínimo, el reposicionamiento en
  vacío se disparó (junio: 18 378 km en vacío frente a 9 918). La reserva fija de la
  v2.1 resultó mejor que cualquier variante dinámica probada.

---

## 6. Hasta dónde llega la flota

Con 37 unidades y pedido medio de 5,50 paquetes:

- Hasta **~330 pedidos/día** ambas versiones cumplen por encima del 96 %.
- Entre **330 y 400/día** la v2.1 colapsa y la v3.0 se sostiene sobre el 95 %.
- A **403 pedidos/día** la v3.0 va al 95,5 % con el 88,8 % de uso de flota y 2,27
  paradas por ruta, contra un techo de ~2,93 que impone la capacidad en paquetes.
  Queda poco margen algorítmico.
- Por encima de **~450 pedidos/día** la v3.0 empieza a dejar pedidos sin entregar
  dentro del horizonte: 108 en 2027-07, 721 en 2027-12, 2 046 en 2028-12. Eso ya no es
  una decisión del planificador sino trabajo que no cabe en la flota.

Esa es la conclusión operativa del estudio: **el planificador deja de ser el cuello de
botella alrededor de los 400–450 pedidos diarios**. Antes de ese punto, cambiar de
algoritmo cambia el resultado; después, lo que decide es el tamaño de la flota. La v3.0
sigue siendo muy superior a la v2.1 en todo el rango saturado —entrega entre 40 y 74
puntos más y cuesta un tercio menos— pero lo que entrega de más ahí viene de exprimir
una flota insuficiente, no de resolver el problema.

---

## 7. Reproducir

```powershell
powershell -ExecutionPolicy Bypass -File scripts\compilar.ps1

# inventario de los archivos de entrada
powershell -ExecutionPolicy Bypass -File scripts\ejecutar.ps1 datos

# barrido completo de los 36 meses
powershell -ExecutionPolicy Bypass -File scripts\ejecutar.ps1 comparar --algoritmos v21,v30

# cota de factibilidad
powershell -ExecutionPolicy Bypass -File scripts\ejecutar.ps1 factibilidad --mes 202601,202602,202603,202604,202605,202606

# ablaciones
foreach ($m in "M11","M12","M13","M14","M15","M16","M17","COLONIA") {
    powershell -ExecutionPolicy Bypass -File scripts\ejecutar.ps1 simular --mes 202606 --algoritmo v30 --sin $m
}
foreach ($m in "M19","M20","M21") {
    powershell -ExecutionPolicy Bypass -File scripts\ejecutar.ps1 simular --mes 202706 --algoritmo v30 --sin $m
}
```

## 8. Limitaciones

- **28 de los 36 meses tienen la demanda cortada** a 5 000 registros. Los meses
  tardíos son los primeros días de ese mes, no el mes completo. La rampa de demanda es
  real, pero no hay forma de medir un mes denso completo con estos archivos.
- **El plan de mantenimiento solo cubre set–oct 2026** y se proyecta al resto por día
  del mes. Es un supuesto del banco de pruebas, no un dato del cliente.
- **El puerto Java de la v2.1 no es bit a bit idéntico al prototipo Python** (~2,5 % de
  diferencia en costo, cumplimiento idéntico). Todas las comparaciones de este
  documento son Java contra Java.
- Los tiempos por ciclo dependen de la máquina y de su carga; solo son comparables
  dentro de una misma tabla.
- El umbral de saturación (4 paradas por unidad libre) se fijó por inspección, no por
  búsqueda sistemática. No se exploró su sensibilidad.
