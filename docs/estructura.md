# Estructura del planificador

El repositorio aloja dos algoritmos independientes. Cada uno tiene su propio
árbol de capas y ninguno depende del otro.

## Algoritmo Genético (GA) — `pe.pucp.paqtracker`

Diagrama de dependencias entre capas (una capa solo depende de las que están
por debajo):

```
servicio        → planificador, planificador.comun, repositorio, modelo, util
repositorio     → modelo, util
planificador    → planificador.comun, modelo, util
planificador.comun → modelo, util
util            → modelo
modelo          → (sin dependencias internas)
```

El servicio orquesta; el planificador decide; los bloques comunes son la
maquinaria compartida; el repositorio lee datos; util calcula distancias y
tiempos; el modelo son las entidades. Ninguna capa inferior conoce a una
superior.

## Algoritmo IACO — `pe.pucp.paqtracker.iaco`

```
app             → servicio, datos, modelo
datos           → modelo
servicio        → modelo
modelo          → (sin dependencias internas)
```

`app` es el banco de pruebas por línea de comandos; `datos` localiza y lee los
archivos de entrada; `servicio` contiene la colonia de hormigas
(`PlanificadorIACO`, `MemoriaFeromonas`, `BusquedaLocal`, `EvaluadorRuta`), el
simulador y las métricas; `modelo` son las entidades.

## Frontera entre ambos

```
pe.pucp.paqtracker        ✗→  pe.pucp.paqtracker.iaco
pe.pucp.paqtracker.iaco   ✗→  pe.pucp.paqtracker
```

No hay ni debe haber imports cruzados. Los dos algoritmos definen clases
homónimas con contratos incompatibles (`Ruta`, `Almacen`, `Pedido`,
`ConfiguracionDominio`), de modo que un import cruzado sería un error de
compilación o, peor, una confusión silenciosa de tipos.

Lo único que comparten es el dataset de `datos/` y los scripts de `scripts/`.

La versión del IACO que se compara con el GA en igualdad de condiciones no está
en `iaco`: es `planificador.PlanificadorIACO` (con `OperadoresColonia` y
`MemoriaFeromonas`), que vive en el árbol del GA y respeta sus capas. Ver
[`comparacion_ga_iaco.md`](comparacion_ga_iaco.md).

## Regla al añadir código

- Código del GA: bajo `pe.pucp.paqtracker`, fuera de `iaco`.
- Código del IACO: bajo `pe.pucp.paqtracker.iaco`.
- Nada que importe de un lado al otro.
