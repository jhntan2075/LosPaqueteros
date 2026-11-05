# Verificación de observaciones de la evaluación

Revisión hecha el 05-11-2026 **solo leyendo** el código y el historial de git de `main` (la rama
`feature/verificacion-evaluacion` no tiene commits propios: apunta a `009e048`, merge del PR #38).
No se modificó código ni se ejecutó nada en la VM.

**Pruebas locales ejecutadas:**
- `paqtracker-web`: `npx vitest run src/test/rubrica` → 5 archivos, **90 pruebas pasan**.
- Java (`paqtracker-planificador-nucleo`): **no se pudieron correr**. La máquina solo tiene JDK 8, 11 y
  17, y las clases están compiladas para Java 21 (class file 65). No hay resultado Java nuevo: las
  afirmaciones sobre el backend salen de leer el código.

**Convención de capas.** *Backend* = API o núcleo. *Interfaz* = `paqtracker-web`. *Script/datos* =
archivos, variables de entorno o constantes. Un valor que solo cambia editando una constante, una
variable de entorno o la base **no** cuenta como configurable por el usuario.

**Límite de esta revisión.** No sabemos la fecha ni el commit de la versión evaluada. Por eso,
"Sin cambios" significa que **hoy** la observación sigue sin resolverse, y se indica cuándo entró
cada pieza relevante.

---

## 1. Resumen

| N.º | Funcionalidad | Calif. anterior | Estado actual | Capa | Evidencia |
|---|---|---|---|---|---|
| 2 | Atributos de almacenes principales (ubicación, capacidad) | Parcial | **Sin cambios** | Script (constante) | `ConfiguracionDominio.java:41,130-132`; solo `GET /api/configuracion/dominio`; front `config/dominio.ts:63-67` |
| 6 | Rangos del semáforo y estado vacío | No implementado | **Corregida** (cambios sin commit, 05-11-2026) | Backend + interfaz | `GET/PUT /api/configuracion/semaforo`; tabla `rangos_semaforo` (V6); diálogo "Configurar rangos" en la leyenda |
| 7 | Atributos de la avería tipo 1 | Parcial | **Sin cambios** (solo unidad y tipo) | Backend + interfaz para unidad/tipo; constantes para el resto | `SolicitudRegistroAveria.java:12`; `ConfiguracionDominio.java:96,114` |
| 8 | Atributos de la avería tipo 2 | Parcial | **Sin cambios** | Ídem | `Averia.java:88-95,108-113`; `CalendarioTurnos.java:56` |
| 9 | Atributos de la avería tipo 3 | Parcial | **Sin cambios** | Ídem | `ConfiguracionDominio.java:105,108`; `CalendarioTurnos.java:67` |
| 1 | Configuración del mapa | Conforme | Sigue conforme | Constante (núcleo + front) | `ConfiguracionDominio.java:15`; `config/dominio.ts:6-7` |
| 4 | Atributos de unidades de transporte | Conforme | Sigue conforme (con riesgo, ver B) | Interfaz para cantidad; constante para el resto | `ConfiguracionEscenario.tsx:342-344`; `TipoVehiculo.java:23-27` |
| 5 | Bloqueos | Conforme | Sigue conforme | Backend + interfaz | `POST /api/archivos/bloqueos` (`ControladorPedidos.java:106`); `GridMap.tsx` |
| 14 | Fechas usadas en pruebas de simulación | Conforme | Sigue conforme | Pruebas/datos | ver lista en B |
| 15 | Datos sin reducción de registros | Conforme | Sigue conforme | Backend | `CargadorDatosEscenario.java:52-93` |
| 16 | Carga de datos distintos de pedidos, independiente de escenarios | Conforme | Sigue conforme (con matiz) | Backend + interfaz | `CasoUsoImportarBloqueos.java:43-45`; `AlmacenArchivosLocal.java:51-59` |

Conteo: Sin cambios 4 · Corregida 1 (punto 6) · Sigue conforme 6 · Se rompió 0.

---

## 2. Detalle de los puntos a corroborar (A)

### Punto 2 — Atributos de los almacenes principales · Sin cambios

> **Para decir en voz alta:** "Las ubicaciones y la capacidad de los tres almacenes están definidas en
> la clase `ConfiguracionDominio` del núcleo: central en (27,14) con stock ilimitado e intermedios en
> (12,38) y (57,27) con 1000 unidades. La API solo las *consulta*. No hay pantalla ni endpoint para
> crearlos o editarlos, y no se guardan en la base. Cambiarlas exige editar el código y recompilar."

- Valores fijos: `paqtracker-planificador-nucleo/.../modelo/ConfiguracionDominio.java:41` (`STOCK_INTERMEDIO = 1000`)
  y `:130-132` (`crearAlmacenes()` con nodos literales).
- La API solo tiene lectura: `ControladorConfiguracion.java:28` (`GET /api/configuracion/dominio`). El propio
  servicio lo declara pendiente: `ServicioConfiguracion.java:15` dice *"La edición de parámetros (CU-26 a
  CU-28) queda para una siguiente entrega"*.
