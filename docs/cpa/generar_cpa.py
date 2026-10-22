"""Genera el CPA (Catalogo de Pruebas de Aceptacion) de PaqTracker en HTML y sus archivos de datos.

Uso:  py docs/cpa/generar_cpa.py
Salida:
  docs/cpa/41.acs.catalog.pruebas.acept.vNN.html (se imprime a PDF con Chrome headless).
  docs/cpa/datos/CPA-###/...  archivos de entrada de los casos (se regeneran en cada ejecucion).

Los casos se derivan de la LE v4.0 por particion en clases de equivalencia y valores limite.
Para agregar o corregir un caso basta con editar CLASES o CASOS; la matriz de trazabilidad, el
resumen de cobertura y los archivos de datos se recalculan solos. validar() comprueba que cada
exigencia tenga caso, que cada clase usada este definida y que cada clase definida se use.
"""

import html
import re
from pathlib import Path

VERSION = "3.0"
CARPETA = Path(__file__).parent
SALIDA = CARPETA / "41.acs.catalog.pruebas.acept.v03.html"
DATOS = CARPETA / "datos"

# Historial de revisiones: (fecha, version, descripcion)
HISTORIAL = [
    ("20/10/2026", "1.0", "Alta inicial del catálogo: 79 casos de prueba de aceptación derivados de la LE v4.0 por "
                          "partición en clases de equivalencia y análisis de valores límite."),
    ("22/10/2026", "2.0", "Alineamiento con la solución integrada: ubicación de los almacenes (27, 14), (12, 38) y "
                          "(57, 27) y archivos de entrada .txt según los acuerdos del equipo (sección 3.1); mensajes "
                          "del formulario de registro de pedidos actualizados; registro de averías por la API de "
                          "incidencias con sus respuestas de error."),
    ("22/10/2026", "3.0", "Alineamiento con el enunciado y el Q&A del curso: costos por km de S/ 8,00, 6,00 y 3,00; "
                          "hora de entrega fuera del plazo; cambio de conductor en ruta; traslado al almacén central en "
                          "las averías de tipo 2 y 3. Datos de prueba dedicados por caso, con un mes propio y su fecha "
                          "de inicio; clases no admitidas (N) y clases nuevas; casos CPA-080 y CPA-081. El detalle está "
                          "en la sección 8."),
]

# Precisiones que aplican los resultados esperados: (exigencias, precision, fuente)
DECISIONES = [
    ("LE-015, LE-016",
     "El almacén central está en el nodo (27, 14) y los intermedios en (12, 38) y (57, 27). Reemplazan a (25, 15) y "
     "(55, 27) del texto de la LE v4.0.",
     "Q&A del curso, pregunta 5 (cambio del 08/09/2026)"),
    ("LE-025, LE-032, LE-086",
     "La hora de entrega al destinatario no forma parte del plazo: un pedido se cumple a tiempo si la unidad llega a "
     "su destino a más tardar en la hora límite. Cada entrega, total o parcial, toma 1 h.",
     "Q&A del curso, preguntas 11 y 14"),
    ("LE-023",
     "Si la ruta de una unidad cruza un cambio de turno, el conductor del turno siguiente la alcanza donde esté y el "
     "relevo no agrega tiempo: la unidad sigue su ruta sin volver al almacén.",
     "Q&A del curso, pregunta 12"),
    ("LE-053, LE-054",
     "En las averías de tipo 2 y 3 la unidad permanece 4 h en el lugar de la avería y luego se traslada de forma "
     "instantánea al almacén central, junto con la carga que no se haya trasbordado.",
     "Q&A del curso, pregunta 3"),
    ("LE-034",
     "Costo por km: S/ 8,00 el auto, S/ 6,00 la moto y S/ 3,00 la bicicleta.",
     "Enunciado de la situación auténtica; Q&A del curso, hoja «Flota»"),
    ("LE-066",
     "Un bloqueo está vigente en el intervalo cerrado [inicio, fin]: incluye el minuto de inicio y el de fin.",
     "Acuerdo del equipo"),
    ("LE-006",
     "La carga masiva de pedidos usa archivos de texto .txt con campos separados por comas (ventas.AAAAMM.txt), con "
     "el formato de los archivos de datos del curso, en lugar de .csv.",
     "Acuerdo del equipo"),
    ("LE-060",
     "Las unidades se identifican como A-01, M-01 y B-01 (tipo y correlativo). El Q&A del curso usa la forma TA01, "
     "TM01 y TB01; ambas codifican el tipo y el correlativo.",
     "Acuerdo del equipo; Q&A del curso, pregunta 18"),
    ("Resumen de la LE",
     "La LE v4.0 numera de LE-001 a LE-101 (101 exigencias: 77 exigibles y 24 deseables); su resumen indica 100 "
     "porque no contabiliza LE-101. Este catálogo cubre las 101.",
     "LE v4.0"),
]
# ---------------------------------------------------------------------------------------------
# Lista de Exigencias v4.0: id -> (nombre, E/D, agrupador)
# ---------------------------------------------------------------------------------------------
LE = {
    "LE-001": ("Registro de pedido", "E", "AG-01"),
    "LE-002": ("Cálculo de la hora límite", "E", "AG-01"),
    "LE-003": ("Consulta de pedidos", "E", "AG-01"),
    "LE-004": ("Filtrado de pedidos", "D", "AG-01"),
    "LE-005": ("Estado del pedido", "D", "AG-01"),
    "LE-006": ("Carga masiva de pedidos", "E", "AG-01"),
    "LE-007": ("Validación del archivo de pedidos", "E", "AG-01"),
    "LE-008": ("Instante de llegada en simulación", "E", "AG-01"),
    "LE-009": ("División de un pedido por capacidad de la unidad", "E", "AG-01"),
    "LE-010": ("Seguimiento de la cantidad entregada", "E", "AG-01"),
    "LE-011": ("Registro de la entrega efectiva", "D", "AG-01"),
    "LE-012": ("Registro manual de pedido", "E", "AG-01"),
    "LE-013": ("Carga de la red de calles", "E", "AG-02"),
    "LE-014": ("Distancia entre nodos", "E", "AG-02"),
    "LE-015": ("Almacén central", "E", "AG-02"),
    "LE-016": ("Almacenes intermedios", "E", "AG-02"),
    "LE-017": ("Recarga de almacenes intermedios", "E", "AG-02"),
    "LE-018": ("Descuento de inventario en almacenes intermedios", "E", "AG-02"),
    "LE-019": ("Configuración de la flota", "E", "AG-02"),
    "LE-020": ("Capacidad de las unidades", "D", "AG-02"),
    "LE-021": ("Velocidad de las unidades", "D", "AG-02"),
    "LE-022": ("Costo por kilómetro de las unidades", "D", "AG-02"),
    "LE-023": ("Respeto de los cambios de turno", "E", "AG-02"),
    "LE-024": ("Reserva de refrigerio", "E", "AG-02"),
    "LE-025": ("Tiempo de entrega al destinatario", "E", "AG-02"),
    "LE-026": ("Algoritmo metaheurístico", "E", "AG-02"),
    "LE-027": ("Planificación con el algoritmo", "E", "AG-02"),
    "LE-028": ("Asignación según capacidad", "E", "AG-02"),
    "LE-029": ("Consolidación de pedidos en una unidad", "E", "AG-02"),
    "LE-030": ("Selección del almacén de origen", "E", "AG-02"),
    "LE-031": ("Cálculo del tiempo de recorrido", "E", "AG-02"),
    "LE-032": ("Rutas dentro del plazo", "E", "AG-02"),
    "LE-033": ("Orden de visita de la ruta", "D", "AG-02"),
    "LE-034": ("Cálculo del costo de operación", "E", "AG-02"),
    "LE-035": ("Reporte de costos del plan", "D", "AG-02"),
    "LE-036": ("Exclusión de tramos bloqueados", "E", "AG-02"),
    "LE-037": ("Replanificación por bloqueo", "E", "AG-02"),
    "LE-038": ("Carga masiva de bloqueos", "E", "AG-02"),
    "LE-039": ("Registro de avería de unidad", "E", "AG-02"),
    "LE-040": ("Replanificación por avería", "E", "AG-02"),
    "LE-041": ("Reasignación de carga en camino hacia el pedido más crítico", "E", "AG-02"),
    "LE-042": ("Identificación del pedido más crítico", "E", "AG-02"),
    "LE-043": ("Parametrización del escenario", "E", "AG-02"),
    "LE-044": ("Ejecución del escenario día a día", "E", "AG-02"),
    "LE-045": ("Replanificación en tiempo real", "E", "AG-02"),
    "LE-046": ("Ejecución de la simulación de 5 días", "E", "AG-02"),
    "LE-047": ("Simulación hasta el colapso", "E", "AG-02"),
    "LE-048": ("Bitácora de ejecuciones", "D", "AG-02"),
    "LE-049": ("Representación reticular de la ciudad", "E", "AG-02"),
    "LE-050": ("Sistema de coordenadas", "E", "AG-02"),
    "LE-051": ("Modificación del tamaño de la flota", "E", "AG-02"),
    "LE-052": ("Avería de tipo 1", "E", "AG-02"),
    "LE-053": ("Avería de tipo 2", "E", "AG-02"),
    "LE-054": ("Avería de tipo 3", "E", "AG-02"),
    "LE-055": ("Media vuelta ante nodo bloqueado", "E", "AG-02"),
    "LE-056": ("Fecha y hora de inicio de la ejecución", "E", "AG-02"),
    "LE-057": ("Consumo de datos por bloques de tiempo", "D", "AG-02"),
    "LE-058": ("Frecuencia de replanificación", "E", "AG-02"),
    "LE-059": ("Registro del tiempo de cómputo del planificador", "E", "AG-02"),
    "LE-060": ("Identificación de la unidad de transporte", "E", "AG-02"),
    "LE-061": ("Ubicación inicial de las unidades", "E", "AG-02"),
    "LE-062": ("Estado de la unidad de transporte", "E", "AG-02"),
    "LE-063": ("Retorno al almacén para recarga", "E", "AG-02"),
    "LE-064": ("Tramo en curso de cada unidad", "E", "AG-02"),
    "LE-065": ("Carga masiva de averías", "E", "AG-02"),
    "LE-066": ("Bloqueo de nodo", "E", "AG-02"),
    "LE-067": ("Criterio de colapso logístico", "E", "AG-02"),
    "LE-068": ("Registro de avería en tiempo real", "D", "AG-02"),
    "LE-069": ("Fuente de datos por escenario", "E", "AG-02"),
    "LE-101": ("Ruta de la unidad de origen tras la reasignación", "E", "AG-02"),
    "LE-070": ("Mapa de operación en tiempo real", "E", "AG-03"),
    "LE-071": ("Representación de la red de calles", "D", "AG-03"),
    "LE-072": ("Representación de los almacenes", "E", "AG-03"),
    "LE-073": ("Posición de las unidades", "E", "AG-03"),
    "LE-074": ("Actualización de posición en tiempo real", "E", "AG-03"),
    "LE-075": ("Conexiones simultáneas", "D", "AG-03"),
    "LE-076": ("Interacción por zonas del mapa", "D", "AG-03"),
    "LE-077": ("Consulta de detalle de un elemento", "E", "AG-03"),
    "LE-078": ("Configuración de rangos del semáforo", "E", "AG-03"),
    "LE-079": ("Semáforo de cumplimiento de plazo", "D", "AG-03"),
    "LE-080": ("Semáforo de inventario", "E", "AG-03"),
    "LE-081": ("Visualización de rutas", "E", "AG-03"),
    "LE-082": ("Visualización del estado de pedidos", "E", "AG-03"),
    "LE-083": ("Visualización de bloqueos", "E", "AG-03"),
    "LE-084": ("Visualización de averías", "E", "AG-03"),
    "LE-085": ("Línea de tiempo de la simulación", "E", "AG-03"),
    "LE-086": ("Indicador de cumplimiento de plazos", "E", "AG-03"),
    "LE-087": ("Indicadores de costo y distancia", "D", "AG-03"),
    "LE-088": ("Exportación de reportes de desempeño", "D", "AG-03"),
    "LE-089": ("Reloj del momento real", "E", "AG-03"),
    "LE-090": ("Ocupación de la unidad sobre el mapa", "D", "AG-03"),
    "LE-091": ("Inventario del almacén sobre el mapa", "D", "AG-03"),
    "LE-092": ("Depuración de los trazos recorridos", "E", "AG-03"),
    "LE-093": ("Representación diferenciada de las averías", "E", "AG-03"),
    "LE-094": ("Vigencia visual de la avería", "E", "AG-03"),
    "LE-095": ("Panel de unidades de transporte", "E", "AG-03"),
    "LE-096": ("Movimientos planificados por almacén", "D", "AG-03"),
    "LE-097": ("Filtrado de pedidos en el panel", "D", "AG-03"),
    "LE-098": ("Indicador global de ocupación de la flota", "D", "AG-03"),
    "LE-099": ("Reporte de cierre por escenario", "D", "AG-03"),
    "LE-100": ("Listado de pedidos entregados recientemente", "D", "AG-03"),
}

AGRUPADORES = {
    "AG-01": "Registro de Pedidos",
    "AG-02": "Planificador de Rutas",
    "AG-03": "Visualizador",
}

