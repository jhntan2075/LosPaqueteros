# Estructura del planificador

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
