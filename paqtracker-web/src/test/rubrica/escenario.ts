import { vi } from 'vitest';
import type { ContextoAveriasValor } from '../../hooks/useAverias';
import type { MensajeEstadoApi, PedidoApi } from '../../types/api';
import type { DatosOperacion } from '../../types/operacion';
import { datosOperacion, INICIO_MS, mensajeEstado, pedidoApi, unidadApi } from '../fabricas';

// Escenario común de las pruebas de la rúbrica (c.1inf54.26-2): una instantánea pequeña con los tres
// almacenes, unidades en cada estado relevante y pedidos en cada estado.

export const MIN = 60_000;
/** Reloj simulado de la instantánea: 30 min después del inicio, a mitad del tramo de A-01. */
export const AHORA_MS = INICIO_MS + 30 * MIN;

/** Tamaño del contenedor del mapa en jsdom (no hay layout: lo informa el ResizeObserver simulado). */
export const ANCHO_MAPA = 1200;
export const ALTO_MAPA = 800;

/**
 * A-01: auto en ruta desde el central (27,14) hacia #1001 en (27,24); a mitad del tramo, 20/24 a bordo.
 * M-01: moto llena (8/8) detenida en el nodo del Intermedio 2 (57,27).
 * B-01: bicicleta averiada (tipo 1) en (10,10).
 * A-02: auto disponible en el almacén (no se dibuja).
 */
export const mensajeRubrica = (sobrescribir: Partial<MensajeEstadoApi> = {}): Partial<MensajeEstadoApi> => ({
  relojSimuladoMs: AHORA_MS,
  unidades: [
    unidadApi({
      id: 1,
      codigo: 'A-01',
      tipo: 'AUTO',
      capacidadMaxima: 24,
      cargaActual: 20,
      estado: 'EN_RUTA',
      almacenOrigen: 'CENTRAL',
      ubicacionActual: { x: 27, y: 19 },
      tramoEnCurso: {
        tipo: 'VIAJE_A_ENTREGA',
        origen: { x: 27, y: 14 },
        destino: { x: 27, y: 24 },
        tiempoSalidaSimulado: INICIO_MS,
        tiempoLlegadaEstimado: INICIO_MS + 60 * MIN,
        codigoPedido: '#1001',
        camino: [
          { x: 27, y: 14 },
          { x: 27, y: 24 },
        ],
      },
      rutaRestante: [
        { x: 27, y: 19 },
        { x: 27, y: 24 },
        { x: 40, y: 24 },
      ],
      paradas: [{ codigoPedido: '#1001', destino: { x: 27, y: 24 }, cantidad: 3, etaMs: INICIO_MS + 60 * MIN }],
    }),
    unidadApi({
      id: 2,
      codigo: 'M-01',
      tipo: 'MOTO',
      capacidadMaxima: 8,
      cargaActual: 8,
      estado: 'EN_RUTA',
      almacenOrigen: 'INTERMEDIO_2',
      ubicacionActual: { x: 57, y: 27 },
      rutaRestante: [
        { x: 57, y: 27 },
        { x: 50, y: 27 },
      ],
      paradas: [{ codigoPedido: '#1002', destino: { x: 50, y: 27 }, cantidad: 3, etaMs: INICIO_MS + 90 * MIN }],
    }),
    unidadApi({
      id: 3,
      codigo: 'B-01',
      tipo: 'BICICLETA',
      capacidadMaxima: 4,
      cargaActual: 0,
      estado: 'AVERIADA',
      almacenOrigen: 'INTERMEDIO_1',
      ubicacionActual: { x: 10, y: 10 },
      averia: { tipo: 1, desdeMs: INICIO_MS + 10 * MIN, reincorporacionMs: INICIO_MS + 130 * MIN, trasladoCentralMs: null },
    }),
    unidadApi({ id: 4, codigo: 'A-02', estado: 'DISPONIBLE_EN_ALMACEN', ubicacionActual: { x: 27, y: 14 } }),
  ],
  almacenes: [
    { id: 1, codigo: 'CENTRAL', nombre: 'Central', ubicacion: { x: 27, y: 14 }, capacidadMaxima: null, stockActual: null, esPrincipal: true, nivelInventario: null },
    { id: 2, codigo: 'INTERMEDIO_1', nombre: 'Intermedio 1', ubicacion: { x: 12, y: 38 }, capacidadMaxima: 100, stockActual: 40, esPrincipal: false, nivelInventario: 'AMBAR' },
    { id: 3, codigo: 'INTERMEDIO_2', nombre: 'Intermedio 2', ubicacion: { x: 57, y: 27 }, capacidadMaxima: 100, stockActual: 10, esPrincipal: false, nivelInventario: 'ROJO' },
  ],
  pedidos: [
    pedidoApi({ id: 1, codigo: '#1001', destino: { x: 27, y: 24 }, estado: 'EN_TRANSITO', unidad: 'A-01', etaMs: INICIO_MS + 60 * MIN }),
    pedidoApi({ id: 2, codigo: '#1002', destino: { x: 50, y: 27 }, estado: 'EN_TRANSITO', unidad: 'M-01', nivelHolgura: 'ROJO', etaMs: INICIO_MS + 90 * MIN }),
    pedidoApi({ id: 3, codigo: '#1003', destino: { x: 5, y: 5 }, estado: 'ENTREGADO', unidad: 'A-01' }),
    pedidoApi({ id: 4, codigo: '#1004', destino: { x: 30, y: 30 }, estado: 'REGISTRADO' }),
  ],
  indicadores: {
    ...mensajeEstado().indicadores,
    pedidosRegistrados: 4,
    pedidosEntregadosATiempo: 1,
    pedidosEnTransito: 2,
    pedidosPendientes: 1,
    unidadesEnRuta: 2,
    unidadesDisponibles: 1,
    unidadesAveriadas: 1,
    porcentajeCumplimiento: 100,
    replanificaciones: 12,
    tiempoComputoUltimoTaMs: 850,
    distanciaTotalKm: 321.4,
  },
  ...sobrescribir,
});