# ---------------------------------------------------------------------------------------------
# Clases de equivalencia. Cada grupo: (codigo, titulo, exigencias, filas, limites)
# fila: (variable, [(id, descripcion) validas], [(id, descripcion) invalidas o no admitidas])
# XX-Vn valida, XX-In invalida (entrada que se rechaza), XX-Nn no admitida (salida que no debe producirse).
# Los identificadores de la v2.0 se conservan; las clases nuevas se agregan al final de cada grupo.
# ---------------------------------------------------------------------------------------------
CLASES = [
    ("PM", "Registro manual de pedido", "LE-001, LE-002, LE-012", [
        ("Cliente", [("PM-V1", "Texto de 1 a 80 caracteres")],
                    [("PM-I1", "Vacío o solo espacios"), ("PM-I2", "Más de 80 caracteres")]),
        ("Coordenada X del destino", [("PM-V2", "Entero 0 ≤ x ≤ 70")],
                    [("PM-I3", "x < 0"), ("PM-I4", "x > 70"), ("PM-I5", "Vacío o no numérico")]),
        ("Coordenada Y del destino", [("PM-V3", "Entero 0 ≤ y ≤ 50")],
                    [("PM-I6", "y < 0"), ("PM-I7", "y > 50"), ("PM-I11", "Vacío o no numérico")]),
        ("Cantidad de producto P", [("PM-V4", "1 ≤ c ≤ 24 (cabe en una sola unidad)"),
                                    ("PM-V5", "c > 24 (se atiende en entregas parciales, LE-009)")],
                    [("PM-I8", "c ≤ 0")]),
        ("Plazo comprometido", [("PM-V6", "Plazo del catálogo: 4, 8, 12, 18 o 36 h")],
                    [("PM-I9", "Plazo > 36 h"), ("PM-I10", "Plazo ≤ 0"),
                     ("PM-I12", "Plazo entre 1 y 35 h que no pertenece al catálogo (p. ej. 5 h)")]),
    ], "x ∈ {−1, 0, 70, 71}; y ∈ {−1, 0, 50, 51}; c ∈ {0, 1, 24, 25}; plazo ∈ {0, 4, 5, 36, 37}; "
       "cliente de 80 y de 81 caracteres."),

    ("AP", "Archivo de pedidos", "LE-006, LE-007", [
        ("Nombre del archivo", [("AP-V1", "ventas.AAAAMM.txt (el mes se toma del nombre)"),
                                ("AP-V2", "Nombre sin mes, con fecha de inicio elegida (se usa el mes de esa fecha)")],
                    [("AP-I1", "Nombre sin mes y sin fecha de inicio elegida")]),
        ("Contenido", [("AP-V3", "Todas las líneas con formato ##d##h##m:x,y,cCLIENTE,cantidad,plazo"),
                       ("AP-V4", "Líneas vacías o comentarios que empiezan con # (se ignoran)")],
                    [("AP-I2", "Archivo vacío"), ("AP-I3", "Línea con menos de 5 campos"),
                     ("AP-I4", "Marca de tiempo mal formada"), ("AP-I5", "Destino fuera de la retícula"),
                     ("AP-I6", "Cantidad ≤ 0"), ("AP-I7", "Plazo ≤ 0"),
                     ("AP-I8", "Plazo fuera del catálogo: mayor que 36 h o no perteneciente a {4, 8, 12, 18, 36}")]),
    ], "destino (70, 50) válido y (71, 50) inválido; cantidad 1 válida y 0 inválida; plazo 36 válido, 37 y 5 inválidos."),

    ("AB", "Archivo de bloqueos", "LE-036, LE-038, LE-066", [
        ("Línea de bloqueo", [("AB-V1", "##d##h##m-##d##h##m:x1,y1,…,xn,yn con inicio ≤ fin, al menos dos puntos, "
                                        "puntos dentro de la retícula y segmentos horizontales o verticales")],
                    [("AB-I1", "Fin anterior al inicio"), ("AB-I2", "Un solo punto"),
                     ("AB-I3", "Punto fuera de la retícula"), ("AB-I4", "Segmento diagonal"),
                     ("AB-I5", "Marca de tiempo mal formada")]),
        ("Instante evaluado", [("AB-V2", "Dentro de la vigencia [inicio, fin]: el nodo no es transitable"),
                               ("AB-V3", "Fuera de la vigencia (antes del inicio o después del fin): el nodo es transitable")],
                    []),
    ], "inicio = fin (válido: rige solo ese minuto); punto (70, 50) válido y (71, 50) inválido; instante igual al fin "
       "(aún vigente) y fin + 1 min (ya no vigente)."),

    ("EJ", "Configuración de la ejecución", "LE-019, LE-043, LE-051, LE-056", [
        ("Escenario", [("EJ-V1", "Simulación de 5 días"), ("EJ-V2", "Hasta el colapso"),
                       ("EJ-V3", "Día a día (en curso desde el arranque del sistema)")],
                    [("EJ-I1", "Tipo de escenario no reconocido")]),
        ("Fecha y hora de inicio", [("EJ-V4", "Fecha y hora (hh:mm) válidas, con datos cargados para ese periodo")],
                    [("EJ-I2", "Sin fecha de inicio"), ("EJ-I7", "Fecha sin datos de pedidos para el periodo")]),
        ("Unidades por tipo (n)", [("EJ-V5", "0 ≤ n ≤ 50 por tipo y al menos 1 unidad en total")],
                    [("EJ-I3", "Total de la flota = 0"), ("EJ-I4", "n > 50"), ("EJ-I5", "n < 0")]),
        ("Momento del cambio de flota", [("EJ-V6", "Al configurar, antes de iniciar la ejecución")],
                    [("EJ-I6", "Con la ejecución en curso")]),
    ], "n ∈ {−1, 0, 1, 50, 51}; total de la flota ∈ {0, 1}."),

    ("AV", "Avería de una unidad", "LE-039, LE-052 a LE-054, LE-065, LE-068", [
        ("Tipo de avería", [("AV-V1", "Tipo 1"), ("AV-V2", "Tipo 2"), ("AV-V3", "Tipo 3")],
                    [("AV-I1", "Otro valor (0, 4, letra)")]),
        ("Unidad afectada", [("AV-V4", "Código existente en la flota y operativo")],
                    [("AV-I2", "Código inexistente"), ("AV-I3", "Unidad ya averiada")]),
        ("Situación de la unidad", [("AV-V5", "En ruta con carga a bordo"), ("AV-V6", "Disponible en almacén")], []),
        ("Instante", [("AV-V7", "Dentro del horizonte de la ejecución")],
                    [("AV-I4", "Marca de tiempo mal formada")]),
    ], "tipo 1: avería + 1 h 59 min (no disponible) y avería + 2 h (disponible); tipos 2 y 3: avería + 3 h 59 min "
       "(en el lugar) y avería + 4 h (trasladada al almacén central)."),

    ("TU", "Turnos y refrigerio", "LE-023, LE-024", [
        ("Instante de operación", [("TU-V1", "Turno 1: [07:00, 15:00)"), ("TU-V2", "Turno 2: [15:00, 23:00)"),
                                   ("TU-V3", "Turno 3: [23:00, 07:00)"),
                                   ("TU-V5", "Ruta que cruza un cambio de turno: la unidad continúa con el conductor "
                                             "del turno siguiente")], []),
        ("Ubicación del refrigerio", [("TU-V4", "Empieza ≥ 1 h después del inicio y termina ≥ 1 h antes del fin del turno")],
                    [("TU-N1", "A menos de 1 h de un cambio de turno (no debe planificarse)")]),
    ], "06:59 y 07:00; 14:59 y 15:00; 22:59 y 23:00."),

    ("CP", "Capacidad, consolidación y entregas parciales", "LE-009, LE-010, LE-028, LE-029", [
        ("Carga asignada a una unidad", [("CP-V1", "Suma de cantidades < capacidad"),
                                         ("CP-V2", "Suma de cantidades = capacidad")],
                    [("CP-N1", "Suma de cantidades > capacidad (no debe planificarse)")]),
        ("Cantidad de un pedido", [("CP-V3", "≤ 24 (una sola entrega posible)"),
                                   ("CP-V4", "> 24 (entregas parciales con el mismo identificador)")], []),
        ("Avance de la entrega", [("CP-V5", "Entrega parcial: cantidad pendiente > 0"),
                                  ("CP-V6", "Entrega total: cantidad pendiente = 0")], []),
    ], "moto con 8 de 8 unidades; pedido de 24 y de 25 unidades."),

    ("PZ", "Cumplimiento del plazo", "LE-011, LE-032, LE-067, LE-086", [
        ("Llegada al destino", [("PZ-V1", "Antes de la hora límite"), ("PZ-V2", "Exactamente en la hora límite")],
                    [("PZ-N1", "Después de la hora límite, o pedido sin planificación factible")]),
    ], "llegada en la hora límite y un minuto después."),

    ("SH", "Semáforo de holgura del pedido", "LE-079", [
        ("f = holgura / plazo; holgura = hora límite − instante actual",
         [("SH-V1", "f ≥ corte ámbar (0,40 por defecto): verde"),
          ("SH-V2", "corte rojo ≤ f < corte ámbar: ámbar"),
          ("SH-V3", "f < corte rojo (0,15 por defecto): rojo"),
          ("SH-V4", "Pedido entregado: cerrado")], []),
    ], "para un plazo de 36 h: holgura de 14 h 24 min (40 %) y de 5 h 24 min (15 %), y un minuto a cada lado."),

    ("SI", "Semáforo de inventario de almacén intermedio", "LE-080, LE-091", [
        ("f = stock / 1 000", [("SI-V1", "f ≥ corte ámbar (0,50 por defecto): verde"),
                               ("SI-V2", "corte rojo ≤ f < corte ámbar: ámbar"),
                               ("SI-V3", "f < corte rojo (0,20 por defecto): rojo")], []),
    ], "f igual al corte ámbar (verde) y justo por debajo (ámbar); f igual al corte rojo (ámbar) y justo por debajo "
       "(rojo). Se prueban fijando los cortes sobre un stock conocido (CPA-069)."),

    ("OC", "Ocupación de la unidad y de la flota", "LE-090, LE-095, LE-098", [
        ("f = carga / capacidad", [("OC-V1", "f < 0,70: verde"), ("OC-V2", "0,70 ≤ f < 0,90: ámbar"),
                                   ("OC-V3", "f ≥ 0,90: rojo")], []),
    ], "auto con 16 (66,7 %), 17 (70,8 %), 21 (87,5 %) y 22 (91,7 %) unidades a bordo. Con capacidad 24 no existen "
       "cargas enteras de exactamente 70 % o 90 %."),

    ("RS", "Rangos del semáforo", "LE-078", [
        ("Cortes configurados", [("RS-V1", "0 < corte rojo < corte ámbar < 1")],
                    [("RS-I1", "Corte rojo ≥ corte ámbar"), ("RS-I2", "Corte fuera del intervalo (0, 1)")]),
    ], "cortes iguales (rojo = ámbar); corte 0 y corte 1,20."),

    ("PR", "Parámetros de operación", "LE-020 a LE-022, LE-057, LE-058, LE-100", [
        ("Capacidad por tipo de unidad", [("PR-V1", "Entero ≥ 1")], [("PR-I1", "≤ 0")]),
        ("Velocidad por tipo de unidad", [("PR-V2", "> 0 km/h")], [("PR-I2", "≤ 0 km/h")]),
        ("Costo por km por tipo de unidad", [("PR-V3", "≥ 0 soles")], [("PR-I3", "< 0 soles")]),
        ("Frecuencia de replanificación (Sa)", [("PR-V4", "Entero > 0 minutos simulados")], [("PR-I4", "≤ 0")]),
        ("Bloque de consumo (Sc)", [("PR-V5", "> 0 minutos simulados")], [("PR-I5", "≤ 0")]),
        ("Ventana de entregas recientes", [("PR-V6", "> 0 horas")], [("PR-I6", "≤ 0 horas")]),
    ], "capacidad 0 y 1; velocidad 0; costo −0,01 y 0; Sa 0 y 1; Sc 0; ventana 0."),

    ("CF", "Consulta y filtrado de pedidos", "LE-003, LE-004, LE-097", [
        ("Código buscado", [("CF-V1", "Código P-##### existente"),
                            ("CF-V2", "Código P-##### con formato válido e inexistente (resultado vacío)")],
                    [("CF-I1", "Código con formato inválido (p. ej. «12AB»)")]),
        ("Criterio de filtro", [("CF-V3", "Criterio con coincidencias"),
                                ("CF-V4", "Criterio sin coincidencias (lista vacía)")], []),
    ], "—"),

    ("AL", "Almacenes e inventario", "LE-017, LE-018, LE-030, LE-063", [
        ("Almacén de origen", [("AL-V1", "Intermedio disponible: con stock y accesible"),
                               ("AL-V2", "Intermedio no disponible: sin stock o inaccesible por bloqueos")], []),
        ("Instante respecto de la recarga", [("AL-V3", "Antes de las 23:59:59"),
                                             ("AL-V4", "Desde las 23:59:59 (stock repuesto a 1 000)")], []),
        ("Almacén de retorno", [("AL-V5", "Intermedio con stock, accesible y alcanzable dentro del turno"),
                                ("AL-V6", "Ningún intermedio cumple: retorna al almacén central")], []),
    ], "23:59 del día D y 00:00 del día D + 1."),

    ("LL", "Llegada del pedido en la simulación", "LE-008, LE-069", [
        ("Reloj simulado respecto de la marca del pedido",
         [("LL-V1", "Reloj anterior a la marca: el pedido aún no existe"),
          ("LL-V2", "Reloj igual o posterior a la marca: el pedido está en la cola")], []),
    ], "marca − 1 min y marca."),
]

# ---------------------------------------------------------------------------------------------
# Archivos de datos de los casos. arch() registra el archivo para escribirlo en docs/cpa/datos y
# devuelve el bloque que se muestra en la tarjeta del caso. Una linea puede ser (texto, comentario):
# el comentario solo se muestra en el catalogo, no se escribe en el archivo.
# ---------------------------------------------------------------------------------------------
ARCHIVOS = {}


def arch(ruta, lineas):
    ARCHIVOS[ruta] = [l[0] if isinstance(l, tuple) else l for l in lineas]
    return {"archivo": ruta, "lineas": lineas}


def ref(ruta):
    """Bloque que remite a un archivo ya definido por otro caso."""
    return {"archivo": ruta, "lineas": ARCHIVOS[ruta], "ref": True}


# Nueve pedidos de 1 unidad a menos de 3 km del almacen central (27, 14), para CPA-073
CERCANOS = [(27, 15), (27, 16), (28, 14), (29, 14), (26, 14), (25, 14), (27, 13), (27, 12), (28, 15)]
PEDIDOS_073 = [f"02d08h{i * 5:02d}m:{x},{y},c073{i + 1},01,36" for i, (x, y) in enumerate(CERCANOS)]

# Anillo de bloqueo alrededor de un almacen intermedio (poligono abierto que deja el almacen inaccesible)
ANILLO_I1 = "11,37,13,37,13,39,11,39,11,38"
ANILLO_I2 = "56,26,58,26,58,28,56,28,56,27"

