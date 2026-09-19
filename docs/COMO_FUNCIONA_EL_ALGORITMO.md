# Cómo funciona el algoritmo de PaqTracker

Explicación en palabras simples de todo lo que hace el planificador hoy, con ejemplos
concretos y el porqué de cada decisión.

---

## 1. El problema en una frase

Llegan pedidos a lo largo del día. Tienes 37 vehículos y 3 almacenes. Cada pedido tiene
una dirección, una cantidad y un plazo máximo de entrega. **Hay que decidir qué vehículo
lleva qué pedidos, en qué orden, y a qué hora sale cada uno.**

### Lo que se quiere lograr (y lo que NO)

El objetivo del negocio **no es ahorrar kilómetros**. Es **retrasar el colapso logístico**:
el momento en que se incumple el primer plazo de entrega.

Esto es importante porque cambia todas las decisiones. Un algoritmo que minimiza distancia
haría cosas como "junto estos 5 pedidos en un solo camión porque me ahorro 40 km" — aunque
eso signifique que el último pedido llegue 2 horas tarde. Nuestro algoritmo hace lo
contrario: **prefiere gastar kilómetros de más con tal de cumplir plazos.**

---

## 2. Los datos con los que trabaja

| Elemento | Detalle |
|---|---|
| **Ciudad** | Una cuadrícula de 70 × 50. Los vehículos se mueven como en un tablero: solo horizontal y vertical, nunca en diagonal. |
| **Almacenes** | 3. El central en (27,14) tiene stock ilimitado. Dos intermedios en (12,38) y (57,27) con 1000 unidades cada uno: el stock se descuenta al despachar desde ellos y se recarga a 1000 cada día a las 23:59:59. |
| **Flota** | 37 vehículos: 10 autos (capacidad 24, 40 km/h, 1,20 por km), 15 motos (capacidad 8, 25 km/h, 0,60 por km), 12 bicicletas (capacidad 4, 12 km/h, 0,15 por km). Valores en `ConfiguracionDominio`. |
| **Bloqueos** | Calles cerradas con hora de inicio y fin. Se conocen de antemano. |
| **Tiempo de servicio** | 60 minutos en cada entrega, para acondicionar el producto. Es un dato del negocio, no se puede tocar. |

### Ejemplo de un pedido real

```
01d08h52m:61,21,c8771,09,04
```

Esto se lee así:

- `01d08h52m` → llega el **día 1 a las 08:52** (que en minutos desde el inicio del mes es el **minuto 532**)
- `61,21` → hay que entregarlo en la **coordenada (61, 21)**
- `c8771` → código del cliente
- `09` → son **9 unidades** de producto
- `04` → el plazo es de **4 horas**

Entonces: este pedido **debe estar entregado antes del minuto 772** (532 + 4×60).

> ⚠️ **Detalle crítico:** el archivo trae el plazo en **horas**, pero todo el sistema por
> dentro trabaja en **minutos**. Si se olvida multiplicar por 60, el pedido pasa a tener
> 4 minutos de plazo en vez de 4 horas y es imposible cumplirlo. Este fue uno de los bugs
> que encontramos.

---

## 3. La idea central: el reloj que avanza de 30 en 30

El algoritmo **no planifica todo el mes de una vez**. Simula la operación real: hay un reloj
que avanza en saltos de **30 minutos** (el parámetro `Sa`). En cada salto se hace una ronda
completa de decisiones.

```
minuto 0 → 30 → 60 → 90 → 120 → ... → fin del horizonte
           │
           └── en cada parada se ejecuta la ronda completa
```

### ¿Por qué 30 minutos y no otro número?

| Valor | Qué pasa |
|---|---|
| **60 min** | Un pedido que llega justo después de una ronda espera **1 hora entera** antes de que el sistema se entere. Para un pedido con plazo de 4 horas, es perder el 25% de su ventana esperando. Algunos llegan tarde. |
| **30 min** ✅ | Espera máxima de 30 min. Suficiente para reaccionar rápido sin recalcular de más. |
| **15 min** | Se triplican los recálculos. Pero en la mayoría de esas rondas extra **no llegó ningún pedido nuevo**, así que se recalcula lo mismo. Gasto de cómputo sin ganancia. |

