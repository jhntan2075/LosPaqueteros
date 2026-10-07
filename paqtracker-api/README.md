# paqtracker-api

API de operación de PaqTracker: monolito modular Spring Boot 4 (Java 21) con
arquitectura hexagonal ligera. Depende solo de `paqtracker-planificador-nucleo`.

## Módulos (`pe.pucp.paqtracker.modulos`)

| Módulo          | Casos de uso                 |
|-----------------|------------------------------|
| `pedidos`       | CU-01, CU-02, CU-04          |
| `planificacion` | CU-06, CU-07, CU-12, CU-13, CU-14 |
| `ejecucion`     | CU-15, CU-16, CU-17          |
| `difusion`      | CU-25                        |
| `configuracion` | CU-26, CU-27, CU-28          |

Cada módulo tiene las capas `presentacion → aplicacion → dominio ← infraestructura`.
Lo transversal (WebSocket, errores, archivos) vive en `comun/`.

## Ejecutar

```bash
docker compose up mysql                            # desde la raíz, con .env completo
./mvnw -pl paqtracker-api -am package -DskipTests
java -jar paqtracker-api/target/paqtracker-api.jar
```

Escucha en `${APP_HOST}:${APP_PORT}` (por defecto `127.0.0.1:3000`). El esquema de la
base lo crea Flyway desde `src/main/resources/db/migracion`; Hibernate solo valida.

## Pruebas

```bash
./mvnw -pl paqtracker-api -am test
```

Usan H2 en memoria en modo MySQL (`tests-resources/application.yml`).
