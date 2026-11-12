// Contrato de paqtracker-api (REST y STOMP). Espejo de los DTO de Java: si cambian allá, cambian aquí.
// Los instantes simulados van en epoch ms.

export type TipoEscenarioApi = 'DIA_A_DIA' | 'SIMULACION_PERIODO' | 'COLAPSO_LOGISTICO';
export type EstadoEjecucionApi = 'CONFIGURADA' | 'EN_CURSO' | 'PAUSADA' | 'FINALIZADA' | 'COLAPSADA';
export type NivelApi = 'VERDE' | 'AMBAR' | 'ROJO';
export type NivelPedidoApi = NivelApi | 'CERRADO';
export type EstadoPedidoApi = 'REGISTRADO' | 'EN_TRANSITO' | 'ENTREGADO';
export type IdAlmacenApi = 'CENTRAL' | 'INTERMEDIO_1' | 'INTERMEDIO_2';

export interface CoordenadaApi {
  x: number;
  y: number;
}

export interface TramoEnCursoApi {
  tipo: 'VIAJE_A_ENTREGA' | 'SERVICIO' | 'RETORNO' | 'AVERIA' | 'VIAJE_A_TRASBORDO' | 'TRASVASE';
  origen: CoordenadaApi;
  destino: CoordenadaApi;
  tiempoSalidaSimulado: number;
  tiempoLlegadaEstimado: number;
  codigoPedido: string | null;
  camino: CoordenadaApi[];
}

export interface ParadaPendienteApi {
  codigoPedido: string;
  destino: CoordenadaApi;
  cantidad: number;
  etaMs: number;
}

/** Avería vigente de una unidad (AveriaEnCurso en la API). */
export interface AveriaEnCursoApi {
  tipo: 1 | 2 | 3;
  desdeMs: number;
  reincorporacionMs: number;
  trasladoCentralMs: number | null;
}

/** Respuesta de POST /api/ejecuciones/{id}/averias: la avería queda programada para el siguiente Sc. */
export interface RespuestaRegistroAveriaApi {
  id: number;
  ejecucionId: string;
  unidad: string;
  tipo: 1 | 2 | 3;
  estado: 'PROGRAMADA';
  instanteMs: number;
  reincorporacionMs: number;
  trasladoCentralMs: number | null;
}

/** GET /api/ejecuciones/{id}/averias/estimacion: qué pasaría si se registrara ahora cada tipo. */
export interface EstimacionAveriaApi {
  tipo: 1 | 2 | 3;
  instanteMs: number;
  reincorporacionMs: number;
  trasladoCentralMs: number | null;
}

export interface UnidadEnMapaApi {
  id: number;
  codigo: string;
  tipo: 'AUTO' | 'MOTO' | 'BICICLETA';
  capacidadMaxima: number;
  cargaActual: number;
  ocupacion: number;
  velocidadKmH: number;
  estado: string;
  almacenOrigen: IdAlmacenApi;
  ubicacionActual: CoordenadaApi;
  tramoEnCurso: TramoEnCursoApi | null;
  rutaRestante: CoordenadaApi[];
  paradas: ParadaPendienteApi[];
  /** Avería vigente si la unidad está averiada; null en los demás estados. */
  averia: AveriaEnCursoApi | null;
  /** Longitud total de la ruta en curso, del almacén de origen al de retorno; 0 fuera de ruta (E17). */
  distanciaRutaKm?: number;
}

export interface AlmacenEnMapaApi {
  id: number;
  codigo: IdAlmacenApi;
  nombre: string;
  ubicacion: CoordenadaApi;
  capacidadMaxima: number | null;
  stockActual: number | null;
  esPrincipal: boolean;
  nivelInventario: NivelApi | null;
}

/** Estado de una fracción de pedido (FraccionEnvio en la API). */
export type EstadoFraccionApi = 'PROGRAMADA' | 'EN_CAMINO' | 'ENTREGADA' | 'LIBERADA';