# ---------------------------------------------------------------------------------------------
# Casos de prueba de aceptacion
# datos: lista de textos y bloques de archivo (arch / ref)
# ---------------------------------------------------------------------------------------------
CASOS = [
    # ------------------------------------------------------------------ AG-01 Registro de Pedidos
    dict(id="CPA-001", ag="AG-01", nombre="Registro manual de un pedido con datos válidos",
         le=["LE-001", "LE-002", "LE-012"], clases="PM-V1, PM-V2, PM-V3, PM-V4, PM-V6",
         pre="Operación día a día en curso. Reloj de la operación visible.",
         datos=["Cliente: «Distribuidora Santa Anita S.A.C.»; destino (43, 18); cantidad 10; plazo 8 h."],
         pasos=["Abrir el módulo Pedidos y elegir «Registrar pedido».",
                "Ingresar los datos y anotar la hora del reloj de la operación.",
                "Pulsar «Registrar y planificar pedido»."],
         esperado=["El pedido queda registrado con un código único (P-#####) que no se repite.",
                   "El instante de registro es el del reloj de la operación (día, hora y minuto), no uno ingresado por el operario.",
                   "Se almacenan el destino (43, 18), la cantidad 10 y el plazo de 8 h.",
                   "La hora límite es igual al instante de registro más 8 h.",
                   "El pedido aparece en la cola de pedidos."]),
    dict(id="CPA-002", ag="AG-01", nombre="Destino en los vértices de la retícula y cantidad mínima",
         le=["LE-001", "LE-050"], clases="PM-V2, PM-V3, PM-V4 (valores límite x = 0 y 70, y = 0 y 50, cantidad 1)",
         pre="Operación día a día en curso.",
         datos=["Pedido A: destino (0, 0). Pedido B: destino (70, 50). Ambos: cliente «Cliente límite», cantidad 1, plazo 36 h."],
         pasos=["Registrar el pedido A.", "Registrar el pedido B."],
         esperado=["Ambos pedidos se registran sin error con cantidad 1.",
                   "En el mapa, (0, 0) aparece en el extremo inferior izquierdo y (70, 50) en el superior derecho."]),
    dict(id="CPA-003", ag="AG-01", nombre="Registro con cliente vacío",
         le=["LE-001", "LE-012"], clases="PM-I1",
         pre="Formulario «Registrar pedido» abierto.",
         datos=["Cliente: « » (solo espacios); destino (43, 18); cantidad 10; plazo 8 h."],
         pasos=["Ingresar los datos.", "Intentar registrar el pedido."],
         esperado=["El botón «Registrar y planificar pedido» permanece deshabilitado.",
                   "Se muestra «Completa el cliente para registrar el pedido.».",
                   "No se crea ningún pedido."]),
    dict(id="CPA-004", ag="AG-01", nombre="Registro con nombre de cliente de más de 80 caracteres",
         le=["LE-001", "LE-012"], clases="PM-I2 (límite 81) y PM-V1 (límite 80)",
         pre="Formulario «Registrar pedido» abierto.",
         datos=["Intento 1: cliente de 81 caracteres. Intento 2: cliente de 80 caracteres. Demás campos: destino (43, 18), "
                "cantidad 10, plazo 8 h."],
         pasos=["Registrar el pedido con el cliente de 81 caracteres.",
                "Registrar el pedido con el cliente de 80 caracteres."],
         esperado=["Con 81 caracteres el sistema rechaza el registro e informa que el cliente excede la longitud permitida.",
                   "Con 80 caracteres el pedido se registra correctamente."]),
    dict(id="CPA-005", ag="AG-01", nombre="Coordenada X no válida",
         le=["LE-001", "LE-049"], clases="PM-I3, PM-I4, PM-I5 (una clase inválida por intento)",
         pre="Formulario «Registrar pedido» abierto con datos válidos en los demás campos (y = 18).",
         datos=["Intento 1: x = 71. Intento 2: x = −1. Intento 3: x vacío."],
         pasos=["Ingresar cada valor de x por separado.", "Intentar registrar."],
         esperado=["Intentos 1 y 2: se muestra «El destino está fuera de la malla: X debe ir de 0 a 70 e Y de 0 a 50.».",
                   "Intento 3: se muestra «Completa un destino dentro de la malla para registrar el pedido.».",
                   "En los tres intentos el botón de registro queda deshabilitado y no se crea ningún pedido."]),
    dict(id="CPA-006", ag="AG-01", nombre="Coordenada Y no válida",
         le=["LE-001", "LE-049"], clases="PM-I6, PM-I7, PM-I11 (una clase inválida por intento)",
         pre="Formulario «Registrar pedido» abierto con datos válidos en los demás campos (x = 43).",
         datos=["Intento 1: y = 51. Intento 2: y = −1. Intento 3: y vacío."],
         pasos=["Ingresar cada valor de y por separado.", "Intentar registrar."],
         esperado=["Intentos 1 y 2: se muestra «El destino está fuera de la malla: X debe ir de 0 a 70 e Y de 0 a 50.».",
                   "Intento 3: se muestra «Completa un destino dentro de la malla para registrar el pedido.».",
                   "En los tres intentos el botón de registro queda deshabilitado y no se crea ningún pedido."]),
    dict(id="CPA-007", ag="AG-01", nombre="Cantidad no positiva",
         le=["LE-001"], clases="PM-I8 (límite 0; el valor 1 se cubre en CPA-002)",
         pre="Formulario «Registrar pedido» abierto.",
         datos=["Intento 1: cantidad 0. Intento 2: cantidad −5. Demás campos válidos."],
         pasos=["Escribir la cantidad en el campo.", "Intentar registrar."],
         esperado=["El campo de cantidad se marca como inválido y se muestra «Completa una cantidad de 1 a 999 para "
                   "registrar el pedido.».",
                   "El botón de registro queda deshabilitado y no se crea ningún pedido con cantidad 0 o negativa."]),
    dict(id="CPA-008", ag="AG-01", nombre="Plazo fuera del catálogo",
         le=["LE-001", "LE-002"], clases="PM-I9, PM-I10, PM-I12 (una clase inválida por intento)",
         pre="Acceso al formulario de registro y al servicio de registro de pedidos en Swagger UI (para enviar plazos que "
             "el formulario no ofrece).",
         datos=["Intento 1: plazo 37 h. Intento 2: plazo 0 h. Intento 3: plazo 5 h. Demás campos válidos."],
         pasos=["Revisar los plazos que ofrece el formulario.",
                "Enviar cada intento al servicio de registro de pedidos."],
         esperado=["El formulario solo ofrece los plazos 4, 8, 12, 18 y 36 h.",
                   "El plazo de 37 h se rechaza con el mensaje «El plazo maximo es de 36 h».",
                   "Los plazos de 0 h y de 5 h se rechazan indicando los plazos permitidos.",
                   "En ningún intento se crea el pedido."]),
    dict(id="CPA-009", ag="AG-01", nombre="Hora límite que cruza el cambio de día",
         le=["LE-002", "LE-008"], clases="PM-V6 (plazos 4 h y 36 h), AP-V1, AP-V3",
         pre="Pantalla «Configuración de escenario». Simulación de 5 días con fecha de inicio 01/04/2029 y flota por defecto.",
         datos=[arch("CPA-009/ventas.202904.txt", ["01d22h30m:43,18,c0091,05,4", "01d22h30m:43,18,c0092,05,36"])],
         pasos=["Subir el archivo y ejecutar la simulación.", "Pausar después de las 22:30 del 01/04/2029.",
                "Abrir el detalle de cada pedido."],
         esperado=["Pedido c0091 (4 h): hora límite 02/04/2029 02:30.",
                   "Pedido c0092 (36 h): hora límite 03/04/2029 10:30.",
                   "La hora límite se muestra con fecha, hora y minuto."]),
    dict(id="CPA-010", ag="AG-01", nombre="Consulta de pedido por identificador",
         le=["LE-003"], clases="CF-V1, CF-V2, CF-I1",
         pre="Al menos un pedido registrado (por ejemplo, el de CPA-001).",
         datos=["Búsqueda 1: código existente (P-#####). Búsqueda 2: P-99999. Búsqueda 3: «12AB»."],
         pasos=["Buscar el pedido por cada código."],
         esperado=["Con el código existente se muestran destino, cantidad, plazo, hora límite y estado del pedido.",
                   "Con P-99999 el sistema informa que el pedido no existe, sin mostrar datos de otro pedido.",
                   "Con «12AB» el sistema informa que el código no tiene el formato P-#####, sin mostrar datos."]),
    dict(id="CPA-011", ag="AG-01", nombre="Filtrado de pedidos por cliente o estado",
         le=["LE-004"], clases="CF-V3, CF-V4",
         pre="Simulación de 5 días con fecha de inicio 01/01/2027 y flota por defecto, pausada al final del día 1 (cola con "
             "pedidos de varios clientes y en distintos estados).",
         datos=["Filtro 1: un cliente presente en la cola. Filtro 2: estado Entregado. Filtro 3: cliente «c9999» (sin pedidos)."],
         pasos=["Aplicar cada filtro en la cola de pedidos.", "Quitar el filtro."],
         esperado=["Los filtros 1 y 2 muestran solo los pedidos que cumplen el criterio.",
                   "El filtro 3 muestra la lista vacía con un mensaje informativo.",
                   "Al quitar el filtro vuelve la lista completa."]),
    dict(id="CPA-012", ag="AG-01", nombre="Ciclo de vida del pedido",
         le=["LE-005", "LE-082"], clases="— (escenario observable, sección 2.3)",
         pre="Simulación de 5 días con fecha de inicio 01/05/2029 y flota por defecto.",
         datos=[arch("CPA-012/ventas.202905.txt", ["01d08h00m:30,18,c0121,05,8"])],
         pasos=["Subir el archivo y ejecutar la simulación.", "Observar el estado del pedido al llegar (08:00).",
                "Observar el estado cuando una unidad sale con el pedido.",
                "Observar el estado cuando la unidad termina la entrega."],
         esperado=["El estado pasa de Registrado a En ruta y luego a Entregado, sin saltos ni retrocesos.",
                   "El estado se ve tanto en la cola de pedidos como en el detalle del pedido."]),
    dict(id="CPA-013", ag="AG-01", nombre="Carga masiva de un archivo de pedidos válido",
         le=["LE-006", "LE-007"],
         clases="AP-V1, AP-V3, AP-V4 (límites: destinos (0, 0) y (70, 50), cantidades 1, 24 y 25, plazos 4 h y 36 h)",
         pre="Módulo Simulación, pantalla «Configuración de escenario».",
         datos=[arch("CPA-013/ventas.202901.txt", [
             "# CPA-013: archivo valido. Las lineas vacias y los comentarios se ignoran.",
             "01d00h00m:00,00,c0001,01,4", "01d06h30m:70,50,c0002,24,36", "",
             "01d08h15m:43,18,c0003,25,12", "02d23h59m:12,38,c0004,10,8"])],
         pasos=["En «Datos de la simulación», pulsar «Subir archivo» en Pedidos.", "Elegir el archivo."],
         esperado=["El sistema informa 4 pedidos válidos del mes 202901.",
                   "El comentario y la línea vacía se ignoran y no se reportan como error.",
                   "Se muestra «Guardado para el mes 202901»."]),
    dict(id="CPA-014", ag="AG-01", nombre="Archivo de pedidos con registros inválidos",
         le=["LE-007"], clases="AP-I3, AP-I4, AP-I5, AP-I6, AP-I7, AP-I8 (una clase inválida por línea)",
         pre="Pantalla «Configuración de escenario».",
         datos=[arch("CPA-014/ventas.202902.txt", [
             ("01d08h00m:43,18,c0101,10,8", "1: válida"), ("01d09h00m:71,50,c0102,05,12", "2: destino fuera"),
             ("01d10h00m:20,20,c0103,00,12", "3: cantidad 0"), ("01d11h00m:20,20,c0104,05,00", "4: plazo 0"),
             ("01d12h00m:20,20,c0105,05", "5: cuatro campos"), ("01dXXh00m:20,20,c0106,05,12", "6: marca mal formada"),
             ("01d13h00m:20,20,c0107,05,37", "7: plazo 37 h"), ("01d14h00m:20,20,c0108,05,5", "8: plazo 5 h")]),
                "Los comentarios a la derecha no forman parte del archivo."],
         pasos=["Subir el archivo como archivo de pedidos."],
         esperado=["El sistema reporta 7 líneas con error e indica sus números (2 a 8).",
                   "El archivo no se guarda y se pide corregirlo y volver a subirlo.",
                   "El botón «Ejecutar simulación» queda deshabilitado mientras haya un archivo con errores."]),
    dict(id="CPA-015", ag="AG-01", nombre="Archivo de pedidos vacío",
         le=["LE-007"], clases="AP-I2",
         pre="Pantalla «Configuración de escenario».",
         datos=["Archivo datos/CPA-015/ventas.202903.txt de 0 bytes."],
         pasos=["Subir el archivo como archivo de pedidos."],
         esperado=["El sistema informa que el archivo de ventas está vacío.", "No se guarda ningún archivo."]),
    dict(id="CPA-016", ag="AG-01", nombre="Archivo de pedidos sin mes identificable",
         le=["LE-006"], clases="AP-I1, AP-V2",
         pre="Pantalla «Configuración de escenario» sin fecha de inicio elegida.",
         datos=[arch("CPA-016/pedidos_sin_mes.txt", ["01d08h00m:43,18,c0201,10,8"])],
         pasos=["Subir el archivo sin haber elegido la fecha de inicio.",
                "Elegir como fecha de inicio el 01/01/2029 y volver a subirlo."],
         esperado=["Primer intento: se muestra «Elige primero la fecha de inicio…» y no se sube nada.",
                   "Segundo intento: el archivo se valida y se guarda para el mes 202901."]),
    dict(id="CPA-017", ag="AG-01", nombre="Instante de llegada en la línea de tiempo de la simulación",
         le=["LE-008", "LE-069"], clases="LL-V1, LL-V2 (límites: marca − 1 min y marca)",
         pre="Archivo de CPA-013 cargado. Simulación de 5 días con fecha de inicio 01/01/2029 y flota por defecto.",
         datos=["Pedido c0003 del archivo de CPA-013, con marca 01d08h15m (destino (43, 18), 25 unidades, plazo 12 h)."],
         pasos=["Iniciar la simulación y pausarla a las 08:14 del 01/01/2029.", "Reanudar y pausar a las 08:15."],
         esperado=["A las 08:14 el pedido c0003 aún no aparece en la cola.",
                   "A las 08:15 el pedido aparece con instante de llegada 01/01/2029 08:15 y hora límite 01/01/2029 20:15."]),
    dict(id="CPA-018", ag="AG-01", nombre="División de un pedido que supera la capacidad de una unidad",
         le=["LE-009", "LE-028"], clases="PM-V4, PM-V5, CP-V3, CP-V4 (límites 24 y 25)",
         pre="Operación día a día en curso con la flota por defecto.",
         datos=["Pedido A: 24 unidades. Pedido B: 25 unidades. Ambos: cliente «Ferretería Los Olivos», destino (43, 18), "
                "plazo 12 h."],
         pasos=["Registrar ambos pedidos.", "Revisar el plan generado para cada uno."],
         esperado=["Ambos pedidos se aceptan: una cantidad mayor que 24 no es motivo de rechazo.",
                   "El pedido A puede atenderse en una sola entrega (por ejemplo, con un auto de capacidad 24).",
                   "El pedido B se atiende en dos o más entregas parciales que suman 25 unidades, todas con el mismo "
                   "código de pedido.",
                   "Ninguna entrega supera la capacidad de la unidad que la transporta."]),
    dict(id="CPA-019", ag="AG-01", nombre="Seguimiento de la cantidad entregada",
         le=["LE-010"], clases="CP-V5, CP-V6",
         pre="Pedido B de CPA-018 en curso.",
         datos=["Pedido de 25 unidades dividido en entregas parciales."],
         pasos=["Abrir el detalle del pedido tras la primera entrega parcial.", "Abrirlo tras la última entrega."],
         esperado=["Tras la primera entrega se ven la cantidad entregada y la pendiente (suman 25) y el pedido sigue En ruta.",
                   "Solo cuando se entregan las 25 unidades el pendiente es 0 y el pedido pasa a Entregado."]),
    dict(id="CPA-020", ag="AG-01", nombre="Registro de la entrega efectiva",
         le=["LE-011"], clases="PZ-V1, PZ-N1",
         pre="Simulación de CPA-073 ejecutada hasta que se entreguen sus 10 pedidos.",
         datos=["Un pedido entregado a tiempo (c0731) y el pedido entregado tarde (c0730)."],
         pasos=["Abrir el detalle de cada pedido entregado."],
         esperado=["Se muestran la fecha y hora real de entrega (llegada al destino) con día, hora y minuto.",
                   "Para c0731 se muestra la holgura (hora límite − hora real), positiva.",
                   "Para c0730 se muestra el retraso (hora real − hora límite), no una holgura."]),

    # ------------------------------------------------------------------ AG-02 Planificador de Rutas
    dict(id="CPA-021", ag="AG-02", nombre="Retícula de la ciudad, coordenadas y red de calles",
         le=["LE-013", "LE-014", "LE-049", "LE-050", "LE-071"], clases="PM-V2, PM-V3",
         pre="Simulación de 5 días con fecha de inicio 01/06/2029 y flota de 1 auto, 0 motos y 0 bicicletas, sin bloqueos.",
         datos=[arch("CPA-021/ventas.202906.txt", ["01d08h00m:27,24,c0211,05,8"])],
         pasos=["Revisar el mapa: dimensiones, origen y calles.", "Buscar alguna opción para editar las calles.",
                "Subir el archivo, ejecutar la simulación y revisar la distancia de la ruta del pedido c0211."],
         esperado=["El mapa representa una retícula de 70 × 50 km con el origen (0, 0) en el extremo inferior izquierdo.",
                   "Las rutas solo usan tramos horizontales y verticales, sin diagonales ni curvas.",
                   "No hay ninguna opción para que el usuario modifique la red de calles.",
                   "La distancia del almacén central (27, 14) al destino (27, 24) es de 10 km: cada tramo entre nodos "
                   "contiguos mide 1 km."]),
    dict(id="CPA-022", ag="AG-02", nombre="Ubicación e inventario inicial de los almacenes",
         le=["LE-015", "LE-016", "LE-072"], clases="SI-V1",
         pre="Inicio de una simulación (00:00 del primer día).",
         datos=["Configuración de almacenes del sistema."],
         pasos=["Ubicar los almacenes en el mapa.", "Abrir el detalle de cada almacén."],
         esperado=["El almacén central se muestra en el nodo (27, 14), el Intermedio 1 en (12, 38) y el Intermedio 2 en (57, 27).",
                   "Las ubicaciones son fijas: no hay ninguna opción para cambiarlas.",
                   "El central figura con inventario ilimitado y siempre disponible.",
                   "Cada intermedio figura con 1 000 unidades de capacidad y 1 000 unidades de stock al inicio."]),
    dict(id="CPA-023", ag="AG-02", nombre="Descuento de inventario al despachar desde un intermedio",
         le=["LE-018", "LE-096"], clases="AL-V1, SI-V1",
         pre="Simulación de 5 días con fecha de inicio 01/07/2029 y flota de 1 auto, 0 motos y 0 bicicletas, sin bloqueos.",
         datos=[arch("CPA-023/ventas.202907.txt", [
             ("01d08h00m:14,36,c0231,04,8", "A: sale del central"),
             ("01d12h00m:14,36,c0232,20,8", "B: sale del Intermedio 1"),
             ("01d13h30m:14,36,c0233,10,8", "C: sale del Intermedio 1")]),
                "El destino (14, 36) está a 4 km del Intermedio 1 y a 35 km del central. Tras entregar A, el auto queda sin "
                "carga y retorna al Intermedio 1 (LE-063), desde donde atiende B y C. Los comentarios a la derecha no "
                "forman parte del archivo."],
         pasos=["Subir el archivo y ejecutar la simulación.",
                "Abrir el detalle del Intermedio 1 después del despacho de B y después del despacho de C."],
         esperado=["B y C salen del Intermedio 1.",
                   "El stock del Intermedio 1 baja de 1 000 a 980 con B y a 970 con C.",
                   "El almacén muestra salidas planificadas por despacho de 20 y 10 unidades."]),
    dict(id="CPA-024", ag="AG-02", nombre="Recarga diaria de los intermedios a las 23:59:59",
         le=["LE-017", "LE-096"], clases="AL-V3, AL-V4 (límites 23:59 y 00:00)",
         pre="Simulación de CPA-023 en curso, con el Intermedio 1 en 970 unidades.",
         datos=["Stock del Intermedio 1 después de los despachos de CPA-023."],
         pasos=["Pausar a las 23:59 del 01/07/2029 y anotar el stock.", "Reanudar y pausar a las 00:00 del 02/07/2029."],
         esperado=["A las 23:59 el stock sigue en 970.", "A las 00:00 el stock es 1 000 (recarga instantánea).",
                   "El almacén muestra un ingreso por recarga de 30 unidades."]),
    dict(id="CPA-025", ag="AG-02", nombre="Configuración de la flota e identificación de unidades",
         le=["LE-019", "LE-051", "LE-060", "LE-061"], clases="EJ-V1, EJ-V5, EJ-V6",
         pre="Pantalla «Configuración de escenario».",
         datos=["Flota: 5 autos, 3 motos y 2 bicicletas."],
         pasos=["Configurar la flota e iniciar una simulación de 5 días.", "Abrir el panel de unidades."],
         esperado=["El panel lista 10 unidades: A-01 a A-05, M-01 a M-03 y B-01 a B-02.",
                   "El prefijo del código identifica el tipo (A auto, M moto, B bicicleta) y ningún código se repite.",
                   "Al inicio todas las unidades están en el almacén central (27, 14)."]),
    dict(id="CPA-026", ag="AG-02", nombre="Flota en los valores límite válidos",
         le=["LE-019"], clases="EJ-V5 (n = 0, n = 1, n = 50; total = 1)",
         pre="Pantalla «Configuración de escenario».",
         datos=["Configuración 1: 0 autos, 0 motos, 1 bicicleta. Configuración 2: 50 autos, 50 motos, 50 bicicletas."],
         pasos=["Crear una simulación con cada configuración."],
         esperado=["Ambas configuraciones se aceptan.", "La configuración 1 muestra solo B-01; la 2 muestra 150 unidades."]),
    dict(id="CPA-027", ag="AG-02", nombre="Flota sin unidades",
         le=["LE-019"], clases="EJ-I3",
         pre="Pantalla «Configuración de escenario».",
         datos=["0 autos, 0 motos, 0 bicicletas."],
         pasos=["Configurar la flota e intentar ejecutar."],
         esperado=["El botón «Ejecutar simulación» queda deshabilitado.",
                   "Se indica que la flota debe tener al menos 1 unidad en total, con 0 a 50 unidades por tipo."]),
    dict(id="CPA-028", ag="AG-02", nombre="Flota con valores fuera de rango",
         le=["LE-019"], clases="EJ-I4 (n = 51), EJ-I5 (n = −1)",
         pre="Pantalla «Configuración de escenario».",
         datos=["Intento 1: 51 autos, 15 motos, 12 bicicletas. Intento 2: −1 autos, 15 motos, 12 bicicletas."],
         pasos=["Ingresar cada configuración e intentar ejecutar."],
         esperado=["Con 51 autos no se permite crear la simulación y se informa el máximo de 50 por tipo.",
                   "Un valor negativo no se acepta: el campo vuelve a 0 o se rechaza con un mensaje."]),
    dict(id="CPA-029", ag="AG-02", nombre="Cambio de flota con la ejecución en curso",
         le=["LE-051"], clases="EJ-I6",
         pre="Simulación en curso creada en CPA-025.",
         datos=["Intento de pasar a 6 autos."],
         pasos=["Buscar en la corrida alguna opción para cambiar la flota.", "Revisar el panel de unidades."],
         esperado=["No hay ninguna opción para cambiar la flota con la ejecución en curso.",
                   "La flota se mantiene en 10 unidades hasta terminar la ejecución."]),
    dict(id="CPA-030", ag="AG-02", nombre="Parámetros de capacidad, velocidad y costo por tipo de unidad",
         le=["LE-020", "LE-021", "LE-022"], clases="PR-V1, PR-V2, PR-V3 (valores por defecto y valor modificado)",
         pre="Acceso a la configuración de parámetros de la operación.",
         datos=["Valores por defecto: auto 24 u., 40 km/h y S/ 8,00 por km; moto 8 u., 25 km/h y S/ 6,00 por km; bicicleta "
                "4 u., 12 km/h y S/ 3,00 por km.",
                "Cambio: velocidad de la moto a 30 km/h."],
         pasos=["Revisar los parámetros por defecto.", "Cambiar la velocidad de la moto e iniciar una ejecución.",
                "Revisar el tiempo estimado de un tramo de 10 km recorrido por una moto."],
         esperado=["Los parámetros por defecto coinciden con los de la situación auténtica indicados en los datos.",
                   "El cambio de velocidad se aplica desde la siguiente planificación.",
                   "Con 30 km/h, el tramo de 10 km se estima en 20 min (con 25 km/h serían 24 min)."]),
    dict(id="CPA-080", ag="AG-02", nombre="Parámetros de unidad no válidos",
         le=["LE-020", "LE-021", "LE-022"],
         clases="PR-I1, PR-I2, PR-I3; PR-V1 y PR-V3 en sus límites (capacidad 1, costo 0)",
         pre="Acceso a la configuración de parámetros de la operación.",
         datos=["Intento 1: capacidad de la moto 0. Intento 2: velocidad de la moto 0 km/h. Intento 3: costo de la moto "
                "−0,01 por km. Intento 4: capacidad de la moto 1. Intento 5: costo de la moto 0,00 por km."],
         pasos=["Ingresar cada valor por separado e intentar guardar."],
         esperado=["Los intentos 1, 2 y 3 se rechazan con un mensaje que indica el rango permitido y se conservan los "
                   "valores vigentes.",
                   "Los intentos 4 y 5 se aceptan."]),
    dict(id="CPA-031", ag="AG-02", nombre="Cambio de turno con la unidad en ruta",
         le=["LE-023", "LE-062"], clases="TU-V1, TU-V2, TU-V5 (límites 14:59 y 15:00)",
         pre="Simulación de 5 días con fecha de inicio 01/09/2029 y flota de 0 autos, 1 moto y 0 bicicletas.",
         datos=[arch("CPA-031/ventas.202909.txt", ["01d14h00m:47,14,c0311,02,4"]),
                "El destino está a 20 km del central: la moto llega a las 14:48 y su entrega de 1 h termina a las 15:48, "
                "después del cambio de turno de las 15:00."],
         pasos=["Subir el archivo y ejecutar la simulación.", "Pausar a las 14:01, a las 14:59 y a las 15:00 y revisar "
                "el estado y la ruta de M-01.", "Revisar la hora de fin de la entrega."],
         esperado=["M-01 sale con el pedido a las 14:00, sin esperar al cambio de turno.",
                   "A las 14:59 y a las 15:00 M-01 está «En entrega» en el destino: el relevo del conductor no la detiene "
                   "ni la hace volver al almacén.",
                   "La entrega termina a las 15:48; el cambio de turno no agrega tiempo.",
                   "Los cambios de turno ocurren a las 07:00, 15:00 y 23:00."]),
    dict(id="CPA-032", ag="AG-02", nombre="Reserva de refrigerio",
         le=["LE-024", "LE-062"], clases="TU-V3, TU-V4, TU-N1 (límites 06:59/07:00 y 22:59/23:00)",
         pre="Simulación de 5 días con fecha de inicio 01/01/2027 y flota por defecto.",
         datos=["Flota por defecto."],
         pasos=["Revisar el panel de unidades en cada turno del día 1 y anotar el inicio y el fin del refrigerio de cada "
                "unidad.", "Pausar a las 06:59, 07:00, 22:59 y 23:00 y anotar el turno vigente."],
         esperado=["Cada unidad tiene exactamente 1 h de refrigerio por turno, con estado «En refrigerio».",
                   "Ningún refrigerio empieza antes de 1 h después del inicio del turno ni termina después de 1 h antes de "
                   "su fin: en el turno de 07:00 a 15:00, entre las 08:00 y las 14:00; en el de 15:00 a 23:00, entre las "
                   "16:00 y las 22:00; en el de 23:00 a 07:00, entre las 00:00 y las 06:00.",
                   "A las 06:59 rige el turno de 23:00 a 07:00 y a las 07:00 el de 07:00 a 15:00; a las 22:59 rige el de "
                   "15:00 a 23:00 y a las 23:00 el de 23:00 a 07:00.",
                   "Durante el refrigerio no se asignan pedidos a la unidad."]),
    dict(id="CPA-033", ag="AG-02", nombre="Tiempo de recorrido, tiempo de entrega y tramo en curso",
         le=["LE-025", "LE-031", "LE-064"], clases="CP-V1",
         pre="Simulación de 5 días con fecha de inicio 01/10/2029 y flota de 0 autos, 1 moto y 0 bicicletas, sin bloqueos.",
         datos=[arch("CPA-033/ventas.202910.txt", ["01d08h00m:37,14,c0331,05,8"]),
                "El destino está a 10 km del almacén central."],
         pasos=["Subir el archivo y ejecutar la simulación.", "Abrir el detalle de M-01 mientras está en ruta.",
                "Observarla al llegar al destino."],
         esperado=["El tramo en curso muestra el nodo de origen, el nodo de destino, la hora de salida y la hora estimada "
                   "de llegada.",
                   "La llegada estimada es la hora de salida + 24 min (10 km a 25 km/h).",
                   "Tras llegar, la unidad permanece 1 h en entrega antes de seguir; la carga en el almacén no suma tiempo."]),
    dict(id="CPA-034", ag="AG-02", nombre="Planificación con el algoritmo metaheurístico y tiempo de cómputo",
         le=["LE-026", "LE-027", "LE-059"], clases="— (escenario observable, sección 2.3)",
         pre="Simulación de 5 días con fecha de inicio 01/01/2027 y flota por defecto.",
         datos=["Datos base del periodo."],
         pasos=["Revisar la bitácora o el panel de planificación tras varias replanificaciones."],
         esperado=["Cada planificación indica el algoritmo metaheurístico que la generó (el seleccionado en el ISA, "
                   "implementado en Java).",
                   "La asignación de pedidos a unidades y las rutas provienen de ese algoritmo.",
                   "Cada planificación registra su tiempo de cómputo (Ta) en milisegundos."]),
    dict(id="CPA-035", ag="AG-02", nombre="Consolidación de pedidos sin exceder la capacidad",
         le=["LE-028", "LE-029", "LE-033"], clases="CP-V1, CP-V2, CP-N1",
         pre="Simulación de 5 días con fecha de inicio 01/11/2029 y flota de 0 autos, 1 moto (capacidad 8) y 0 bicicletas.",
         datos=[arch("CPA-035/ventas.202911.txt", [
             "01d08h00m:47,14,c0351,03,8", "01d08h00m:47,13,c0352,03,8", "01d08h00m:47,12,c0353,02,8",
             "01d08h00m:47,11,c0354,01,36"]),
                "Los tres primeros suman 8 unidades (= capacidad) y están en nodos contiguos."],
         pasos=["Subir el archivo y ejecutar la simulación.", "Revisar la ruta de la moto a las 08:00.",
                "Seguir la ejecución hasta la entrega del cuarto pedido."],
         esperado=["Los pedidos c0351, c0352 y c0353 van en la misma salida (8 de 8 unidades) y la ruta muestra su orden "
                   "de visita.",
                   "El pedido c0354 no se agrega a esa salida porque superaría la capacidad: se atiende en una salida "
                   "posterior (1 de 8 unidades).",
                   "Ninguna salida lleva más de 8 unidades."]),
    dict(id="CPA-036", ag="AG-02", nombre="Selección del almacén de origen",
         le=["LE-030"], clases="AL-V1, AL-V2",
         pre="Parte 1: ejecución de CPA-023. Parte 2: simulación de 5 días con fecha de inicio 01/08/2029 y flota de 1 auto, "
             "0 motos y 0 bicicletas.",
         datos=["Parte 2: los mismos pedidos de CPA-023 y un bloqueo que rodea al Intermedio 1 durante todo el día 1 y lo deja "
                "inaccesible.",
                arch("CPA-036/ventas.202908.txt", ["01d08h00m:14,36,c0361,04,8", "01d12h00m:14,36,c0362,20,8",
                                                   "01d13h30m:14,36,c0363,10,8"]),
                arch("CPA-036/bloqueo.202908.txt", [f"01d00h00m-01d23h59m:{ANILLO_I1}"])],
         pasos=["Parte 1: en la ejecución de CPA-023, revisar el almacén de origen de B y C.",
                "Parte 2: subir ambos archivos, ejecutar la simulación y revisar el almacén de origen de c0362 y c0363 y el "
                "stock del Intermedio 1."],
         esperado=["Parte 1: B y C salen del Intermedio 1, el almacén con stock más cercano al destino (4 km).",
                   "Parte 2: c0362 y c0363 salen del almacén central, el siguiente almacén con stock más cercano (35 km); "
                   "ningún despacho sale del Intermedio 1 y su stock sigue en 1 000."]),
    dict(id="CPA-037", ag="AG-02", nombre="Rutas dentro del plazo con planificación factible",
         le=["LE-032", "LE-086"], clases="PZ-V1, PZ-V2",
         pre="Simulación de 5 días con fecha de inicio 01/01/2027 y flota por defecto.",
         datos=["Datos base del periodo."],
         pasos=["Ejecutar la simulación hasta el final.", "Exportar o revisar el listado completo de pedidos entregados."],
         esperado=["Todos los pedidos llegan a su destino a más tardar en su hora límite, salvo los que el sistema registró "
                   "como sin planificación factible, con su causa (LE-032).",
                   "El indicador de cumplimiento coincide con el porcentaje calculado sobre el listado."]),
    dict(id="CPA-038", ag="AG-02", nombre="Pedido sin planificación factible",
         le=["LE-032", "LE-067"], clases="PZ-N1",
         pre="Simulación hasta el colapso con fecha de inicio 01/12/2029 y flota de 0 autos, 0 motos y 1 bicicleta "
             "(capacidad 4, 12 km/h).",
         datos=[arch("CPA-038/ventas.202912.txt", ["01d11h00m:47,14,c0381,08,4"]),
                "El pedido necesita dos viajes de la bicicleta. El destino está a 20 km del central (1 h 40 min): la "
                "segunda carga no puede llegar antes de las 17:00 (ida, entrega de 1 h, regreso e ida), después de la hora límite "
                "de las 15:00."],
         pasos=["Subir el archivo y ejecutar la simulación.", "Esperar a que la ejecución se detenga."],
         esperado=["El sistema registra el pedido c0381 y la causa de que no haya planificación factible.",
                   "Se declara el colapso logístico con el pedido c0381, su causa y el instante del incumplimiento "
                   "(01/12/2029 15:00, hora límite del pedido).",
                   "La ejecución queda en estado Colapsada."]),
    dict(id="CPA-039", ag="AG-02", nombre="Costo de la operación por ruta y total",
         le=["LE-034", "LE-035", "LE-087"], clases="PR-V3",
         pre="Ejecución de CPA-033 (1 moto), con los costos por defecto.",
         datos=[ref("CPA-033/ventas.202910.txt")],
         pasos=["Ejecutar hasta que la moto vuelva al almacén central.", "Abrir el reporte de costos del plan.",
                "Revisar los indicadores de la operación."],
         esperado=["La moto recorre 20 km: 10 km al destino y 10 km de retorno al almacén central.",
                   "El costo de la ruta de la moto es S/ 120,00 (20 km × S/ 6,00).",
                   "El costo total es la suma de km × costo por km de cada tipo de unidad: S/ 120,00.",
                   "Se muestran el costo total y los kilómetros recorridos de la operación (20 km)."]),
    dict(id="CPA-040", ag="AG-02", nombre="Exclusión de nodos bloqueados y fin de la vigencia",
         le=["LE-036", "LE-066", "LE-083"], clases="AB-V2, AB-V3 (límites: fin de la vigencia y fin + 1 min)",
         pre="Simulación de 5 días con fecha de inicio 01/01/2030 y flota de 1 auto, 0 motos y 0 bicicletas.",
         datos=[arch("CPA-040/ventas.203001.txt", ["01d08h00m:47,14,c0401,02,8", "01d18h30m:47,14,c0402,02,8"]),
                arch("CPA-040/bloqueo.203001.txt", ["01d06h00m-01d18h00m:37,4,37,24"])],
         pasos=["Subir ambos archivos y ejecutar la simulación.", "A las 08:00, revisar el mapa y la ruta del pedido c0401.",
                "Pausar a las 18:00 y a las 18:01 y revisar el mapa.", "Revisar la ruta del pedido c0402."],
         esperado=["A las 08:00 el bloqueo se ve en el mapa y la ruta de c0401 no pasa por ningún nodo con x = 37 y "
                   "4 ≤ y ≤ 24: rodea el bloqueo y mide 42 km en lugar de 20 km.",
                   "A las 18:00 el bloqueo todavía se muestra (la vigencia incluye el minuto de fin).",
                   "A las 18:01 el bloqueo ya no se muestra.",
                   "La ruta de c0402 va en línea recta por y = 14 y mide 20 km."]),
    dict(id="CPA-041", ag="AG-02", nombre="Replanificación ante un bloqueo",
         le=["LE-037"], clases="AB-V2",
         pre="Simulación de 5 días con fecha de inicio 01/02/2030, flota de 1 auto, 0 motos y 0 bicicletas y Sa = 30 min.",
         datos=[arch("CPA-041/ventas.203002.txt", ["01d08h00m:7,14,c0411,02,4"]),
                arch("CPA-041/bloqueo.203002.txt", ["01d08h10m-01d20h00m:17,4,17,24"]),
                "Por y = 14, el auto llegaría a (17, 14) hacia las 08:15, con el bloqueo ya vigente."],
         pasos=["Subir ambos archivos y ejecutar la simulación.",
                "Revisar la ruta del auto a las 08:00 y después de la replanificación de las 08:30.",
                "Seguir al auto hasta la entrega."],
         esperado=["El auto no pasa por ningún nodo con x = 17 y 4 ≤ y ≤ 24 mientras el bloqueo está vigente, ya sea porque "
                   "el plan de las 08:00 lo anticipa o porque la replanificación cambia la ruta.",
                   "El auto llega al destino del pedido c0411 antes de su hora límite (12:00)."]),
    dict(id="CPA-042", ag="AG-02", nombre="Media vuelta ante un nodo bloqueado",
         le=["LE-055"], clases="AB-V2",
         pre="Simulación de 5 días con fecha de inicio 01/03/2030 y flota de 1 auto, 0 motos y 0 bicicletas.",
         datos=[arch("CPA-042/ventas.203003.txt", ["01d08h00m:47,14,c0421,02,8"]),
                arch("CPA-042/bloqueo.203003.txt", ["01d08h08m-01d20h00m:33,4,33,24"]),
                "El auto sale a las 08:00 por y = 14 y alcanza (32, 14) a las 08:07; el bloqueo de (33, 14) empieza mientras "
                "recorre el tramo (32, 14)–(33, 14)."],
         pasos=["Subir ambos archivos y ejecutar la simulación.",
                "Comprobar en el detalle de la ruta que el plan de las 08:00 pasa por (33, 14). Si el plan ya evita el "
                "bloqueo, el caso no aplica a esta ejecución.",
                "Observar al auto entre las 08:07 y las 08:12."],
         esperado=["El auto no atraviesa el nodo (33, 14) ni gira hacia los lados.",
                   "Retorna por el mismo tramo hasta (32, 14) y sigue una ruta que rodea el bloqueo.",
                   "Los kilómetros recorridos incluyen el tramo de ida y vuelta."]),
    dict(id="CPA-043", ag="AG-02", nombre="Carga masiva de un archivo de bloqueos válido",
         le=["LE-038"], clases="AB-V1 (límites: inicio = fin; puntos en el borde de la retícula)",
         pre="Pantalla «Configuración de escenario».",
         datos=[arch("CPA-043/bloqueo.202901.txt", [
             ("01d06h00m-01d18h00m:10,10,10,20", "dos puntos"),
             ("01d08h00m-01d08h00m:30,05,40,05,40,15", "inicio = fin, tres puntos"),
             ("02d00h00m-03d00h00m:00,00,00,50", "borde x = 0"),
             ("02d10h00m-02d12h00m:60,50,70,50", "termina en (70, 50)")]),
                "Los comentarios a la derecha no forman parte del archivo."],
         pasos=["En Bloqueos, pulsar «Subir archivo» y elegir el archivo."],
         esperado=["El sistema informa 4 bloqueos válidos del mes 202901.", "Se muestra «Guardado para el mes 202901»."]),
    dict(id="CPA-044", ag="AG-02", nombre="Archivo de bloqueos con registros inválidos",
         le=["LE-038"], clases="AB-I1, AB-I2, AB-I3, AB-I4, AB-I5 (una clase inválida por línea)",
         pre="Pantalla «Configuración de escenario».",
         datos=[arch("CPA-044/bloqueo.202902.txt", [
             ("01d06h00m-01d18h00m:10,10,10,20", "1: válida"), ("01d18h00m-01d06h00m:10,10,10,20", "2: fin anterior al inicio"),
             ("01d06h00m-01d18h00m:10,10", "3: un solo punto"), ("01d06h00m-01d18h00m:65,50,71,50", "4: punto fuera"),
             ("01d06h00m-01d18h00m:10,10,20,20", "5: diagonal"), ("01d06h00m-01dXXh00m:10,10,10,20", "6: marca mal formada")]),
                "Los comentarios a la derecha no forman parte del archivo."],
         pasos=["Subir el archivo como archivo de bloqueos."],
         esperado=["Se reportan 5 líneas con error (2, 3, 4, 5 y 6).",
                   "El archivo no se guarda y no se puede ejecutar la simulación hasta corregirlo."]),
    dict(id="CPA-045", ag="AG-02", nombre="Registro de una avería válida en el día a día",
         le=["LE-039", "LE-068", "LE-045"], clases="AV-V1, AV-V4, AV-V5, AV-V7",
         pre="Operación día a día en curso con la unidad M-03 en ruta y con carga.",
         datos=["Ejecución «dia-a-dia»; cuerpo {\"unidad\": \"M-03\", \"tipo\": 1}."],
         pasos=["En Swagger UI, ejecutar POST /api/ejecuciones/dia-a-dia/averias con los datos.",
                "Revisar la respuesta y el panel «Averías activas» del visualizador."],
         esperado=["La API responde 202 con la unidad, el tipo, el instante de la avería (el del reloj de la operación) y la "
                   "reincorporación estimada (instante + 2 h).",
                   "La avería se ubica en la posición actual de la unidad.",
                   "M-03 pasa al estado «Averiada» y aparece en «Averías activas».",
                   "El registro dispara una replanificación de los pedidos de M-03 sin esperar al siguiente Sa."]),
    dict(id="CPA-046", ag="AG-02", nombre="Avería con tipo inválido",
         le=["LE-039"], clases="AV-I1",
         pre="Operación día a día en curso.",
         datos=["Unidad A-01. Intento 1: tipo 4. Intento 2: tipo 0."],
         pasos=["Ejecutar POST /api/ejecuciones/dia-a-dia/averias con cada tipo."],
         esperado=["La API responde 400 con «Tipo de averia invalido: 4 (use 1, 2 o 3)» o con 0, según el intento.",
                   "La unidad no cambia de estado."]),
    dict(id="CPA-047", ag="AG-02", nombre="Avería de una unidad inexistente o ya averiada",
         le=["LE-039"], clases="AV-I2, AV-I3",
         pre="Operación día a día en curso con la flota por defecto (10 autos) y M-03 averiada (CPA-045).",
         datos=["Intento 1: unidad A-11, tipo 1. Intento 2: unidad M-03, tipo 2."],
         pasos=["Ejecutar POST /api/ejecuciones/dia-a-dia/averias con cada intento."],
         esperado=["A-11: la API responde 404 porque la unidad no pertenece a la flota de la ejecución.",
                   "M-03: la API responde 409 con «La unidad M-03 ya esta averiada».",
                   "No se registra ninguna avería nueva."]),
    dict(id="CPA-048", ag="AG-02", nombre="Avería de tipo 1 y redistribución de pedidos",
         le=["LE-052", "LE-040", "LE-093", "LE-094"], clases="AV-V1, AV-V5, AV-V7 (límites: avería + 1 h 59 min y + 2 h)",
         pre="Simulación de 5 días con fecha de inicio 01/04/2030 y flota de 2 autos, 0 motos y 0 bicicletas.",
         datos=[arch("CPA-048/ventas.203004.txt", ["01d08h00m:47,14,c0481,05,8", "01d08h00m:47,16,c0482,05,8"]),
                "Avería de tipo 1 registrada con POST /api/ejecuciones/{id}/averias a las 08:15 sobre el auto que lleva los "
                "pedidos (U)."],
         pasos=["Subir el archivo, ejecutar la simulación y pausarla a las 08:15.",
                "Anotar el código del auto en ruta con los pedidos (U) y registrar la avería.",
                "Revisar a qué unidad pasan los pedidos de U.", "Pausar a las 10:14 y a las 10:15 y revisar el estado de U."],
         esperado=["Los pedidos de U se asignan al otro auto y llegan a su destino antes de su hora límite (16:00).",
                   "Las demás unidades pueden pasar por el punto de la avería: la vía no queda bloqueada.",
                   "A las 10:14 U sigue «Averiada» en el lugar de la avería y el mapa muestra el distintivo de la avería de tipo 1.",
                   "A las 10:15 U vuelve a operar desde ese lugar y el distintivo deja de mostrarse."]),
    dict(id="CPA-049", ag="AG-02", nombre="Avería de tipo 2 y traslado al almacén central",
         le=["LE-053", "LE-040", "LE-093", "LE-094"], clases="AV-V2, AV-V5, TU-V1",
         pre="Ejecución de CPA-048 repetida desde el inicio, con una avería de tipo 2 en lugar de la de tipo 1.",
         datos=[ref("CPA-048/ventas.203004.txt"), "Avería de tipo 2 sobre U a las 08:15 (turno de 07:00 a 15:00)."],
         pasos=["Registrar la avería.", "Pausar a las 12:14 y a las 12:15.",
                "Seguir el estado de U hasta que vuelva a estar disponible."],
         esperado=["Hasta las 12:14 U permanece en el lugar de la avería con el distintivo de la avería de tipo 2.",
                   "A las 12:15 U aparece en el almacén central, junto con la carga que no se trasbordó.",
                   "U no vuelve a estar disponible antes de las 23:00 del 01/04/2030 (fin del turno siguiente) y está "
                   "disponible a partir de esa hora.",
                   "Los pedidos de U se redistribuyen."]),
    dict(id="CPA-050", ag="AG-02", nombre="Avería de tipo 3 y traslado al almacén central",
         le=["LE-054", "LE-040", "LE-093", "LE-094"], clases="AV-V3, AV-V5, TU-V2",
         pre="Ejecución de CPA-048 repetida desde el inicio, con una avería de tipo 3 en lugar de la de tipo 1.",
         datos=[ref("CPA-048/ventas.203004.txt"), "Avería de tipo 3 sobre U a las 08:15 del 01/04/2030."],
         pasos=["Registrar la avería.", "Pausar a las 12:15.", "Seguir el estado de U en los días siguientes."],
         esperado=["U se muestra con el distintivo de la avería de tipo 3, distinto de los de tipo 1 y 2.",
                   "A las 12:15 U se traslada al almacén central, junto con la carga que no se trasbordó.",
                   "U no está disponible durante al menos 2 días (hasta las 08:15 del 03/04/2030).",
                   "U se reincorpora a las 15:00 del 03/04/2030, al inicio del turno de 15:00 a 23:00."]),
    dict(id="CPA-051", ag="AG-02", nombre="Carga masiva de averías",
         le=["LE-065"], clases="AV-V1, AV-V2, AV-V3, AV-V4, AV-V7, AV-I1, AV-I2, AV-I4",
         pre="Pantalla «Configuración de escenario» con la flota por defecto.",
         datos=["Archivo de averías con 6 líneas, en el formato de averías del sistema:",
                "Válidas: A-01 tipo 1 a las 01d10h00m; M-02 tipo 2 a las 01d11h00m; B-03 tipo 3 a las 01d12h00m.",
                "Inválidas: A-02 tipo 4 (AV-I1); A-99 tipo 1 (AV-I2); M-04 tipo 1 con marca «01dXXh00m» (AV-I4)."],
         pasos=["Subir el archivo de averías.", "Quitar las líneas inválidas, volver a subirlo y ejecutar la simulación."],
         esperado=["El primer intento reporta las 3 líneas inválidas con su número y no guarda el archivo.",
                   "El archivo corregido se acepta con la unidad, el tipo y el instante de cada avería.",
                   "Durante la simulación, cada avería ocurre en su instante sobre la unidad indicada."]),
    dict(id="CPA-052", ag="AG-02", nombre="Reasignación de carga en camino hacia el pedido más crítico",
         le=["LE-041", "LE-042", "LE-101"], clases="Condiciones (a), (b) y (c) de LE-041 satisfechas; AV-V2, AV-V5",
         pre="Simulación de 5 días con fecha de inicio 01/05/2030 y flota de 0 autos, 2 motos y 0 bicicletas.",
         datos=[arch("CPA-052/ventas.203005.txt", ["01d08h00m:47,10,c0521,05,4", "01d08h00m:5,14,c0522,08,36"]),
                "P1 = c0521 (5 u., hora límite 12:00), al este. P2 = c0522 (8 u., plazo 36 h), al oeste. Como 5 + 8 > 8, "
                "van en motos distintas: U1 con P1 y U2 con P2."],
         pasos=["Subir el archivo, ejecutar la simulación y pausarla a las 08:15.",
                "Comprobar que U1 lleva solo P1 y U2 solo P2, ambas en ruta. Si no es así, el caso no aplica a esta ejecución.",
                "Registrar una avería de tipo 2 en U1.",
                "Revisar el pedido más crítico, la carga y la ruta de U2 y la cola de pedidos."],
         esperado=["El sistema identifica a P1 como el pedido más crítico (menor holgura).",
                   "Se transfieren a P1 5 de las 8 unidades que lleva U2 (no más que la carga a bordo).",
                   "U2 llega a P1 antes de las 12:00 y luego entrega 3 unidades a P2, con holgura no negativa.",
                   "Las 5 unidades de P2 que U2 ya no puede cubrir vuelven a la cola de pedidos por atender.",
                   "Al quedar sin carga, U2 retorna a un almacén según LE-063."]),
    dict(id="CPA-053", ag="AG-02", nombre="Reasignación descartada por holgura negativa",
         le=["LE-041"], clases="Condición (c) de LE-041 no satisfecha; AV-V2, AV-V5",
         pre="Simulación de 5 días con fecha de inicio 01/06/2030 y flota de 0 autos, 2 motos y 0 bicicletas.",
         datos=[arch("CPA-053/ventas.203006.txt", ["01d08h00m:47,10,c0531,05,4", "01d08h00m:5,14,c0532,08,4"]),
                "P1 = c0531 y P2 = c0532, ambos con hora límite 12:00 y en direcciones opuestas. Si U2 se desviara hacia P1, "
                "llegaría a P2 después de las 12:00."],
         pasos=["Subir el archivo, ejecutar la simulación y pausarla a las 08:15.",
                "Comprobar que U1 lleva solo P1 y U2 solo P2, ambas en ruta.",
                "Registrar una avería de tipo 2 en U1."],
         esperado=["No se transfiere carga desde U2.",
                   "La ruta y la carga de U2 no cambian, y U2 llega a P2 antes de las 12:00.",
                   "El sistema registra P1 como pedido sin planificación factible, con su causa (LE-032)."]),
    dict(id="CPA-054", ag="AG-02", nombre="Selección del escenario por parámetros",
         le=["LE-043"], clases="EJ-V1, EJ-V2, EJ-V3, EJ-I1",
         pre="Sistema desplegado.",
         datos=["Escenarios: Simulación de 5 días, Hasta el colapso, Día a día y un tipo «SEMANAL»."],
         pasos=["Crear una ejecución de cada escenario válido.", "Pedir al servicio de ejecuciones crear el tipo «SEMANAL»."],
         esperado=["Cada escenario válido usa el mismo planificador y difiere solo en sus parámetros.",
                   "El día a día ya está en curso desde el arranque y no se crea dos veces.",
                   "El tipo «SEMANAL» se rechaza con «Tipo de escenario desconocido»."]),
    dict(id="CPA-055", ag="AG-02", nombre="Escenario día a día con ingreso manual y replanificación",
         le=["LE-044", "LE-045", "LE-012"], clases="EJ-V3, PM-V1, PM-V2, PM-V3, PM-V4, PM-V6",
         pre="Operación día a día en curso con los datos de entrada cargados.",
         datos=["Pedido manual: cliente «Bodega San Isidro», destino (50, 40), 6 unidades, plazo 4 h."],
         pasos=["Registrar el pedido manual.", "Revisar la respuesta del registro y el mapa."],
         esperado=["El día a día procesa a la vez los pedidos y bloqueos cargados y los pedidos manuales.",
                   "El ingreso del pedido dispara una replanificación inmediata: se informan el tiempo de cómputo y las "
                   "unidades despachadas.",
                   "El pedido aparece asignado a una unidad en el mapa."]),
    dict(id="CPA-056", ag="AG-02", nombre="Ejecución de la simulación de 5 días",
         le=["LE-046", "LE-069", "LE-085", "LE-089"], clases="EJ-V1, EJ-V4, EJ-V5",
         pre="Pantalla «Configuración de escenario». Datos de ventas y bloqueos disponibles para el periodo.",
         datos=["Fecha de inicio: 01/01/2027. Flota por defecto (10 autos, 15 motos, 12 bicicletas)."],
         pasos=["Elegir «Simulación 5 días», la fecha de inicio y la flota.", "Pulsar «Ejecutar simulación».",
                "Dejar correr la simulación hasta el final."],
         esperado=["La simulación consume los pedidos y bloqueos de los archivos de entrada del periodo.",
                   "Se muestran la fecha y hora simuladas (precisión de minuto) y el tiempo simulado transcurrido.",
                   "Se muestran la fecha y hora reales y el tiempo real transcurrido desde el inicio.",
                   "La simulación termina al cumplirse 5 días simulados (06/01/2027 00:00) en estado Finalizada."]),
    dict(id="CPA-057", ag="AG-02", nombre="Simulación hasta el colapso logístico",
         le=["LE-047", "LE-067", "LE-069"], clases="EJ-V2, PZ-N1",
         pre="Pantalla «Configuración de escenario».",
         datos=["Fecha de inicio: 01/03/2027, semana con tensión verificada en el IEN (con pedidos sin rutear). Flota por defecto."],
         pasos=["Elegir «Hasta el colapso» y ejecutar.", "Esperar a que la ejecución se detenga."],
         esperado=["La ejecución se detiene en el instante en que un pedido incumple su plazo.",
                   "Se registran el instante del colapso (fecha, hora y minuto), el pedido que falla y la causa.",
                   "La ejecución queda en estado Colapsada."]),
    dict(id="CPA-058", ag="AG-02", nombre="Fecha y hora de inicio con precisión de minuto",
         le=["LE-056"], clases="EJ-V4 (hora distinta de 00:00)",
         pre="Pantalla «Configuración de escenario».",
         datos=["Inicio: 01/01/2027 a las 08:30."],
         pasos=["Ingresar la fecha y la hora de inicio.", "Ejecutar la simulación."],
         esperado=["El sistema pide la fecha y la hora (hh:mm) de inicio.",
                   "El reloj simulado arranca en 01/01/2027 08:30 y los pedidos anteriores a esa hora no se consideran nuevos."]),
    dict(id="CPA-059", ag="AG-02", nombre="Ejecución sin fecha de inicio o sin datos para el periodo",
         le=["LE-056"], clases="EJ-I2, EJ-I7",
         pre="Pantalla «Configuración de escenario».",
         datos=["Intento 1: fecha de inicio vacía. Intento 2: fecha de inicio 01/01/2035, mes sin archivo de pedidos. Flota "
                "por defecto en ambos."],
         pasos=["Intentar ejecutar la simulación con cada configuración."],
         esperado=["Intento 1: el botón «Ejecutar simulación» queda deshabilitado y se indica que falta definir la fecha de inicio.",
                   "Intento 2: la ejecución se rechaza indicando que no hay datos de pedidos para el periodo."]),
    dict(id="CPA-060", ag="AG-02", nombre="Bloques de consumo (Sc) y frecuencia de replanificación (Sa)",
         le=["LE-057", "LE-058"], clases="PR-V4, PR-V5 (valores por defecto y modificados)",
         pre="Acceso a los parámetros de ejecución. Factor de aceleración k = 180.",
         datos=["Ejecución 1: Sa = 30 min y Sc = 3 min simulados (por defecto; 1 s real con k = 180).",
                "Ejecución 2: Sa = 60 min y Sc = 6 min simulados."],
         pasos=["Ejecutar una simulación con la configuración 1 y revisar en la bitácora los instantes de planificación y "
                "de difusión del estado.", "Repetir con la configuración 2."],
         esperado=["Con Sa = 30 hay una planificación cada 30 min simulados; con Sa = 60, cada 60 min.",
                   "El estado se difunde en bloques de Sc: dos difusiones consecutivas están separadas por 3 min simulados en "
                   "la ejecución 1 y por 6 min en la ejecución 2."]),
    dict(id="CPA-081", ag="AG-02", nombre="Parámetros de ejecución no válidos",
         le=["LE-057", "LE-058"], clases="PR-I4, PR-I5; PR-V4 en su límite (Sa = 1)",
         pre="Acceso a los parámetros de ejecución.",
         datos=["Intento 1: Sa = 0. Intento 2: Sa = −30. Intento 3: Sc = 0. Intento 4: Sa = 1."],
         pasos=["Ingresar cada valor por separado e intentar ejecutar."],
         esperado=["Los intentos 1, 2 y 3 se rechazan con un mensaje que indica el rango permitido y no se crea la ejecución.",
                   "El intento 4 se acepta."]),
    dict(id="CPA-061", ag="AG-02", nombre="Retorno al almacén para recarga",
         le=["LE-063"], clases="AL-V5, AL-V6",
         pre="Caso 1: simulación de 5 días con fecha de inicio 01/07/2030. Caso 2: con fecha de inicio 01/08/2030. Ambos con "
             "flota de 0 autos, 1 moto y 0 bicicletas.",
         datos=["Caso 1:", arch("CPA-061/caso1/ventas.203007.txt", ["01d08h00m:55,24,c0611,08,8"]),
                "Caso 2: el mismo pedido y un bloqueo que rodea al Intermedio 2 durante todo el día 1 y lo deja inaccesible.",
                arch("CPA-061/caso2/ventas.203008.txt", ["01d08h00m:55,24,c0612,08,8"]),
                arch("CPA-061/caso2/bloqueo.203008.txt", [f"01d00h00m-01d23h59m:{ANILLO_I2}"]),
                "El destino (55, 24) está a 5 km del Intermedio 2, a 38 km del central y a 57 km del Intermedio 1."],
         pasos=["En cada caso, subir los archivos, ejecutar la simulación y observar a qué almacén retorna la moto tras "
                "entregar las 8 unidades."],
         esperado=["Caso 1: la moto queda sin carga y retorna al Intermedio 2 (5 km), el almacén con stock más cercano por la "
                   "red de calles, y no al central (38 km).",
                   "Caso 2: con el Intermedio 2 inaccesible, la moto retorna al almacén central, el más cercano de los que "
                   "puede alcanzar (38 km frente a 57 km del Intermedio 1)."]),
    dict(id="CPA-062", ag="AG-02", nombre="Bitácora de la ejecución",
         le=["LE-048"], clases="— (escenario observable, sección 2.3)",
         pre="Ejecución de CPA-040 con una avería de tipo 1 registrada a las 09:30 sobre A-01.",
         datos=["Bloqueo de las 06:00 y avería de las 09:30 de esa ejecución."],
         pasos=["Abrir la bitácora de eventos al terminar."],
         esperado=["La bitácora registra el inicio, el fin y cada incidencia procesada (el bloqueo de las 06:00 y la avería "
                   "de las 09:30), con su instante."]),

    # ------------------------------------------------------------------ AG-03 Visualizador
    dict(id="CPA-063", ag="AG-03", nombre="Mapa de operación y posición de las unidades en tiempo real",
         le=["LE-070", "LE-071", "LE-072", "LE-073", "LE-074"], clases="— (escenario observable, sección 2.3)",
         pre="Simulación de 5 días en curso con la flota por defecto.",
         datos=["Flota por defecto."],
         pasos=["Abrir el visualizador.", "Observar una unidad en ruta durante 1 minuto real."],
         esperado=["El mapa muestra la red de calles, los tres almacenes y la posición de cada unidad.",
                   "La posición de la unidad se actualiza a medida que avanza, sin recargar la página."]),
    dict(id="CPA-064", ag="AG-03", nombre="Dos visualizadores simultáneos e independientes",
         le=["LE-075", "LE-076"], clases="— (1 y 2 visualizadores conectados)",
         pre="Una simulación en curso.",
         datos=["Dispositivo 1: computadora. Dispositivo 2: otra computadora o celular."],
         pasos=["Abrir la misma corrida en ambos dispositivos.",
                "En el dispositivo 1, acercar la zona del Intermedio 1; en el 2, desplazarse a la zona del central."],
         esperado=["Ambos dispositivos muestran la misma ejecución y el mismo instante simulado.",
                   "El zoom y el desplazamiento de un dispositivo no afectan al otro."]),
    dict(id="CPA-065", ag="AG-03", nombre="Detalle de una unidad, un pedido y un almacén",
         le=["LE-077"], clases="— (elemento unidad, pedido y almacén)",
         pre="Simulación en curso.",
         datos=["Unidad A-01, un pedido en ruta y el Intermedio 1."],
         pasos=["Seleccionar cada elemento en el mapa o en los paneles."],
         esperado=["Unidad: código, tipo, estado, carga y ruta.",
                   "Pedido: código, destino, cantidad, hora límite, estado y unidad asignada.",
                   "Almacén: ubicación (12, 38), stock y capacidad (1 000 unidades)."]),
    dict(id="CPA-066", ag="AG-03", nombre="Configuración de los rangos del semáforo",
         le=["LE-078"], clases="RS-V1",
         pre="Acceso a la configuración de la operación.",
         datos=["Holgura: rojo 0,25 y ámbar 0,60 (por defecto 0,15 y 0,40). Inventario: rojo 0,30 y ámbar 0,60 (por "
                "defecto 0,20 y 0,50)."],
         pasos=["Cambiar los rangos y guardar.", "Observar los colores de los pedidos y de los intermedios."],
         esperado=["Los nuevos rangos se aceptan y quedan vigentes.",
                   "Los colores verde, ámbar y rojo se recalculan con los nuevos cortes (por ejemplo, un intermedio con 550 "
                   "unidades pasa de verde a ámbar)."]),
    dict(id="CPA-067", ag="AG-03", nombre="Rangos del semáforo inconsistentes",
         le=["LE-078"], clases="RS-I1, RS-I2 (límites: rojo = ámbar; cortes 0 y 1,20)",
         pre="Acceso a la configuración de la operación.",
         datos=["Intento 1: rojo 0,50 y ámbar 0,40. Intento 2: rojo 0,40 y ámbar 0,40. Intento 3: rojo 0,15 y ámbar 1,20. "
                "Intento 4: rojo 0 y ámbar 0,40."],
         pasos=["Intentar guardar cada configuración."],
         esperado=["El sistema rechaza las cuatro configuraciones con un mensaje que explica la regla (0 < rojo < ámbar < 1).",
                   "Se conservan los rangos vigentes."]),
    dict(id="CPA-068", ag="AG-03", nombre="Semáforo de cumplimiento de plazo del pedido",
         le=["LE-079"], clases="SH-V1, SH-V2, SH-V3, SH-V4 (límites al 40 % y al 15 %); AV-V3, AV-V6",
         pre="Simulación de 5 días con fecha de inicio 01/09/2030, flota de 0 autos, 0 motos y 1 bicicleta y rangos por "
             "defecto (rojo 0,15; ámbar 0,40).",
         datos=[arch("CPA-068/ventas.203009.txt", ["01d08h00m:30,18,c0681,02,36"]),
                "Avería de tipo 3 de B-01 registrada a las 07:00 del 01/09/2030, con la bicicleta en el almacén. Así el "
                "pedido sigue pendiente durante el día 2 (B-01 se reincorpora el 03/09/2030 a las 15:00).",
                "Hora límite del pedido: 02/09/2030 20:00."],
         pasos=["Subir el archivo, ejecutar la simulación, pausarla a las 07:00 y registrar la avería.",
                "Pausar el 02/09/2030 a las 05:35, 05:36, 05:37, 14:35, 14:36 y 14:37 y anotar el color del pedido.",
                "Observar el color cuando el pedido se entrega."],
         esperado=["05:35 (holgura 14 h 25 min) y 05:36 (14 h 24 min, exactamente 40 %): verde.",
                   "05:37 (14 h 23 min), 14:35 (5 h 25 min) y 14:36 (5 h 24 min, exactamente 15 %): ámbar.",
                   "14:37 (5 h 23 min): rojo.",
                   "Al entregarse, el pedido se muestra como cerrado, sin color de alerta."]),
    dict(id="CPA-069", ag="AG-03", nombre="Semáforo de inventario de los intermedios",
         le=["LE-080", "LE-091"], clases="SI-V1, SI-V2, SI-V3 (límites: f igual a cada corte y justo por debajo)",
         pre="Ejecución de CPA-023 pausada a las 15:00 del 01/07/2029, con el Intermedio 1 en 970 unidades (f = 0,97).",
         datos=["Cortes de inventario (rojo; ámbar): 1) 0,20; 0,50 (por defecto). 2) 0,20; 0,97. 3) 0,20; 0,98. "
                "4) 0,97; 0,98. 5) 0,98; 0,99."],
         pasos=["Con cada par de cortes, guardar la configuración y anotar el color del Intermedio 1 en el mapa."],
         esperado=["1) y 2): verde (f ≥ corte ámbar; en 2, f es igual al corte).",
                   "3) y 4): ámbar (corte rojo ≤ f < corte ámbar; en 4, f es igual al corte rojo).",
                   "5): rojo (f < corte rojo).",
                   "El mapa muestra el inventario en unidades o en porcentaje junto al color.",
                   "El almacén central no tiene semáforo de inventario (inventario ilimitado)."]),
    dict(id="CPA-070", ag="AG-03", nombre="Rutas planificadas y depuración del trazo recorrido",
         le=["LE-081", "LE-092"], clases="— (escenario observable, sección 2.3)",
         pre="Simulación en curso con unidades en ruta.",
         datos=["Una moto con una ruta de varios tramos."],
         pasos=["Activar la visualización de rutas.", "Seguir a la moto mientras recorre su ruta."],
         esperado=["Cada unidad muestra su ruta planificada sobre el mapa.",
                   "El tramo ya recorrido se elimina o se diferencia del pendiente."]),
    dict(id="CPA-071", ag="AG-03", nombre="Visualización de averías por tipo y vigencia",
         le=["LE-084", "LE-093", "LE-094"], clases="AV-V1, AV-V2, AV-V3",
         pre="Ejecuciones de CPA-048, CPA-049 y CPA-050.",
         datos=["Averías de tipo 1, 2 y 3."],
         pasos=["Observar el mapa mientras cada unidad está inmovilizada y al reincorporarse."],
         esperado=["Cada avería se muestra en la ubicación de la unidad con un distintivo propio de su tipo, contrastado "
                   "con el resto.",
                   "El distintivo permanece visible mientras la unidad está inmovilizada y desaparece al reincorporarse."]),
    dict(id="CPA-072", ag="AG-03", nombre="Línea de tiempo simulada y reloj real",
         le=["LE-085", "LE-089"], clases="EJ-V1, EJ-V2, EJ-V3",
         pre="Una simulación de 5 días, una hasta el colapso y el día a día en curso.",
         datos=["—"],
         pasos=["Revisar el encabezado de cada escenario."],
         esperado=["En los dos escenarios de simulación se muestran la fecha y hora simuladas (hh:mm), el tiempo simulado "
                   "transcurrido, la fecha y hora reales (hh:mm) y el tiempo real transcurrido.",
                   "En el día a día no se muestra la línea de tiempo simulada."]),
    dict(id="CPA-073", ag="AG-03", nombre="Indicador de cumplimiento de plazos",
         le=["LE-086"], clases="PZ-V1, PZ-N1",
         pre="Simulación de 5 días con fecha de inicio 01/10/2030 y flota de 0 autos, 0 motos y 1 bicicleta.",
         datos=[arch("CPA-073/ventas.203010.txt", ["01d11h00m:47,14,c0730,08,4"] + PEDIDOS_073),
                "c0730 no puede llegar a tiempo (el mismo caso de CPA-038). Los otros 9 pedidos, de 1 unidad y plazo 36 h, "
                "están a menos de 3 km del central y llegan el día 2, cuando c0730 ya se entregó."],
         pasos=["Subir el archivo y ejecutar la simulación hasta que se entreguen los 10 pedidos.",
                "Revisar el indicador de cumplimiento."],
         esperado=["c0730 llega a su destino después de su hora límite (15:00) y los otros 9 dentro de su plazo.",
                   "El indicador muestra 90 % (9 pedidos entregados a tiempo / 10 pedidos entregados)."]),
    dict(id="CPA-074", ag="AG-03", nombre="Exportación de los reportes de desempeño",
         le=["LE-088"], clases="— (escenario observable, sección 2.3)",
         pre="Simulación finalizada.",
         datos=["Reporte de la simulación de CPA-056."],
         pasos=["Elegir «Exportar» en el reporte de desempeño."],
         esperado=["Se descarga un archivo con los gráficos de desempeño y sus indicadores."]),
    dict(id="CPA-075", ag="AG-03", nombre="Panel de unidades y ocupación de cada unidad",
         le=["LE-095", "LE-090", "LE-062"], clases="OC-V1, OC-V2, OC-V3 (límites 70 % y 90 %)",
         pre="Simulación de 5 días con fecha de inicio 01/11/2030 y flota de 4 autos, 0 motos y 0 bicicletas.",
         datos=[arch("CPA-075/ventas.203011.txt", ["01d08h00m:47,14,c0751,16,4", "01d08h00m:7,14,c0752,17,4",
                                                   "01d08h00m:27,0,c0753,21,4", "01d08h00m:37,4,c0754,22,4"]),
                "Dos pedidos cualesquiera suman más de 24 unidades, así que cada auto lleva uno."],
         pasos=["Subir el archivo y ejecutar la simulación.", "Pausar cuando los cuatro autos estén en ruta.",
                "Abrir el panel de unidades y observar la ocupación en el panel y en el mapa."],
         esperado=["El panel lista cada unidad con código, tipo, estado y ocupación (número o porcentaje).",
                   "16 u. (66,7 %): verde. 17 u. (70,8 %) y 21 u. (87,5 %): ámbar. 22 u. (91,7 %): rojo.",
                   "El mapa muestra la misma ocupación de cada unidad."]),
    dict(id="CPA-076", ag="AG-03", nombre="Ocupación global de la flota",
         le=["LE-098"], clases="OC-V2",
         pre="Simulación de CPA-075 pausada con los cuatro autos en ruta.",
         datos=["Carga a bordo: 16 + 17 + 21 + 22 = 76 unidades. Capacidad de la flota: 4 × 24 = 96 unidades."],
         pasos=["Revisar el indicador global de ocupación."],
         esperado=["El indicador muestra una ocupación de 79,2 % (76 / 96), en color ámbar."]),
    dict(id="CPA-077", ag="AG-03", nombre="Filtrado de pedidos en el panel",
         le=["LE-097"], clases="CF-V3, CF-V4",
         pre="Simulación de 5 días con fecha de inicio 01/01/2027 y flota por defecto, con pedidos despachados desde "
             "distintos almacenes.",
         datos=["Filtro 1: almacén Intermedio 1. Filtro 2: un nodo de destino presente en la cola. Filtro 3: estado En ruta. "
                "Filtro 4: destino (0, 50), sin pedidos."],
         pasos=["Aplicar cada filtro en el panel de pedidos."],
         esperado=["Los filtros 1, 2 y 3 muestran solo los pedidos que cumplen el criterio.",
                   "El filtro 4 muestra la lista vacía con un mensaje informativo."]),
    dict(id="CPA-078", ag="AG-03", nombre="Reporte de cierre por escenario",
         le=["LE-099"], clases="— (fin de 5 días, colapso y cierre del día a día)",
         pre="Ejecuciones de CPA-056 y CPA-057 terminadas. Operación día a día en curso.",
         datos=["—"],
         pasos=["Abrir el reporte de cierre de la simulación de 5 días y del colapso.",
                "Cerrar la operación del día a día y abrir su reporte de cierre."],
         esperado=["Cada uno de los tres reportes presenta la última planificación estable antes del cierre.",
                   "En el colapso, el reporte incluye el instante, el pedido que falla y la causa."]),
    dict(id="CPA-079", ag="AG-03", nombre="Pedidos entregados recientemente",
         le=["LE-100"], clases="PR-V6, PR-I6",
         pre="Ejecución con pedidos entregados en las últimas 6 horas.",
         datos=["Ventana de 2 h, luego de 6 h y luego de 0 h."],
         pasos=["Revisar el listado con la ventana de 2 h.", "Cambiar la ventana a 6 h.", "Intentar cambiar la ventana a 0 h."],
         esperado=["El listado contiene solo los pedidos entregados dentro de la ventana configurada.",
                   "Al ampliar la ventana se agregan los entregados entre 2 y 6 h atrás.",
                   "La ventana de 0 h se rechaza y se conserva la de 6 h."]),
]

