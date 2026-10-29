# Despliegue de PaqTracker en la VM de la PUCP

Procedimiento para la VM que asignó el curso. A diferencia de AWS (`DESPLIEGUE-AWS.md`), esta máquina ya tiene servicios de otros: se agrega PaqTracker sin instalar paquetes y sin romper lo que hay.

## Qué hay en la VM

| Elemento | Estado | Consecuencia para PaqTracker |
|---|---|---|
| Ubuntu 24, 3.8 GB de RAM | Compartida con Tomcat y MySQL | La API corre con `-Xmx640m`; la SPA se compila fuera (`CONSTRUIR_WEB=0`) |
| Java 21 (solo JRE), MySQL 8.4.6 | Instalados | Sin JDK no se puede compilar: el JAR se compila en una laptop y se sube (`CONSTRUIR_API=0`). No se instala nada: hacerlo requiere autorización del profesor |
| Tomcat en el 8080 | En uso | La API usa `127.0.0.1:3000`; no hay choque |
| Nginx, `/etc/nginx/sites-enabled/default` | Gestionado por certbot: server en el 80 (`default_server`) y en el 443 con certificado y `location /tomcat/` | No se agrega otro server: se incluye `paqtracker-app.conf` dentro del 443 (`NGINX_MODO=snippet`) y se conserva `/tomcat/` |

Resultado:

```
navegador ──443 (certbot)──▶ Nginx ──┬─ /tomcat/     → Tomcat :8080 (sin cambios)
                                     ├─ /            → /var/www/paqtracker (SPA)
                                     ├─ /api/        → 127.0.0.1:3000 (API)
                                     └─ /ws (STOMP)  → 127.0.0.1:3000 (wss://)
```

Con la página servida por HTTPS, el front abre el WebSocket con `wss://` porque `VITE_WS_URL=/ws` es relativa y se resuelve con el protocolo de la página (`paqtracker-web/src/services/clienteStomp.ts`). No hay contenido mixto.

Cada comando se pega **solo y de uno en uno**. En los ejemplos, `<dominio>` es el nombre del certificado de certbot y `<usuario>@<vm>` el acceso SSH.

## 0. Comprobaciones previas (solo lectura)

```bash
java -version                            # 21 (JRE; no hay javac)
mysql --version && nginx -v
free -h                                  # memoria libre antes de compilar
sudo ss -ltnp | grep -E ':(80|443|3000|3306|8080)\b'   # 3000 debe estar libre
sudo nginx -t                            # la configuracion actual debe ser valida antes de tocarla
readlink -f "$(command -v java)"         # el servicio usa /usr/bin/java
```

## 1. Código, JAR y SPA

En la VM:

```bash
git clone https://github.com/jhntan2075/LosPaqueteros.git && cd LosPaqueteros
mkdir -p paqtracker-api/target paqtracker-web
```

La VM no compila nada: el JAR y la SPA se construyen en una laptop del equipo y se suben ya listos. La laptop necesita **JDK 21** (el proyecto compila con `release 21`; un JDK 17 falla) y Node 22. En Windows (PowerShell), desde la raíz del repositorio, en la misma versión del código que se despliega:

```powershell
.\mvnw.cmd -B -ntp -pl paqtracker-api -am package -DskipTests
scp paqtracker-api/target/paqtracker-api.jar <usuario>@<vm>:~/LosPaqueteros/paqtracker-api/target/

cd paqtracker-web; npm ci; $env:VITE_API_BASE_URL='/api'; $env:VITE_WS_URL='/ws'; npm run build
scp -r dist <usuario>@<vm>:~/LosPaqueteros/paqtracker-web/
```

Deben quedar en la VM `~/LosPaqueteros/paqtracker-api/target/paqtracker-api.jar` y `~/LosPaqueteros/paqtracker-web/dist/index.html`.

Variables de `desplegar.sh` que se usan en esta VM:

