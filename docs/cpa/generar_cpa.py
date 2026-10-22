"""Genera el CPA (Catalogo de Pruebas de Aceptacion) de PaqTracker en HTML.

Uso:  py docs/cpa/generar_cpa.py
Salida: docs/cpa/41.acs.catalog.pruebas.acept.vNN.html (se imprime a PDF con Chrome headless).

Los casos se derivan de la LE v4.0 por particion en clases de equivalencia y valores limite.
Para agregar o corregir un caso basta con editar CLASES o CASOS; la matriz de trazabilidad y
el resumen de cobertura se recalculan solos.
"""

import html
from pathlib import Path

VERSION = "2.0"
SALIDA = Path(__file__).with_name("41.acs.catalog.pruebas.acept.v02.html")

# Historial de revisiones: (fecha, version, descripcion)
HISTORIAL = [
    ("20/10/2026", "1.0", "Alta inicial del catálogo: 79 casos de prueba de aceptación derivados de la LE v4.0 por "
                          "partición en clases de equivalencia y análisis de valores límite."),
    ("22/10/2026", "2.0", "Alineamiento con la solución integrada: ubicación de los almacenes (27, 14), (12, 38) y "
                          "(57, 27) y archivos de entrada .txt según los acuerdos del equipo (sección 3.1); mensajes "
                          "del formulario de registro de pedidos actualizados; registro de averías por la API de "
                          "incidencias con sus respuestas de error."),
]