- No hay tabla de almacenes: las migraciones V1–V5 (`db/migracion`) solo crean `ejecucion`, `pedido` y `averia`.
- El front duplica los valores en `paqtracker-web/src/config/dominio.ts:63-67` y **no llama** al endpoint de
  configuración (no hay ninguna llamada a `configuracion/dominio` en `src/`).
- En el historial no hay ningún commit que toque `crearAlmacenes()` después de la evaluación. Los últimos
  cambios a `ConfiguracionDominio.java` son de `0520b70` (22-10, averías).

### Punto 6 — Rangos del semáforo y estado vacío · Corregida (05-11-2026, aún sin commit)

> **Para decir en voz alta:** "En el mapa, en *Capas y leyenda*, el botón **Configurar rangos** abre un
> diálogo con los cuatro semáforos: holgura del pedido, stock bajo, carga de unidades y stock de
> almacenes. Los dos últimos tienen el estado *vacío*. El operador escribe los umbrales en porcentaje. El
> sistema exige que estén entre 0 y 100 % y en orden (rojo < ámbar; vacío < ámbar < rojo) antes de
> guardar, y la API vuelve a validarlos. Se guardan en la base, en la tabla `rangos_semaforo`, y rigen de
> inmediato en el mapa, los paneles y la leyenda, sin reiniciar. Los valores por defecto son los de
> siempre y hay un botón para volver a ellos."

- API: `GET` y `PUT /api/configuracion/semaforo` (`ControladorConfiguracion`). Responde 400 si falta un
  umbral, si no es numérico, si está fuera de [0, 1] o si no respeta el orden. Las reglas están en
  `modulos/configuracion/dominio/RangosSemaforo.java`; la persistencia, en la migración
  `V6__crear_tabla_rangos_semaforo.sql` (una fila, con DEFAULT = valores anteriores).
- En vivo: `ServicioRangosSemaforo` guarda los rangos en memoria. `SeguimientoPedidos` (holgura) y
  `ConstructorInstantanea` (stock bajo) los consultan en cada difusión, y antes los fijaban al crear el motor.
- Interfaz: `components/map/DialogoRangosSemaforo.tsx`. El almacén `config/rangosSemaforo.ts` lo cargan
  `useRangosSemaforoGlobales` en `App.tsx` y `services/servicioSemaforo.ts`. `CORTE_*` (`config/dominio.ts`)
  y `RANGO_*` (`config/glosario.ts`) leen el valor vigente.
- Las variables `APP_SEMAFORO_*` / `APP_INVENTARIO_*` quedan solo como valores iniciales: se usan si la tabla
  está vacía.
- Límite: otra pestaña ya abierta toma los rangos nuevos de carga y stock al recargar. Detalle y decisiones en
  [decisiones-rangos-semaforo.md](decisiones-rangos-semaforo.md).
- Pruebas:
  - API: `RangosSemaforoTest`, `ServicioRangosSemaforoTest`, `IntegracionRangosSemaforoTest` y un caso nuevo
    en `SeguimientoPedidosTest`.
  - Front: `config/rangosSemaforo.test.ts` y `components/map/DialogoRangosSemaforo.test.tsx`.
