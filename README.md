# PaqTracker

Sistema de planificación, optimización y visualización de rutas de última milla
para PaqRap: autos, motos y bicicletas sobre una grilla urbana de 70 × 50 km,
almacenes por niveles y plazo de entrega de hasta 36 h. Equipo 2B — PUCP 1INF54.

Tres componentes:

- **Planificador de Rutas**: metaheurísticas GA (por defecto) e IACO en Java puro.
- **API de operación**: Spring Boot, monolito modular. Motor de ejecución, despacho,
  replanificación, difusión del estado por STOMP/WebSocket y persistencia en MySQL.
- **Front web**: React + TypeScript (Vite). Registro de pedidos y visualizador.

Tres escenarios concurrentes: día a día (reloj real), simulación de periodo y
colapso logístico (reloj acelerado).

## Estructura del monorepo

```
.github/workflows/                 CI (java.yml, web.yml) con filtros por ruta
paqtracker-planificador-nucleo/    Maven, Java puro: modelo, planificador, simulacion, lectura, util
paqtracker-api/                    Maven, Spring Boot: API REST + STOMP, depende del núcleo
paqtracker-experimentacion/        Maven, CLI de experimentos (no se despliega), depende del núcleo
paqtracker-web/                    React + TypeScript + Vite
paqtracker-infra/                  Inicialización de MySQL, configuración de Nginx y systemd
datos/                             Dataset de ventas, bloqueos y banco de escenarios
docs/                              Documentación técnica
scripts/                           Atajos de PowerShell para compilar, probar y experimentar
pom.xml                            POM padre (núcleo, api, experimentacion)
docker-compose.yml                 MySQL + API para desarrollo local
.env.example                       Variables de entorno documentadas
```

Dependencias permitidas: `api → nucleo`, `experimentacion → nucleo`. El front solo
habla con la API por HTTP y WebSocket. Detalle de capas en
[`docs/estructura.md`](docs/estructura.md).

## Requisitos

- JDK 21 o superior. No hace falta instalar Maven: se usa el wrapper (`mvnw`).
- Node.js 22 para el front.
- Docker Desktop 4.x para MySQL (y opcionalmente la API) en local.

## Cómo levantarlo localmente

```bash
cp .env.example .env                 # completar contraseñas locales
docker compose up --build            # MySQL 8.0 + API en http://127.0.0.1:3000
cd paqtracker-web && npm ci && npm run dev   # front en http://127.0.0.1:5173
```

Vite reenvía `/api` y `/ws` a `127.0.0.1:3000`.

## Comandos de referencia (desde la raíz)

```bash
./mvnw -pl paqtracker-planificador-nucleo test       # pruebas del núcleo, sin levantar la API
./mvnw -pl paqtracker-api -am package                # API + núcleo (JAR en paqtracker-api/target)
./mvnw -pl paqtracker-experimentacion -am package    # banco de experimentos
./mvnw verify                                        # todo
cd paqtracker-web && npm ci && npm run lint && npm run build
```

En Windows se usa `mvnw.cmd`, o los atajos `scripts\compilar.ps1` y `scripts\tests.ps1`.
Los CLI del planificador (`scripts\ga.ps1`, `scripts\iaco.ps1`, `scripts\experimento.ps1`, …)
están descritos en [`paqtracker-experimentacion/README.md`](paqtracker-experimentacion/README.md).

## Formato de datos

- **Ventas** — una línea por pedido: `##d##h##m:x,y,cliente,cantidad,plazo_horas`.
- **Bloqueos** — `##d##h##m-##d##h##m:x1,y1,x2,y2,...` (ventana y polilínea).
- **Mantenimiento preventivo** — `YYYYMMDD:CODIGO_UNIDAD` por línea.

## Despliegue

Producción en la VM del laboratorio (2 vCPU / 2 GB), sin Docker: el JAR de la API
como servicio systemd en `127.0.0.1:3000` (`-Xmx640m`, SerialGC) y Nginx como proxy
inverso que sirve la SPA y reenvía `/api` y `/ws`. La configuración vive en
`paqtracker-infra/`.