# Acuerdos del equipo que precisan o corrigen la LE v4.0: (exigencias, decision)
DECISIONES = [
    ("LE-015, LE-016",
     "El almacén central se ubica en el nodo (27, 14) y los almacenes intermedios en (12, 38) y (57, 27). "
     "Reemplazan a (25, 15) y (55, 27) del texto de la LE v4.0."),
    ("LE-006",
     "La carga masiva de pedidos usa archivos de texto plano .txt (ventas.AAAAMM.txt), con el formato de los "
     "archivos de datos del curso, en lugar de .csv."),
    ("Resumen de la LE",
     "La LE v4.0 numera de LE-001 a LE-101 (101 exigencias: 77 exigibles y 24 deseables); su resumen indica 100 "
     "porque no contabiliza LE-101. Este catálogo cubre las 101."),
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
# fila: (variable, [(id, descripcion) validas], [(id, descripcion) invalidas])
# ---------------------------------------------------------------------------------------------
CLASES = [
    ("PM", "Registro manual de pedido", "LE-001, LE-002, LE-012", [
        ("Cliente", [("PM-V1", "Texto de 1 a 80 caracteres")],
                    [("PM-I1", "Vacío o solo espacios"), ("PM-I2", "Más de 80 caracteres")]),
        ("Coordenada X del destino", [("PM-V2", "Entero 0 ≤ x ≤ 70")],
                    [("PM-I3", "x < 0"), ("PM-I4", "x > 70"), ("PM-I5", "Vacío o no numérico")]),
        ("Coordenada Y del destino", [("PM-V3", "Entero 0 ≤ y ≤ 50")],
                    [("PM-I6", "y < 0"), ("PM-I7", "y > 50")]),
        ("Cantidad de producto P", [("PM-V4", "1 ≤ c ≤ 24 (cabe en una sola unidad)"),
                                    ("PM-V5", "c > 24 (se atiende en entregas parciales, LE-009)")],
                    [("PM-I8", "c ≤ 0")]),
        ("Plazo comprometido", [("PM-V6", "Plazo del catálogo: 4, 8, 12, 18 o 36 h")],
                    [("PM-I9", "Plazo > 36 h"), ("PM-I10", "Plazo ≤ 0")]),
    ], "x ∈ {−1, 0, 70, 71}; y ∈ {−1, 0, 50, 51}; c ∈ {0, 1, 24, 25}; plazo ∈ {0, 4, 36, 37}; "
       "cliente de 80 y de 81 caracteres."),

    ("AP", "Archivo de pedidos", "LE-006, LE-007", [
        ("Nombre del archivo", [("AP-V1", "ventas.AAAAMM.txt (el mes se toma del nombre)"),
                                ("AP-V2", "Nombre sin mes, con fecha de inicio elegida (se usa el mes de esa fecha)")],
                    [("AP-I1", "Nombre sin mes y sin fecha de inicio elegida")]),
        ("Contenido", [("AP-V3", "Todas las líneas con formato ##d##h##m:x,y,cCLIENTE,cantidad,plazo"),
                       ("AP-V4", "Líneas vacías o comentarios que empiezan con # (se ignoran)")],
                    [("AP-I2", "Archivo vacío"), ("AP-I3", "Línea con menos de 5 campos"),
                     ("AP-I4", "Marca de tiempo mal formada"), ("AP-I5", "Destino fuera de la retícula"),
                     ("AP-I6", "Cantidad ≤ 0"), ("AP-I7", "Plazo ≤ 0")]),
    ], "destino (70, 50) válido y (71, 50) inválido; cantidad 1 válida y 0 inválida."),

    ("AB", "Archivo de bloqueos", "LE-038, LE-066", [
        ("Línea de bloqueo", [("AB-V1", "##d##h##m-##d##h##m:x1,y1,…,xn,yn con inicio ≤ fin, al menos dos puntos, "
                                        "puntos dentro de la retícula y segmentos horizontales o verticales")],
                    [("AB-I1", "Fin anterior al inicio"), ("AB-I2", "Un solo punto"),
                     ("AB-I3", "Punto fuera de la retícula"), ("AB-I4", "Segmento diagonal"),
                     ("AB-I5", "Marca de tiempo mal formada")]),
        ("Instante evaluado", [("AB-V2", "Dentro de la vigencia: el nodo no es transitable"),
                               ("AB-V3", "Fuera de la vigencia: el nodo vuelve a ser transitable")], []),
    ], "inicio = fin (válido); punto (70, 50) válido y (71, 50) inválido; instante igual al fin de la vigencia."),

    ("EJ", "Configuración de la ejecución", "LE-019, LE-043, LE-051, LE-056", [
        ("Escenario", [("EJ-V1", "Simulación de 5 días"), ("EJ-V2", "Hasta el colapso"),
                       ("EJ-V3", "Día a día (en curso desde el arranque del sistema)")],
                    [("EJ-I1", "Tipo de escenario no reconocido")]),
        ("Fecha y hora de inicio", [("EJ-V4", "Fecha y hora (hh:mm) válidas, con datos cargados para ese periodo")],
                    [("EJ-I2", "Sin fecha de inicio")]),
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
    ], "tipo 1: avería + 1 h 59 min (no disponible) y avería + 2 h (disponible)."),

    ("TU", "Turnos y refrigerio", "LE-023, LE-024", [
        ("Instante de operación", [("TU-V1", "Turno 1: [07:00, 15:00)"), ("TU-V2", "Turno 2: [15:00, 23:00)"),
                                   ("TU-V3", "Turno 3: [23:00, 07:00)")], []),
        ("Ubicación del refrigerio", [("TU-V4", "Empieza ≥ 1 h después del inicio y termina ≥ 1 h antes del fin del turno")],
                    [("TU-I1", "A menos de 1 h de un cambio de turno (no debe planificarse)")]),
    ], "06:59 y 07:00; 14:59 y 15:00; 22:59 y 23:00."),

    ("CP", "Capacidad y consolidación", "LE-009, LE-028, LE-029", [
        ("Carga asignada a una unidad", [("CP-V1", "Suma de cantidades < capacidad"),
                                         ("CP-V2", "Suma de cantidades = capacidad")],
                    [("CP-I1", "Suma de cantidades > capacidad (no debe planificarse)")]),
        ("Cantidad de un pedido", [("CP-V3", "≤ 24 (una sola entrega posible)"),
                                   ("CP-V4", "> 24 (entregas parciales con el mismo identificador)")], []),
    ], "moto con 8 de 8 unidades; pedido de 24 y de 25 unidades."),

    ("PZ", "Cumplimiento del plazo", "LE-032, LE-067, LE-086", [
        ("Instante de entrega", [("PZ-V1", "Antes de la hora límite"), ("PZ-V2", "Exactamente en la hora límite")],
                    [("PZ-I1", "Después de la hora límite, o pedido sin planificación factible (colapso)")]),
    ], "entrega en la hora límite y un minuto después."),

    ("SH", "Semáforo de holgura del pedido", "LE-079", [
        ("f = holgura restante / plazo", [("SH-V1", "f ≥ 0,40: verde"), ("SH-V2", "0,15 ≤ f < 0,40: ámbar"),
                                          ("SH-V3", "f < 0,15: rojo"), ("SH-V4", "Pedido entregado: cerrado")], []),
    ], "para un plazo de 36 h: holgura de 14 h 24 min (40 %) y de 5 h 24 min (15 %)."),

    ("SI", "Semáforo de inventario de almacén intermedio", "LE-080, LE-091", [
        ("f = stock / 1 000", [("SI-V1", "f ≥ 0,50: verde (≥ 500 u.)"), ("SI-V2", "0,20 ≤ f < 0,50: ámbar (200 a 499 u.)"),
                               ("SI-V3", "f < 0,20: rojo (≤ 199 u.)")], []),
    ], "stock de 500, 499, 200 y 199 unidades."),

    ("OC", "Ocupación de la unidad", "LE-090, LE-095, LE-098", [
        ("f = carga / capacidad", [("OC-V1", "f < 0,70: verde"), ("OC-V2", "0,70 ≤ f < 0,90: ámbar"),
                                   ("OC-V3", "f ≥ 0,90: rojo")], []),
    ], "auto con 16 (66,7 %), 17 (70,8 %), 21 (87,5 %) y 22 (91,7 %) unidades a bordo."),

    ("RS", "Rangos del semáforo", "LE-078", [
        ("Cortes configurados", [("RS-V1", "0 < corte rojo < corte ámbar < 1")],
                    [("RS-I1", "Corte rojo ≥ corte ámbar"), ("RS-I2", "Corte fuera del intervalo (0, 1)")]),
    ], "cortes iguales (rojo = ámbar); corte 0 y corte 1."),
]

# ---------------------------------------------------------------------------------------------
# Casos de prueba de aceptacion
# ---------------------------------------------------------------------------------------------
CASOS = [
    # ------------------------------------------------------------------ AG-01 Registro de Pedidos
    dict(id="CPA-001", ag="AG-01", nombre="Registro manual de un pedido con datos válidos",
         le=["LE-001", "LE-002", "LE-012"], clases="PM-V1, PM-V2, PM-V3, PM-V4, PM-V6",
         pre="Operación día a día en curso. Reloj de la operación visible.",
         datos="Cliente: «Distribuidora Santa Anita S.A.C.»; destino (43, 18); cantidad 10; plazo 8 h.",
         pasos=["Abrir el módulo Pedidos y elegir «Registrar pedido».",
                "Ingresar los datos y anotar la hora del reloj de la operación.",
                "Pulsar «Registrar y planificar pedido»."],
         esperado=["El pedido queda registrado con un código único (P-#####) que no se repite.",
                   "El instante de registro es el del reloj de la operación (día, hora y minuto), no uno ingresado por el operario.",
                   "Se almacenan el destino (43, 18), la cantidad 10 y el plazo de 8 h.",
                   "La hora límite es igual al instante de registro más 8 h.",
                   "El pedido aparece en la cola de pedidos."]),
    dict(id="CPA-002", ag="AG-01", nombre="Destino en los vértices de la retícula",
         le=["LE-001", "LE-050"], clases="PM-V2, PM-V3 (valores límite)",
         pre="Operación día a día en curso.",
         datos="Pedido A: destino (0, 0). Pedido B: destino (70, 50). Ambos: cliente «Cliente límite», cantidad 1, plazo 36 h.",
         pasos=["Registrar el pedido A.", "Registrar el pedido B."],
         esperado=["Ambos pedidos se registran sin error.",
                   "En el mapa, (0, 0) aparece en el extremo inferior izquierdo y (70, 50) en el superior derecho."]),
    dict(id="CPA-003", ag="AG-01", nombre="Registro con cliente vacío",
         le=["LE-001", "LE-012"], clases="PM-I1",
         pre="Formulario «Registrar pedido» abierto.",
         datos="Cliente: «   » (solo espacios); destino (43, 18); cantidad 10; plazo 8 h.",
         pasos=["Ingresar los datos.", "Intentar registrar el pedido."],
         esperado=["El botón «Registrar y planificar pedido» permanece deshabilitado.",
                   "Se muestra «Completa el cliente para registrar el pedido.».",
                   "No se crea ningún pedido."]),
    dict(id="CPA-004", ag="AG-01", nombre="Registro con nombre de cliente de más de 80 caracteres",
         le=["LE-001", "LE-012"], clases="PM-I2 (límite 81; el valor 80 se cubre como PM-V1)",
         pre="Formulario «Registrar pedido» abierto.",
         datos="Cliente de 81 caracteres; destino (43, 18); cantidad 10; plazo 8 h. Repetir con un cliente de 80 caracteres.",
         pasos=["Registrar el pedido con el cliente de 81 caracteres.", "Registrar el pedido con el cliente de 80 caracteres."],
         esperado=["Con 81 caracteres el sistema rechaza el registro e informa que el cliente excede la longitud permitida.",
                   "Con 80 caracteres el pedido se registra correctamente."]),
    dict(id="CPA-005", ag="AG-01", nombre="Coordenada X fuera de la retícula",
         le=["LE-001", "LE-049"], clases="PM-I3, PM-I4, PM-I5 (un valor inválido por intento)",
         pre="Formulario «Registrar pedido» abierto con datos válidos en los demás campos.",
         datos="Intento 1: x = 71, y = 18. Intento 2: x = −1, y = 18. Intento 3: x vacío, y = 18.",
         pasos=["Ingresar cada valor de x por separado.", "Intentar registrar."],
         esperado=["Intentos 1 y 2: se muestra «El destino está fuera de la malla: X debe ir de 0 a 70 e Y de 0 a 50.».",
                   "Intento 3: se muestra «Completa un destino dentro de la malla para registrar el pedido.».",
                   "El botón de registro queda deshabilitado y no se crea ningún pedido."]),
    dict(id="CPA-006", ag="AG-01", nombre="Coordenada Y fuera de la retícula",
         le=["LE-001", "LE-049"], clases="PM-I6, PM-I7",
         pre="Formulario «Registrar pedido» abierto con datos válidos en los demás campos.",
         datos="Intento 1: x = 43, y = 51. Intento 2: x = 43, y = −1.",
         pasos=["Ingresar cada valor de y por separado.", "Intentar registrar."],
         esperado=["Se muestra «El destino está fuera de la malla: X debe ir de 0 a 70 e Y de 0 a 50.».",
                   "El botón de registro queda deshabilitado y no se crea ningún pedido."]),
    dict(id="CPA-007", ag="AG-01", nombre="Cantidad no positiva",
         le=["LE-001", "LE-010"], clases="PM-I8 (límite 0; el valor 1 se cubre en CPA-002)",
         pre="Formulario «Registrar pedido» abierto.",
         datos="Cantidad 0 y cantidad −5; demás campos válidos.",
         pasos=["Escribir la cantidad en el campo.", "Intentar registrar."],
         esperado=["El campo de cantidad se marca como inválido y se muestra «Completa una cantidad de 1 a 999 para registrar el pedido.».",
                   "El botón de registro queda deshabilitado y no se crea ningún pedido con cantidad 0 o negativa."]),
    dict(id="CPA-008", ag="AG-01", nombre="Plazo fuera del catálogo",
         le=["LE-001", "LE-002"], clases="PM-I9, PM-I10",
         pre="Acceso al registro de pedidos (formulario o servicio de registro).",
         datos="Plazo 37 h (límite superior + 1) y plazo 0 h; demás campos válidos.",
         pasos=["Intentar registrar el pedido con plazo 37 h.", "Intentar registrar el pedido con plazo 0 h."],
         esperado=["El formulario solo ofrece los plazos 4, 8, 12, 18 y 36 h.",
                   "Un plazo de 37 h se rechaza con el mensaje «El plazo máximo es de 36 h».",
                   "Un plazo de 0 h se rechaza. En ambos casos no se crea el pedido."]),
    dict(id="CPA-009", ag="AG-01", nombre="Hora límite que cruza el cambio de día",
         le=["LE-002"], clases="PM-V6 (plazos 4 h y 36 h)",
         pre="Ejecución con reloj en 22:30 del día D (simulación pausada o día a día a esa hora).",
         datos="Pedido 1: plazo 4 h. Pedido 2: plazo 36 h. Destino (43, 18), cantidad 5.",
         pasos=["Registrar ambos pedidos a las 22:30 del día D.", "Abrir el detalle de cada pedido."],
         esperado=["Pedido 1: hora límite 02:30 del día D+1.",
                   "Pedido 2: hora límite 10:30 del día D+2.",
                   "La hora límite se muestra con fecha, hora y minuto."]),
    dict(id="CPA-010", ag="AG-01", nombre="Consulta de pedido por identificador",
         le=["LE-003"], clases="Identificador existente (válida) / inexistente (inválida)",
         pre="Al menos un pedido registrado (por ejemplo, el de CPA-001).",
         datos="Código existente (P-#####) y código inexistente P-99999.",
         pasos=["Buscar el pedido por su código existente.", "Buscar el código P-99999."],
         esperado=["Con el código existente se muestran destino, cantidad, plazo, hora límite y estado del pedido.",
                   "Con P-99999 el sistema informa que el pedido no existe, sin mostrar datos de otro pedido."]),
    dict(id="CPA-011", ag="AG-01", nombre="Filtrado de pedidos por cliente o estado",
         le=["LE-004"], clases="Filtro con coincidencias / filtro sin coincidencias",
         pre="Cola con pedidos de al menos dos clientes y en distintos estados.",
         datos="Filtro 1: cliente «c0003». Filtro 2: estado Entregado. Filtro 3: cliente «inexistente».",
         pasos=["Aplicar cada filtro en la cola de pedidos.", "Quitar el filtro."],
         esperado=["Cada filtro muestra solo los pedidos que cumplen el criterio.",
                   "El filtro sin coincidencias muestra la lista vacía con un mensaje informativo.",
                   "Al quitar el filtro vuelve la lista completa."]),
    dict(id="CPA-012", ag="AG-01", nombre="Ciclo de vida del pedido",
         le=["LE-005", "LE-082"], clases="Estados registrado → en ruta → entregado",
         pre="Simulación en curso con un pedido recién registrado.",
         datos="Pedido de 5 unidades con plazo 8 h.",
         pasos=["Observar el estado al registrarse.", "Observar el estado cuando una unidad sale con el pedido.",
                "Observar el estado cuando la unidad llega al destino y termina la entrega."],
         esperado=["El estado pasa de Registrado a En ruta y luego a Entregado, sin saltos ni retrocesos.",
                   "El estado se ve tanto en la cola de pedidos como en el detalle del pedido."]),
    dict(id="CPA-013", ag="AG-01", nombre="Carga masiva de un archivo de pedidos válido",
         le=["LE-006", "LE-007"], clases="AP-V1, AP-V3, AP-V4",
         pre="Módulo Simulación, pantalla «Configuración de escenario».",
         datos="Archivo datos/CPA-013/ventas.202901.txt: 4 pedidos válidos, 1 comentario y 1 línea vacía. "
               "Incluye los límites (0, 0), (70, 50), cantidad 1, cantidad 25, plazo 4 h y plazo 36 h.",
         pasos=["En «Datos de la simulación», pulsar «Subir archivo» en Pedidos.", "Elegir el archivo."],
         esperado=["El sistema informa 4 pedidos válidos del mes 202901.",
                   "El comentario y la línea vacía se ignoran y no se reportan como error.",
                   "Se muestra «Guardado para el mes 202901»."]),
    dict(id="CPA-014", ag="AG-01", nombre="Archivo de pedidos con registros inválidos",
         le=["LE-007"], clases="AP-I3, AP-I4, AP-I5, AP-I6, AP-I7 (una clase inválida por línea)",
         pre="Pantalla «Configuración de escenario».",
         datos="Archivo datos/CPA-014/ventas.202902.txt: línea 1 válida; línea 2 destino (71, 50); línea 3 cantidad 0; "
               "línea 4 plazo 0; línea 5 con 4 campos; línea 6 con marca de tiempo «01dXXh00m».",
         pasos=["Subir el archivo como archivo de pedidos."],
         esperado=["El sistema reporta 5 líneas con error e indica sus números (2, 3, 4, 5 y 6).",
                   "El archivo no se guarda y se pide corregirlo y volver a subirlo.",
                   "El botón «Ejecutar simulación» queda deshabilitado mientras haya un archivo con errores."]),
    dict(id="CPA-015", ag="AG-01", nombre="Archivo de pedidos vacío",
         le=["LE-007"], clases="AP-I2",
         pre="Pantalla «Configuración de escenario».",
         datos="Archivo datos/CPA-015/ventas.202903.txt de 0 bytes.",
         pasos=["Subir el archivo como archivo de pedidos."],
         esperado=["El sistema informa que el archivo de ventas está vacío.", "No se guarda ningún archivo."]),
    dict(id="CPA-016", ag="AG-01", nombre="Archivo de pedidos sin mes identificable",
         le=["LE-006"], clases="AP-I1 (y AP-V2 al elegir la fecha)",
         pre="Pantalla «Configuración de escenario» sin fecha de inicio elegida.",
         datos="Archivo datos/CPA-016/pedidos_sin_mes.txt (1 pedido válido).",
         pasos=["Subir el archivo sin haber elegido la fecha de inicio.",
                "Elegir como fecha de inicio el 01/01/2029 y volver a subirlo."],
         esperado=["Primer intento: se muestra «Elige primero la fecha de inicio…» y no se sube nada.",
                   "Segundo intento: el archivo se valida y se guarda para el mes 202901."]),
    dict(id="CPA-017", ag="AG-01", nombre="Instante de llegada en la línea de tiempo de la simulación",
         le=["LE-008", "LE-069"], clases="Pedido antes / en / después del instante simulado",
         pre="Archivo de CPA-013 cargado. Simulación de 5 días configurada con inicio el 01/01/2029 00:00.",
         datos="Pedido del archivo con marca 01d08h15m (destino (43, 18), 25 unidades).",
         pasos=["Iniciar la simulación y pausarla a las 08:14 del 01/01/2029.", "Reanudar y pausar a las 08:15."],
         esperado=["A las 08:14 el pedido aún no aparece en la cola.",
                   "A las 08:15 el pedido aparece con instante de llegada 01/01/2029 08:15."]),
    dict(id="CPA-018", ag="AG-01", nombre="División de un pedido que supera la capacidad de una unidad",
         le=["LE-009", "LE-028"], clases="PM-V5, CP-V3, CP-V4 (límites 24 y 25)",
         pre="Operación día a día en curso con la flota por defecto.",
         datos="Pedido A: 24 unidades. Pedido B: 25 unidades. Destino (43, 18), plazo 12 h.",
         pasos=["Registrar ambos pedidos.", "Revisar el plan generado para cada uno."],
         esperado=["El pedido A puede atenderse en una sola entrega (por ejemplo, con un auto de capacidad 24).",
                   "El pedido B se atiende en dos o más entregas parciales.",
                   "Todas las entregas parciales llevan el mismo código del pedido B.",
                   "Ninguna entrega supera la capacidad de la unidad que la transporta."]),
    dict(id="CPA-019", ag="AG-01", nombre="Seguimiento de la cantidad entregada",
         le=["LE-010"], clases="Entrega parcial (pendiente > 0) / total (pendiente = 0)",
         pre="Pedido B de CPA-018 en curso.",
         datos="Pedido de 25 unidades dividido en entregas parciales.",
         pasos=["Abrir el detalle del pedido tras la primera entrega parcial.", "Abrirlo tras la última entrega."],
         esperado=["Tras la primera entrega se ven la cantidad entregada y la pendiente (suman 25) y el pedido sigue En ruta.",
                   "Solo cuando se entregan las 25 unidades el pedido pasa a Entregado."]),
    dict(id="CPA-020", ag="AG-01", nombre="Registro de la entrega efectiva",
         le=["LE-011"], clases="PZ-V1 (holgura positiva), PZ-V2 (holgura cero)",
         pre="Simulación con al menos un pedido entregado.",
         datos="Pedido entregado de la simulación.",
         pasos=["Abrir el detalle del pedido entregado."],
         esperado=["Se muestran la fecha y hora real de entrega (día, hora y minuto).",
                   "Se muestra la holgura (hora límite − hora real), o el retraso si fuese negativa."]),

    # ----------------------------------------------------------------- AG-02 Planificador de Rutas
    dict(id="CPA-021", ag="AG-02", nombre="Retícula de la ciudad, coordenadas y red de calles",
         le=["LE-013", "LE-014", "LE-049", "LE-050", "LE-071"], clases="PM-V2, PM-V3",
         pre="Visualizador abierto en cualquier escenario.",
         datos="Pedido con destino (27, 24) atendido desde el almacén central.",
         pasos=["Revisar el mapa: dimensiones, origen y calles.", "Buscar alguna opción para editar las calles.",
                "Revisar la distancia de la ruta al destino (27, 24)."],
         esperado=["El mapa representa una retícula de 70 × 50 km con el origen (0, 0) en el extremo inferior izquierdo.",
                   "Las rutas solo usan tramos horizontales y verticales, sin diagonales ni curvas.",
                   "No hay ninguna opción para que el usuario modifique la red de calles.",
                   "Cada tramo entre nodos contiguos mide 1 km: la distancia mostrada coincide con la suma de los tramos recorridos."]),
    dict(id="CPA-022", ag="AG-02", nombre="Ubicación e inventario inicial de los almacenes",
         le=["LE-015", "LE-016", "LE-072"], clases="SI-V1",
         pre="Inicio de una simulación (00:00 del primer día).",
         datos="Configuración de almacenes del sistema.",
         pasos=["Ubicar los almacenes en el mapa.", "Abrir el detalle de cada almacén."],
         esperado=["El almacén central se muestra en el nodo (27, 14), el Intermedio 1 en (12, 38) y el Intermedio 2 en (57, 27).",
                   "Las ubicaciones son fijas: no hay ninguna opción para cambiarlas.",
                   "El central figura con inventario ilimitado y siempre disponible.",
                   "Cada intermedio figura con 1 000 unidades de capacidad y 1 000 unidades de stock al inicio."]),
    dict(id="CPA-023", ag="AG-02", nombre="Descuento de inventario al despachar desde un intermedio",
         le=["LE-018", "LE-096"], clases="SI-V1 → SI-V1",
         pre="Simulación en curso con el Intermedio 1 en 1 000 unidades.",
         datos="Pedido de 20 unidades con destino cercano al Intermedio 1, por ejemplo (13, 37).",
         pasos=["Esperar a que el pedido se despache desde el Intermedio 1.", "Abrir el detalle del almacén."],
         esperado=["El stock del Intermedio 1 baja a 980.",
                   "El almacén muestra la salida planificada de 20 unidades por despacho."]),
    dict(id="CPA-024", ag="AG-02", nombre="Recarga diaria de los intermedios a las 23:59:59",
         le=["LE-017", "LE-096"], clases="Instante antes / en la recarga (límite 23:59:59)",
         pre="Simulación en curso con un intermedio por debajo de 1 000 unidades.",
         datos="Intermedio con stock menor que 1 000 durante el día 1.",
         pasos=["Pausar a las 23:59 del día 1 y anotar el stock.", "Reanudar y pausar a las 00:00 del día 2."],
         esperado=["A las 23:59 el stock sigue por debajo de 1 000.",
                   "A las 00:00 el stock es 1 000 (recarga instantánea).",
                   "El almacén muestra el ingreso por recarga."]),
    dict(id="CPA-025", ag="AG-02", nombre="Configuración de la flota e identificación de unidades",
         le=["LE-019", "LE-051", "LE-060", "LE-061"], clases="EJ-V1, EJ-V5, EJ-V6",
         pre="Pantalla «Configuración de escenario».",
         datos="Flota: 5 autos, 3 motos y 2 bicicletas.",
         pasos=["Configurar la flota e iniciar una simulación de 5 días.", "Abrir el panel de unidades."],
         esperado=["El panel lista 10 unidades: A-01 a A-05, M-01 a M-03 y B-01 a B-02.",
                   "El prefijo del código identifica el tipo (A auto, M moto, B bicicleta) y ningún código se repite.",
                   "Al inicio todas las unidades están en el almacén central."]),
    dict(id="CPA-026", ag="AG-02", nombre="Flota en los valores límite válidos",
         le=["LE-019"], clases="EJ-V5 (n = 0, n = 1, n = 50; total = 1)",
         pre="Pantalla «Configuración de escenario».",
         datos="Configuración 1: 0 autos, 0 motos, 1 bicicleta. Configuración 2: 50 autos, 50 motos, 50 bicicletas.",
         pasos=["Crear una simulación con cada configuración."],
         esperado=["Ambas configuraciones se aceptan.",
                   "La configuración 1 muestra solo B-01; la 2 muestra 150 unidades."]),
    dict(id="CPA-027", ag="AG-02", nombre="Flota sin unidades",
         le=["LE-019"], clases="EJ-I3",
         pre="Pantalla «Configuración de escenario».",
         datos="0 autos, 0 motos, 0 bicicletas.",
         pasos=["Configurar la flota e intentar ejecutar."],
         esperado=["El botón «Ejecutar simulación» queda deshabilitado.",
                   "Se indica que hace falta una flota de 1 a 50 unidades por tipo."]),
    dict(id="CPA-028", ag="AG-02", nombre="Flota con valores fuera de rango",
         le=["LE-019"], clases="EJ-I4 (n = 51), EJ-I5 (n = −1)",
         pre="Pantalla «Configuración de escenario».",
         datos="Intento 1: 51 autos, 15 motos, 12 bicicletas. Intento 2: −1 autos.",
         pasos=["Ingresar cada configuración e intentar ejecutar."],
         esperado=["Con 51 autos no se permite crear la simulación y se informa el máximo de 50 por tipo.",
                   "Un valor negativo no se acepta: el campo vuelve a 0 o se rechaza con un mensaje."]),
    dict(id="CPA-029", ag="AG-02", nombre="Cambio de flota con la ejecución en curso",
         le=["LE-051"], clases="EJ-I6",
         pre="Simulación en curso creada en CPA-025.",
         datos="Intento de pasar a 6 autos.",
         pasos=["Buscar en la corrida alguna opción para cambiar la flota.", "Revisar el panel de unidades."],
         esperado=["No hay ninguna opción para cambiar la flota con la ejecución en curso.",
                   "La flota se mantiene en 10 unidades hasta terminar la ejecución."]),
    dict(id="CPA-030", ag="AG-02", nombre="Parámetros de capacidad, velocidad y costo por tipo de unidad",
         le=["LE-020", "LE-021", "LE-022"], clases="Valores por defecto y valor modificado",
         pre="Acceso a la configuración de parámetros de la operación.",
         datos="Por defecto: auto 24 u., 40 km/h, 1,20/km; moto 8 u., 25 km/h, 0,60/km; bicicleta 4 u., 12 km/h, 0,15/km. "
               "Cambio: velocidad de la moto a 30 km/h.",
         pasos=["Revisar los parámetros por defecto.", "Cambiar la velocidad de la moto e iniciar una ejecución.",
                "Revisar el tiempo de un tramo de 10 km recorrido por una moto."],
         esperado=["Los parámetros por defecto coinciden con los datos.",
                   "Con 30 km/h, el tramo de 10 km se estima en 20 min (24 min con 25 km/h)."]),
    dict(id="CPA-031", ag="AG-02", nombre="Respeto de los cambios de turno",
         le=["LE-023", "LE-062"], clases="TU-V1, TU-V2, TU-V3 (límites 06:59/07:00, 14:59/15:00, 22:59/23:00)",
         pre="Simulación de 5 días en curso.",
         datos="Datos de la simulación de 5 días.",
         pasos=["Pausar en cada instante límite y revisar el estado de las unidades y sus rutas."],
         esperado=["Los cambios de turno ocurren a las 07:00, 15:00 y 23:00.",
                   "Ninguna ruta planificada termina después del fin del turno en que se despachó la unidad.",
                   "Las unidades sin turno vigente figuran como «Fuera de turno» y no reciben pedidos."]),
    dict(id="CPA-032", ag="AG-02", nombre="Reserva de refrigerio",
         le=["LE-024", "LE-062"], clases="TU-V4, TU-I1",
         pre="Simulación de 5 días en curso durante el turno de 07:00 a 15:00.",
         datos="Flota por defecto.",
         pasos=["Revisar el panel de unidades entre las 07:00 y las 15:00.",
                "Anotar el inicio y el fin del refrigerio de cada unidad."],
         esperado=["Cada unidad tiene exactamente 1 h de refrigerio en el turno, con estado «En refrigerio».",
                   "Ningún refrigerio empieza antes de las 08:00 ni termina después de las 14:00.",
                   "Durante el refrigerio no se asignan pedidos a la unidad."]),
    dict(id="CPA-033", ag="AG-02", nombre="Tiempo de recorrido, tiempo de entrega y tramo en curso",
         le=["LE-025", "LE-031", "LE-064"], clases="CP-V1",
         pre="Simulación en curso con una moto en ruta.",
         datos="Moto que sale del almacén central hacia un destino a 10 km.",
         pasos=["Abrir el detalle de la unidad en ruta.", "Revisar el tramo en curso y la hora de la siguiente salida."],
         esperado=["El tramo en curso muestra el nodo de origen, el nodo de destino, la hora de salida y la hora estimada de llegada.",
                   "La llegada estimada es la salida + 24 min (10 km a 25 km/h).",
                   "Tras llegar, la unidad permanece 1 h en entrega antes de seguir; la carga en el almacén no suma tiempo."]),
    dict(id="CPA-034", ag="AG-02", nombre="Planificación con el algoritmo metaheurístico y tiempo de cómputo",
         le=["LE-026", "LE-027", "LE-059"], clases="Ejecución con pedidos pendientes",
         pre="Simulación de 5 días en curso.",
         datos="Pedidos del archivo cargado.",
         pasos=["Revisar la bitácora o el panel de planificación tras varias replanificaciones."],
         esperado=["La asignación de pedidos a unidades y las rutas provienen del algoritmo metaheurístico implementado en Java.",
                   "Cada planificación registra su tiempo de cómputo (Ta) en milisegundos."]),
    dict(id="CPA-035", ag="AG-02", nombre="Consolidación de pedidos sin exceder la capacidad",
         le=["LE-028", "LE-029", "LE-033"], clases="CP-V1, CP-V2, CP-I1",
         pre="Flota de 1 moto (capacidad 8), 0 autos y 0 bicicletas.",
         datos="Tres pedidos cercanos entre sí: 3, 3 y 2 unidades (suma 8 = capacidad). Luego un cuarto pedido de 1 unidad.",
         pasos=["Registrar los tres pedidos y revisar la ruta de la moto.", "Registrar el cuarto pedido."],
         esperado=["Los tres pedidos van en la misma moto (8 de 8 unidades) y la ruta muestra su orden de visita.",
                   "El cuarto pedido no se agrega a esa salida porque superaría la capacidad: queda para otra salida."]),
    dict(id="CPA-036", ag="AG-02", nombre="Selección del almacén de origen",
         le=["LE-030"], clases="SI-V1 (con stock) / intermedio sin stock suficiente",
         pre="Simulación en curso.",
         datos="Pedido de 10 unidades con destino (13, 37), cerca del Intermedio 1. "
               "Repetir con el Intermedio 1 sin stock suficiente.",
         pasos=["Registrar el pedido con el Intermedio 1 abastecido.", "Repetir con el Intermedio 1 sin stock."],
         esperado=["Con stock, el pedido sale del Intermedio 1.",
                   "Sin stock, el pedido sale del almacén con stock más conveniente (otro intermedio o el central)."]),
    dict(id="CPA-037", ag="AG-02", nombre="Rutas dentro del plazo con planificación factible",
         le=["LE-032", "LE-086"], clases="PZ-V1, PZ-V2",
         pre="Simulación de 5 días con la flota por defecto.",
         datos="Archivo de pedidos de la simulación.",
         pasos=["Ejecutar la simulación hasta el final.", "Revisar el detalle de una muestra de pedidos entregados."],
         esperado=["Cada pedido de la muestra se entrega antes o exactamente en su hora límite.",
                   "El indicador de cumplimiento refleja el porcentaje real de pedidos a tiempo."]),
    dict(id="CPA-038", ag="AG-02", nombre="Pedido sin planificación factible",
         le=["LE-032", "LE-067"], clases="PZ-I1",
         pre="Simulación hasta el colapso con flota de 1 bicicleta (12 km/h), 0 autos y 0 motos.",
         datos="Pedido de 2 unidades con destino (0, 0) y plazo 4 h. "
               "Desde el almacén más cercano se necesitan más de 4 h (recorrido + 1 h de entrega).",
         pasos=["Registrar o cargar el pedido e iniciar la ejecución."],
         esperado=["El sistema registra el pedido y la causa de que no haya planificación factible.",
                   "Se declara el colapso logístico con su instante y su causa."]),
    dict(id="CPA-039", ag="AG-02", nombre="Costo de la operación por ruta y total",
         le=["LE-034", "LE-035", "LE-087"], clases="Uno y varios tipos de unidad",
         pre="Simulación en curso con al menos una ruta terminada.",
         datos="Ruta de una moto de 20 km (costo esperado 20 × 0,60 = 12,00).",
         pasos=["Abrir el reporte de costos del plan.", "Revisar los indicadores de la operación."],
         esperado=["El costo de la ruta de la moto es 12,00.",
                   "El costo total es la suma de km × costo por km de cada tipo de unidad.",
                   "Se muestran el costo total y los kilómetros recorridos de la operación."]),
    dict(id="CPA-040", ag="AG-02", nombre="Exclusión de un nodo bloqueado y fin de la vigencia",
         le=["LE-036", "LE-066", "LE-083"], clases="AB-V2, AB-V3 (límite: fin de la vigencia)",
         pre="Archivo de bloqueos de CPA-043 cargado. Simulación iniciada el 01/01/2029 00:00.",
         datos="Bloqueo 01d06h00m-01d18h00m sobre el tramo (10, 10)–(10, 20). Pedido con destino (10, 25) registrado a las 08:00.",
         pasos=["Revisar la ruta planificada a las 08:00.", "Registrar otro pedido igual a las 18:00 y revisar su ruta."],
         esperado=["A las 08:00 el bloqueo se ve en el mapa y la ruta no atraviesa ningún nodo del tramo bloqueado ni tramos que inciden en él.",
                   "A las 18:00 el bloqueo ya no se muestra y la ruta puede usar esos nodos."]),
    dict(id="CPA-041", ag="AG-02", nombre="Replanificación ante un bloqueo",
         le=["LE-037", "LE-045"], clases="AB-V2",
         pre="Unidad con ruta planificada que pasa por un nodo que se bloqueará después.",
         datos="Bloqueo que empieza mientras la unidad está en camino.",
         pasos=["Iniciar o registrar el bloqueo.", "Revisar la ruta de la unidad."],
         esperado=["La ruta se replanifica para evitar el nodo bloqueado.",
                   "Los pedidos de la unidad conservan la entrega dentro de su plazo cuando hay alternativa factible."]),
    dict(id="CPA-042", ag="AG-02", nombre="Media vuelta ante un nodo bloqueado",
         le=["LE-055"], clases="AB-V2",
         pre="Unidad en un tramo cuyo nodo siguiente se bloquea mientras la recorre.",
         datos="Bloqueo activado sobre el nodo siguiente de la unidad.",
         pasos=["Observar la unidad cuando llega al nodo bloqueado."],
         esperado=["La unidad no atraviesa el nodo ni gira hacia los lados.",
                   "Retorna por el mismo tramo por el que llegó y sigue la nueva ruta."]),
    dict(id="CPA-043", ag="AG-02", nombre="Carga masiva de un archivo de bloqueos válido",
         le=["LE-038"], clases="AB-V1 (límites: inicio = fin; puntos en el borde de la retícula)",
         pre="Pantalla «Configuración de escenario».",
         datos="Archivo datos/CPA-043/bloqueo.2901.txt con 4 bloqueos válidos: uno con inicio = fin, "
               "uno de tres puntos, uno sobre el borde x = 0 y uno que termina en (70, 50).",
         pasos=["En Bloqueos, pulsar «Subir archivo» y elegir el archivo."],
         esperado=["El sistema informa 4 bloqueos válidos del mes 202901.", "Se muestra «Guardado para el mes 202901»."]),
    dict(id="CPA-044", ag="AG-02", nombre="Archivo de bloqueos con registros inválidos",
         le=["LE-038"], clases="AB-I1, AB-I2, AB-I3, AB-I4, AB-I5 (una clase inválida por línea)",
         pre="Pantalla «Configuración de escenario».",
         datos="Archivo datos/CPA-044/bloqueo.2902.txt: línea 1 válida; 2 fin anterior al inicio; 3 un solo punto; "
               "4 punto (71, 50); 5 segmento diagonal; 6 marca de tiempo mal formada.",
         pasos=["Subir el archivo como archivo de bloqueos."],
         esperado=["Se reportan 5 líneas con error (2, 3, 4, 5 y 6).",
                   "El archivo no se guarda y no se puede ejecutar la simulación hasta corregirlo."]),
    dict(id="CPA-045", ag="AG-02", nombre="Registro de una avería válida",
         le=["LE-039", "LE-068"], clases="AV-V1, AV-V4, AV-V5, AV-V7",
         pre="Operación día a día en curso con la unidad M-03 en ruta y con carga.",
         datos="Ejecución «dia-a-dia»; cuerpo {\"unidad\": \"M-03\", \"tipo\": 1}.",
         pasos=["En Swagger UI, ejecutar POST /api/ejecuciones/dia-a-dia/averias con los datos.",
                "Revisar la respuesta y el panel «Averías activas» del visualizador."],
         esperado=["La API responde 202 con la unidad, el tipo, el instante de la avería (el del reloj de la operación) "
                   "y la reincorporación estimada (instante + 2 h).",
                   "La avería se ubica en la posición actual de la unidad.",
                   "M-03 pasa al estado «Averiada» y aparece en «Averías activas»."]),
    dict(id="CPA-046", ag="AG-02", nombre="Avería con tipo inválido",
         le=["LE-039"], clases="AV-I1",
         pre="Operación día a día en curso.",
         datos="Unidad A-01, tipo 4 (y tipo 0).",
         pasos=["Ejecutar POST /api/ejecuciones/dia-a-dia/averias con cada tipo."],
         esperado=["La API responde 400 con «Tipo de averia invalido: 4 (use 1, 2 o 3)» (o 0, según el intento).",
                   "La unidad no cambia de estado."]),
    dict(id="CPA-047", ag="AG-02", nombre="Avería de una unidad inexistente o ya averiada",
         le=["LE-039"], clases="AV-I2, AV-I3",
         pre="Operación en curso con la flota por defecto (10 autos) y M-03 averiada (CPA-045).",
         datos="Intento 1: unidad A-11, tipo 1. Intento 2: unidad M-03, tipo 2.",
         pasos=["Ejecutar POST /api/ejecuciones/dia-a-dia/averias con cada intento."],
         esperado=["A-11: la API responde 404 porque la unidad no pertenece a la flota de la ejecución.",
                   "M-03: la API responde 409 con «La unidad M-03 ya esta averiada».",
                   "No se registra ninguna avería nueva."]),
    dict(id="CPA-048", ag="AG-02", nombre="Avería de tipo 1 y redistribución de pedidos",
         le=["LE-052", "LE-040", "LE-093", "LE-094"], clases="AV-V1, AV-V5 (límites: avería + 1 h 59 min y + 2 h)",
         pre="Simulación en curso. Unidad A-02 en ruta con dos pedidos pendientes.",
         datos="Avería tipo 1 en A-02 a las 10:00 del día 1.",
         pasos=["Registrar la avería.", "Revisar los pedidos de A-02.",
                "Pausar a las 11:59 y a las 12:00 y revisar el estado de A-02."],
         esperado=["Los pedidos pendientes de A-02 se asignan a otras unidades disponibles, dentro de su plazo cuando es factible.",
                   "Las demás unidades pueden pasar por el punto de la avería: la vía no queda bloqueada.",
                   "A las 11:59 A-02 sigue «Averiada» y el mapa muestra el distintivo de la avería de tipo 1.",
                   "A las 12:00 A-02 vuelve a operar y el distintivo deja de mostrarse."]),
    dict(id="CPA-049", ag="AG-02", nombre="Avería de tipo 2",
         le=["LE-053", "LE-040", "LE-093", "LE-094"], clases="AV-V2, AV-V5, TU-V1",
         pre="Simulación en curso. Unidad M-05 en ruta.",
         datos="Avería tipo 2 en M-05 a las 10:00 del día 1 (turno de 07:00 a 15:00).",
         pasos=["Registrar la avería.", "Seguir el estado de M-05 hasta que vuelva a estar disponible."],
         esperado=["M-05 queda inmovilizada en su ubicación como máximo 4 h (hasta las 14:00), con el distintivo de la avería de tipo 2.",
                   "No vuelve a estar disponible antes del fin del siguiente turno (23:00 del día 1).",
                   "Sus pedidos pendientes se redistribuyen."]),
    dict(id="CPA-050", ag="AG-02", nombre="Avería de tipo 3",
         le=["LE-054", "LE-040", "LE-093", "LE-094"], clases="AV-V3, AV-V5, TU-V2",
         pre="Simulación de 5 días en curso. Unidad B-04 en ruta.",
         datos="Avería tipo 3 en B-04 a las 10:00 del día 1.",
         pasos=["Registrar la avería.", "Seguir el estado de B-04 en los días siguientes."],
         esperado=["B-04 se muestra con el distintivo de la avería de tipo 3, distinto de los de tipo 1 y 2.",
                   "B-04 no está disponible durante al menos 2 días (hasta las 10:00 del día 3).",
                   "Se reincorpora al inicio del turno de 15:00 a 23:00 del día 3."]),
    dict(id="CPA-051", ag="AG-02", nombre="Carga masiva de averías",
         le=["LE-065"], clases="AV-V1 a AV-V3, AV-V4, AV-I1, AV-I2, AV-I4",
         pre="Pantalla «Configuración de escenario».",
         datos="Archivo de averías con 3 líneas válidas (una por tipo: A-01, M-02 y B-03) y 3 inválidas "
               "(tipo 4, unidad A-99, marca de tiempo mal formada).",
         pasos=["Subir el archivo de averías.", "Corregir las líneas inválidas, volver a subirlo y ejecutar la simulación."],
         esperado=["El primer intento reporta las 3 líneas inválidas con su número y no guarda el archivo.",
                   "El archivo corregido se acepta con la unidad, el tipo y el instante de cada avería.",
                   "Durante la simulación, cada avería ocurre en su instante sobre la unidad indicada."]),
    dict(id="CPA-052", ag="AG-02", nombre="Reasignación de carga en camino hacia el pedido más crítico",
         le=["LE-041", "LE-042", "LE-101"], clases="Condiciones (a), (b) y (c) de LE-041 satisfechas",
         pre="Simulación en curso. A-03 lleva el pedido P1, que se queda sin posibilidad de entrega a tiempo. "
             "A-04 está operativa, con 12 unidades a bordo sin entregar y holgura suficiente en sus pedidos.",
         datos="Avería tipo 2 en A-03. P1 = 8 unidades.",
         pasos=["Registrar la avería de A-03.", "Revisar el pedido más crítico y la ruta de A-04."],
         esperado=["El sistema identifica como más crítico al pedido con menor holgura (P1).",
                   "Se transfieren a P1 como máximo las unidades disponibles a bordo de A-04.",
                   "La ruta de A-04 se replanifica con la carga restante y sus pedidos mantienen holgura no negativa.",
                   "Las cantidades que A-04 ya no puede cubrir vuelven a la cola de pedidos por atender.",
                   "Si A-04 queda sin carga, se planifica su retorno al almacén según LE-063."]),
    dict(id="CPA-053", ag="AG-02", nombre="Reasignación descartada por holgura negativa",
         le=["LE-041"], clases="Condición (c) de LE-041 no satisfecha",
         pre="Situación de CPA-052, pero los pedidos de A-04 quedarían con holgura negativa tras la transferencia.",
         datos="Pedidos de A-04 con hora límite próxima.",
         pasos=["Registrar la avería de A-03."],
         esperado=["No se transfiere carga desde A-04.",
                   "La ruta y la carga de A-04 no cambian.",
                   "El sistema busca otra alternativa para P1 o registra el incumplimiento."]),
    dict(id="CPA-054", ag="AG-02", nombre="Selección del escenario por parámetros",
         le=["LE-043"], clases="EJ-V1, EJ-V2, EJ-V3, EJ-I1",
         pre="Sistema desplegado.",
         datos="Escenarios: Simulación de 5 días, Hasta el colapso, Día a día y un tipo «SEMANAL».",
         pasos=["Crear una ejecución de cada escenario válido.",
                "Pedir al servicio de ejecuciones crear el tipo «SEMANAL»."],
         esperado=["Cada escenario válido usa el mismo planificador y difiere solo en sus parámetros.",
                   "El día a día ya está en curso desde el arranque y no se crea dos veces.",
                   "El tipo «SEMANAL» se rechaza con «Tipo de escenario desconocido»."]),
    dict(id="CPA-055", ag="AG-02", nombre="Escenario día a día con ingreso manual y replanificación",
         le=["LE-044", "LE-045", "LE-012"], clases="EJ-V3, PM-V1 a PM-V4, PM-V6",
         pre="Operación día a día en curso con los datos de entrada cargados.",
         datos="Pedido manual: destino (50, 40), 6 unidades, plazo 4 h.",
         pasos=["Registrar el pedido manual.", "Revisar la respuesta del registro y el mapa."],
         esperado=["El día a día procesa a la vez los pedidos y bloqueos cargados y los pedidos manuales.",
                   "El ingreso del pedido dispara una replanificación inmediata: se informa el tiempo de cómputo y las unidades despachadas.",
                   "El pedido aparece asignado a una unidad en el mapa."]),
    dict(id="CPA-056", ag="AG-02", nombre="Ejecución de la simulación de 5 días",
         le=["LE-046", "LE-069", "LE-085", "LE-089"], clases="EJ-V1, EJ-V4, EJ-V5",
         pre="Pantalla «Configuración de escenario». Datos de ventas y bloqueos disponibles para el periodo.",
         datos="Inicio: 01/01/2027 00:00. Flota por defecto (10 autos, 15 motos, 12 bicicletas).",
         pasos=["Elegir «Simulación 5 días», la fecha de inicio y la flota.", "Pulsar «Ejecutar simulación».",
                "Dejar correr la simulación hasta el final."],
         esperado=["La simulación consume los pedidos y bloqueos de los archivos de entrada del periodo.",
                   "Se muestran la fecha y hora simuladas (precisión de minuto) y el tiempo simulado transcurrido.",
                   "Se muestran la fecha y hora reales y el tiempo real transcurrido desde el inicio.",
                   "La simulación termina al cumplirse 5 días simulados (06/01/2027 00:00) en estado Finalizada."]),
    dict(id="CPA-057", ag="AG-02", nombre="Simulación hasta el colapso logístico",
         le=["LE-047", "LE-067", "LE-069"], clases="EJ-V2, PZ-I1",
         pre="Pantalla «Configuración de escenario».",
         datos="Inicio: 01/01/2027 00:00; flota reducida (2 autos, 2 motos, 2 bicicletas) para acelerar el colapso.",
         pasos=["Elegir «Hasta el colapso» y ejecutar.", "Esperar a que la ejecución se detenga."],
         esperado=["La ejecución se detiene en el instante en que un pedido incumple su plazo.",
                   "Se registran el instante del colapso (fecha, hora y minuto), el pedido que falla y la causa.",
                   "La ejecución queda en estado Colapsada."]),
    dict(id="CPA-058", ag="AG-02", nombre="Fecha y hora de inicio con precisión de minuto",
         le=["LE-056"], clases="EJ-V4 (hora distinta de 00:00)",
         pre="Pantalla «Configuración de escenario».",
         datos="Inicio: 01/01/2027 a las 08:30.",
         pasos=["Ingresar la fecha y la hora de inicio.", "Ejecutar la simulación."],
         esperado=["El sistema pide la fecha y la hora (hh:mm) de inicio.",
                   "El reloj simulado arranca en 01/01/2027 08:30 y los pedidos anteriores a esa hora no se consideran como nuevos."]),
    dict(id="CPA-059", ag="AG-02", nombre="Ejecución sin fecha de inicio",
         le=["LE-056"], clases="EJ-I2",
         pre="Pantalla «Configuración de escenario».",
         datos="Fecha de inicio vacía; flota por defecto.",
         pasos=["Intentar ejecutar la simulación."],
         esperado=["El botón «Ejecutar simulación» queda deshabilitado.",
                   "Se indica que falta definir la fecha de inicio."]),
    dict(id="CPA-060", ag="AG-02", nombre="Bloques de consumo (Sc) y frecuencia de replanificación (Sa)",
         le=["LE-057", "LE-058"], clases="Valor por defecto (Sa = 30 min) y valor modificado (Sa = 60 min)",
         pre="Acceso a los parámetros de ejecución.",
         datos="Sa = 30 min simulados (por defecto) y Sa = 60 min. Sc = 1 s real.",
         pasos=["Ejecutar una simulación con Sa = 30 y revisar en la bitácora los instantes de planificación.",
                "Repetir con Sa = 60."],
         esperado=["Con Sa = 30 hay una planificación cada 30 min simulados; con Sa = 60, cada 60 min.",
                   "Los datos se consumen y el estado se difunde en bloques de Sc."]),
    dict(id="CPA-061", ag="AG-02", nombre="Retorno al almacén para recarga",
         le=["LE-063"], clases="Intermedio con stock alcanzable / ningún intermedio válido",
         pre="Simulación en curso.",
         datos="Caso 1: unidad que agota su carga cerca del Intermedio 2, con stock. "
               "Caso 2: igual, pero con el Intermedio 2 sin stock y el Intermedio 1 fuera de alcance en el turno.",
         pasos=["Observar el destino de retorno de la unidad en cada caso."],
         esperado=["Caso 1: retorna al Intermedio 2, el más cercano por la red de calles considerando los bloqueos vigentes.",
                   "Caso 2: retorna al almacén central."]),
    dict(id="CPA-062", ag="AG-02", nombre="Bitácora de la ejecución",
         le=["LE-048"], clases="Ejecución con incidencias",
         pre="Simulación con al menos un bloqueo y una avería.",
         datos="Simulación de CPA-056 con una avería registrada.",
         pasos=["Abrir la bitácora de eventos al terminar."],
         esperado=["La bitácora registra el inicio, el fin y cada incidencia procesada (bloqueos y averías), con su instante."]),

    # ------------------------------------------------------------------------ AG-03 Visualizador
    dict(id="CPA-063", ag="AG-03", nombre="Mapa de operación y posición de las unidades en tiempo real",
         le=["LE-070", "LE-071", "LE-072", "LE-073", "LE-074"], clases="—",
         pre="Simulación de 5 días en curso.",
         datos="Flota por defecto.",
         pasos=["Abrir el visualizador.", "Observar una unidad en ruta durante 1 minuto real."],
         esperado=["El mapa muestra la red de calles, los tres almacenes y la posición de cada unidad.",
                   "La posición de la unidad se actualiza a medida que avanza, sin recargar la página."]),
    dict(id="CPA-064", ag="AG-03", nombre="Dos visualizadores simultáneos e independientes",
         le=["LE-075", "LE-076"], clases="1 y 2 visualizadores conectados",
         pre="Una simulación en curso.",
         datos="Dispositivo 1: computadora. Dispositivo 2: otra computadora o celular.",
         pasos=["Abrir la misma corrida en ambos dispositivos.",
                "En el dispositivo 1, acercar la zona del Intermedio 1; en el 2, desplazarse a la zona del central."],
         esperado=["Ambos dispositivos muestran la misma ejecución y el mismo instante simulado.",
                   "El zoom y el desplazamiento de un dispositivo no afectan al otro."]),
    dict(id="CPA-065", ag="AG-03", nombre="Detalle de una unidad, un pedido y un almacén",
         le=["LE-077"], clases="Elemento unidad / pedido / almacén",
         pre="Simulación en curso.",
         datos="Unidad A-01, un pedido en ruta y el Intermedio 1.",
         pasos=["Seleccionar cada elemento en el mapa o en los paneles."],
         esperado=["Unidad: código, tipo, estado, carga y ruta.",
                   "Pedido: código, destino, cantidad, hora límite, estado y unidad asignada.",
                   "Almacén: ubicación, stock y capacidad."]),
    dict(id="CPA-066", ag="AG-03", nombre="Configuración de los rangos del semáforo",
         le=["LE-078"], clases="RS-V1",
         pre="Acceso a la configuración de la operación.",
         datos="Holgura: rojo 0,25 y ámbar 0,60 (por defecto 0,15 y 0,40). "
               "Inventario: rojo 0,30 y ámbar 0,60 (por defecto 0,20 y 0,50).",
         pasos=["Cambiar los rangos y guardar.", "Observar los colores de los pedidos y de los intermedios."],
         esperado=["Los nuevos rangos se aceptan y quedan vigentes.",
                   "Los colores verde, ámbar y rojo se recalculan con los nuevos cortes."]),
    dict(id="CPA-067", ag="AG-03", nombre="Rangos del semáforo inconsistentes",
         le=["LE-078"], clases="RS-I1, RS-I2",
         pre="Acceso a la configuración de la operación.",
         datos="Intento 1: rojo 0,50 y ámbar 0,40. Intento 2: ámbar 1,20.",
         pasos=["Intentar guardar cada configuración."],
         esperado=["El sistema rechaza ambas configuraciones con un mensaje que explica la regla.",
                   "Se conservan los rangos vigentes."]),
    dict(id="CPA-068", ag="AG-03", nombre="Semáforo de cumplimiento de plazo del pedido",
         le=["LE-079"], clases="SH-V1, SH-V2, SH-V3, SH-V4 (límites al 40 % y al 15 %)",
         pre="Simulación pausable con rangos por defecto (rojo 0,15; ámbar 0,40).",
         datos="Pedido registrado el día 1 a las 08:00 con plazo 36 h (hora límite: día 2 a las 20:00) y aún no entregado.",
         pasos=["Pausar en día 2 05:35, 05:37, 14:35 y 14:37 y anotar el color.", "Observar el color al entregarse."],
         esperado=["05:35 (holgura 14 h 25 min, > 40 %): verde.",
                   "05:37 (14 h 23 min, < 40 %) y 14:35 (5 h 25 min, ≥ 15 %): ámbar.",
                   "14:37 (5 h 23 min, < 15 %): rojo.",
                   "Al entregarse, el pedido se muestra como cerrado, sin color de alerta."]),
    dict(id="CPA-069", ag="AG-03", nombre="Semáforo de inventario de los intermedios",
         le=["LE-080", "LE-091"], clases="SI-V1, SI-V2, SI-V3 (límites 500, 499, 200 y 199)",
         pre="Simulación con rangos de inventario por defecto (rojo 0,20; ámbar 0,50).",
         datos="Despachos desde el Intermedio 2 que lo dejan en 500, 499, 200 y 199 unidades.",
         pasos=["Observar el color del Intermedio 2 en el mapa en cada nivel de stock."],
         esperado=["500 unidades: verde. 499 y 200: ámbar. 199: rojo.",
                   "El mapa muestra el inventario en unidades o en porcentaje junto al color.",
                   "El almacén central no tiene semáforo de inventario (inventario ilimitado)."]),
    dict(id="CPA-070", ag="AG-03", nombre="Rutas planificadas y depuración del trazo recorrido",
         le=["LE-081", "LE-092"], clases="—",
         pre="Simulación en curso con unidades en ruta.",
         datos="Unidad M-01 con una ruta de varios tramos.",
         pasos=["Activar la visualización de rutas.", "Seguir a M-01 mientras recorre su ruta."],
         esperado=["Cada unidad muestra su ruta planificada sobre el mapa.",
                   "El tramo ya recorrido se elimina o se diferencia del pendiente."]),
    dict(id="CPA-071", ag="AG-03", nombre="Visualización de averías por tipo y vigencia",
         le=["LE-084", "LE-093", "LE-094"], clases="AV-V1, AV-V2, AV-V3",
         pre="Simulación con una avería de cada tipo (CPA-048 a CPA-050 o CPA-051).",
         datos="Averías tipo 1, 2 y 3.",
         pasos=["Observar el mapa mientras cada unidad está inmovilizada y al reincorporarse."],
         esperado=["Cada avería se muestra en la ubicación de la unidad con un distintivo propio de su tipo, contrastado con el resto.",
                   "El distintivo permanece visible mientras la unidad está inmovilizada y desaparece al reincorporarse."]),
    dict(id="CPA-072", ag="AG-03", nombre="Línea de tiempo simulada y reloj real",
         le=["LE-085", "LE-089"], clases="EJ-V1, EJ-V2, EJ-V3",
         pre="Una simulación de 5 días, una hasta el colapso y el día a día en curso.",
         datos="—",
         pasos=["Revisar el encabezado de cada escenario."],
         esperado=["En los dos escenarios de simulación se muestran la fecha y hora simuladas (hh:mm), el tiempo simulado transcurrido, "
                   "la fecha y hora reales (hh:mm) y el tiempo real transcurrido.",
                   "En el día a día no se muestra la línea de tiempo simulada."]),
    dict(id="CPA-073", ag="AG-03", nombre="Indicador de cumplimiento de plazos",
         le=["LE-086"], clases="PZ-V1, PZ-I1",
         pre="Ejecución con pedidos entregados.",
         datos="Situación con 10 pedidos entregados: 9 a tiempo y 1 tarde.",
         pasos=["Revisar el indicador de cumplimiento."],
         esperado=["El indicador muestra 90 % (pedidos entregados a tiempo / pedidos entregados)."]),
    dict(id="CPA-074", ag="AG-03", nombre="Exportación de los reportes de desempeño",
         le=["LE-088"], clases="—",
         pre="Simulación finalizada.",
         datos="Reporte de la simulación de CPA-056.",
         pasos=["Elegir «Exportar» en el reporte de desempeño."],
         esperado=["Se descarga un archivo con los gráficos de desempeño y sus indicadores."]),
    dict(id="CPA-075", ag="AG-03", nombre="Panel de unidades y ocupación de cada unidad",
         le=["LE-095", "LE-090", "LE-062"], clases="OC-V1, OC-V2, OC-V3 (límites 70 % y 90 %)",
         pre="Simulación en curso.",
         datos="Autos (capacidad 24) con 16, 17, 21 y 22 unidades a bordo.",
         pasos=["Abrir el panel de unidades.", "Observar la ocupación en el panel y en el mapa."],
         esperado=["El panel lista cada unidad con código, tipo, estado y ocupación (número o porcentaje).",
                   "16 u. (66,7 %): verde. 17 u. (70,8 %) y 21 u. (87,5 %): ámbar. 22 u. (91,7 %): rojo.",
                   "El mapa muestra la misma ocupación de cada unidad."]),
    dict(id="CPA-076", ag="AG-03", nombre="Ocupación global de la flota",
         le=["LE-098"], clases="OC-V1, OC-V2, OC-V3",
         pre="Simulación en curso.",
         datos="Flota por defecto con distintos niveles de carga.",
         pasos=["Revisar el indicador global de ocupación."],
         esperado=["El indicador muestra la ocupación del conjunto de la flota con el color correspondiente a sus rangos."]),
    dict(id="CPA-077", ag="AG-03", nombre="Filtrado de pedidos en el panel",
         le=["LE-097"], clases="Filtro por almacén de origen / nodo de destino / estado",
         pre="Simulación en curso con pedidos despachados desde distintos almacenes.",
         datos="Filtros: almacén Intermedio 1; destino (43, 18); estado En ruta.",
         pasos=["Aplicar cada filtro en el panel de pedidos."],
         esperado=["Cada filtro muestra solo los pedidos que cumplen el criterio."]),
    dict(id="CPA-078", ag="AG-03", nombre="Reporte de cierre por escenario",
         le=["LE-099"], clases="Fin de 5 días / colapso / cierre del día a día",
         pre="Ejecuciones de CPA-056 y CPA-057 terminadas.",
         datos="—",
         pasos=["Abrir el reporte de cierre de cada ejecución."],
         esperado=["Cada reporte presenta la última planificación estable antes del cierre.",
                   "En el colapso, el reporte incluye el instante, el pedido que falla y la causa."]),
    dict(id="CPA-079", ag="AG-03", nombre="Pedidos entregados recientemente",
         le=["LE-100"], clases="Ventana por defecto / ventana modificada",
         pre="Ejecución con pedidos entregados en las últimas horas.",
         datos="Ventana de 2 h y luego de 6 h.",
         pasos=["Revisar el listado con la ventana de 2 h.", "Cambiar la ventana a 6 h."],
         esperado=["El listado contiene solo los pedidos entregados dentro de la ventana configurada.",
                   "Al ampliar la ventana se agregan los entregados entre 2 y 6 h atrás."]),
]


# ---------------------------------------------------------------------------------------------
# Render
# ---------------------------------------------------------------------------------------------
def e(texto):
    return html.escape(texto, quote=False)


def prioridad(caso):
    return "Alta" if any(LE[le][1] == "E" for le in caso["le"]) else "Media"


def validar():
    ids = [c["id"] for c in CASOS]
    assert len(ids) == len(set(ids)), "ids de caso repetidos"
    for caso in CASOS:
        for le in caso["le"]:
            assert le in LE, f"{caso['id']}: {le} no existe en la LE"
    cubiertas = {le for c in CASOS for le in c["le"]}
    faltantes = sorted(set(LE) - cubiertas)
    assert not faltantes, f"exigencias sin caso: {faltantes}"


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
    n_clases = sum(len(v) + len(i) for _, _, _, filas, _ in CLASES for _, v, i in filas)
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
  <li>ISA – Informe de selección del algoritmo (experimentación numérica).</li>
</ul>

<h2>2. Técnica de derivación de los casos</h2>
<h3>2.1. Partición en clases de equivalencia</h3>
<p>Para cada exigencia con datos de entrada se identificaron las variables que recibe el sistema y se dividió su
dominio en clases de equivalencia: conjuntos de valores que el sistema debe tratar de la misma forma. Se espera que
un valor cualquiera de una clase revele los mismos defectos que el resto. Cada clase es <b>válida</b> (V) si el sistema
debe aceptar sus valores, o <b>inválida</b> (I) si debe rechazarlos con un mensaje y sin alterar su estado.</p>
<p>Los casos se construyeron con dos reglas:</p>
<ol>
  <li>Un caso válido cubre la mayor cantidad posible de clases válidas aún no cubiertas.</li>
  <li>Un caso inválido cubre una sola clase inválida, con valores válidos en las demás variables, para que un rechazo
  se atribuya sin ambigüedad a la clase probada. En los archivos de carga masiva cada línea se valida por separado,
  así que un mismo archivo puede reunir varias líneas inválidas, cada una con una sola clase inválida.</li>
</ol>
<h3>2.2. Análisis de valores límite</h3>
<p>Cuando una clase es un rango, la prueba usa valores en su frontera (el límite y el valor contiguo de la clase
vecina): bordes de la retícula, capacidad de las unidades, plazo máximo, horarios de turno, inicio y fin de la vigencia
de un bloqueo, duración de una avería y cortes del semáforo.</p>
<h3>2.3. Exigencias sin datos de entrada</h3>
<p>Las exigencias de visualización y las que describen un comportamiento interno del planificador se verifican con
escenarios observables: se fija una situación de partida y se comprueba el resultado en la interfaz o en los registros
del sistema.</p>

<h2>3. Entorno y datos de prueba</h2>
<h3>3.1. Acuerdos del equipo que precisan la LE v4.0</h3>
<p>Los resultados esperados de este catálogo aplican los siguientes acuerdos, que prevalecen sobre el texto de la
LE v4.0 en los puntos indicados.</p>
<table class="tabla">
  <thead><tr><th style="width:20%">Exigencias</th><th>Acuerdo</th></tr></thead>
  <tbody>{''.join(f"<tr><td>{e(exig)}</td><td>{e(decision)}</td></tr>" for exig, decision in DECISIONES)}</tbody>
</table>
<h3>3.2. Entorno</h3>
<table class="tabla kv">
  <tbody>
  <tr><th>Sistema bajo prueba</th><td>Solución integrada de PaqTracker (API de operación, planificador y visualizador web) desplegada en el entorno del curso.</td></tr>
  <tr><th>Navegador</th><td>Google Chrome o Microsoft Edge actualizados; un segundo dispositivo para CPA-064.</td></tr>
  <tr><th>Datos base</th><td>Ventas <code>ventas.v20260909</code> (2026-01 a 2028-12) y bloqueos <code>bloqueos.v20260909</code>.</td></tr>
  <tr><th>Datos de los casos</th><td>Carpeta <code>docs/cpa/datos/CPA-###/</code> del repositorio. Usan los meses 2029-01 a 2029-03 para no sobrescribir los datos base.</td></tr>
  <tr><th>Almacenes</th><td>Central en (27, 14), inventario ilimitado. Intermedio 1 en (12, 38) e Intermedio 2 en (57, 27), 1 000 unidades cada uno.</td></tr>
  <tr><th>Servicios de la API</th><td>Las operaciones sin pantalla propia (por ejemplo, el registro de averías) se ejecutan desde Swagger UI
  (<code>/swagger-ui.html</code>) sobre la misma API que usa el visualizador.</td></tr>
  <tr><th>Parámetros por defecto</th><td>Flota de 10 autos, 15 motos y 12 bicicletas; Sa = 30 min simulados; Sc = 1 s real; factor de aceleración k = 180;
  semáforo de holgura rojo 0,15 y ámbar 0,40; semáforo de inventario rojo 0,20 y ámbar 0,50; ocupación ámbar 0,70 y rojo 0,90.</td></tr>
  <tr><th>Criterio de aceptación</th><td>Un caso es <b>Conforme</b> si todos sus resultados esperados se cumplen; de lo contrario es <b>No conforme</b>
  y se anota la diferencia en «Resultado obtenido».</td></tr>
  </tbody>
</table>"""


def tabla_clases():
    partes = ["<h2>4. Clases de equivalencia</h2>",
              "<p>Identificadores: <b>XX-Vn</b> para las clases válidas y <b>XX-In</b> para las inválidas, donde XX es el grupo.</p>"]
    for i, (codigo, titulo, exig, filas, limites) in enumerate(CLASES, 1):
        cuerpo = []
        for variable, validas, invalidas in filas:
            v = "<br>".join(f"<b>{a}</b> {e(b)}" for a, b in validas) or "—"
            inv = "<br>".join(f"<b>{a}</b> {e(b)}" for a, b in invalidas) or "—"
            cuerpo.append(f"<tr><td>{e(variable)}</td><td>{v}</td><td>{inv}</td></tr>")
        partes.append(f"""
<div class="bloque">
<h3>4.{i}. {codigo} · {e(titulo)} <span class="exig">({exig})</span></h3>
<table class="tabla clases">
  <thead><tr><th style="width:22%">Variable</th><th style="width:42%">Clases válidas</th><th>Clases inválidas</th></tr></thead>
  <tbody>{''.join(cuerpo)}</tbody>
</table>
<p class="limites"><b>Valores límite:</b> {e(limites)}</p>
</div>""")
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
  <tr><th>Datos de entrada</th><td colspan="3">{e(caso['datos'])}</td></tr>
  <tr><th>Pasos</th><td colspan="3"><ol>{pasos}</ol></td></tr>
  <tr><th>Resultado esperado</th><td colspan="3"><ul>{esperado}</ul></td></tr>
  <tr class="ejec"><th>Resultado obtenido</th><td colspan="3"></td></tr>
  <tr class="ejec"><th>Estado</th><td colspan="3">☐ Conforme &nbsp;&nbsp; ☐ No conforme &nbsp;&nbsp; Fecha: ____/____/______ &nbsp;&nbsp; Responsable: ______________</td></tr>
  </tbody>
</table>"""


def catalogo():
    partes = ["<h2>5. Catálogo de casos de prueba</h2>",
              "<p>Prioridad <b>Alta</b>: el caso verifica al menos una exigencia exigible (E). "
              "Prioridad <b>Media</b>: verifica solo exigencias deseables (D).</p>"]
    for i, (ag, nombre) in enumerate(AGRUPADORES.items(), 1):
        casos = [c for c in CASOS if c["ag"] == ag]
        partes.append(f"<h3 class='ag'>5.{i}. {ag} · {nombre} ({casos[0]['id']} a {casos[-1]['id']})</h3>")
        partes.extend(tarjeta(c) for c in casos)
    return "".join(partes)


def trazabilidad():
    filas = []
    for le, (nombre, ed, ag) in LE.items():
        casos = ", ".join(c["id"] for c in CASOS if le in c["le"])
        filas.append(f"<tr><td>{le}</td><td>{e(nombre)}</td><td class='c'>{ed}</td><td class='c'>{ag}</td><td>{casos}</td></tr>")
    return f"""
<h2>6. Matriz de trazabilidad</h2>
<p>Cada exigencia de la LE v4.0 tiene al menos un caso de prueba de aceptación.</p>
<table class="tabla traza">
  <thead><tr><th>Id.LE</th><th>Nombre del requisito</th><th>E/D</th><th>Agrupador</th><th>Casos de prueba</th></tr></thead>
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
en la tabla se cuenta en el agrupador donde está ubicado.</p>
</div>"""


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
.exig { font-weight: normal; font-size: 9.5pt; }
.tabla { width: 100%; border-collapse: collapse; margin: 0 0 3mm; font-size: 9.5pt; }
.tabla th, .tabla td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; text-align: left; }
.tabla thead th { background: #e8e8e8; text-align: center; }
.tabla td.c { text-align: center; }
.tabla tr.total td { font-weight: bold; }
.kv th { width: 26%; background: #f2f2f2; }
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
    cuerpo = historial() + introduccion() + tabla_clases() + catalogo() + trazabilidad() + resumen()
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


if __name__ == "__main__":
    SALIDA.write_text(documento(), encoding="utf-8")
    print(f"{len(CASOS)} casos, {len(LE)} exigencias cubiertas -> {SALIDA}")
