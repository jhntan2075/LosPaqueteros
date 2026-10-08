import type { TipoUnidad } from '../config/dominio';
import { formatearHolgura, formatearHora, formatearHoraRelativa } from '../lib/formato';
import type { PedidoApi } from '../types/api';
import type { DatosOperacion } from '../types/operacion';
import type { BorradorPedido, EstadoPedidoCola, PedidoEnCola, PedidoRegistrado, VehiculoAsignado } from '../types/pedidos';
import { clienteApi } from './clienteApi';

// Pedidos (CU-01, CU-04) sobre paqtracker-api, adaptados a los modelos de vista del módulo Pedidos.

const MS_POR_MINUTO = 60_000;
const MS_POR_HORA = 3_600_000;
const TIPO_POR_PREFIJO: Record<string, TipoUnidad> = { A: 'AUTO', M: 'MOTO', B: 'BICICLETA' };

/** "A-04" → { tipo: 'AUTO', codigo: 'A-04' }. */
export function vehiculoDeCodigo(codigo: string | null): VehiculoAsignado | null {
  const tipo = codigo ? TIPO_POR_PREFIJO[codigo.charAt(0)] : undefined;
  return codigo && tipo ? { tipo, codigo } : null;
}

function estadoEnCola(pedido: PedidoApi): EstadoPedidoCola {
  if (pedido.estado === 'ENTREGADO') {
    return pedido.etaMs !== null && pedido.etaMs > pedido.horaLimiteMs ? 'INCUMPLIDO' : 'ENTREGADO';
  }
  return pedido.estado;
}

export function adaptarPedidoEnCola(pedido: PedidoApi, reloj: Date): PedidoEnCola {
  const referencia = pedido.etaMs ?? reloj.getTime();
  return {
    codigo: pedido.codigo,
    cliente: pedido.cliente ?? '—',
    destino: pedido.destino ? { x: pedido.destino.x, y: pedido.destino.y } : undefined,
    cantidad: pedido.cantidad,
    plazoHoras: Math.round((pedido.horaLimiteMs - pedido.registroMs) / MS_POR_HORA),
    horaLimite: formatearHoraRelativa(new Date(pedido.horaLimiteMs), reloj),
    eta: pedido.etaMs === null ? null : formatearHora(new Date(pedido.etaMs)),
    holgura: formatearHolgura((pedido.horaLimiteMs - referencia) / MS_POR_MINUTO),
    nivelHolgura: pedido.nivelHolgura,
    vehiculo: vehiculoDeCodigo(pedido.unidad),
    estado: estadoEnCola(pedido),
  };
}

/** Pedidos de una ejecución, tal como los entrega la API. */
export const obtenerPedidos = (ejecucionId: string) => clienteApi.listarPedidos(ejecucionId);

/**
 * Cola para mostrar: primero los activos de menor holgura, luego los resueltos (el más reciente primero).
 */
export function ordenarCola(pedidos: PedidoApi[], reloj: Date): PedidoEnCola[] {
  const activos = pedidos.filter((p) => p.estado !== 'ENTREGADO');
  const resueltos = pedidos.filter((p) => p.estado === 'ENTREGADO').reverse();
  const holgura = (p: PedidoApi) => p.horaLimiteMs - (p.etaMs ?? reloj.getTime());
  activos.sort((a, b) => holgura(a) - holgura(b));
  return [...activos, ...resueltos].map((p) => adaptarPedidoEnCola(p, reloj));
}

/** Registra el pedido en la operación día a día (CU-01); la API replanifica de inmediato (CU-12). */
export async function registrarPedido(borrador: BorradorPedido, datos: DatosOperacion): Promise<PedidoRegistrado> {
  const respuesta = await clienteApi.registrarPedido({
    cliente: borrador.cliente,
    x: borrador.destino.x,
    y: borrador.destino.y,
    cantidad: borrador.cantidad,
    plazoHoras: borrador.plazoHoras,
  });
  const { pedido } = respuesta;
  const vehiculo = vehiculoDeCodigo(pedido.unidad);
  // La unidad acaba de salir: su almacén y posición vienen de la instantánea vigente.
  const unidad = vehiculo ? datos.flota.find((u) => u.codigo === vehiculo.codigo) : undefined;
  const referencia = pedido.etaMs ?? datos.reloj.getTime();
  return {
    codigo: pedido.codigo,
    borrador,
    almacenOrigen: unidad?.origen ?? null,
    horaLimite: new Date(pedido.horaLimiteMs),
    vehiculo,
    posicionVehiculo: unidad?.posicion ?? null,
    eta: pedido.etaMs === null ? null : new Date(pedido.etaMs),
    holguraMinutos: Math.round((pedido.horaLimiteMs - referencia) / MS_POR_MINUTO),
    nivelHolgura: pedido.nivelHolgura,
    replanificacion: {
      replanifico: respuesta.replanifico,
      milisegundos: Math.max(0, respuesta.tiempoComputoMs),
      unidadesDespachadas: respuesta.unidadesDespachadas,
    },
  };
}