# Cambios respecto de la version 2.0 (seccion 8)
CAMBIOS = [
    "Costos por km: S/ 8,00 (auto), S/ 6,00 (moto) y S/ 3,00 (bicicleta), según el enunciado y la hoja «Flota» del Q&A. "
    "CPA-030 y CPA-039 se recalculan: la ruta de 20 km de una moto cuesta S/ 120,00.",
    "Hora de entrega fuera del plazo (Q&A, pregunta 11): el cumplimiento se mide por la llegada al destino. CPA-038 y "
    "CPA-073 se rediseñan: con los almacenes vigentes, una bicicleta llega a (0, 0) en 3 h 25 min y el caso anterior no "
    "producía colapso.",
    "Cambio de turno (Q&A, pregunta 12): CPA-031 verifica que la unidad sigue su ruta con el relevo del conductor, en lugar "
    "de exigir que ninguna ruta cruce el fin del turno. Se agrega la clase TU-V5.",
    "Averías de tipo 2 y 3 (Q&A, pregunta 3): CPA-049 y CPA-050 verifican las 4 h en el lugar y el traslado al almacén central.",
    "Vigencia de los bloqueos: intervalo cerrado [inicio, fin]. CPA-040 corrige su resultado esperado (a las 18:00 el bloqueo "
    "sigue vigente y a las 18:01 ya no) y se rediseña para que la ruta deba rodear el bloqueo.",
    "Datos dedicados: cada caso de simulación usa su propio mes (2029-04 a 2030-11) y su archivo en docs/cpa/datos, con el "
    "contenido incluido en el caso, para que los casos no interfieran entre sí. Las simulaciones arrancan a las 00:00 de la "
    "fecha de inicio. Casos rediseñados: CPA-009, 012, 021, 023, 024, 031, 033, 035, 036, 038, 040, 041, 042, 048 a 050, "
    "052, 053, 061, 068, 069, 073 y 075.",
    "Almacén de origen y retorno (CPA-023, CPA-036, CPA-061): el despacho desde un intermedio se fuerza con una unidad que "
    "termina una entrega cerca de él, y su falta de disponibilidad se fuerza con un bloqueo que lo rodea.",
    "Semáforo de inventario (CPA-069): los límites se prueban fijando los cortes sobre un stock conocido (970 unidades), "
    "porque no es posible llevar un intermedio a 500, 499, 200 y 199 unidades exactas con datos de entrada.",
    "Clases no admitidas (N): TU-I1, CP-I1 y PZ-I1 pasan a ser TU-N1, CP-N1 y PZ-N1, porque describen salidas del "
    "planificador y no entradas que se rechazan.",
    "Clases nuevas: PM-I11 (Y vacía), PM-I12 (plazo fuera del catálogo), AP-I8, EJ-I7, TU-V5, CP-V5, CP-V6 y los grupos PR, "
    "CF, AL y LL. Todas las clases que usan los casos están definidas en la sección 4 y todas las definidas se usan.",
    "Casos nuevos: CPA-080 y CPA-081 (parámetros no válidos). Casos ampliados: CPA-006, CPA-008, CPA-010, CPA-014, "
    "CPA-059, CPA-067 y CPA-079.",
    "Resultados concretos: transferencia de 5 unidades (CPA-052), límites exactos del semáforo a las 05:36 y 14:36 "
    "(CPA-068), ocupación global de 79,2 % (CPA-076) y distancias de las rutas (CPA-021, CPA-040, CPA-061).",
    "Otros ajustes: CPA-007 deja de trazarse a LE-010; CPA-027 corrige el mensaje esperado (0 a 50 unidades por tipo y al "
    "menos 1 en total); CPA-078 incluye el cierre del día a día; los archivos de bloqueos usan el nombre bloqueo.AAAAMM.txt.",
]


