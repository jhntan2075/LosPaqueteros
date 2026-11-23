import { CORTE_HOLGURA, CORTE_INVENTARIO, CORTE_OCUPACION, DURACIONES_AVERIA, esPlazoRegular, formatearDuracion } from './dominio';
import type { NivelCarga } from '../lib/semaforo';
import type { EstadoFraccion, EstadoUnidad, SituacionUnidad } from '../types/operacion';
import type { NivelHolgura } from '../types/pedidos';

// Glosario de la interfaz: un solo nombre por concepto en todas las pantallas. Si un término cambia,
// cambia aquí.

const porcentaje = (fraccion: number) => Math.round(fraccion * 1000) / 10;

// Los rangos son getters: se arman al leerlos con los cortes vigentes, que el operador puede cambiar.

/** Estado de una simulación: el mismo nombre en el encabezado, el informe, el historial y la lista de existentes. */
export const NOMBRE_ESTADO_SIMULACION: Record<'EN_CURSO' | 'COMPLETADA' | 'DETENIDA' | 'COLAPSADA', string> = {
  EN_CURSO: 'En curso',
  COMPLETADA: 'Completada',
  DETENIDA: 'Detenida',
  COLAPSADA: 'Colapsada',
};

/** Nivel del semáforo de holgura. */
export const NOMBRE_HOLGURA: Record<NivelHolgura, string> = {
  ROJO: 'Crítico',
  AMBAR: 'Ajustado',
  VERDE: 'Holgado',
  CERRADO: 'Cerrado',
};

/** Rango de holgura restante (fracción del plazo) de cada nivel, p. ej. "15–40 %". */
export const RANGO_HOLGURA: Record<Exclude<NivelHolgura, 'CERRADO'>, string> = {
  get ROJO() { return `< ${porcentaje(CORTE_HOLGURA.rojo)} %`; },
  get AMBAR() { return `${porcentaje(CORTE_HOLGURA.rojo)}–${porcentaje(CORTE_HOLGURA.ambar)} %`; },
  get VERDE() { return `> ${porcentaje(CORTE_HOLGURA.ambar)} %`; },
};

/** Nivel del semáforo + vacío de carga de las unidades. */
export const NOMBRE_CARGA: Record<NivelCarga, string> = {
  VACIO: 'Vacío',
  VERDE: 'Con espacio',
  AMBAR: 'Ocupación alta',
  ROJO: 'Casi lleno',
};

/** Con vacío en 0 (solo sin carga) se lee "0"; si el operador lo sube, "≤ 5 %" y el verde parte de ahí. */
const rangos = (cortes: { vacio: number; ambar: number; rojo: number }): Record<NivelCarga, string> => ({
  get VACIO() { return cortes.vacio === 0 ? '0' : `≤ ${porcentaje(cortes.vacio)} %`; },
  get VERDE() {
    return cortes.vacio === 0
      ? `< ${porcentaje(cortes.ambar)} %`
      : `${porcentaje(cortes.vacio)}–${porcentaje(cortes.ambar)} %`;
  },
  get AMBAR() { return `${porcentaje(cortes.ambar)}–${porcentaje(cortes.rojo)} %`; },
  get ROJO() { return `≥ ${porcentaje(cortes.rojo)} %`; },
});

/** Carga de una unidad sobre su capacidad. */
export const RANGO_OCUPACION = rangos(CORTE_OCUPACION);

/** Stock de un almacén intermedio sobre su capacidad. */
/** Nivel de stock de un almacén intermedio: lleno = verde, bajo = rojo. */
export const NOMBRE_STOCK: Record<NivelCarga, string> = {
  VACIO: 'Sin stock',
  ROJO: 'Stock crítico',
  AMBAR: 'Stock medio',
  VERDE: 'Abastecido',
};

/** Rango de stock (fracción de la capacidad) de cada nivel, con los cortes del inventario. */
export const RANGO_STOCK: Record<NivelCarga, string> = {
  VACIO: '0',
  get ROJO() { return `< ${porcentaje(CORTE_INVENTARIO.rojo)} %`; },
  get AMBAR() { return `${porcentaje(CORTE_INVENTARIO.rojo)}–${porcentaje(CORTE_INVENTARIO.ambar)} %`; },
  get VERDE() { return `≥ ${porcentaje(CORTE_INVENTARIO.ambar)} %`; },
};

/** Alerta de stock bajo de un intermedio (LE-078), aparte del semáforo de ocupación. */
export const alertaStockBajo = () => `Stock bajo (< ${porcentaje(CORTE_INVENTARIO.rojo)} %)`;

/** "Regular" (36 h) o "Priorizado" (plazos menores). */
export const tipoDeEntrega = (plazoHoras: number) => (esPlazoRegular(plazoHoras) ? 'Regular' : 'Priorizado');

