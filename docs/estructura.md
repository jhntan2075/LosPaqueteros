# Estructura del monorepo

## Módulos y dependencias

```
paqtracker-api              ─┐
                             ├─→ paqtracker-planificador-nucleo
paqtracker-experimentacion  ─┘

paqtracker-web  ──HTTP /api, STOMP /ws──→  paqtracker-api
```

Prohibido: `nucleo → *`, `api → experimentacion`. `paqtracker-experimentacion` no se
despliega.

## Núcleo — `paqtracker-planificador-nucleo` (`pe.pucp.paqtracker`)

Una capa solo depende de las que están por debajo:

```
simulacion          → planificador, planificador.comun, modelo, util
lectura             → modelo, util
planificador        → planificador.comun, modelo, util
planificador.comun  → modelo, util
modelo ↔ util       (mismo módulo: EscenarioOperativo usa Malla y util usa el modelo)
```

`simulacion` orquesta el reloj, el despacho y la recarga; `planificador` decide;
`planificador.comun` es la maquinaria compartida por GA e IACO; `lectura` lee los
archivos de entrada; `util` calcula distancias y tiempos; `modelo` es el contrato
común con la API.

## API — `paqtracker-api` (`pe.pucp.paqtracker`)

```
comun/                  configuracion, excepcion, archivos, salud
modulos/<modulo>/
  presentacion/   →  aplicacion/   →  dominio/   ←  infraestructura/
  (controladores)    (casouso, servicio,  (puertos)    (JPA, adaptadores)
                      dto, mapeador)
```

Módulos: `pedidos`, `planificacion`, `ejecucion`, `difusion`, `configuracion`. Solo
`planificacion` importa `pe.pucp.paqtracker.planificador`; los demás usan `modelo` y
se comunican entre sí únicamente por `CasoUso*` o por el servicio fachada del módulo.

## Experimentación — `paqtracker-experimentacion`

```
experimentacion   → simulacion, lectura, planificador, modelo, util (del núcleo)
bancopruebasiaco  → (autónomo: app → servicio, datos → modelo)
```

`bancopruebasiaco` y el núcleo definen clases homónimas con contratos incompatibles
(`Ruta`, `Almacen`, `Pedido`, `ConfiguracionDominio`), así que no hay ni debe haber
imports cruzados entre ellos.

## Regla al añadir código

- Lógica del planificador o de la simulación reutilizable: núcleo, en el paquete de la capa.
- Casos de uso, persistencia y difusión: `paqtracker-api`, en el módulo y la capa que corresponda.
- Corridas por lotes y análisis: `paqtracker-experimentacion`.