### Qué pasa en cada ronda (los 6 pasos)

```
PASO 1 → Vuelven los vehículos que ya terminaron su ruta
PASO 2 → Entran a la cola los pedidos que se registraron desde la ronda anterior
PASO 3 → Salida inmediata de los pedidos urgentes (plazo ≤ 8h)
PASO 4 → Se ordena la cola por urgencia (el que vence primero, primero)
PASO 5 → El algoritmo genético arma el plan para el resto
PASO 6 → Cada vehículo con ruta asignada SALE DE INMEDIATO
```

Un punto que suele confundir: **los vehículos no esperan**. Si en el paso 5 el algoritmo le
asigna una ruta a un vehículo, ese vehículo arranca en ese mismo minuto. No hay una cola de
camiones esperando su turno. Lo que sí puede pasar es que el algoritmo **decida no asignarle
ruta a un pedido en esta ronda** y lo deje para la siguiente.

---

## 4. Paso 3: el carril rápido para pedidos urgentes

Los pedidos con **plazo de 8 horas o menos** no pasan por el algoritmo genético. Se les
asigna vehículo directamente y salen.

### ¿Por qué existe este carril?

Porque descubrimos un problema grave. El algoritmo genético compara opciones por "costo", y
para un pedido apretado le salía **más barato dejarlo en la cola que despacharlo**. Con
números reales del pedido del ejemplo:

| Opción | Costo que calculaba el algoritmo |
|---|---|
| Despacharlo ahora (llegaría justo, con poco margen) | ~33 600 |
| Dejarlo esperando en la cola | ~465 |

Resultado: **el pedido se quedaba en la cola para siempre.** Lo probamos con un solo pedido
en todo el sistema y 37 vehículos libres — igual nunca salía. El reporte decía
"Pico de unidades en uso: **0 de 37**".

Un pedido con 36 horas de plazo puede darse el lujo de que el algoritmo lo piense un par de
rondas. Uno de 4 horas, no: cada ronda de indecisión son 30 minutos de su ventana. Por eso
se los saca de esa negociación.

### Cómo se elige el vehículo (dos criterios, en este orden)

**Primero un filtro duro** — el vehículo queda descartado si:
- está ocupado,
- su capacidad es menor que la cantidad del pedido,
- el almacén donde está no tiene stock suficiente.

**Después se calcula cuándo llegaría cada candidato:**

```
hora de llegada = minuto actual + (distancia real ÷ velocidad de ese tipo de vehículo)
```

**Y se elige con esta prioridad:**

1. **¿Llega dentro del plazo?** Un vehículo que llega a tiempo siempre le gana a uno que no.
2. Entre los que **sí llegan a tiempo** → el de **menor capacidad** (para no gastar un auto
   de 24 en llevar 2 paquetes, y dejarlo libre para pedidos grandes).
3. Si **ninguno llega a tiempo** → el que llegue **lo antes posible** (minimizar el retraso).

### Ejemplo de por qué el orden de criterios importa

Un pedido de **2 unidades** para la coordenada (67, 48), que está a 74 km del almacén central.

| Vehículo | ¿Le cabe? | Tiempo de viaje | ¿Llega a tiempo? |
|---|---|---|---|
| Bicicleta (cap. 4, 12 km/h) | Sí | 74 ÷ 12 = **370 min** | ❌ No (el plazo daba 239 min) |
| Moto (cap. 8, 25 km/h) | Sí | 74 ÷ 25 = **178 min** | ✅ Sí, con 61 min de sobra |

Si se eligiera solo por "el más chico que le quepa", ganaría la bicicleta — y llegaría
**131 minutos tarde**. Este era exactamente el bug que teníamos: de 83 incumplimientos en un
mes de prueba, **78 eran bicicletas**. Al corregir el criterio, las bicicletas pasaron a
causar **cero** incumplimientos.

---

## 5. Paso 5: el algoritmo genético