# ---------------------------------------------------------------------------------------------
# Render
# ---------------------------------------------------------------------------------------------
def e(texto):
    return html.escape(texto, quote=False)


def prioridad(caso):
    return "Alta" if any(LE[le][1] == "E" for le in caso["le"]) else "Media"


def ids_clases():
    return [cid for _, _, _, filas, _ in CLASES for _, v, i in filas for cid, _ in v + i]


def validar():
    ids = [c["id"] for c in CASOS]
    assert len(ids) == len(set(ids)), "ids de caso repetidos"
    for caso in CASOS:
        for le in caso["le"]:
            assert le in LE, f"{caso['id']}: {le} no existe en la LE"
    cubiertas = {le for c in CASOS for le in c["le"]}
    faltantes = sorted(set(LE) - cubiertas)
    assert not faltantes, f"exigencias sin caso: {faltantes}"
    definidas = ids_clases()
    assert len(definidas) == len(set(definidas)), "ids de clase repetidos"
    usadas = {cid for c in CASOS for cid in re.findall(r"\b[A-Z]{2}-[VIN]\d+\b", c["clases"])}
    sin_definir = sorted(usadas - set(definidas))
    assert not sin_definir, f"clases usadas sin definir: {sin_definir}"
    sin_usar = sorted(set(definidas) - usadas)
    assert not sin_usar, f"clases definidas sin caso: {sin_usar}"