/** "Regular 36 h", "Priorizado 4 h". */
export const etiquetaPlazo = (plazoHoras: number) => `${tipoDeEntrega(plazoHoras)} ${plazoHoras} h`;

/**
 * Tipos de avería (TipoAveria del planificador): nombre, un ejemplo reconocible, cuánto dura y qué pasa con
 * los pedidos que la unidad lleva. La hora exacta de reincorporación la calcula el servidor.
 */
const REPLANIFICA = (varios: boolean) =>
  `${varios ? 'vuelven a planificarse con otras unidades' : 'vuelve a planificarse con otra unidad'}. La unidad se traslada al almacén central.`;

export const TIPO_AVERIA: Record<
  1 | 2 | 3,
  { nombre: string; ejemplo: string; duracion: string; impacto: (varios: boolean) => string }
> = {
  1: {
    nombre: 'Menor',
    ejemplo: 'llanta desinflada',
    // Duración vigente (configurable): se lee al pintar, no al cargar el módulo.
    get duracion() {
      return `${formatearDuracion(DURACIONES_AVERIA.tipo1Minutos)} detenida en el lugar`;
    },
    impacto: (varios) =>
      varios ? 'se quedan en la unidad; otra unidad en ruta puede recogerlos.' : 'se queda en la unidad; otra unidad en ruta puede recogerlo.',
  },
  2: { nombre: 'Intermedia', ejemplo: 'falla de transmisión', duracion: 'Hasta el fin del siguiente turno', impacto: REPLANIFICA },
  3: {
    nombre: 'Mayor',
    ejemplo: 'mantenimiento',
    get duracion() {
      return `${formatearDuracion(DURACIONES_AVERIA.tipo3MinimoMinutos)} o más`;
    },
    impacto: REPLANIFICA,
  },
};

/** Cómo se ve cada tipo de avería en el mapa (forma y color de la insignia, COLOR_AVERIA). */
export const SIMBOLO_AVERIA: Record<1 | 2 | 3, string> = {
  1: 'círculo azul celeste',
  2: 'rombo ciruela',
  3: 'octágono marrón',
};

/** Cómo se ve un bloqueo en el mapa (COLOR_BLOQUEO): fuera de los colores del semáforo. */
export const SIMBOLO_BLOQUEO = 'línea y aspa magenta';

/** "Tipo 2 · Intermedia". */
export const nombreAveria = (tipo: 1 | 2 | 3) => `Tipo ${tipo} · ${TIPO_AVERIA[tipo].nombre}`;

/**
 * Fracción de un pedido: la parte que lleva una sola unidad. Es el "producto" de la rúbrica (los paquetes del
 * producto P no tienen identidad); el pedido es el "envío".
 */
export const NOMBRE_ESTADO_FRACCION: Record<EstadoFraccion, string> = {
  PROGRAMADA: 'Por salir',
  EN_CAMINO: 'En tránsito',
  ENTREGADA: 'Entregada',
  LIBERADA: 'Liberada por avería',
};

/** Marca de texto que acompaña al estado de la fracción: el color nunca es la única señal. */
export const MARCA_ESTADO_FRACCION: Record<EstadoFraccion, string> = {
  PROGRAMADA: '⏱',
  EN_CAMINO: '↗',
  ENTREGADA: '✓',
  LIBERADA: '↺',
};

/** "Fracción 2 de 3"; con una sola fracción el pedido no va fraccionado y no se numera. */
export const etiquetaFraccion = (indice: number, total: number) => (total > 1 ? `Fracción ${indice} de ${total}` : 'Pedido completo');

/** "Va en 3 unidades" / "Va en 1 unidad". */
export const vaEnUnidades = (cantidad: number) => `Va en ${cantidad} ${cantidad === 1 ? 'unidad' : 'unidades'}`;

/** Almacén central en las listas: no tiene tope. */
export const STOCK_CENTRAL = 'Sin tope · abastece a toda la red';

/** Estado de una unidad de la flota. */
export const ESTADO_UNIDAD: Record<EstadoUnidad, string> = {
  EN_RUTA: 'En ruta',
  EN_REFRIGERIO: 'En refrigerio',
  DISPONIBLE: 'Disponible',
  FUERA_DE_TURNO: 'Fuera de turno',
  AVERIADA: 'Averiada',
};

/** Qué está haciendo una unidad; detalla el "En ruta" de ESTADO_UNIDAD. */
export const SITUACION_UNIDAD: Record<SituacionUnidad, string> = {
  A_ENTREGA: 'En ruta a entrega',
  ENTREGANDO: 'Entregando pedido',
  RETORNANDO: 'Regresando al almacén',
  A_TRASBORDO: 'En ruta a trasbordo',
  RECIBIENDO_CARGA: 'Recibiendo carga',
  EN_ESPERA: 'En espera',
  EN_ALMACEN: 'En almacén',
  EN_REFRIGERIO: 'En refrigerio',
  FUERA_DE_TURNO: 'Fuera de turno',
  AVERIADA: 'Averiada',
};

