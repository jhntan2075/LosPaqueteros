import { ALMACENES, CORTE_OCUPACION, UNIDADES, type TipoUnidad } from '../config/dominio';
import { distanciaManhattan } from './factibilidad';
import type { DatosOperacion, PedidoOperacion, UnidadOperacion } from '../types/operacion';
import type { NivelHolgura } from '../types/pedidos';

// Derivados puros del estado de operación (antes vivían en los datos de ejemplo).

/** Semáforo de ocupación de una unidad (CF-02). */
export const nivelDeOcupacion = (carga: number, capacidad: number): NivelHolgura => {
  const fraccion = capacidad === 0 ? 0 : carga / capacidad;
  if (fraccion >= CORTE_OCUPACION.rojo) return 'ROJO';
  if (fraccion >= CORTE_OCUPACION.ambar) return 'AMBAR';
  return 'VERDE';
};

export const unidadPorCodigo = (datos: DatosOperacion, codigo: string): UnidadOperacion | undefined =>
  datos.flota.find((u) => u.codigo === codigo);

/** Pedidos activos con holgura en rojo o ámbar, de menor a mayor holgura. */
export const pedidosEnRiesgo = (datos: DatosOperacion): PedidoOperacion[] =>
  Object.values(datos.pedidos)
    .filter((p) => p.nivel === 'ROJO' || p.nivel === 'AMBAR')
    .sort((a, b) => a.holguraMinutos - b.holguraMinutos);

/** Distancia de Manhattan desde el almacén de la unidad asignada; null si el pedido aún no tiene unidad. */
export function distanciaDesdeOrigen(datos: DatosOperacion, pedido: PedidoOperacion): number | null {
  const unidad = unidadPorCodigo(datos, pedido.unidad);
  if (!unidad) return null;
  const origen = ALMACENES.find((a) => a.id === unidad.origen);
  return origen ? distanciaManhattan(origen.ubicacion, pedido.destino) : null;
}

export function estadoFlota(datos: DatosOperacion) {
  const { flota } = datos;
  const porEstado = (estado: UnidadOperacion['estado']) => flota.filter((u) => u.estado === estado);
  const enRuta = porEstado('EN_RUTA');
  const porTipo = (Object.keys(UNIDADES) as TipoUnidad[]).map((tipo) => {
    const delTipo = flota.filter((u) => u.tipo === tipo);
    const enRutaTipo = delTipo.filter((u) => u.estado === 'EN_RUTA');
    const ocupacion = enRutaTipo.length === 0 ? 0 : enRutaTipo.reduce((s, u) => s + u.carga / UNIDADES[tipo].capacidad, 0) / enRutaTipo.length;
    return { tipo, enRuta: enRutaTipo.length, total: delTipo.length, ocupacion };
  });
  return {
    total: flota.length,
    enRuta: enRuta.length,
    disponibles: porEstado('DISPONIBLE').length,
    averiadas: porEstado('AVERIADA'),
    porTipo,
    llenas: enRuta.filter((u) => u.carga >= UNIDADES[u.tipo].capacidad),
    ociosas: [] as UnidadOperacion[],
    sinAlimentacion: flota.filter((u) => !u.alimentacion.cumplida),
  };
}

/** Riesgo agregado para la fila de KPIs. */
export function resumenRiesgo(datos: DatosOperacion) {
  const riesgo = pedidosEnRiesgo(datos);
  return {
    rojo: riesgo.filter((p) => p.nivel === 'ROJO').length,
    ambar: riesgo.filter((p) => p.nivel === 'AMBAR').length,
    holguraMinima: riesgo[0]?.holgura ?? '—',
  };
}
