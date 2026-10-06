import { TIEMPO_SERVICIO_MINUTOS, UNIDADES, type IdAlmacen } from '../config/dominio';
import { evaluarFactibilidad, nivelDeHolgura } from '../lib/factibilidad';
import { formatearHolgura, formatearHora, sumarMinutos } from '../lib/formato';
import { puntoEnRecorrido, tramoOrtogonal } from '../lib/malla';
import type { BorradorPedido, PedidoEnCola, PedidoRegistrado } from '../types/pedidos';

// Datos de ejemplo del módulo Pedidos mientras paqtracker-api no existe.
// Las funciones son asíncronas a propósito: al conectar la API se reemplaza este módulo
// por llamadas a apiClient sin tocar los componentes.

/** Reloj de operación de los diseños de Figma: 25/08/2026 · 11:15:40. */
export const RELOJ_SIMULADO_EJEMPLO = new Date(2026, 7, 25, 11, 15, 40);

export const TOTAL_PEDIDOS_EJEMPLO = 1305;

const cola: PedidoEnCola[] = [
  { codigo: '#1088', cliente: 'Familia Torres', cantidad: 6, plazoHoras: 4, horaLimite: '14:37', eta: '14:15', holgura: '00:22', nivelHolgura: 'ROJO', vehiculo: { tipo: 'AUTO', codigo: 'A-04' }, estado: 'EN_TRANSITO' },
  { codigo: '#1107', cliente: 'Comercial Rueda', cantidad: 18, plazoHoras: 8, horaLimite: '15:02', eta: '14:44', holgura: '00:18', nivelHolgura: 'ROJO', vehiculo: { tipo: 'MOTO', codigo: 'M-07' }, estado: 'EN_TRANSITO' },
  { codigo: '#1094', cliente: 'Clínica San Rafael', cantidad: 9, plazoHoras: 12, horaLimite: '16:20', eta: '15:41', holgura: '00:39', nivelHolgura: 'AMBAR', vehiculo: { tipo: 'AUTO', codigo: 'A-05' }, estado: 'EN_TRANSITO' },
  { codigo: '#1131', cliente: 'Ferretería Aliaga', cantidad: 4, plazoHoras: 18, horaLimite: '19:05', eta: '18:12', holgura: '00:53', nivelHolgura: 'AMBAR', vehiculo: { tipo: 'BICICLETA', codigo: 'B-11' }, estado: 'EN_TRANSITO' },
  { codigo: '#1150', cliente: 'Panadería El Trigal', cantidad: 20, plazoHoras: 36, horaLimite: '02:40 · D2', eta: '23:58', holgura: '02:42', nivelHolgura: 'VERDE', vehiculo: { tipo: 'AUTO', codigo: 'A-09' }, estado: 'EN_TRANSITO' },
  { codigo: '#1156', cliente: 'Distribuidora Vega', cantidad: 10, plazoHoras: 36, horaLimite: '04:15 · D2', eta: null, holgura: '06:10', nivelHolgura: 'VERDE', vehiculo: null, estado: 'PLANIFICADO' },
  { codigo: '#1042', cliente: 'Textiles Andina', cantidad: 15, plazoHoras: 4, horaLimite: '13:50', eta: null, holgura: '04:10', nivelHolgura: 'VERDE', vehiculo: null, estado: 'REGISTRADO' },
  { codigo: '#1174', cliente: 'Óptica Vidal', cantidad: 3, plazoHoras: 36, horaLimite: '03:20 · D2', eta: '13:02', holgura: '9 h 42 min', nivelHolgura: 'CERRADO', vehiculo: { tipo: 'AUTO', codigo: 'A-04' }, estado: 'ENTREGADO' },
  { codigo: '#1169', cliente: 'Minimarket Solano', cantidad: 8, plazoHoras: 8, horaLimite: '12:44', eta: '12:39', holgura: '00:05', nivelHolgura: 'CERRADO', vehiculo: { tipo: 'MOTO', codigo: 'M-11' }, estado: 'ENTREGADO' },
  { codigo: '#1119', cliente: 'Colegio San Marcos', cantidad: 5, plazoHoras: 4, horaLimite: '10:05', eta: '10:41', holgura: '-00:36', nivelHolgura: 'ROJO', vehiculo: { tipo: 'AUTO', codigo: 'A-08' }, estado: 'INCUMPLIDO' },
];

