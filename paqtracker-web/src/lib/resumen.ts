import { formatearMiles } from './formato';
import { estadoFlota } from './operacion';
import type { DatosOperacion } from '../types/operacion';

// Cifras del resumen de la operación (franja sobre el mapa y su desplegable): se derivan de las mismas
// unidades y pedidos que se muestran, no de indicadores sueltos del servidor.

/** Una unidad es "carga alta" desde este uso de la flota (en ruta sobre el total). */
const USO_CARGA_ALTA = 0.7;

export function metricasResumen(datos: DatosOperacion) {
  const { resumen } = datos;
  const flota = estadoFlota(datos);
  const usoFlota = flota.total === 0 ? 0 : flota.enRuta / flota.total;
  const entregadosSobreTotal = resumen.total === 0 ? 0 : (resumen.entregados / resumen.total) * 100;
  return {
    resumen,
    flota,
    usoFlota,
    /** Toda la flota está en ruta: no queda unidad para absorber un pedido nuevo. */
    quiebre: flota.total > 0 && usoFlota >= 1,
    alertaCarga: usoFlota >= USO_CARGA_ALTA,
    /** "12,3": entregados sobre el total de pedidos. */
    porcentajeEntregado: entregadosSobreTotal.toFixed(1).replace('.', ','),
    totalPedidos: formatearMiles(resumen.total),
    /**
     * Entregas en plazo sobre las entregadas, con un decimal truncado hacia abajo: nunca marca 100 con entregas
     * tardías (99,96 no se redondea a 100). null si aún no se entregó ninguna.
     */
    porcentajeEnPlazo: resumen.entregados === 0 ? null : Math.floor((resumen.enPlazo * 1000) / resumen.entregados) / 10,
    enRutaDe: (tipo: string) => flota.porTipo.find((t) => t.tipo === tipo)?.enRuta ?? 0,
  };
}