Para todo lo que no es urgente, entra el algoritmo genético. La idea es imitar la evolución
natural: se crean muchas soluciones posibles, se quedan las mejores, se cruzan entre sí, y
después de varias generaciones sobrevive la mejor.

### 5.1 Antes de empezar: partir los pedidos grandes

El **Fragmentador** revisa si algún pedido es más grande que el vehículo más grande
(capacidad 24). Si un pedido pide 30 unidades, se parte en dos entregas: una de 24 y otra
de 6. Si cabe en un solo vehículo, se deja entero.

### 5.2 La población inicial: 50 soluciones, mezcladas a propósito

Se generan 50 soluciones distintas, pero **no todas de la misma forma**:

| Tipo | Cantidad | Cómo se arma | Para qué sirve |
|---|---|---|---|
| **Golosas** | 30 (60%) | Agrupa pedidos cercanos entre sí y los asigna al almacén más próximo que tenga un vehículo con capacidad suficiente | **Calidad.** Arrancan ya siendo buenas soluciones |
| **Aleatorias** | 20 (40%) | Reparte pedidos al azar entre vehículos, respetando capacidad y stock | **Diversidad.** Aportan ideas distintas |

**¿Por qué no hacerlas todas golosas, si son mejores?** Porque salen todas casi iguales. Si
las 50 soluciones son casi idénticas, cruzarlas entre sí no produce nada nuevo — es como
cruzar un individuo consigo mismo. La población se vuelve un montón de clones y el algoritmo
se estanca a las pocas generaciones. Las aleatorias son las que mantienen vivo el proceso.

### 5.3 Las cuatro reparaciones obligatorias

Toda solución pasa por el **Reparador** antes de ser evaluada. Arregla cuatro cosas:

| Fase | Qué arregla | Cómo |
|---|---|---|
| **1. Capacidad** | Un vehículo con más carga de la que aguanta | Le saca la entrega más lejana y la reubica en otra ruta. Si no cabe en ninguna, va a la cola de espera |
| **2. Stock** | Un almacén del que se sacó más mercadería de la que tenía | Igual: quita entregas hasta que la carga quepa en el stock |
| **3. Almacén de retorno** | Una ruta que termina en un almacén sin stock | Lo cambia al almacén válido más cercano (el central siempre sirve, es ilimitado) |
| **4. Orden por plazo** | Una ruta donde el orden de visitas causa retrasos | Reordena por hora límite. **Pero solo si había incumplimientos**, y si el reordenamiento empeora, lo deshace |

**Detalle técnico que importa:** las tres primeras fases usan un bucle `mientras`, no un `si`.
Es decir, repiten la corrección hasta que el problema desaparece, no una sola vez. Por eso
después de reparar **nunca quedan violaciones** — se verificó sobre 1000 soluciones y
salieron 0.

**¿Por qué la fase 4 es condicional?** Porque reordenar por plazo ignora la geografía. Si la
ruta ya cumple todos los plazos, reordenarla solo agrega kilómetros sin ganar nada.

### 5.4 La búsqueda local: puliendo cada solución

Después de reparar, cada solución se pule con dos técnicas. Esto es lo que hace que el
algoritmo sea **"memético"** y no un genético común.

**2-opt (dentro de una misma ruta):** si una ruta se cruza a sí misma, invierte un tramo
para destrenzarla.

```
Antes:  Almacén → A → C → B → D     (la ruta hace un zigzag)
Después: Almacén → A → B → C → D    (más corta)
```

**Or-opt (entre rutas distintas):** mueve una o dos entregas de una ruta a otra si eso
reduce la distancia total de ambas.

#### La regla especial del Or-opt (y por qué existe)

El Or-opt tiene una restricción que **no viene de los libros, viene del negocio**: solo
puede mover carga hacia un vehículo de **capacidad igual o menor**.

Sin esa regla, pasa siempre lo mismo: como juntar todo en un vehículo casi siempre acorta la
distancia total, el algoritmo termina **vaciando las bicicletas y las motos dentro de los
autos**. El plan resultante es perfecto en kilómetros para ese día... y deja al negocio con
los 10 autos ocupados llevando paquetitos.