export const CLIENTES_EJEMPLO = [...new Set(cola.map((pedido) => pedido.cliente))].sort();

/** Ocupación de stock de los almacenes intermedios que muestra el lienzo (el Central no tiene tope). */
export const PORCENTAJE_STOCK_EJEMPLO: Partial<Record<IdAlmacen, number>> = { INTERMEDIO_1: 62, INTERMEDIO_2: 18 };

let siguienteCodigo = 1312;
let siguienteUnidad = 0;

export async function obtenerColaPedidos(): Promise<{ pedidos: PedidoEnCola[]; total: number }> {
  return { pedidos: [...cola], total: TOTAL_PEDIDOS_EJEMPLO + (siguienteCodigo - 1312) };
}

/**
 * Simula POST /api/pedidos: registra el pedido, lo inserta en la ruta de una unidad
 * del tipo sugerido y devuelve el resultado de la replanificación.
 */
export async function registrarPedido(borrador: BorradorPedido, reloj: Date): Promise<PedidoRegistrado> {
  const evaluacion = evaluarFactibilidad(borrador.destino, borrador.cantidad, borrador.plazoHoras);
  const tipo = evaluacion.tiposSugeridos[0] ?? 'AUTO';
  const plazoMinutos = borrador.plazoHoras * 60;
  const viaje = (evaluacion.minutosViaje ?? 0) + TIEMPO_SERVICIO_MINUTOS;

  // La unidad atiende antes otros pedidos de su ruta: se ocupa parte de la holgura disponible.
  const espera = Math.max(0, Math.round((plazoMinutos - viaje) * 0.75));
  const eta = sumarMinutos(reloj, viaje + espera);
  const horaLimite = sumarMinutos(reloj, plazoMinutos);
  const holguraMinutos = Math.round((horaLimite.getTime() - eta.getTime()) / 60_000);
  const nivelHolgura = nivelDeHolgura(holguraMinutos, plazoMinutos);

  // La unidad ya salió del almacén de origen y va camino al destino.
  const recorrido = tramoOrtogonal(evaluacion.origen.almacen.ubicacion, borrador.destino);
  const { punto } = puntoEnRecorrido(recorrido, 0.45);
  const posicionVehiculo = { x: Math.round(punto.x), y: Math.round(punto.y) };

  const codigo = `#${siguienteCodigo++}`;
  // Unidad del tipo sugerido, rotando dentro de la cantidad que existe en la flota.
  const numero = (siguienteUnidad++ % UNIDADES[tipo].cantidad) + 1;
  const vehiculo = { tipo, codigo: `${UNIDADES[tipo].prefijoCodigo}-${String(numero).padStart(2, '0')}` };

  cola.unshift({
    codigo,
    cliente: borrador.cliente,
    cantidad: borrador.cantidad,
    plazoHoras: borrador.plazoHoras,
    horaLimite: formatearHora(horaLimite),
    eta: formatearHora(eta),
    holgura: formatearHolgura(holguraMinutos),
    nivelHolgura,
    vehiculo,
    estado: 'PLANIFICADO',
  });

  return {
    codigo,
    borrador,
    almacenOrigen: evaluacion.origen.almacen.id,
    horaLimite,
    vehiculo,
    posicionVehiculo,
    eta,
    holguraMinutos,
    nivelHolgura,
    replanificacion: { segundos: 3.8, rutasAfectadas: 2, pedidosEnRiesgoNuevos: 0 },
  };
}
