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
  tipo: 'VIAJE_A_ENTREGA' | 'SERVICIO' | 'RETORNO';
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
}

export type TipoEventoApi =
  | 'NUEVO_PEDIDO'
  | 'PLAN_ACTUALIZADO'
  | 'PEDIDO_ENTREGADO'
  | 'BLOQUEO_INICIADO'
  | 'BLOQUEO_LEVANTADO'
  | 'ALERTA_COLAPSO'
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
  dias: number;
  relojSimulado: string | null;
  relojReal: string | null;
  parametros: {
    saltoConsumoScSegundos: number;
    saltoAlgoritmoSaMinutos: number;
    factorAceleracionK: number;
    fraccionSemaforoRojo: number;
    fraccionSemaforoAmbar: number;
  };
  indicadores: IndicadoresApi | null;
  flota: ComposicionFlotaApi;
}

export interface SolicitudEjecucionApi {
  tipoEscenario: 'SIMULACION_PERIODO' | 'COLAPSO_LOGISTICO';
  /** yyyy-MM-dd */
  fechaInicio: string;
  dias?: number;
  algoritmo?: 'GA' | 'IACO';
  flota?: ComposicionFlotaApi;
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
}

export interface RegistroPedidoApi {
  ejecucionId: string;
  pedido: PedidoApi;
  replanifico: boolean;
  tiempoComputoMs: number;
  unidadesDespachadas: number;
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
}

export interface ErrorApi {
  estado: number;
  error: string;
  mensaje: string;
  detalles: string[];
}