- Antes (para contexto): los cortes eran variables de entorno de la API (desde `b77ba78`, 06-10) y
  constantes del front. El estado vacío y la leyenda con rangos llegaron en `4fa20d1` (PR #38).

### Punto 7 — Atributos de la avería tipo 1 · Sin cambios

> **Para decir en voz alta:** "El operador registra la avería en la pantalla de Operación con el diálogo
> 'Registrar avería': elige la unidad y el tipo, y antes de confirmar ve cuándo volvería a operar. El
> instante es el reloj simulado del momento del registro y no se puede elegir. Las 2 h de detención, los
> 30 min de trasvase y el umbral de urgencia de 120 min son constantes del código."

- Lo que fija el usuario: **unidad** y **tipo**. API: `SolicitudRegistroAveria.java:12` (`unidad`, `tipo`).
  Interfaz: `DialogoRegistrarAveria.tsx:44` (tipo sin valor por defecto), con estimación previa
  (`GET .../averias/estimacion`, línea 69) y cancelación (`DELETE .../averias/{id}`, `ControladorIncidencias.java:66`).
- **Instante**: no es elegible; es el reloj simulado al registrar (`CasoUsoRegistrarAveria.java:59-60`). Se
  aplica en el siguiente salto Sc.
- Constantes (núcleo): `AVERIA_TIPO1_MINUTOS = 120` (`ConfiguracionDominio.java:96`), `TRASVASE_MINUTOS = 30`
  (`:114`) y el umbral de urgencia `EvaluadorFitness.UMBRAL_HOLGURA_MINUTOS = 120` (`EvaluadorFitness.java:61`).
- **Destino tras la avería** (sigue la ruta, se trasvasa a otra unidad en ruta, o vuelve al almacén): lo
  decide el algoritmo (`GestorTrasbordo.java:23-33,75-77`), no el usuario.
- Persistencia: la tabla `averia` guarda unidad, tipo, instante y cancelación (V3, V4). **No** guarda
  duraciones, porque son constantes.
- Historial: backend en PR #21 (`2bf301c`, 21-10); trasvase a unidades en ruta en `0520b70` (22-10); diálogo
  del front, estimación y cancelación en PR #26 (`2279b50`, `9459810`, 22-10). Ningún commit posterior hace
  configurables las duraciones.
- Restricción: se rechaza en la simulación hasta el colapso (`MotorEjecucion.java:334`).

### Punto 8 — Atributos de la avería tipo 2 · Sin cambios

> **Para decir en voz alta:** "Igual que el tipo 1, el operador elige la unidad y el tipo. La unidad queda
> 4 h en el lugar, luego pasa de forma instantánea al almacén central y vuelve al terminar el turno
> siguiente al de la avería. La carga se intenta trasvasar a unidades en ruta y lo demás se replanifica.
> Las 4 h y la regla del turno están en el código."

- Usuario: unidad y tipo (igual que en el punto 7).
- Constantes: `AVERIA_PERMANENCIA_SITIO_MINUTOS = 240` (`ConfiguracionDominio.java:105`). La reincorporación
  es `CalendarioTurnos.finDelSiguienteTurno(instante)` (`Averia.java:91`, `CalendarioTurnos.java:56`), que usa
  los turnos fijos `INICIOS_TURNO_MINUTOS` (`ConfiguracionDominio.java:68`) y `DURACION_TURNO_MINUTOS`.
- Destino tras la avería: almacén central, fijo (`Averia.java:108-113`). No se puede elegir.
- Los turnos tampoco son configurables por el usuario. CLAUDE.md los da por configurables, pero en el código
  son constantes.

### Punto 9 — Atributos de la avería tipo 3 · Sin cambios

> **Para decir en voz alta:** "El operador elige la unidad y el tipo 3. La unidad queda 4 h en el lugar, pasa
> al central y vuelve al inicio del primer turno de las 15:00 que empiece cumplidos dos días desde la
> avería. Los 2 días, las 4 h y el turno de las 15:00 son constantes. El archivo de mantenimiento preventivo
> no se usa en el sistema."

- Constantes: `AVERIA_TIPO3_MINIMO_MINUTOS = 2 * 1440` (`ConfiguracionDominio.java:108`) y
  `AVERIA_PERMANENCIA_SITIO_MINUTOS` (`:105`). El turno de las 15:00 se toma de `iniciosTurno()[1]`
  (`CalendarioTurnos.java:67-68`).
- Destino: almacén central, fijo.
- `datos/mant.preventivo.202609-202610.txt` (36 líneas, `AAAAMMDD:UNIDAD`) solo lo lee el banco de experimentación
  IACO (`paqtracker-experimentacion/.../bancopruebasiaco/datos/LectorMantenimiento.java`). La API no tiene
  endpoint ni lector para ese archivo. Si la observación esperaba programar mantenimientos, eso falta.

---

## 3. Detalle de los puntos conformes (B)

- **1 · Mapa:** sí sigue. Malla de 70×50 en `ConfiguracionDominio.java:15-18` y en `config/dominio.ts:6-7`. Los
  cambios recientes son visuales (`a3eb626` zoom, `b29135b` movimiento fluido, `237ed2b` redibujo) y no tocan las
  dimensiones. Las dimensiones son constantes y no las configura el usuario.
- **4 · Unidades de transporte:** sí sigue. La cantidad por tipo se fija en la interfaz al crear la simulación
  (`ConfiguracionEscenario.tsx:342-344`, máximo 50 por tipo, `APP_MAX_UNIDADES_POR_TIPO`) y se guarda (migración
  V2). Capacidad, velocidad y costo/km son constantes (`TipoVehiculo.java:23-27`, `ConfiguracionDominio.java:44-60`).
  Ningún cambio reciente lo afectó. Riesgo: si se vuelve a revisar con el criterio del punto 2, esos tres
  atributos tienen la misma limitación.
- **5 · Bloqueos:** sí sigue. Se cargan por archivo con validación línea por línea (`POST /api/archivos/bloqueos`,
  `ControladorPedidos.java:106`), se guardan por mes y se dibujan en el mapa. `237ed2b` cambió el redibujo del mapa:
  las pruebas de rúbrica del mapa pasan.
- **14 · Fechas de prueba:** sí sigue. Fechas concretas:
  - API: `2026-01-01` en `IntegracionApiTest` y `RubricaCriteriosGeneralesTest:37-65`; `2026-01-01 08:30`
    (hora de inicio); `2026-01-31` (cruce de mes, `IntegracionApiTest:109`); `2030-01-01` (sin datos, debe
    rechazar, `:152`).
  - Front: `2026-03-03` (`rubrica.simulacion.test.tsx:21,51`).
  - CPA v03 (`docs/cpa`): inicio en 01/01/2027, 01/01/2029, 01/07/2029, 01/12/2029 (colapso), 01/04/2030 y otras,
    con archivos propios de 2029-01 a 2030-11 en `docs/cpa/datos`.
  - Datos del curso disponibles: ventas de 2026-01 a 2028-12 (36 meses) y bloqueos de 2601 a 2812.
- **15 · Sin reducción de registros:** sí sigue. Solo se filtra por ventana de tiempo
  (`CargadorDatosEscenario.java:59-60,85-87`) y se rechazan las líneas inválidas (`CargadorPedidos.java:142-153`).
  No hay muestreo ni topes. Los `subList` de `GestorTrasbordo:197` y `AlmacenArchivosLocal:57` no descartan pedidos.
  Ojo: los escenarios del experimento GA vs IACO (`datos/experimento/esc-*`) son **sintéticos**
  (`GeneradorEscenarios`), no los datos del curso.
- **16 · Carga de datos independiente de escenarios:** sí sigue. El endpoint guarda el archivo del mes en la carpeta de
  datos (`AlmacenArchivosLocal.java:51-59`) y cualquier ejecución posterior lo usa, incluso el día a día
  (`CargadorDatosEscenario.java:61`). Matiz: en la interfaz, la subida solo está dentro de la configuración de
  Simulación (`ConfiguracionEscenario.tsx:197`). Sin cambios recientes.

---

## 4. Brechas (por prioridad)

1. **Edición y persistencia de almacenes (punto 2).**
   - Falta: crear y editar la ubicación y la capacidad, y guardarlas.
   - Dónde: tabla `almacen` (migración V7; la V6 ya la usa el semáforo); `PUT/POST /api/configuracion/almacenes` en `modulos/configuracion`;
     reemplazar `ConfiguracionDominio.crearAlmacenes()` por un proveedor inyectado en `ServicioPlanificacion`,
     `FabricaMotorEjecucion` y `ConstructorInstantanea`; en el front, pantalla de configuración y leer
     `GET /api/configuracion/dominio` en vez de `config/dominio.ts`.
   - Esfuerzo: **alto**. El núcleo usa `crearAlmacenes()` de forma estática, y la experimentación también lo
     usa (`CorredorExperimento`, `SimulacionDinamica`).
   - Dependencias: definir si el cambio aplica solo al inicio de una ejecución, como la flota (recomendado);
     validar que el nodo esté dentro de la malla.
2. ~~**Rangos del semáforo configurables por el usuario (punto 6).**~~ **Resuelta el 05-11-2026** (ver punto 6).
   Queda un pendiente menor: difundir los rangos por STOMP para que otras pestañas abiertas los tomen sin
   recargar. Esfuerzo **bajo**.
3. **Atributos de averías configurables (puntos 7–9).**
   - Falta, según lo que se acuerde con el profesor:
     - (a) elegir el **instante** de la avería (hoy es solo "ahora");
     - (b) editar las duraciones por tipo (`AVERIA_TIPO1_MINUTOS`, `AVERIA_PERMANENCIA_SITIO_MINUTOS`,
       `AVERIA_TIPO3_MINIMO_MINUTOS`, `TRASVASE_MINUTOS`) y el turno de reincorporación del tipo 3.
   - Dónde: campo opcional `instante` en `SolicitudRegistroAveria` y validación en `MotorEjecucion.programarAveria`;
     las duraciones pasan de `ConfiguracionDominio` a parámetros de la ejecución que lleguen a `Averia` y
     `GestorTrasbordo`.
   - Esfuerzo: **medio** para (a), **alto** para (b), porque `Averia` lee constantes estáticas y el núcleo es
     compartido con la experimentación.
   - Dependencias: dudas 1–3.
4. **Mantenimiento preventivo (punto 9).**
   - Falta: cargar `mant.preventivo.*.txt` en la API y programar averías tipo 3 desde ese archivo.
   - Dónde: `POST /api/archivos/mantenimiento`, un lector basado en `LectorMantenimiento` del banco y el
     `GestorEventos`.
   - Esfuerzo: **medio**.
   - Dependencias: duda 4.
5. **Turnos y refrigerio configurables.**
   - Afectan las reincorporaciones de los tipos 2 y 3. Están como constantes (`ConfiguracionDominio.java:68-93`),
     aunque CLAUDE.md §3 los da por configurables.
   - Esfuerzo: **medio/alto**. Dependencias: la misma refactorización que la brecha 3(b).
6. **Atributos de unidades (capacidad, velocidad, costo/km) editables.**
   - Hoy el punto 4 está conforme, pero tiene la misma limitación que el punto 2 (`TipoVehiculo.java:23-27`).
   - Esfuerzo: **medio**. Dependencias: se puede hacer junto con la brecha 1.

Nota interna (no es duda para el profesor): CLAUDE.md §4 y §10.1 están desactualizados respecto de `0520b70`.
El código trasvasa a unidades **en ruta**, con 30 min de trasvase, y en tipo 2/3 también trasvasa. CLAUDE.md
dice "unidad libre en almacén" y "traspaso instantáneo".

---

## 5. Dudas para el profesor

1. En los puntos 7–9, ¿qué atributos esperaban que el usuario fije? ¿Solo unidad, tipo e instante, o también
   las duraciones por tipo (2 h, 4 h, 2 días) y el turno de reincorporación?
2. ¿Basta con registrar la avería en el instante actual del reloj, o debe poder programarse para un instante
   futuro o pasado?
3. ¿Se confirman los 30 min de trasvase del tipo 1 (`TRASVASE_MINUTOS`, anotado en el código como "indicación
   del profesor") y el trasvase también en los tipos 2 y 3?
4. ¿El archivo `mant.preventivo.*.txt` debe cargarse en el sistema como averías tipo 3 programadas? La
   aclaración del 24-09 solo lo excluye del experimento GA vs IACO.
5. En el punto 6 (ya implementado con una opción del sistema), ¿están bien como interpretación del estado
   vacío un umbral configurable "vacío hasta X %" (0 por defecto) y una sola configuración para todo el
   sistema, en vez de una por ejecución? Ver [decisiones-rangos-semaforo.md](decisiones-rangos-semaforo.md).
6. En el punto 2, ¿la edición de almacenes debe aplicar solo al iniciar una ejecución, como la flota, o
   también en caliente?
