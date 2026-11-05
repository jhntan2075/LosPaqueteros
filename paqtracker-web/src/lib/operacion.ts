import { ALMACENES, UNIDADES, type TipoUnidad } from '../config/dominio';
import { distanciaManhattan } from './factibilidad';
import { nivelDeOcupacion, nivelDeStock, type NivelCarga } from './semaforo';
import type { AlmacenOperacion, DatosOperacion, PedidoOperacion, UnidadOperacion } from '../types/operacion';

// Derivados puros del estado de operación (antes vivían en los datos de ejemplo).

/** Unidad fuera del almacén (en ruta, en refrigerio o averiada): se dibuja en el mapa y puede llevar carga. */
export const fueraDelAlmacen = (u: Pick<UnidadOperacion, 'estado'>) => u.estado !== 'DISPONIBLE' && u.estado !== 'FUERA_DE_TURNO';

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

/** Ocupación de un conjunto: cantidad sobre capacidad, con su semáforo; null si no hay capacidad. */
export interface OcupacionGlobal {
  cantidad: number;
  capacidad: number;
  fraccion: number | null;
  nivel: NivelCarga | null;
}

const ocupacion = (cantidad: number, capacidad: number, nivelDe: (c: number, cap: number) => NivelCarga): OcupacionGlobal => ({
  cantidad,
  capacidad,
  fraccion: capacidad === 0 ? null : cantidad / capacidad,
  nivel: capacidad === 0 ? null : nivelDe(cantidad, capacidad),
});

/** Flota en conjunto (G01): paquetes a bordo sobre la capacidad de las unidades fuera del almacén. */
export function ocupacionFlota(flota: Pick<UnidadOperacion, 'estado' | 'carga' | 'capacidad'>[]): OcupacionGlobal {
  const fuera = flota.filter(fueraDelAlmacen);
  return ocupacion(
    fuera.reduce((s, u) => s + u.carga, 0),
    fuera.reduce((s, u) => s + u.capacidad, 0),
    nivelDeOcupacion,
  );
}

/** Almacenes en conjunto (G03): stock total de los intermedios sobre su capacidad total; el central no tiene tope. */
export function ocupacionAlmacenes(almacenes: AlmacenOperacion[]): OcupacionGlobal {
  const conTope = almacenes.filter((a) => a.stock !== null && a.capacidad);
  return ocupacion(
    conTope.reduce((s, a) => s + (a.stock as number), 0),
    conTope.reduce((s, a) => s + (a.capacidad as number), 0),
    nivelDeStock,
  );
}

export function estadoFlota(datos: DatosOperacion) {
  const { flota } = datos;
  const porEstado = (estado: UnidadOperacion['estado']) => flota.filter((u) => u.estado === estado);
  const enRuta = porEstado('EN_RUTA');
  const porTipo = (Object.keys(UNIDADES) as TipoUnidad[]).map((tipo) => {
    const delTipo = flota.filter((u) => u.tipo === tipo);
    // Carga a bordo: paquetes sin entregar sobre la capacidad de las unidades fuera del almacén. Baja a
    // medida que entregan; null si ninguna unidad del tipo está fuera.
    const fuera = delTipo.filter(fueraDelAlmacen);
    const capacidadFuera = fuera.reduce((s, u) => s + u.capacidad, 0);
    const cargaFuera = fuera.reduce((s, u) => s + u.carga, 0);
    return {
      tipo,
      enRuta: delTipo.filter((u) => u.estado === 'EN_RUTA').length,
      total: delTipo.length,
      carga: cargaFuera,
      capacidad: capacidadFuera,
      cargaABordo: capacidadFuera === 0 ? null : cargaFuera / capacidadFuera,
    };
  });
  return {
    total: flota.length,
    enRuta: enRuta.length,
    disponibles: porEstado('DISPONIBLE').length,
    enRefrigerio: porEstado('EN_REFRIGERIO'),
    fueraDeTurno: porEstado('FUERA_DE_TURNO').length,
    averiadas: porEstado('AVERIADA'),
    porTipo,
    llenas: enRuta.filter((u) => u.carga >= u.capacidad),
  };
}

/**
 * Cantidad de bloqueos distintos activos: un bloqueo con una polilínea de varios puntos se parte en
 * varios tramos (`datos.bloqueos`, uno por segmento) pero sigue siendo un solo bloqueo para el usuario.
 */
export const cantidadBloqueos = (datos: DatosOperacion) => new Set(datos.bloqueos.map((b) => b.idOriginal)).size;

/** Riesgo agregado para la fila de KPIs. */
export function resumenRiesgo(datos: DatosOperacion) {
  const riesgo = pedidosEnRiesgo(datos);
  return {
    rojo: riesgo.filter((p) => p.nivel === 'ROJO').length,
    ambar: riesgo.filter((p) => p.nivel === 'AMBAR').length,
    holguraMinima: riesgo[0]?.holgura ?? '—',
  };
}
