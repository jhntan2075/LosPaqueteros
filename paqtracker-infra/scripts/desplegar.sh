#!/usr/bin/env bash
# Despliega PaqTracker en la VM desde una copia del repositorio: construye el JAR de la API (y la SPA si
# hay Node), los copia a su lugar y reinicia el servicio. Idempotente: se puede correr en cada entrega.
#
# Uso, desde la raiz del repositorio en la VM:
#   sudo bash paqtracker-infra/scripts/desplegar.sh
#   sudo env NGINX_MODO=snippet CONSTRUIR_API=0 CONSTRUIR_WEB=0 bash paqtracker-infra/scripts/desplegar.sh
#
# Variables:
#   CONSTRUIR_API=1     (por defecto) compila el JAR con ./mvnw; requiere JDK 21.
#   CONSTRUIR_API=0     no ejecuta ./mvnw: instala paqtracker-api/target/paqtracker-api.jar compilado en otra
#                       maquina (para una VM con solo JRE). Si falta, termina sin tocar nada instalado.
#   NGINX_MODO=conf     (por defecto) instala nginx/paqtracker.conf en conf.d, con su propio server en el 80.
#                       Para una maquina sin otros sitios (AWS).
#   NGINX_MODO=snippet  instala nginx/paqtracker-app.conf en snippets/ para incluirlo en un server existente
#                       (el 443 de certbot en la VM de la PUCP). No toca conf.d ni sites-enabled.
#   CONSTRUIR_WEB=1     (por defecto) compila la SPA si hay Node.
#   CONSTRUIR_WEB=0     no compila: publica paqtracker-web/dist ya generado en otra maquina (compilar con
#                       Node puede agotar la memoria de la VM).
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DESTINO_API=/opt/paqtracker
DESTINO_WEB=/var/www/paqtracker
USUARIO=paqtracker
NGINX_MODO="${NGINX_MODO:-conf}"
CONSTRUIR_API="${CONSTRUIR_API:-1}"
CONSTRUIR_WEB="${CONSTRUIR_WEB:-1}"
JAR_API=paqtracker-api/target/paqtracker-api.jar
NGINX_CONF=/etc/nginx/conf.d/paqtracker.conf
NGINX_SNIPPET=/etc/nginx/snippets/paqtracker-app.conf

# Se valida antes de construir para no perder minutos de compilacion por un valor mal escrito.
case "$NGINX_MODO" in
    conf | snippet) ;;
    *) echo "!! NGINX_MODO debe ser conf o snippet (se recibio: ${NGINX_MODO})" >&2; exit 2 ;;
esac
case "$CONSTRUIR_API" in
    0 | 1) ;;
    *) echo "!! CONSTRUIR_API debe ser 0 o 1 (se recibio: ${CONSTRUIR_API})" >&2; exit 2 ;;
esac
case "$CONSTRUIR_WEB" in
    0 | 1) ;;
    *) echo "!! CONSTRUIR_WEB debe ser 0 o 1 (se recibio: ${CONSTRUIR_WEB})" >&2; exit 2 ;;
esac

# nginx -T vuelca la configuracion activa y marca cada archivo incluido; asi se detecta el include sin
# importar si se escribio con ruta absoluta o relativa.
snippet_incluido() {
    local activa
    activa="$(nginx -T 2>/dev/null)" || return 1
    grep -qF "# configuration file ${NGINX_SNIPPET}:" <<<"$activa"
}

avisar_snippet_sin_incluir() {
    cat <<AVISO
!! ${NGINX_SNIPPET} esta instalado pero ningun server de Nginx lo incluye; no se recarga Nginx.
   Hacerlo una sola vez: en /etc/nginx/sites-enabled/default, dentro del server que escucha en 443,
   reemplazar su 'root ...;' y su 'location / { ... }' por la linea
       include ${NGINX_SNIPPET};
   conservando 'location /tomcat/' y las lineas de certbot. Luego:
       sudo nginx -t && sudo systemctl reload nginx
   Detalle en paqtracker-infra/DESPLIEGUE-VM-PUCP.md.
AVISO
}

cd "$RAIZ"

if [ "$CONSTRUIR_API" = 0 ]; then
    echo "== CONSTRUIR_API=0: no se compila la API; se usa ${JAR_API}"
else
    echo "== Construyendo la API"
    ./mvnw -B -ntp -pl paqtracker-api -am package -DskipTests
