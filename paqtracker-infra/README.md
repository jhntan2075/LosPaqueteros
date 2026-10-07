# paqtracker-infra

Configuración para levantar PaqTracker en desarrollo (Docker) y para desplegarlo en
la VM del laboratorio (sin Docker).

```
init-db/01-init.sql            Inicialización del MySQL del docker-compose de desarrollo
mysql/crear-base.sh            Base y usuario de permisos mínimos en el MySQL de la VM
nginx/paqtracker.conf          Proxy inverso: SPA + /api + /ws hacia 127.0.0.1:3000
systemd/paqtracker-api.service Servicio de la API (-Xmx640m, SerialGC)
systemd/paqtracker.env.example Variables de la API en la VM (/etc/paqtracker/paqtracker.env)
scripts/desplegar.sh           Construye e instala API y SPA, y reinicia el servicio
```

## Arquitectura en la VM

```
navegador ──80──▶ Nginx ──┬─ /            → /var/www/paqtracker (SPA)
                          ├─ /api/        → 127.0.0.1:3000 (API)
                          └─ /ws (STOMP)  → 127.0.0.1:3000 (WebSocket)
API (systemd, usuario paqtracker) ──▶ MySQL 8 (127.0.0.1:3306, usuario paq_user)
```

La API nunca se expone directamente: escucha solo en `127.0.0.1`.

## Primer despliegue

Requisitos en la VM: JDK 21+, MySQL 8, Nginx y Git. Node 22 es opcional: sin Node
se conserva la SPA ya publicada.

1. **Base de datos:**
   ```bash
   DB_PASSWORD='<clave>' sudo -E bash paqtracker-infra/mysql/crear-base.sh
   ```
2. **Primer despliegue:**
   ```bash
   sudo bash paqtracker-infra/scripts/desplegar.sh
   ```
   La primera vez el script crea `/etc/paqtracker/paqtracker.env` y se detiene.
3. **Variables:** completar `DB_PASSWORD` en `/etc/paqtracker/paqtracker.env` con la
   clave del paso 1.
4. **Despliegue completo:** volver a correr `desplegar.sh`. Construye el JAR (y la SPA
   si hay Node), instala el servicio y la configuración de Nginx, y reinicia.
5. **Verificar:**
   ```bash
   curl http://localhost/api/ejecuciones   # debe listar la ejecucion "dia-a-dia"
   journalctl -u paqtracker-api -f         # bitacora de la API
   ```

Flyway crea el esquema al arrancar la API. La operación día a día arranca sola sobre
el mes en curso.

## Entregas siguientes

```bash
git pull && sudo bash paqtracker-infra/scripts/desplegar.sh
```

El script no pisa los archivos de ventas y bloqueos que los usuarios hayan subido.
Tampoco pisa las variables de `/etc/paqtracker/paqtracker.env`.

## Contingencia

Si systemd no está disponible, el mismo JAR corre con:

```bash
java -Xmx640m -XX:+UseSerialGC -jar paqtracker-api.jar
```

Antes hay que exportar las variables. El código no cambia; la alternativa en Tomcat 10
(WAR) solo requiere cambiar el empaquetado.