def portada():
    integrantes = "".join(f"<p>{n}</p>" for n in [
        "Alvarez Castillo, Diego Stefano (20220461)",
        "Davila Mosquera, Jhonatan Cesar (20203840)",
        "Gutierrez Lopez, Jose Francisco (20222353)",
        "Segura Mamani, Ronaldo Tito (20222051)",
    ])
    return f"""
<section class="portada">
  <p class="inst">PONTIFICIA UNIVERSIDAD CATÓLICA DEL PERÚ<br>FACULTAD DE CIENCIAS E INGENIERÍA</p>
  <h1>CPA – Catálogo de Pruebas de Aceptación</h1>
  <div class="datos-portada">
    <p><b>Curso:</b> Proyecto de Diseño y Desarrollo de Software</p>
    <p><b>Horario:</b> H-0983</p>
    <p><b>Profesor:</b> Fernández Sánchez, Juan Carlos</p>
    <p><b>Equipo:</b> 2B</p>
    <p><b>Proyecto:</b> PaqTracker</p>
    <p><b>Integrantes:</b></p>
    <div class="integrantes">{integrantes}</div>
  </div>
  <p class="lugar">Lima, Octubre 2026</p>
</section>"""


def historial():
    equipo = "Diego Alvarez<br>Jhonatan Davila<br>Jose Gutierrez<br>Ronaldo Segura"
    filas = "".join(f"<tr><td>{fecha}</td><td>{version}</td><td>{e(descripcion)}</td><td>{equipo}</td></tr>"
                    for fecha, version, descripcion in HISTORIAL)
    return f"""
<h2>Historial de revisiones</h2>
<table class="tabla">
  <thead><tr><th style="width:14%">Fecha</th><th style="width:10%">Versión</th><th>Descripción</th><th style="width:22%">Equipo</th></tr></thead>
  <tbody>{filas}</tbody>
</table>"""