Los autos son el **recurso escaso**: son los únicos que pueden con pedidos de más de 8
unidades. Gastarlos en consolidar cosas que una bicicleta podía llevar deja al sistema sin
capacidad de reacción cuando llegue un pedido grande. La regla sacrifica algo de distancia
para **preservar la flota**.

**Cuánto mejora la búsqueda local:** reduce la distancia un **29% en promedio** (entre 26% y
33% según el día) comparado con no usarla.

### 5.5 El bucle de generaciones

Ahora sí, el ciclo evolutivo. Se repite **70 veces**:

```
1. Ordenar las 50 soluciones de mejor a peor

2. ELITISMO: las 3 mejores (5%) pasan intactas a la siguiente generación
   → garantiza que nunca se pierda lo bueno que ya se encontró

3. Para llenar las 47 restantes:

   a. TORNEO: se eligen 5 soluciones al azar y gana la mejor de esas 5
      → se repite para conseguir dos "padres"

   b. CRUCE (80% de probabilidad): el hijo hereda una ruta completa de un
      padre y el resto del otro. Los pedidos que quedaron duplicados o
      sueltos se reinsertan por urgencia

   c. MUTACIÓN (10% de probabilidad): un cambio pequeño al azar, una de tres:
      • Intercambiar dos entregas dentro de una ruta
      • Rescatar un pedido de la cola de espera y meterlo en una ruta
      • Cambiar el almacén al que vuelve una ruta

   d. Reparar → pulir → reparar de nuevo → evaluar

4. Si la mejor de esta generación supera al mejor histórico, se guarda
```

**Por qué el torneo de 5:** si siempre ganara el mejor absoluto, todos los hijos vendrían del
mismo padre y se perdería diversidad. Con torneos de 5, una solución mediocre a veces gana
(si le tocan 4 rivales peores) y aporta sus genes. Es presión selectiva, pero no dictadura.

**Por qué se repara dos veces:** porque la búsqueda local puede romper cosas. Al mover una
entrega de una ruta a otra con Or-opt, la ruta destino puede quedar sobrecargada.

**La mutación "rescatar de espera" es clave:** sin ella, un pedido que quedó fuera en la
construcción inicial no tendría forma de volver a entrar. La cola de espera sería una
condena, no una situación temporal.

---

## 6. Cómo se mide si una solución es buena

Acá está el corazón del asunto. Cada solución recibe un **puntaje** (fitness). **Mientras más
bajo, mejor.** El puntaje suma cuatro cosas:

```
puntaje =  distancia total
        +  5000 × (incumplimientos)²
        +    50 × (suma de urgencia de los pedidos en espera)
        +    20 × (suma de lo que falta para tener margen seguro)²
```

### Criterio 1: la distancia (peso 1)

La suma de todos los kilómetros recorridos, incluyendo el regreso al almacén.

Es el único término **sin peso multiplicador**. Funciona como la **unidad de medida** contra
la cual se calibran los demás. Una solución típica anda por las **600 unidades** de distancia.

### Criterio 2: incumplimientos (peso 5000, al cuadrado)

Cada entrega que llega después de su hora límite.

**¿Por qué 5000?** Porque la distancia típica es ~600. El ratio es de **8,4 veces**. Eso
garantiza que **no existe ningún ahorro de ruta que compense un incumplimiento**. Es la
traducción matemática de "el objetivo es cumplir plazos, no ahorrar kilómetros".

**¿Por qué al cuadrado y no simple?**

| Incumplimientos | Si fuera lineal (5000 × n) | Como es ahora (5000 × n²) |
|---|---|---|
| 1 | 5 000 | 5 000 |
| 2 | 10 000 | 20 000 |
| 3 | 15 000 | 45 000 |
| 5 | 25 000 | 125 000 |

Con castigo lineal, pasar de 2 a 3 incumplimientos cuesta lo mismo que pasar de 0 a 1: una
vez que ya fallaste, da igual fallar más. Con castigo cuadrático, **el daño se encarece cada
vez más**. Esto obliga al algoritmo a **repartir la presión**: prefiere que 10 rutas queden
justas a que una sola ruta acumule 5 entregas tarde.