/** Pedido registrado que aún no sale a ruta (estado REGISTRADO del servidor). */
export const ESTADO_EN_ESPERA = 'En espera';

/** Pestaña Incidencias: pedidos en ámbar plegados y estado sin nada que atender. */
export const etiquetaVerAjustados = (cantidad: number) => `Ver ${cantidad} ${cantidad === 1 ? 'ajustado' : 'ajustados'}`;
export const OCULTAR_AJUSTADOS = 'Ocultar los ajustados';
export const SIN_INCIDENCIAS = 'Sin incidencias: todo va en plazo.';

/** Nombre del escenario de una simulación, como lo ve el usuario. */
export const nombreEscenario = (tipo: string, dias: number) =>
  tipo === 'COLAPSO_LOGISTICO' ? 'Hasta el colapso' : `Simulación ${dias} ${dias === 1 ? 'día' : 'días'}`;

/** Secciones de la pestaña Incidencias. */
export const SECCION_LLEGARAN_TARDE = 'Llegarán tarde';
export const SECCION_EN_RIESGO = 'En riesgo';
export const SECCION_AJUSTADOS = 'Ajustados';
export const SECCION_STOCK_BAJO = 'Almacenes con stock bajo';

/** Resumen de la operación: fichas del desplegable y bloque de la simulación. */
export const TITULO_PEDIDOS_ENTREGADOS = 'Pedidos entregados';
export const lineaEntregados = (porcentaje: string, total: string) => `${porcentaje} % de ${total} pedidos`;
export const lineaPlazo = (enPlazo: number, fueraDePlazo: number) => `${enPlazo} en plazo · ${fueraDePlazo} fuera de plazo`;
export const TITULO_UNIDADES_EN_RUTA = 'Unidades en ruta';
export const lineaTiposEnRuta = (autos: number, motos: number, bicis: number) => `Auto ${autos} · Moto ${motos} · Bici ${bicis}`;
export const lineaDisponibles = (disponibles: number, averiadas: number) => `${disponibles} disponibles · ${averiadas} averiadas`;
export const MARCA_FLOTA_COMPLETA = 'Toda la flota en ruta';
export const MARCA_FLOTA_CARGA_ALTA = 'Flota con carga alta';
export const PROXIMA_LLEGADA = 'Próxima llegada';
export const valorProximaLlegada = (minutos: number | null) => (minutos === null ? 'Sin llegadas en tránsito' : `${minutos} min`);
export const SIMULACION = 'Simulación';
export const SIM_ESCENARIO = 'Escenario';
export const SIM_INICIO = 'Inicio';
export const SIM_FLOTA = 'Flota';
export const SIM_RITMO = 'Ritmo';
export const simFlota = (autos: number, motos: number, bicis: number) => `${autos} autos · ${motos} motos · ${bicis} bicis`;

/** Reporte de cierre (la última planificación estable): botón y nota al pie de Actividad. */
export const reporteDeCierre = (diaADia: boolean) => (diaADia ? 'Generar reporte de cierre' : 'Ver la última planificación');
export const notaReporteDeCierre = (diaADia: boolean) =>
  `Rutas y paradas de la última planificación estable. ${diaADia ? 'No detiene la operación.' : 'No detiene la simulación.'}`;

/** Franja de resumen sobre el mapa: cuatro métricas y un desplegable con el resto. */
export const RESUMEN_OPERACION = 'Resumen de la operación';
export const RESUMEN_EN_PLAZO = 'En plazo';
export const RESUMEN_EN_TRANSITO = 'En tránsito';
export const RESUMEN_EN_ESPERA = ESTADO_EN_ESPERA;
export const RESUMEN_EN_RUTA = ESTADO_UNIDAD.EN_RUTA;
export const AYUDA_RESUMEN_EN_PLAZO = 'Entregas hechas en plazo, sobre las entregadas';
export const AYUDA_RESUMEN_EN_TRANSITO = 'Pedidos que van en ruta a su destino';
export const AYUDA_RESUMEN_EN_ESPERA = 'Pedidos registrados que aún no salen a ruta';
export const AYUDA_RESUMEN_EN_RUTA = 'Unidades en ruta, sobre el total de la flota';
export const VER_MAS_DEL_RESUMEN = 'Ver más del resumen';
export const MAS_DEL_RESUMEN = 'Más del resumen';
export const SIN_DATO = '—';

/** Resumen: bloque de actividad reciente. */
export const ACTIVIDAD_RECIENTE = 'Actividad reciente';
export const VER_ACTIVIDAD = 'Ver actividad';
export const SIN_INCIDENCIAS_RECIENTES = 'Sin incidencias recientes.';