def introduccion():
    n_e = sum(1 for v in LE.values() if v[1] == "E")
    n_d = len(LE) - n_e
    n_clases = len(ids_clases())
    return f"""
<h2>1. Introducción</h2>
<h3>1.1. Propósito</h3>
<p>Este catálogo define las pruebas de aceptación con las que se verifica que PaqTracker cumple la Lista de
Exigencias (LE v4.0). Cada caso indica las exigencias que verifica, las clases de equivalencia que cubre, los datos
de entrada, los pasos y el resultado esperado. Las columnas «Resultado obtenido» y «Estado» se completan al ejecutar
las pruebas sobre la solución integrada y desplegada.</p>
<h3>1.2. Alcance</h3>
<p>El catálogo cubre las {len(LE)} exigencias de la LE ({n_e} exigibles y {n_d} deseables) en sus tres agrupadores:
Registro de Pedidos (AG-01), Planificador de Rutas (AG-02) y Visualizador (AG-03). Contiene {len(CASOS)} casos de
prueba construidos sobre {n_clases} clases de equivalencia. La sección 6 muestra la trazabilidad de cada exigencia a
sus casos.</p>
<h3>1.3. Referencias</h3>
<ul>
  <li>LE – Lista de Exigencias, versión 4.0 (16/09/2026).</li>
  <li>DP – Definición de Producto (requisitos de alto nivel RAN-01 a RAN-08).</li>
  <li>Enunciado de la situación auténtica, semestre 2026-2 (flota, costos por km, turnos y plazos).</li>
  <li>Preguntas y respuestas publicadas del curso 1INF54 2026-2 (precisiones de la sección 3.1).</li>
  <li>ISA – Informe de selección del algoritmo (experimentación numérica).</li>
  <li>IEN – Informe de diseño de experimento, 22.dis.experim.v02 (semana con tensión verificada).</li>
</ul>

<h2>2. Técnica de derivación de los casos</h2>
<h3>2.1. Partición en clases de equivalencia</h3>
<p>Para cada exigencia con datos de entrada se identificaron las variables que recibe el sistema y se dividió su
dominio en clases de equivalencia: conjuntos de valores que el sistema debe tratar de la misma forma. Se espera que
un valor cualquiera de una clase revele los mismos defectos que el resto. Cada clase es de uno de tres tipos:</p>
<ul>
  <li><b>Válida</b> (V): el sistema debe aceptar sus valores.</li>
  <li><b>Inválida</b> (I): el sistema debe rechazar sus valores con un mensaje, sin alterar su estado.</li>
  <li><b>No admitida</b> (N): no es una entrada, sino un resultado que el planificador no debe producir (por ejemplo,
  cargar una unidad por encima de su capacidad). Se verifica observando el plan o la ejecución.</li>
</ul>
<p>Los casos se construyeron con tres reglas:</p>
<ol>
  <li>Un caso válido cubre la mayor cantidad posible de clases válidas aún no cubiertas.</li>
  <li>Un caso inválido cubre una sola clase inválida, con valores válidos en las demás variables, para que un rechazo
  se atribuya sin ambigüedad a la clase probada. En los archivos de carga masiva cada línea se valida por separado,
  así que un mismo archivo puede reunir varias líneas inválidas, cada una con una sola clase inválida. Si un caso
  tiene varios intentos, cada intento es independiente y prueba una sola clase inválida.</li>
  <li>Un caso que verifica una clase no admitida usa datos válidos que podrían llevar a producir esa salida y
  comprueba que no se produce.</li>
</ol>
<h3>2.2. Análisis de valores límite</h3>
<p>Cuando una clase es un rango, la prueba usa valores en su frontera (el límite y el valor contiguo de la clase
vecina): bordes de la retícula, capacidad de las unidades, plazo máximo, horarios de turno, inicio y fin de la vigencia
de un bloqueo, duración de una avería, recarga de los intermedios y cortes de los semáforos.</p>
<h3>2.3. Exigencias sin datos de entrada</h3>
<p>Las exigencias de visualización y las que describen un comportamiento interno del planificador se verifican con
escenarios observables: se fija una situación de partida y se comprueba el resultado en la interfaz o en los registros
del sistema. En esos casos el campo «Clases cubiertas» indica «escenario observable».</p>
<h3>2.4. Reproducibilidad de los casos</h3>
<p>Cuando el resultado depende de decisiones del planificador (qué unidad atiende un pedido o desde qué almacén sale),
el caso usa un archivo de datos dedicado y una flota reducida que fuerzan la situación, y los resultados esperados se
calculan a mano (distancias, horas y costos). Cada caso de simulación usa un mes propio, de modo que sus archivos no
se mezclan con los de otro caso. Si una precondición que se comprueba durante la ejecución no se cumple, el caso indica
que no aplica a esa ejecución, en lugar de registrarse como conforme o no conforme.</p>

<h2>3. Entorno y datos de prueba</h2>
<h3>3.1. Precisiones que aplican los resultados esperados</h3>
<p>Los resultados esperados aplican las siguientes precisiones del curso y acuerdos del equipo, que prevalecen sobre
el texto de la LE v4.0 en los puntos indicados.</p>
<table class="tabla">
  <thead><tr><th style="width:17%">Exigencias</th><th>Precisión</th><th style="width:24%">Fuente</th></tr></thead>
  <tbody>{''.join(f"<tr><td>{e(exig)}</td><td>{e(precision)}</td><td>{e(fuente)}</td></tr>" for exig, precision, fuente in DECISIONES)}</tbody>
</table>
<h3>3.2. Entorno</h3>
<table class="tabla kv">
  <tbody>
  <tr><th>Sistema bajo prueba</th><td>Solución integrada de PaqTracker (API de operación, planificador y visualizador web) desplegada en el entorno del curso.</td></tr>
  <tr><th>Navegador</th><td>Google Chrome o Microsoft Edge actualizados; un segundo dispositivo para CPA-064.</td></tr>
  <tr><th>Datos base</th><td>Ventas <code>ventas.v20260909</code> (2026-01 a 2028-12) y bloqueos <code>bloqueos.v20260909</code>.</td></tr>
  <tr><th>Datos de los casos</th><td>Carpeta <code>docs/cpa/datos/CPA-###/</code> del repositorio, generada por <code>docs/cpa/generar_cpa.py</code>.
  Usan los meses 2029-01 a 2030-11 para no mezclarse con los datos base. Pedidos: <code>ventas.AAAAMM.txt</code>, una línea por
  pedido con el formato <code>##d##h##m:x,y,cNNNN,cantidad,plazo</code>. Bloqueos: <code>bloqueo.AAAAMM.txt</code>, una línea por
  bloqueo con el formato <code>##d##h##m-##d##h##m:x1,y1,…,xn,yn</code>.</td></tr>
  <tr><th>Fecha de inicio</th><td>Cada caso de simulación indica su fecha de inicio; la simulación arranca a las 00:00 de ese día y
  los pedidos llegan según la marca de tiempo de su archivo.</td></tr>
  <tr><th>Almacenes</th><td>Central en (27, 14), inventario ilimitado. Intermedio 1 en (12, 38) e Intermedio 2 en (57, 27), 1 000 unidades cada uno.</td></tr>
  <tr><th>Servicios de la API</th><td>Las operaciones sin pantalla propia (por ejemplo, el registro de averías) se ejecutan desde Swagger UI
  (<code>/swagger-ui.html</code>) sobre la misma API que usa el visualizador.</td></tr>
  <tr><th>Parámetros por defecto</th><td>Flota de 10 autos, 15 motos y 12 bicicletas. Auto: 24 u., 40 km/h y S/ 8,00 por km. Moto: 8 u.,
  25 km/h y S/ 6,00 por km. Bicicleta: 4 u., 12 km/h y S/ 3,00 por km. Sa = 30 min simulados; Sc = 3 min simulados (1 s real con
  k = 180). Semáforo de holgura: rojo 0,15 y ámbar 0,40. Semáforo de inventario: rojo 0,20 y ámbar 0,50. Ocupación: ámbar 0,70 y rojo 0,90.</td></tr>
  <tr><th>Criterio de aceptación</th><td>Un caso es <b>Conforme</b> si todos sus resultados esperados se cumplen; de lo contrario es <b>No conforme</b>
  y se anota la diferencia en «Resultado obtenido».</td></tr>
  </tbody>
</table>
<h3>3.3. Convenciones</h3>
<ul>
  <li>Hora límite = instante de registro (o marca de llegada del archivo) + plazo comprometido.</li>
  <li>Las distancias se miden en kilómetros por la red de calles (1 km por tramo) y el tiempo de recorrido es la distancia
  dividida entre la velocidad de la unidad.</li>
  <li>Los tiempos esperados no incluyen el refrigerio: si la unidad toma su refrigerio durante el recorrido, el tiempo se
  desplaza 1 h (LE-024).</li>
  <li>Holgura de un pedido no entregado = hora límite − instante actual; para el semáforo, f = holgura / plazo.</li>
  <li>Ocupación de una unidad = carga a bordo / capacidad. Ocupación global = carga a bordo de la flota / capacidad total de la flota.</li>
  <li>Los montos están en soles (S/). Las marcas ##d##h##m indican día del mes, hora y minuto.</li>
</ul>"""


