#!/usr/bin/env bash
# Despliega PaqTracker en la VM desde una copia del repositorio: construye el JAR de la API (y la SPA si
# hay Node), los copia a su lugar y reinicia el servicio. Idempotente: se puede correr en cada entrega.
#
# Uso, desde la raiz del repositorio en la VM:
#   sudo bash paqtracker-infra/scripts/desplegar.sh
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DESTINO_API=/opt/paqtracker
DESTINO_WEB=/var/www/paqtracker
USUARIO=paqtracker

cd "$RAIZ"

echo "== Construyendo la API"
./mvnw -B -ntp -pl paqtracker-api -am package -DskipTests

if command -v npm >/dev/null 2>&1 && [ -f paqtracker-web/package.json ]; then
    echo "== Construyendo la SPA"
    (cd paqtracker-web && npm ci && VITE_API_BASE_URL=/api VITE_WS_URL=/ws npm run build)
else
    echo "== Sin Node: se conserva la SPA ya publicada en ${DESTINO_WEB}"
fi

echo "== Instalando archivos"
id -u "$USUARIO" >/dev/null 2>&1 || useradd --system --home "$DESTINO_API" --shell /usr/sbin/nologin "$USUARIO"
install -d -o "$USUARIO" -g "$USUARIO" "$DESTINO_API" "$DESTINO_API/datos"
install -o "$USUARIO" -g "$USUARIO" -m 0644 paqtracker-api/target/paqtracker-api.jar "$DESTINO_API/paqtracker-api.jar"
# Los datos se copian sin pisar los archivos que los usuarios ya subieron por la API (CU-02).
cp -rn datos/ventas.v20260909 datos/bloqueos.v20260909 "$DESTINO_API/datos/"
chown -R "$USUARIO:$USUARIO" "$DESTINO_API/datos"
if [ -d paqtracker-web/dist ]; then
    install -d "$DESTINO_WEB"
    rm -rf "${DESTINO_WEB:?}"/*
    cp -r paqtracker-web/dist/. "$DESTINO_WEB/"
fi

echo "== Configuracion del sistema"
install -m 0644 paqtracker-infra/systemd/paqtracker-api.service /etc/systemd/system/paqtracker-api.service
install -m 0644 paqtracker-infra/nginx/paqtracker.conf /etc/nginx/conf.d/paqtracker.conf
if [ ! -f /etc/paqtracker/paqtracker.env ]; then
    install -d -m 0750 -g "$USUARIO" /etc/paqtracker
    install -m 0640 -g "$USUARIO" paqtracker-infra/systemd/paqtracker.env.example /etc/paqtracker/paqtracker.env
    echo "!! Complete DB_PASSWORD en /etc/paqtracker/paqtracker.env y vuelva a ejecutar este script"
    exit 1
fi

systemctl daemon-reload
systemctl enable paqtracker-api
systemctl restart paqtracker-api
nginx -t && systemctl reload nginx

echo "== Listo. Estado del servicio:"
systemctl --no-pager --lines=5 status paqtracker-api