/** Pestaña Actividad: listas vacías, filtros y grupos de eventos rutinarios. */
export const SIN_ACTIVIDAD = 'Aún no hay actividad en esta ejecución.';
export const SIN_EVENTOS_CON_FILTROS = 'Ningún evento con estos filtros.';
export const VER_TODOS = 'Ver todos';
export const FILTRO_ULTIMOS_30_MIN = 'Últimos 30 min';
export const tituloGrupoReplanificaciones = (cantidad: number, horaUltima: string) => `${cantidad} replanificaciones · última ${horaUltima}`;
export const tituloGrupoPedidos = (cantidad: number) => `+${cantidad} pedidos registrados`;
export const tituloGrupoEntregas = (cantidad: number) => `${cantidad} entregas`;

/** Controles sobre el mapa: buscador, tarjeta de alertas y barra de herramientas. */
export const BUSCAR_EN_MAPA = 'Buscar pedido o unidad en el mapa';
export const BUSCAR_PLACEHOLDER = 'Pedido, unidad o almacén';
export const sinResultadosEnMapa = (termino: string) => `No hay pedidos, unidades ni almacenes en el mapa con «${termino}»`;
export const HERRAMIENTAS_MAPA = 'Herramientas del mapa';
export const HERRAMIENTA_CAPAS = 'Capas';
export const HERRAMIENTA_LEYENDA = 'Leyenda';
export const HERRAMIENTA_VER_TODO = 'Ver la malla completa';
export const HERRAMIENTA_ENFOQUE = 'Modo enfoque';
export const AYUDA_ENFOQUE = 'Ocultar todo menos el mapa';
export const etiquetaFiltros = (activos: number) => (activos > 0 ? `Filtros (${activos} ${activos === 1 ? 'activo' : 'activos'})` : 'Filtros');
const ALERTAS_TODO_EN_PLAZO = 'Todo va en plazo';
const ALERTAS_SIN_PEDIDOS_EN_RIESGO = 'Sin pedidos en riesgo';
/** Titular de la tarjeta de alertas: lo que exige actuar primero. `otras`: averías y bloqueos activos. */
export const titularAlertas = (tarde: number, enRiesgo: number, otras: number) =>
  tarde > 0
    ? `${tarde} ${tarde === 1 ? 'llegará' : 'llegarán'} tarde`
    : enRiesgo > 0
      ? `${enRiesgo} en riesgo`
      : otras > 0
        ? ALERTAS_SIN_PEDIDOS_EN_RIESGO
        : ALERTAS_TODO_EN_PLAZO;
export const ALERTAS = 'Alertas';
export const VER_INCIDENCIAS = 'Ver Incidencias';
export const VER_DETALLE = 'Ver detalle';
export const DIALOGO_CAPAS = 'Capas del mapa';
export const DIALOGO_FILTROS = 'Filtros del mapa';
export const LEYENDA_DEL_MAPA = 'Leyenda del mapa';
export const CAPAS_VISIBLES = 'Capas visibles';
export const NOMBRE_CAPA = { rutas: 'Rutas', unidades: 'Unidades', destinos: 'Destinos', bloqueos: 'Bloqueos', almacenes: 'Almacenes' } as const;
export const COLOR_DE_LAS_UNIDADES = 'Color de las unidades';
export const MODO_COLOR_CARGA = 'Carga';
export const MODO_COLOR_HOLGURA = 'Holgura';
export const AYUDA_COLOR_CARGA = 'Semáforo de la carga a bordo de cada unidad.';
export const AYUDA_COLOR_HOLGURA = 'La holgura del pedido más urgente que lleva cada unidad.';
export const ZOOM = 'Zoom';
export const ACERCAR = 'Acercar';
export const ALEJAR = 'Alejar';
export const AYUDA_ACERCAR = 'Acercar (+)';
export const AYUDA_ALEJAR = 'Alejar (-)';
export const textoEnRiesgo = (cantidad: number) => `${cantidad} en riesgo`;
export const textoBloqueos = (cantidad: number) => `${cantidad} ${cantidad === 1 ? 'bloqueo' : 'bloqueos'}`;
export const textoAverias = (cantidad: number) => `${cantidad} ${cantidad === 1 ? 'avería' : 'averías'}`;
export const VER_EN_INCIDENCIAS = 'Ver en Incidencias';
export const etiquetaEnRiesgo = (total: number, criticos: number, ajustados: number) =>
  `${total} ${total === 1 ? 'pedido' : 'pedidos'} en riesgo: ${criticos} ${criticos === 1 ? 'crítico' : 'críticos'} y ${ajustados} ${ajustados === 1 ? 'ajustado' : 'ajustados'}`;