### Criterio 3: pedidos en espera (peso 50, ponderado por urgencia)

Los pedidos que quedaron sin asignar a ninguna ruta.

**Lo importante:** un pedido en espera **no se pierde**. La cola de espera es parte de la
solución, está penalizada, y hay tres formas de salir de ahí: la presión del puntaje, la
mutación de rescate, y sobre todo que **vuelve a entrar en la planificación de la siguiente
ronda de 30 minutos**.

**La ponderación por urgencia** es lo que arreglamos: antes se calculaba con el plazo
original del pedido (un número fijo). Ahora se calcula con **el tiempo que le queda hasta
vencer**. La diferencia:

| | Antes | Ahora |
|---|---|---|
| Un pedido esperando en la cola | Cuesta siempre lo mismo, ronda tras ronda | **Cuesta más cada ronda**, porque le queda menos tiempo |
| Consecuencia | Nunca aumentaba la presión → se quedaba ahí para siempre | La presión crece hasta que sale sí o sí |

### Criterio 4: margen de seguridad (peso 20, umbral 120 min, al cuadrado)

Este es preventivo. Castiga a las entregas que llegan **a tiempo pero con poco margen**
(menos de 2 horas de holgura).

```
Si llega con 115 min de margen → falta 5  → castigo:    5² = 25
Si llega con 20 min de margen  → falta 100 → castigo: 100² = 10 000
```

**¿Por qué castigar algo que llega a tiempo?** Porque el plan es una predicción, no una
certeza. Si un plan llega justo al límite, cualquier imprevisto —un bloqueo nuevo, un
vehículo que se demoró— lo convierte en incumplimiento. El margen es el colchón.

Al ser cuadrático, **no castiga parejo**: llegar con 115 minutos es casi gratis, llegar con
20 minutos es carísimo. Concentra la presión solo en los casos verdaderamente riesgosos.

### Lo que NO está en el puntaje (y por qué)

Esta es una decisión de diseño que suele generar preguntas. **La capacidad y el stock no se
penalizan en el puntaje.** La razón no es que sean menos importantes, sino que son de
naturaleza distinta:

| Restricción | ¿Siempre se puede arreglar? | Tratamiento |
|---|---|---|
| Capacidad del vehículo | **Sí**, siempre. Saco una entrega y la pongo en otro lado (o en espera) | Reparador |
| Stock del almacén | **Sí**, siempre. Igual | Reparador |
| Almacén de retorno | **Sí**, siempre. El central es ilimitado, siempre sirve | Reparador |
| **Plazo de entrega** | **NO.** Si la flota no alcanza, no hay forma de reacomodar que lo arregle | **Puntaje** |

Poner la capacidad en el puntaje sería desperdiciar el algoritmo: gastaría generaciones
aprendiendo a evitar algo que el Reparador arregla al instante. Cuando el evaluador recibe
una solución, esa solución **ya es factible**; lo único que queda por medir es qué tan buena
es en tiempo y costo.

---

## 7. Cómo se calculan las distancias y los tiempos

Todo el sistema usa **un solo método** para esto, para que el puntaje, el reparador, la
búsqueda local y el despacho real coincidan.

### La distancia: no siempre es la línea recta

```
Si NO hay bloqueos que corten el camino → distancia Manhattan (|Δx| + |Δy|)
Si SÍ hay bloqueos en el medio         → BFS: se busca el camino real más corto
                                          rodeando las calles cerradas
```

**Un caso especial que era un bug:** ¿qué pasa si el bloqueo cubre **la dirección de entrega
misma**? Antes, la búsqueda nunca encontraba el destino (porque era intransitable), agotaba
todas las opciones y devolvía un valor centinela gigante: **536 870 911**. Esa cifra absurda
dominaba el puntaje y volvía incomparables todas las soluciones.

El arreglo: si el destino está bloqueado, el vehículo **se acerca a la esquina transitable
más próxima** y se suma ese último paso. El costo vuelve a ser un número realista.