/** Parte de un pedido que lleva una sola unidad (FraccionEnvio en la API). */
export interface FraccionEnvioApi {
  /** Correlativo dentro del pedido, desde 1. */
  indice: number;
  unidad: string;
  almacenOrigen: IdAlmacenApi;
  cantidad: number;
  /** Salida del almacén; futura si la ruta ya se despachó y la unidad aún no sale. */
  salidaMs: number;
  /** Llegada estimada, o real si ya se entregó. */
  llegadaMs: number;
  estado: EstadoFraccionApi;
}

export interface PedidoEnMapaApi {
  id: number;
  codigo: string;
  destino: CoordenadaApi;
  cantidad: number;
  registroMs: number;
  horaLimiteMs: number;
  etaMs: number | null;
  estado: EstadoPedidoApi;
  nivelHolgura: NivelPedidoApi;
  unidad: string | null;
  /** Cliente según el archivo de ventas (p. ej. "c8662"), o null si no se conoce. */
  cliente?: string | null;
  /** Entrega real (la de su última fracción), o null si aún no se entrega. */
  entregaMs?: number | null;
  /** Partes del pedido por unidad, en el orden en que salieron. */
  fracciones?: FraccionEnvioApi[];
}

export interface BloqueoEnMapaApi {
  id: number;
  puntos: CoordenadaApi[];
  inicioMs: number;
  finMs: number;
}

export interface IndicadoresApi {
  pedidosRegistrados: number;
  pedidosEntregadosATiempo: number;
  pedidosEntregadosConRetraso: number;
  pedidosPendientes: number;
  pedidosEnTransito: number;
  unidadesEnRuta: number;
  unidadesDisponibles: number;
  unidadesAveriadas: number;
  tiempoPromedioEntregaMinutos: number;
  tiempoComputoUltimoTaMs: number;
  replanificaciones: number;
  distanciaTotalKm: number;
  porcentajeCumplimiento: number;
  estadoSemaforoGlobal: NivelApi;
}

/** Instantánea de /topic/ejecuciones/{id}/estado y de GET /api/ejecuciones/{id}/estado. */
export interface MensajeEstadoApi {
  ejecucionId: string;
  tipoEscenario: TipoEscenarioApi;
  estado: EstadoEjecucionApi;
  pasoSc: number;
  relojSimuladoMs: number;
  relojSimuladoFormateado: string;
  relojSimuladoInicioMs: number;
  tiempoSimuladoTranscurridoMs: number;
  relojRealFormateado: string;
  relojRealInicioMs: number | null;
  tiempoRealTranscurridoMs: number;
  factorAceleracion: number;
  unidades: UnidadEnMapaApi[];
  almacenes: AlmacenEnMapaApi[];
  pedidos: PedidoEnMapaApi[];
  bloqueos: BloqueoEnMapaApi[];
  indicadores: IndicadoresApi;
  /** Pedidos entregados en las últimas 4 h simuladas, los más recientes primero. */
  entregadosRecientes?: PedidoEnMapaApi[];
}

export type TipoEventoApi =
  | 'NUEVO_PEDIDO'
  | 'PLAN_ACTUALIZADO'
  | 'PEDIDO_ENTREGADO'
  | 'BLOQUEO_INICIADO'
  | 'BLOQUEO_LEVANTADO'
  | 'ALERTA_COLAPSO'
  | 'UNIDAD_AVERIADA'
  | 'TRASBORDO'
  | 'UNIDAD_REINCORPORADA'
  | 'EJECUCION_FINALIZADA';

/** Evento de /topic/ejecuciones/{id}/eventos. */
export interface MensajeEventoApi {
  id: string;
  ejecucionId: string;
  tipo: TipoEventoApi;
  mensaje: string;
  timestampSimuladoMs: number;
  detalle: Record<string, unknown>;
}

export interface ComposicionFlotaApi {
  autos: number;
  motos: number;
  bicicletas: number;
}