def tabla_clases():
    partes = ["<h2>4. Clases de equivalencia</h2>",
              "<p>Identificadores: <b>XX-Vn</b> para las clases válidas, <b>XX-In</b> para las inválidas y <b>XX-Nn</b> para "
              "las no admitidas, donde XX es el grupo. Los identificadores de la versión 2.0 se conservan; las clases nuevas "
              "se numeran a continuación de las existentes.</p>"]
    for i, (codigo, titulo, exig, filas, limites) in enumerate(CLASES, 1):
        cuerpo = []
        tiene_n = any("-N" in cid for _, _, inv in filas for cid, _ in inv)
        for variable, validas, invalidas in filas:
            v = "<br>".join(f"<b>{a}</b> {e(b)}" for a, b in validas) or "—"
            inv = "<br>".join(f"<b>{a}</b> {e(b)}" for a, b in invalidas) or "—"
            cuerpo.append(f"<tr><td>{e(variable)}</td><td>{v}</td><td>{inv}</td></tr>")
        cabecera = "Clases no admitidas" if tiene_n else "Clases inválidas"
        partes.append(f"""
<div class="bloque">
<h3>4.{i}. {codigo} · {e(titulo)} <span class="exig">({exig})</span></h3>
<table class="tabla clases">
  <thead><tr><th style="width:22%">Variable</th><th style="width:42%">Clases válidas</th><th>{cabecera}</th></tr></thead>
  <tbody>{''.join(cuerpo)}</tbody>
</table>
<p class="limites"><b>Valores límite:</b> {e(limites)}</p>
</div>""")
    return "".join(partes)


def bloque_datos(datos):
    partes = []
    for d in datos:
        if isinstance(d, str):
            partes.append(f"<p class='dato'>{e(d)}</p>")
            continue
        titulo = f"Archivo <code>datos/{e(d['archivo'])}</code>" + (" (definido en otro caso)" if d.get("ref") else "") + ":"
        lineas = []
        ancho = max(len(l[0] if isinstance(l, tuple) else l) for l in d["lineas"])
        for l in d["lineas"]:
            if isinstance(l, tuple):
                lineas.append(e(l[0].ljust(ancho + 3)) + f"<span class='com'>({e(l[1])})</span>")
            else:
                lineas.append(e(l) if l else "&nbsp;")
        partes.append(f"<p class='dato arch'>{titulo}</p><pre>{'<br>'.join(lineas)}</pre>")
    return "".join(partes)


def tarjeta(caso):
    les = ", ".join(caso["le"])
    pasos = "".join(f"<li>{e(p)}</li>" for p in caso["pasos"])
    esperado = "".join(f"<li>{e(r)}</li>" for r in caso["esperado"])
    return f"""
<table class="caso">
  <thead><tr><th class="cid">{caso['id']}</th><th colspan="3">{e(caso['nombre'])}</th></tr></thead>
  <tbody>
  <tr><th>Exigencias</th><td>{les}</td><th class="corto">Prioridad</th><td class="corto">{prioridad(caso)}</td></tr>
  <tr><th>Clases cubiertas</th><td colspan="3">{e(caso['clases'])}</td></tr>
  <tr><th>Precondiciones</th><td colspan="3">{e(caso['pre'])}</td></tr>
  <tr><th>Datos de entrada</th><td colspan="3">{bloque_datos(caso['datos'])}</td></tr>
  <tr><th>Pasos</th><td colspan="3"><ol>{pasos}</ol></td></tr>
  <tr><th>Resultado esperado</th><td colspan="3"><ul>{esperado}</ul></td></tr>
  <tr class="ejec"><th>Resultado obtenido</th><td colspan="3"></td></tr>
  <tr class="ejec"><th>Estado</th><td colspan="3">☐ Conforme &nbsp;&nbsp; ☐ No conforme &nbsp;&nbsp; ☐ No aplica &nbsp;&nbsp; Fecha: ___/___/_____ &nbsp;&nbsp; Responsable: __________</td></tr>
  </tbody>
</table>"""


def rango(ids):
    base = [i for i in ids if int(i[4:]) <= 79]
    extra = [i for i in ids if int(i[4:]) > 79]
    texto = f"{base[0]} a {base[-1]}"
    if extra:
        texto += (f" y {extra[0]}" if len(extra) == 1 else ", " + ", ".join(extra[:-1]) + f" y {extra[-1]}")
    return texto


def catalogo():
    partes = ["<h2>5. Catálogo de casos de prueba</h2>",
              "<p>Prioridad <b>Alta</b>: el caso verifica al menos una exigencia exigible (E). "
              "Prioridad <b>Media</b>: verifica solo exigencias deseables (D). Los casos CPA-080 y CPA-081 se añadieron en "
              "la versión 3.0 y se ubican junto a los casos con los que se relacionan, sin alterar la numeración de los "
              "anteriores.</p>"]
    for i, (ag, nombre) in enumerate(AGRUPADORES.items(), 1):
        casos = [c for c in CASOS if c["ag"] == ag]
        partes.append(f"<h3 class='ag'>5.{i}. {ag} · {nombre} ({rango([c['id'] for c in casos])})</h3>")
        partes.extend(tarjeta(c) for c in casos)
    return "".join(partes)


def trazabilidad():
    filas = []
    for le, (nombre, ed, ag) in LE.items():
        casos = ", ".join(sorted(c["id"] for c in CASOS if le in c["le"]))
        filas.append(f"<tr><td>{le}</td><td>{e(nombre)}</td><td class='c'>{ed}</td><td class='c'>{ag}</td><td>{casos}</td></tr>")
    return f"""
<h2>6. Matriz de trazabilidad</h2>
<p>Cada exigencia de la LE v4.0 tiene al menos un caso de prueba de aceptación.</p>
<table class="tabla traza">
  <thead><tr><th style="width:9%">Id.LE</th><th>Nombre del requisito</th><th style="width:6%">E/D</th><th style="width:11%">Agrupador</th><th style="width:34%">Casos de prueba</th></tr></thead>
  <tbody>{''.join(filas)}</tbody>
</table>"""


def resumen():
    filas = []
    tot = [0, 0, 0, 0, 0]
    for ag, nombre in AGRUPADORES.items():
        les = [k for k, v in LE.items() if v[2] == ag]
        e_ = sum(1 for k in les if LE[k][1] == "E")
        casos = [c for c in CASOS if c["ag"] == ag]
        alta = sum(1 for c in casos if prioridad(c) == "Alta")
        fila = [len(les), e_, len(les) - e_, len(casos), alta]
        tot = [a + b for a, b in zip(tot, fila)]
        filas.append(f"<tr><td>{ag}</td><td>{nombre}</td>" + "".join(f"<td class='c'>{x}</td>" for x in fila)
                     + "<td class='c'>100 %</td></tr>")
    filas.append("<tr class='total'><td></td><td>Total</td>" + "".join(f"<td class='c'>{x}</td>" for x in tot)
                 + "<td class='c'>100 %</td></tr>")
    return f"""
<div class="bloque">
<h2>7. Resumen de cobertura</h2>
<table class="tabla">
  <thead><tr><th>Id.Ag</th><th>Agrupador</th><th>Exigencias</th><th>E</th><th>D</th><th>Casos</th>
  <th>Prioridad alta</th><th>Cobertura de la LE</th></tr></thead>
  <tbody>{''.join(filas)}</tbody>
</table>
<p>Un caso puede verificar exigencias de otro agrupador (por ejemplo, CPA-056 verifica la línea de tiempo del Visualizador);
en la tabla se cuenta en el agrupador donde está ubicado. Las {len(ids_clases())} clases de equivalencia están cubiertas por al
menos un caso.</p>
</div>"""


def cambios():
    items = "".join(f"<li>{e(c)}</li>" for c in CAMBIOS)
    return f"""
<h2>8. Cambios respecto de la versión 2.0</h2>
<ul>{items}</ul>"""


ESTILOS = """
@page { size: A4; margin: 14mm 16mm 16mm 16mm; }
* { box-sizing: border-box; }
body { font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; color: #000; margin: 0; line-height: 1.32; }
.portada { height: 263mm; display: flex; flex-direction: column; align-items: center; page-break-after: always; padding-top: 18mm; }
.portada .inst { font-weight: bold; font-size: 13pt; text-align: center; margin: 0 0 40mm; }
.portada h1 { font-size: 17pt; margin: 0 0 22mm; text-align: center; }
.datos-portada { align-self: stretch; padding: 0 6mm; }
.datos-portada p { margin: 0 0 3.5mm; font-size: 11pt; }
.integrantes { text-align: center; }
.integrantes p { margin: 0 0 2mm; }
.portada .lugar { margin-top: auto; font-size: 11pt; }
table.marco { width: 100%; border-collapse: collapse; }
table.marco > thead > tr > td { padding: 0 0 5mm; }
.cabecera { width: 100%; border-collapse: collapse; font-size: 10pt; }
.cabecera td { border: 1px solid #000; padding: 4px 8px; }
h2 { font-size: 13pt; margin: 7mm 0 3mm; page-break-after: avoid; }
h3 { font-size: 11pt; margin: 5mm 0 2mm; page-break-after: avoid; }
h3.ag { font-size: 12pt; margin-top: 7mm; }
p { margin: 0 0 2.2mm; text-align: justify; }
ul, ol { margin: 0 0 2mm; padding-left: 6mm; }
code { font-family: Consolas, monospace; font-size: 9pt; }
pre { font-family: Consolas, monospace; font-size: 8.5pt; margin: 0 0 1.5mm 3mm; white-space: pre; line-height: 1.25; }
pre .com { font-family: 'Times New Roman', Times, serif; font-style: italic; font-size: 9pt; }
p.dato { margin: 0 0 1.2mm; text-align: left; }
p.arch { font-style: italic; }
.exig { font-weight: normal; font-size: 9.5pt; }
.tabla { width: 100%; border-collapse: collapse; margin: 0 0 3mm; font-size: 9.5pt; }
.tabla th, .tabla td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; text-align: left; }
.tabla thead th { background: #e8e8e8; text-align: center; }
.tabla td.c { text-align: center; }
.tabla tr.total td { font-weight: bold; }
.kv th { width: 22%; background: #f2f2f2; }
.traza { font-size: 9pt; }
.traza tr { page-break-inside: avoid; }
.bloque { page-break-inside: avoid; }
.limites { font-size: 9.5pt; }
table.caso { width: 100%; border-collapse: collapse; margin: 0 0 5mm; font-size: 9.5pt; page-break-inside: avoid; }
table.caso th, table.caso td { border: 1px solid #000; padding: 3px 6px; vertical-align: top; text-align: left; }
table.caso thead th { background: #dcdcdc; font-size: 10pt; }
table.caso thead th.cid { width: 21%; }
table.caso tbody th { width: 21%; background: #f2f2f2; font-weight: bold; }
table.caso th.corto { width: 12%; }
table.caso td.corto { width: 12%; }
table.caso ul, table.caso ol { margin: 0; padding-left: 5mm; }
table.caso tr.ejec td { height: 7mm; }
"""


def documento():
    validar()
    cuerpo = historial() + introduccion() + tabla_clases() + catalogo() + trazabilidad() + resumen() + cambios()
    return f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>CPA PaqTracker</title><style>{ESTILOS}</style></head>
<body>
{portada()}
<table class="marco">
  <thead><tr><td>
    <table class="cabecera"><tr><td>PaqTracker</td><td style="width:30%">Versión : {VERSION}</td></tr>
    <tr><td colspan="2">Catálogo de Pruebas de Aceptación</td></tr></table>
  </td></tr></thead>
  <tbody><tr><td>{cuerpo}</td></tr></tbody>
</table>
</body></html>"""


def escribir_datos():
    for ruta, lineas in ARCHIVOS.items():
        destino = DATOS / ruta
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text("\n".join(lineas) + "\n", encoding="utf-8", newline="\n")
    vacio = DATOS / "CPA-015" / "ventas.202903.txt"
    vacio.parent.mkdir(parents=True, exist_ok=True)
    vacio.write_bytes(b"")


if __name__ == "__main__":
    SALIDA.write_text(documento(), encoding="utf-8")
    escribir_datos()
    print(f"{len(CASOS)} casos, {len(ids_clases())} clases, {len(LE)} exigencias cubiertas, "
          f"{len(ARCHIVOS) + 1} archivos de datos -> {SALIDA}")