export const datosRubrica = (sobrescribir: Partial<MensajeEstadoApi> = {}, ahoraMs = AHORA_MS): DatosOperacion =>
  datosOperacion(mensajeRubrica(sobrescribir), ahoraMs);

/** Los mismos pedidos como los devuelve GET /api/pedidos (cola de Pedidos). */
export const pedidosColaRubrica = (): PedidoApi[] =>
  (mensajeRubrica().pedidos ?? []).map((p) => ({
    codigo: p.codigo,
    cliente: `Cliente ${p.id}`,
    destino: p.destino,
    cantidad: p.cantidad,
    registroMs: p.registroMs,
    horaLimiteMs: p.horaLimiteMs,
    etaMs: p.etaMs,
    estado: p.estado,
    nivelHolgura: p.nivelHolgura,
    unidad: p.unidad,
  }));

/**
 * jsdom no tiene layout: el ResizeObserver simulado informa un contenedor de ANCHO_MAPA × ALTO_MAPA, y
 * la captura de puntero (que el mapa usa para distinguir clic de arrastre) se reemplaza por stubs.
 */
export function prepararEntornoMapa() {
  class ResizeObserverFalso {
    private readonly alCambiar: ResizeObserverCallback;
    constructor(alCambiar: ResizeObserverCallback) {
      this.alCambiar = alCambiar;
    }
    observe(elemento: Element) {
      this.alCambiar([{ target: elemento, contentRect: { width: ANCHO_MAPA, height: ALTO_MAPA } } as unknown as ResizeObserverEntry], this as never);
    }
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverFalso);
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
}

export const averiasFalsas = (): ContextoAveriasValor => ({
  pendientes: {},
  registrar: vi.fn(),
  cancelar: vi.fn(),
});

/** Elemento del mapa por su data-objeto ("almacen:CENTRAL", "vehiculo:A-01", "pedido:#1001"). */
export const objetoMapa = (contenedor: HTMLElement, id: string) => contenedor.querySelector(`[data-objeto="${id}"]`) as SVGGElement | null;

/** Punto en pantalla de un objeto del mapa, leído de su transform="translate(x, y)". */
export function posicionEnPantalla(elemento: Element): { x: number; y: number } {
  const coincidencia = /translate\(([-\d.e]+),\s*([-\d.e]+)\)/.exec(elemento.getAttribute('transform') ?? '');
  if (!coincidencia) throw new Error(`Sin translate: ${elemento.outerHTML.slice(0, 80)}`);
  return { x: Number(coincidencia[1]), y: Number(coincidencia[2]) };
}

const BLANCO = '#FFFFFF';
const canal = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminancia = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => canal(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Contraste WCAG entre un color y el fondo blanco del mapa. */
export const contrasteSobreBlanco = (hex: string) => {
  const [x, y] = [luminancia(hex), luminancia(BLANCO)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
