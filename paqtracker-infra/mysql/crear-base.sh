#!/usr/bin/env bash
# Crea la base de PaqTracker y su usuario con permisos minimos en el MySQL 8 de la VM.
# Las tablas no se crean aqui: las crea Flyway al arrancar la API.
#
# Uso (como un usuario con acceso de administrador a MySQL):
#   DB_PASSWORD='clave-de-la-app' sudo -E bash paqtracker-infra/mysql/crear-base.sh
set -euo pipefail

DB_NAME="${DB_NAME:-paqtracker}"
DB_USER="${DB_USER:-paq_user}"
: "${DB_PASSWORD:?Defina DB_PASSWORD con la clave del usuario de la aplicacion}"

mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
-- Solo sobre su base: datos (DML) y lo que Flyway necesita para migrar. Sin DROP: permitiria borrar
-- la base entera; si una migracion futura elimina una tabla, se concede en ese momento.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
    ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "Base ${DB_NAME} y usuario ${DB_USER}@localhost listos"
