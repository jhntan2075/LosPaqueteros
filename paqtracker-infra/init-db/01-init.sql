-- Script de inicializacion de base de datos para PaqTracker
-- Charset utf8mb4 para compatibilidad completa

CREATE DATABASE IF NOT EXISTS paqtracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE paqtracker;

-- Tabla informativa de version de esquema
CREATE TABLE IF NOT EXISTS schema_version_info (
    installed_rank INT NOT NULL,
    version VARCHAR(50),
    description VARCHAR(200) NOT NULL,
    installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (installed_rank)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_version_info (installed_rank, version, description)
VALUES (1, '1.0.0', 'Inicializacion de base de datos local PaqTracker');