### El tiempo: velocidad según el tipo de vehículo

```
minutos de viaje = (distancia × 60) ÷ velocidad del tipo de vehículo
```

Un mismo trayecto de 40 km:
- En **auto** (40 km/h) → 60 minutos
- En **moto** (25 km/h) → 96 minutos
- En **bicicleta** (12 km/h) → 200 minutos

### El detalle del plazo: se mide a la llegada, no a la salida

```
Llega al destino  →  ACÁ se compara contra la hora límite
Descarga y acondiciona (60 min)
Sale hacia el siguiente punto
```

Esto significa que una entrega que **llega** dentro del plazo cuenta como cumplida, aunque el
vehículo **parta** de ahí después de que venció. Es lo correcto: al cliente le importa cuándo
recibe, no cuándo se va el repartidor.

---

## 8. Los parámetros y qué pasa si los mueves

| Parámetro | Valor | Qué es | Si lo subes | Si lo bajas |
|---|---|---|---|---|
| `TAMANO_POBLACION` | 50 | Soluciones por generación | Con 100 se triplica el tiempo sin mejorar | Con 30 converge muy rápido y se estanca en días difíciles |
| `MAX_GENERACIONES` | 70 | Ciclos evolutivos | Solo gasta cómputo: la población ya convergió | Por debajo de 46 se corta la búsqueda en los días difíciles |
| `PROBABILIDAD_CRUCE` | 0,80 | Chance de cruzar dos padres | — | Muy bajo = puras copias con mutaciones, deja de ser genético |
| `PROBABILIDAD_MUTACION` | 0,10 | Chance de alterar al hijo | Muy alto = búsqueda casi al azar, se desperdicia el cruce | — |
| `FRACCION_ELITE` | 0,05 | Los mejores que pasan intactos (3) | Muy alto congela la población | Muy bajo puede perder buenas soluciones |
| `FRACCION_GOLOSA` | 0,60 | Cuántas soluciones iniciales son "inteligentes" | 100% goloso = clones, se estanca | 100% aleatorio = se desperdician generaciones |
| `TAMANO_TORNEO` | 5 | Cuántos compiten por ser padre | Muy alto = gana siempre el mejor, se pierde diversidad | Muy bajo = selección casi al azar |
| `Sa` | 30 min | Salto del reloj | 60 min → pedidos de 4h llegan tarde | 15 min → triple de recálculos sin ganancia |

**¿De dónde sale el 70 de las generaciones?** De medir. Se corrió el mes completo (30 días,
611 pedidos) viendo en qué generación deja de mejorar cada día. **El peor día convergía en la
generación 46.** Se fijó 70 para tener un 50% de margen sobre ese peor caso.

---

## 9. Resultados actuales

Con los datos reales del proyecto (641 pedidos, 37 vehículos, 3 almacenes, con bloqueos):

| | 1 día | 7 días | 30 días |
|---|---|---|---|
| Pedidos | 12 | 116 | 611 |
| Entregados | 12 | 116 | 611 |
| **Incumplimientos** | **0** | **0** | **0** |
| **Cumplimiento** | **100%** | **100%** | **100%** |
| **Colapso** | **no hubo** | **no hubo** | **no hubo** |
| Recálculos | 14 | 91 | 439 |
| Pico de vehículos usados | 1 de 37 | 4 de 37 | 4 de 37 |
| Distancia total | 541 | 5 034 | 26 231 |

### Un resultado interesante: la flota se equilibra sola

Uso de vehículos en los 30 días:

| Tipo | Veces despachado |
|---|---|
| Moto | **249** |
| Bicicleta | **184** |
| Auto | **144** |

En la versión anterior del planificador, que resolvía el mes entero de una sola vez, **casi
solo se usaban autos**. Al tener todos los pedidos juntos, se formaban grupos grandes que
solo cabían en vehículos de capacidad 24.

El modelo dinámico lo invierte **sin ninguna regla que lo fuerce**: como planifica cada 30
minutos sobre los pocos pedidos que llegaron hasta ese momento, los grupos que se forman son
naturalmente chicos, y para cada grupo chico se elige el vehículo más chico que sirva. Los
autos quedan libres para cuando de verdad se necesitan.

