# Despliegue de PaqTracker en AWS Academy

Registro de cómo se desplegó el sistema en una instancia EC2 del AWS Academy Learner Lab (08-10-2026). Complementa el `README.md` de esta carpeta, que describe la VM del laboratorio de Informática. El procedimiento es el mismo; solo cambia la creación de la máquina y algunos detalles de este Ubuntu.

## Qué se creó

| Elemento | Valor |
|---|---|
| Instancia | EC2 `t3.small` (2 vCPU, 2 GB de RAM), Ubuntu 26.04 LTS |
| Disco | 20 GB, gp3 |
| Grupo de seguridad | Entrada: SSH (22) y HTTP (80) desde cualquier origen. Nada más |
| Acceso | EC2 Instance Connect (terminal en el navegador, botón **Connect**). Alternativa: clave `labsuser.pem` desde *AWS Details* |
| Versión desplegada | Rama `main` |
| Algoritmo | `GA` (`PLANIFICADOR_ALGORITMO` en `/etc/paqtracker/paqtracker.env`) |

No hay HTTPS: Nginx solo escucha en el puerto 80. Acceso: `http://<IP pública>` (escribir `http://`, no `https://`).

## Procedimiento

Cada comando se pega **solo y de uno en uno**, esperando a que vuelva el cursor.

1. **Swap de 2 GB.** La instancia no trae swap y compilar con 2 GB va justo.
```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
2. **Programas.**
```bash
   sudo apt update && sudo apt install -y openjdk-21-jdk git nginx mysql-server nodejs npm
```
   Versiones que quedaron: Java 21, MySQL 8.4, Nginx 1.28, Node 22.
3. **Descargar el proyecto.**
```bash
   git clone https://github.com/jhntan2075/LosPaqueteros.git && cd LosPaqueteros
```
4. **Base de datos.** Se genera una clave aleatoria y se guarda en un archivo privado:
```bash
   export DB_PASSWORD=$(openssl rand -hex 16) && (umask 077; echo "$DB_PASSWORD" > ~/.db_password)
   sudo env DB_PASSWORD="$(cat ~/.db_password)" bash paqtracker-infra/mysql/crear-base.sh
```
5. **Primer despliegue.** Se detiene a propósito y crea `/etc/paqtracker/paqtracker.env`:
```bash
   sudo bash paqtracker-infra/scripts/desplegar.sh
```
6. **Poner la clave en el archivo de variables.**
```bash
   sudo sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$(cat ~/.db_password)|" /etc/paqtracker/paqtracker.env
```
7. **Despliegue completo** (en segundo plano, tarda varios minutos):
```bash
   nohup sudo bash paqtracker-infra/scripts/desplegar.sh > ~/despliegue.log 2>&1 &
   tail -f ~/despliegue.log
```
   Pulsar **Ctrl + C** para dejar de mirar el registro; no detiene el despliegue.
8. **Quitar el sitio por defecto de Nginx** (ver Problemas encontrados):
```bash
   sudo rm -f /etc/nginx/sites-enabled/default && sudo nginx -t && sudo systemctl reload nginx
```
9. **Verificar.**
```bash
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/ejecuciones   # debe dar 200
```
   Luego abrir `http://<IP pública>` en el navegador: debe cargar la interfaz y el mapa.

## Problemas encontrados

- **`sudo -E` no funciona** en este Ubuntu ("preserving the entire environment is not supported"). Se reemplazó por `sudo env VARIABLE=valor ...`, como en los pasos 4 y 6.
- **Nginx rechazaba la configuración** con "a duplicate default server for 0.0.0.0:80". El sitio de ejemplo de Ubuntu (`sites-enabled/default`) choca con el de PaqTracker. Se resolvió con el paso 8.
- **Terminal del navegador congelada** al final de `apt install`. Cerrar la pestaña y volver a pulsar **Connect** no detiene la instalación.
- **Trabones ocasionales** durante una simulación, sin causa identificada (no se capturó el estado de la máquina en ese momento). Si vuelve a ocurrir, ejecutar en la terminal, justo durante el trabón: `top -b -n1 | head -15; free -h; vmstat 1 5`.

## Operación

- **Registro de la API:** `journalctl -u paqtracker-api -f`
- **Estado:** `systemctl status paqtracker-api nginx mysql`
- **Actualizar a una versión nueva:** `cd ~/LosPaqueteros && git pull && sudo bash paqtracker-infra/scripts/desplegar.sh`. No pisa las variables ni los archivos subidos.
- **Credenciales:** la clave de la base está en `~/.db_password` (solo lectura para el usuario `ubuntu`) y en `/etc/paqtracker/paqtracker.env`. No se guarda en el repositorio.

## Particularidades de AWS Academy

- Las sesiones del laboratorio duran unas horas. Al terminar, la instancia se **detiene** (no se borra) y hay que encenderla al iniciar el laboratorio.
- La **IP pública cambia** cada vez que la instancia se detiene y se vuelve a encender, salvo que se asigne una IP elástica.
- Los servicios arrancan solos con la máquina; tras reiniciar, comprobar con la misma dirección.
- Los créditos son limitados: detener la instancia (*Stop*, nunca *Terminate*) cuando no se use.

## Pendiente

- Registro manual de averías en la API: todavía no está implementado.
- IP elástica y HTTPS, si se necesita una dirección estable.