fi
# Antes de instalar nada: sin JAR, el servicio quedaria reiniciando sobre un archivo inexistente o viejo.
if [ ! -f "$JAR_API" ]; then
    echo "!! No existe ${RAIZ}/${JAR_API}. Compilelo en una maquina con JDK 21" >&2
    echo "   (./mvnw -B -ntp -pl paqtracker-api -am package -DskipTests) y copielo a esa ruta." >&2
    echo "   No se instalo ni se cambio nada." >&2
    exit 1
fi

if [ "$CONSTRUIR_WEB" = 0 ]; then
    echo "== CONSTRUIR_WEB=0: no se compila la SPA; se publica paqtracker-web/dist si existe"
elif command -v npm >/dev/null 2>&1 && [ -f paqtracker-web/package.json ]; then
    echo "== Construyendo la SPA"
    (cd paqtracker-web && npm ci && VITE_API_BASE_URL=/api VITE_WS_URL=/ws npm run build)
else
    echo "== Sin Node: no se compila la SPA"
fi

echo "== Instalando archivos"
id -u "$USUARIO" >/dev/null 2>&1 || useradd --system --home "$DESTINO_API" --shell /usr/sbin/nologin "$USUARIO"
install -d -o "$USUARIO" -g "$USUARIO" "$DESTINO_API" "$DESTINO_API/datos"
install -o "$USUARIO" -g "$USUARIO" -m 0644 "$JAR_API" "$DESTINO_API/paqtracker-api.jar"
# Los datos se copian sin pisar los archivos que los usuarios ya subieron por la API (CU-02).
cp -rn datos/ventas.v20260909 datos/bloqueos.v20260909 "$DESTINO_API/datos/"
chown -R "$USUARIO:$USUARIO" "$DESTINO_API/datos"
# Sin index.html el dist esta vacio o incompleto: se conserva la SPA publicada en vez de borrarla.
if [ -f paqtracker-web/dist/index.html ]; then
    install -d "$DESTINO_WEB"
    rm -rf "${DESTINO_WEB:?}"/*
    cp -r paqtracker-web/dist/. "$DESTINO_WEB/"
else
    echo "== Sin paqtracker-web/dist/index.html: se conserva la SPA ya publicada en ${DESTINO_WEB}"
fi

echo "== Configuracion del sistema (Nginx en modo ${NGINX_MODO})"
install -m 0644 paqtracker-infra/systemd/paqtracker-api.service /etc/systemd/system/paqtracker-api.service
if [ "$NGINX_MODO" = snippet ]; then
    install -d -m 0755 /etc/nginx/snippets
    install -m 0644 paqtracker-infra/nginx/paqtracker-app.conf "$NGINX_SNIPPET"
    if [ -f "$NGINX_CONF" ]; then
        echo "!! ${NGINX_CONF} (del modo conf) sigue instalado y choca con el server de certbot."
        echo "   Quitarlo con: sudo rm ${NGINX_CONF}"
    fi
else
    install -m 0644 paqtracker-infra/nginx/paqtracker.conf "$NGINX_CONF"
fi
if [ ! -f /etc/paqtracker/paqtracker.env ]; then
    install -d -m 0750 -g "$USUARIO" /etc/paqtracker
    install -m 0640 -g "$USUARIO" paqtracker-infra/systemd/paqtracker.env.example /etc/paqtracker/paqtracker.env
    echo "!! Complete DB_PASSWORD en /etc/paqtracker/paqtracker.env y vuelva a ejecutar este script"
    exit 1
fi

systemctl daemon-reload
systemctl enable paqtracker-api
systemctl restart paqtracker-api

# Si la configuracion no es valida, Nginx sigue sirviendo la que ya tenia cargada.
if ! nginx -t; then
    echo "!! nginx -t fallo: no se recarga Nginx. Revise el error de arriba." >&2
    if [ "$NGINX_MODO" = conf ]; then
        echo "   Si ya hay otro server en el 80 (certbot), use NGINX_MODO=snippet." >&2
    fi
    exit 1
fi
if [ "$NGINX_MODO" = snippet ] && ! snippet_incluido; then
    avisar_snippet_sin_incluir
else
    systemctl reload nginx
fi

echo "== Listo. Estado del servicio:"
systemctl --no-pager --lines=5 status paqtracker-api