export interface EjecucionApi {
  id: string;
  nombre: string;
  tipoEscenario: TipoEscenarioApi;
  estado: EstadoEjecucionApi;
  algoritmo: 'GA' | 'IACO';
  fechaInicio: string;
  /** HH:mm:ss del primer día en que arrancó el reloj. */
  horaInicio: string;
  dias: number;
  relojSimulado: string | null;
  relojReal: string | null;
  /** Null en una ejecución histórica: la base no guarda los saltos del reloj. */
  parametros: {
    saltoConsumoScSegundos: number;
    saltoAlgoritmoSaMinutos: number;
    factorAceleracionK: number;
    fraccionSemaforoRojo: number;
    fraccionSemaforoAmbar: number;
  } | null;
  indicadores: IndicadoresApi | null;
  flota: ComposicionFlotaApi;
  /** Ya no está en memoria (corrida pasada o de antes de un reinicio): solo queda su resultado guardado. */
  historica: boolean;
  /** Resultado guardado; solo en las históricas. */
  resultado: ResultadoGuardadoApi | null;
}

/** Métricas que la base guarda de cada ejecución (RAN-04: calidad de la solución y tiempo de cómputo). */
export interface MetricasEjecucionApi {
  entregas: number;
  incumplimientos: number;
  entregasTarde: number;
  distanciaKm: number;
  costoTotal: number;
  productosEntregados: number;
  productosFueraPlazo: number;
  retrasoTotalMin: number;
  retrasoPonderado: number;
  replanificaciones: number;
  tiempoComputoMaxMs: number;
  tiempoComputoTotalMs: number;
  planificacionesMedidas: number;
  picoUnidades: number;
  usoAutos: number;
  usoMotos: number;
  usoBicicletas: number;
  averiasAtendidas: number;
}

export interface ColapsoGuardadoApi {
  /** Instantes ISO-8601 (UTC). */
  fecha: string;
  causa: 'ENTREGA_TARDIA' | 'PLAZO_VENCIDO_SIN_DESPACHO';
  pedido: string;
  unidad: string | null;
  horaLimite: string;
  llegadaEstimada: string | null;
}

export interface ResultadoGuardadoApi {
  metricas: MetricasEjecucionApi;
  tiempoComputoPromedioMs: number;
  colapso: ColapsoGuardadoApi | null;
  /** SISTEMA: pedidos de los archivos del sistema. ARCHIVO: un archivo subido para esta corrida. */
  origenDatos: 'SISTEMA' | 'ARCHIVO';
  semilla: number | null;
  /** Instantes ISO-8601 (UTC). */
  relojAlcanzado: string | null;
  creadaEn: string;
  finalizadaEn: string | null;
}

export interface SolicitudEjecucionApi {
  tipoEscenario: 'SIMULACION_PERIODO' | 'COLAPSO_LOGISTICO';
  /** yyyy-MM-dd */
  fechaInicio: string;
  /** HH:mm del primer día en que arranca el reloj; el servidor usa 00:00 si se omite. */
  horaInicio?: string;
  dias?: number;
  algoritmo?: 'GA' | 'IACO';
  flota?: ComposicionFlotaApi;
  /** Lote del archivo de pedidos subido para esta corrida; sin él, solo pedidos del sistema. */
  lotePedidos?: string;
}

export interface PedidoApi {
  codigo: string;
  cliente: string | null;
  destino: CoordenadaApi;
  cantidad: number;
  registroMs: number;
  horaLimiteMs: number;
  etaMs: number | null;
  estado: EstadoPedidoApi;
  nivelHolgura: NivelPedidoApi;
  unidad: string | null;
  entregaMs?: number | null;
  fracciones?: FraccionEnvioApi[];
}

export interface RegistroPedidoApi {
  ejecucionId: string;
  pedido: PedidoApi;
  replanifico: boolean;
  tiempoComputoMs: number;
  unidadesDespachadas: number;
}

