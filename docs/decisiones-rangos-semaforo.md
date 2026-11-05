# Rangos del semáforo configurables: decisiones (punto 6 de la evaluación)

Fecha: 05-11-2026. No hubo tiempo de consultar al profesor; estas son las decisiones que tomó el equipo.
Si el profesor indica otra cosa, se corrigen aquí.

## Qué se configura

Hay cuatro semáforos. Todos se guardan como fracciones entre 0 y 1, y la interfaz los muestra en %.

| Semáforo | Mide | Umbrales | Regla | Por defecto | Lo calcula |
|---|---|---|---|---|---|
| Holgura del pedido | holgura restante / plazo | rojo, ámbar | rojo < ámbar | 15 % / 40 % | API |
| Stock bajo de almacén (LE-078) | stock / capacidad | rojo, ámbar | rojo < ámbar | 20 % / 50 % | API |
| Carga de unidades | carga / capacidad | vacío, ámbar, rojo | vacío < ámbar < rojo | 0 / 70 % / 90 % | interfaz |
| Stock de almacenes (rojo = lleno) | stock / capacidad | vacío, ámbar, rojo | vacío < ámbar < rojo | 0 / 50 % / 80 % | interfaz |

## Decisiones

1. **Estado vacío configurable con un umbral.** La unidad o el almacén es *vacío* si su fracción es
   ≤ `vacio`. Con 0 (por defecto) solo cuenta como vacío lo que no tiene carga, como antes.
   Sin carga o con capacidad 0 siempre es vacío. Holgura y stock bajo no tienen estado vacío.
2. **Una sola configuración para todo el sistema.** Se guarda en la tabla `rangos_semaforo` (migración V6),
   que tiene una sola fila. Rige para el día a día y para todas las simulaciones, incluso las que ya están
   corriendo: los rangos no se guardan por ejecución.
3. **Valores iniciales.** La migración pone como `DEFAULT` los valores de la tabla de arriba. Al arrancar,
   si la tabla está vacía, la API crea la fila. Los cortes de holgura e inventario salen de
   `APP_SEMAFORO_*` y `APP_INVENTARIO_*`. Desde entonces esas variables ya no tienen efecto: manda la base.
4. **Rigen sin reiniciar.** La API tiene los rangos en memoria y los consulta cada vez que calcula un nivel.
   Un cambio aparece en la siguiente difusión STOMP, es decir, dentro de un Sc (1 s). En la interfaz,
   quien guarda ve el cambio al instante en el mapa, los paneles y la leyenda. Las otras pestañas abiertas
   reciben al instante los niveles que calcula la API (holgura y stock bajo). Los de carga y stock, y los
   textos de la leyenda, los toman al recargar la página.
5. **Validación en dos capas.** El diálogo valida antes de enviar y la API vuelve a validar
   (`RangosSemaforo`). Responde 400 si:
   - falta un umbral o un grupo;
   - un valor no es numérico o está fuera de [0, 1];
   - no se respeta el orden de la tabla. Los umbrales iguales no se aceptan.
6. **Dónde está la opción.** En la leyenda del mapa ("Capas y leyenda" → "Configurar rangos"), que se ve en
   Operación y en Simulación. No hay autenticación (es una exclusión de alcance), así que cualquiera que
   use la interfaz puede cambiarlos.

## Límites conocidos

- Otra pestaña ya abierta no recibe los rangos nuevos de carga y stock, porque no van por STOMP. Los toma
  al recargar.
- Los colores del semáforo siguen fijos. Lo configurable son los rangos.
- El estimador de holgura de "Registrar pedido" (`lib/factibilidad.ts`) usa los mismos cortes. Su borde
  ámbar/verde (`>`) no coincide con el de la API (`>=`); esa diferencia ya existía y no se cambió.