---

## 10. El límite real del sistema

Esto es importante para no pedirle al algoritmo lo imposible.

**La flota tiene un techo físico de ~363 pedidos por día.** El cálculo:

```
Capacidad total de la flota  = 37 vehículos × 1440 min = 53 280 minutos-vehículo por día

Costo de UNA entrega  = 60 min de acondicionamiento
                      + ~87 min de viaje (43,5 km promedio ÷ ~30 km/h)
                      = ~147 minutos

Techo = 53 280 ÷ 147 ≈ 363 pedidos/día
```

Lo probamos con demanda creciente:

| Pedidos/día | Cumplimiento | ¿Colapsa? |
|---|---|---|
| 115 | 100% | No |
| 289 (80% del techo) | 99,3% | Casi no |
| 466 (128% del techo) | 93,3% | Sí |
| 589 (162% del techo) | 82,7% | Sí |
| 712 (196% del techo) | 65,7% | Sí, feo |

**La conclusión:** por debajo del techo el algoritmo cumple casi todo. Por encima, falla en
proporción al exceso — y **eso no es culpa del algoritmo**. Ningún método de ruteo puede
entregar 712 pedidos al día con una flota que da para 363.

### Si hay que subir el techo, estas son las palancas

1. **Reducir el tiempo de acondicionamiento (60 min).** Es lo que más pesa: con 712 pedidos,
   solo el acondicionamiento consume el **80% de toda la flota**.
2. **Más vehículos.**
3. **Más almacenes intermedios**, para acortar los viajes.
4. **Revisar la composición de la flota.** Con la configuración anterior (auto 20 km/h,
   moto 40, bici 14) el auto era el único con capacidad mayor a 8 y a la vez el más lento,
   así que todo pedido urgente y grande viajaba en el vehículo lento. Desde el 17-09-2026 las
   velocidades vigentes son auto 40, moto 25 y bici 12 km/h (ver `TipoVehiculo`).

> **Nota:** el techo de ~363 pedidos/día y la tabla de demanda creciente se midieron con la
> configuración de velocidades anterior. Hay que volver a medirlos con la vigente.

---

## 11. Resumen de todos los criterios en un solo lugar

**Criterios de evaluación (el puntaje):**
1. Distancia total — peso 1
2. Incumplimientos — peso 5000, al cuadrado
3. Pedidos en espera — peso 50, ponderado por tiempo restante
4. Margen de seguridad bajo 120 min — peso 20, al cuadrado

**Restricciones duras (el Reparador las garantiza siempre):**
5. La carga no puede exceder la capacidad del vehículo
6. No se puede sacar más mercadería de la que tiene el almacén
7. La ruta debe terminar en un almacén con stock
8. Si hay incumplimientos, se reordena por plazo (si eso mejora)

**Criterios de asignación:**
9. Cola ordenada por hora límite (el que vence primero, primero)
10. Pedidos con plazo ≤ 8h salen por el carril rápido
11. En el carril rápido: llegar a tiempo > no desperdiciar capacidad > llegar lo antes posible
12. Al agrupar, se elige el almacén más cercano **que tenga un vehículo con capacidad suficiente**
13. Para cada grupo, el vehículo más chico que le sirva

**Criterios de optimización:**
14. 2-opt: destrenzar rutas que se cruzan a sí mismas
15. Or-opt: mover entregas entre rutas, **solo hacia vehículos de capacidad igual o menor**
16. Elitismo: las 3 mejores nunca se pierden
17. Torneo de 5: presión selectiva sin dictadura
18. Población mixta 60/40: calidad y diversidad a la vez

**Criterios de cálculo:**
19. Distancia Manhattan, o BFS real si hay bloqueos en el camino
20. Si el destino mismo está bloqueado, se llega a la esquina adyacente
21. Velocidad según el tipo de vehículo, no un promedio
22. El plazo se mide a la **llegada**, antes del tiempo de acondicionamiento