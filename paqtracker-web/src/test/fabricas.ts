import type { MensajeEstadoApi, PedidoEnMapaApi, UnidadEnMapaApi } from '../types/api';
import type { DatosOperacion, UnidadOperacion } from '../types/operacion';
import { construirDatosOperacion } from '../services/adaptadorOperacion';

// Fábricas de datos de prueba: un estado mínimo válido que cada prueba ajusta con `sobrescribir`.

export const INICIO_MS = new Date(2026, 2, 3, 8, 0, 0).getTime();

export const unidadApi = (sobrescribir: Partial<UnidadEnMapaApi> = {}): UnidadEnMapaApi => ({
  id: 1,
  codigo: 'A-01',
  tipo: 'AUTO',
  capacidadMaxima: 10,
  cargaActual: 0,
  ocupacion: 0,
  velocidadKmH: 50,
  estado: 'DISPONIBLE_EN_ALMACEN',
  almacenOrigen: 'CENTRAL',
  ubicacionActual: { x: 12, y: 8 },
  tramoEnCurso: null,
  rutaRestante: [],
  paradas: [],
  averia: null,
  ...sobrescribir,
});

export const pedidoApi = (sobrescribir: Partial<PedidoEnMapaApi> = {}): PedidoEnMapaApi => ({
  id: 1,
  codigo: '#1001',
  destino: { x: 20, y: 10 },
  cantidad: 3,
  registroMs: INICIO_MS,
  horaLimiteMs: INICIO_MS + 4 * 3_600_000,
  etaMs: null,
  estado: 'REGISTRADO',
  nivelHolgura: 'VERDE',
  unidad: null,
  ...sobrescribir,
});

export const mensajeEstado = (sobrescribir: Partial<MensajeEstadoApi> = {}): MensajeEstadoApi => ({
  ejecucionId: 'ej-1',
  tipoEscenario: 'SIMULACION_PERIODO',
  estado: 'EN_CURSO',
  pasoSc: 0,
  relojSimuladoMs: INICIO_MS,
  relojSimuladoFormateado: '',
  relojSimuladoInicioMs: INICIO_MS,
  tiempoSimuladoTranscurridoMs: 0,
  relojRealFormateado: '',
  relojRealInicioMs: null,
  tiempoRealTranscurridoMs: 1234,
  factorAceleracion: 1,
  unidades: [],
  almacenes: [],
  pedidos: [],
  bloqueos: [],
  indicadores: {
    pedidosRegistrados: 0,
    pedidosEntregadosATiempo: 0,
    pedidosEntregadosConRetraso: 0,
    pedidosPendientes: 0,
    pedidosEnTransito: 0,
    unidadesEnRuta: 0,
    unidadesDisponibles: 0,
    unidadesAveriadas: 0,
    tiempoPromedioEntregaMinutos: 0,
    tiempoComputoUltimoTaMs: 0,
    replanificaciones: 0,
    distanciaTotalKm: 0,
    porcentajeCumplimiento: 0,
    estadoSemaforoGlobal: 'VERDE',
  },
  ...sobrescribir,
});

export const datosOperacion = (mensaje: Partial<MensajeEstadoApi> = {}, ahoraMs = INICIO_MS): DatosOperacion =>
  construirDatosOperacion(mensajeEstado(mensaje), ahoraMs, []);

export const unidadVista = (sobrescribir: Partial<UnidadOperacion> = {}): UnidadOperacion => ({
  ...datosOperacion({ unidades: [unidadApi()] }).flota[0],
  ...sobrescribir,
});