| Variable | Valor aquí | Efecto |
|---|---|---|
| `NGINX_MODO` | `snippet` | Instala `paqtracker-app.conf` en `/etc/nginx/snippets/`; no toca `conf.d` ni `sites-enabled` |
| `CONSTRUIR_API` | `0` | No ejecuta `./mvnw` (no hay JDK): instala el JAR subido. Si no está, el script termina con error **antes de instalar nada** |
| `CONSTRUIR_WEB` | `0` | No compila la SPA: publica `paqtracker-web/dist`. Si no hay `dist/index.html`, conserva la SPA ya publicada |

Cualquier otro valor (por ejemplo `CONSTRUIR_API=no`) hace que el script termine con código 2 sin hacer nada.

## 2. Base de datos y usuario de MySQL

Primero ver qué hay, sin modificar nada:

```bash
sudo mysql -e "SHOW DATABASES; SELECT user, host FROM mysql.user WHERE user = 'paq_user';"
```

- Si ya existe una base `paqtracker` o un usuario `paq_user` que no son nuestros, usar otros nombres con `DB_NAME` y `DB_USER` en el comando de abajo y en el paso 4. El script hace `ALTER USER` sobre su usuario: no reutilizar uno ajeno.
- Si `sudo mysql` pide clave o rechaza el acceso, root no usa `auth_socket`: pedir una cuenta de administrador y ejecutar a mano el SQL de `mysql/crear-base.sh` con `mysql -u <admin> -p`.

Crear la base y el usuario (la clave se guarda en un archivo privado):

```bash
(umask 077; openssl rand -hex 16 > ~/.db_password)
sudo env DB_PASSWORD="$(cat ~/.db_password)" bash paqtracker-infra/mysql/crear-base.sh
```

`crear-base.sh` solo crea `paqtracker` (si no existe) y `paq_user@localhost`, con permisos únicamente sobre esa base y sin `DROP`. No toca otras bases ni usuarios. Las tablas las crea Flyway al arrancar la API.

## 3. Primer despliegue (crea el archivo de variables)

```bash
sudo env NGINX_MODO=snippet CONSTRUIR_API=0 CONSTRUIR_WEB=0 bash paqtracker-infra/scripts/desplegar.sh
```

Instala el JAR y la SPA subidos, el servicio y `/etc/nginx/snippets/paqtracker-app.conf`, crea `/etc/paqtracker/paqtracker.env` y **se detiene a propósito**. No copia nada a `conf.d` ni toca `sites-enabled`.

## 4. Completar `/etc/paqtracker/paqtracker.env`

```bash
sudo sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$(cat ~/.db_password)|" /etc/paqtracker/paqtracker.env
sudo grep -E '^(APP_HOST|APP_PORT|DB_NAME|DB_USER)=' /etc/paqtracker/paqtracker.env
```

Debe quedar `APP_HOST=127.0.0.1` y `APP_PORT=3000`. Si en el paso 2 se usaron otros `DB_NAME` o `DB_USER`, corregirlos aquí con `sudo nano /etc/paqtracker/paqtracker.env`.

## 5. Incluir el snippet en el server 443 (una sola vez)

Respaldar el sitio **fuera** de `sites-enabled` (Nginx carga todo lo que hay en esa carpeta, y una copia ahí duplicaría los server):

```bash
sudo cp /etc/nginx/sites-enabled/default ~/nginx-default.$(date +%F).bak
sudo nano /etc/nginx/sites-enabled/default
```

En el server que tiene `listen 443 ssl`, reemplazar su `root` y su `location /` por el `include`. Todo lo demás queda igual: `server_name`, las líneas `# managed by Certbot`, `location /tomcat/` y cualquier otra `location`. Ejemplo (los valores reales de la VM pueden diferir):

Antes:

```nginx
server {
    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;
    server_name <dominio>;

    location / {
        try_files $uri $uri/ =404;
    }

    location /tomcat/ {
        proxy_pass http://127.0.0.1:8080/;
        # ... cabeceras existentes, sin cambios
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/<dominio>/fullchain.pem; # managed by Certbot
    # ... resto de lineas de certbot, sin cambios
}
```

Después:

```nginx
server {
    server_name <dominio>;

    include /etc/nginx/snippets/paqtracker-app.conf;

    location /tomcat/ {
        proxy_pass http://127.0.0.1:8080/;
        # ... cabeceras existentes, sin cambios
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/<dominio>/fullchain.pem; # managed by Certbot
    # ... resto de lineas de certbot, sin cambios
}
```

Notas:

- La línea `index ...` puede quedarse o quitarse; el snippet trae su propio `root` e `index` dentro de cada `location`.
- `/tomcat/` sigue funcionando porque Nginx elige la `location` de prefijo más largo; `/` solo atiende lo que no coincide con otra.
- Lo que antes servía `location /` (por ejemplo, la página de bienvenida de `/var/www/html`) deja de verse en `/`. Confirmar con el profesor que no se usa.
- El server del 80 no se toca. Si redirige a HTTPS (lo habitual con certbot), `http://<dominio>` lleva a PaqTracker.

Validar sin recargar:

```bash
sudo nginx -t
```

Si falla, restaurar con `sudo cp ~/nginx-default.<fecha>.bak /etc/nginx/sites-enabled/default` y revisar.

## 6. Despliegue completo

```bash
sudo env NGINX_MODO=snippet CONSTRUIR_API=0 CONSTRUIR_WEB=0 bash paqtracker-infra/scripts/desplegar.sh
```

Como no compila, termina en segundos. El script reinicia la API, ejecuta `nginx -t` y solo recarga Nginx si pasa. Si el snippet no está incluido en ningún server, no recarga y muestra la instrucción del paso 5.

## 7. Comprobación

```bash
systemctl status paqtracker-api --no-pager
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/ejecuciones       # API directa: 200
curl -s -o /dev/null -w "%{http_code}\n" https://<dominio>/api/ejecuciones            # por Nginx: 200
curl -s -o /dev/null -w "%{http_code}\n" https://<dominio>/                           # SPA: 200
curl -s -o /dev/null -w "%{http_code}\n" https://<dominio>/tomcat/                    # Tomcat: igual que antes
curl -s --http1.1 --max-time 5 -o /dev/null -w "%{http_code}\n" \
  -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" https://<dominio>/ws              # WebSocket: 101
```

El último comando corta a los 5 s porque la conexión queda abierta; lo que importa es el `101`.

En el navegador, abrir `https://<dominio>`: debe cargar la interfaz y el mapa. En las herramientas de desarrollo (pestaña *Red*, filtro *WS*) la conexión debe ser `wss://<dominio>/ws` y no debe haber avisos de contenido mixto.

## Operación

- **Registro de la API:** `journalctl -u paqtracker-api -f`
- **Memoria:** `free -h`; la API no debería pasar de unos 800 MB en total (heap de 640 MB).
- **Actualizar:** en la VM, `cd ~/LosPaqueteros && git pull`; en la laptop, compilar y subir el JAR y `dist` como en el paso 1 (misma versión del código); en la VM, `sudo env NGINX_MODO=snippet CONSTRUIR_API=0 CONSTRUIR_WEB=0 bash paqtracker-infra/scripts/desplegar.sh`. Si no se sube un JAR nuevo, se reinstala el anterior que quedó en `target/`. No pisa las variables, los archivos subidos ni el `sites-enabled/default` editado.
- **Retirar PaqTracker:** restaurar el respaldo del paso 5, `sudo nginx -t && sudo systemctl reload nginx` y `sudo systemctl disable --now paqtracker-api`.

## Pendiente

- Crear swap mejoraría el margen de memoria, pero cambia la configuración del sistema: consultarlo antes con el profesor.
