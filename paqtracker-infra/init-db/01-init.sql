-- Inicializacion del contenedor MySQL de desarrollo para PaqTracker.
-- Solo fija el charset de la base. Las tablas las crea Flyway desde
-- paqtracker-api/src/main/resources/db/migracion: crear aqui cualquier tabla haria
-- que Flyway encuentre un esquema no vacio y se niegue a migrar.

CREATE DATABASE IF NOT EXISTS paqtracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER DATABASE paqtracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