/** Entrega pendiente dentro de una ruta del plan (RutaPlanificada.ParadaPlanificada). */
export interface ParadaPlanificadaApi {
  pedido: string;
  destino: CoordenadaApi;
  cantidad: number;
  llegadaMs: number;
  horaLimiteMs: number;
}

/** Ruta de una unidad en el plan estable. */
export interface RutaPlanificadaApi {
  unidad: string;
  tipo: 'AUTO' | 'MOTO' | 'BICICLETA';
  almacenOrigen: IdAlmacenApi;
  salidaMs: number;
  regresoMs: number;
  distanciaKm: number;
  carga: number;
  capacidad: number;
  paradas: ParadaPlanificadaApi[];
}

/** GET /api/ejecuciones/{id}/plan-estable: plan vigente tras la última planificación sin colapso. */
export interface PlanEstableApi {
  ejecucionId: string;
  tipoEscenario: TipoEscenarioApi;
  algoritmo: 'GA' | 'IACO';
  instanteMs: number;
  tiempoComputoMs: number;
  unidadesDespachadas: number;
  rutas: RutaPlanificadaApi[];
  pedidosSinAsignar: string[];
  /** Si la ejecución colapsó después de este plan: cuándo y por qué pedido. */
  colapso: { instanteMs: number; pedido: string; causa: string } | null;
}

export interface HitoPedidoApi {
  instanteMs: number;
  titulo: string;
  detalle: string;
}

export interface DetallePedidoApi {
  ejecucionId: string;
  pedido: PedidoApi;
  hitos: HitoPedidoApi[];
}

export interface ImportacionApi {
  mes: string;
  registrosValidos: number;
  errores: string[];
  lineasInvalidas: number[];
  guardado: boolean;
  /** Pedidos: lote para enviarlo al crear la simulación. Null en bloqueos o si no se guardó. */
  lote: string | null;
}

export interface ErrorApi {
  estado: number;
  error: string;
  mensaje: string;
  detalles: string[];
}

/** Semáforo donde menos es peor (holgura, stock bajo): rojo bajo `rojo`, ámbar bajo `ambar`. Fracciones 0–1. */
export interface CortesPorDebajoApi {
  rojo: number;
  ambar: number;
}

/** Semáforo de carga con vacío: vacío hasta `vacio`, ámbar desde `ambar`, rojo desde `rojo`. Fracciones 0–1. */
export interface CortesCargaApi {
  vacio: number;
  ambar: number;
  rojo: number;
}

/** Almacén en GET/PUT /api/configuracion/parametros; capacidad null en el central (ilimitado). */
export interface ParametrosAlmacenApi {
  codigo: 'CENTRAL' | 'INTERMEDIO_1' | 'INTERMEDIO_2';
  nombre?: string;
  x: number;
  y: number;
  capacidad: number | null;
}

/** Tipo de unidad en GET/PUT /api/configuracion/parametros. */
export interface ParametrosUnidadApi {
  tipo: 'AUTO' | 'MOTO' | 'BICICLETA';
  capacidad: number;
  velocidadKmH: number;
  costoPorKm: number;
}

/** Duraciones de las averías, en minutos. */
export interface ParametrosAveriaApi {
  tipo1Minutos: number;
  permanenciaSitioMinutos: number;
  tipo3MinimoMinutos: number;
  trasvaseMinutos: number;
}

/** Cuerpo de GET y PUT /api/configuracion/parametros (B02, B04, B07-B09). */
export interface ParametrosDominioApi {
  almacenes: ParametrosAlmacenApi[];
  unidades: ParametrosUnidadApi[];
  averias: ParametrosAveriaApi;
}

/** Cuerpo de GET y PUT /api/configuracion/semaforo. */
export interface RangosSemaforoApi {
  holgura: CortesPorDebajoApi;
  inventario: CortesPorDebajoApi;
  ocupacionUnidad: CortesCargaApi;
  ocupacionAlmacen: CortesCargaApi;
}
