import { ALMACENES, MALLA_ALTO_KM, MALLA_ANCHO_KM } from '../config/dominio';
import type { ParametrosAveriaApi, ParametrosDominioApi } from '../types/api';

// Mismos límites que valida la API (ParametrosDominio): se avisa junto al campo antes de enviar.
const CAPACIDAD_ALMACEN_MAXIMA = 100_000;
const CAPACIDAD_UNIDAD_MAXIMA = 500;
const VELOCIDAD_MAXIMA = 120;
const DURACION_MAXIMA = 30 * 1440;

const entero = (valor: number, min: number, max: number, unidad: string) =>
  !Number.isInteger(valor) ? 'Ingresa un número entero.' : valor < min || valor > max ? `Debe estar entre ${min} y ${max.toLocaleString('es-PE')} ${unidad}.` : null;

/** Errores por campo ("almacenes.1.x", "averias.trasvaseMinutos"…), con las mismas reglas que la API. */
export function validarParametros(p: ParametrosDominioApi): Record<string, string> {
  const errores: Record<string, string> = {};
  const nodos = new Map<string, string>();
  p.almacenes.forEach((a, i) => {
    const ex = entero(a.x, 0, MALLA_ANCHO_KM, 'km');
    const ey = entero(a.y, 0, MALLA_ALTO_KM, 'km');
    if (ex) errores[`almacenes.${i}.x`] = ex;
    if (ey) errores[`almacenes.${i}.y`] = ey;
    if (!ex && !ey) {
      const clave = `${a.x},${a.y}`;
      const otro = nodos.get(clave);
      if (otro) errores[`almacenes.${i}.x`] = `Está en el mismo nodo que ${otro}.`;
      else nodos.set(clave, ALMACENES[i]?.nombre ?? a.codigo);
    }
    if (a.codigo !== 'CENTRAL') {
      const ec = entero(a.capacidad ?? Number.NaN, 1, CAPACIDAD_ALMACEN_MAXIMA, 'paquetes');
      if (ec) errores[`almacenes.${i}.capacidad`] = ec;
    }
  });
  p.unidades.forEach((u, i) => {
    const ec = entero(u.capacidad, 1, CAPACIDAD_UNIDAD_MAXIMA, 'paquetes');
    const ev = entero(u.velocidadKmH, 1, VELOCIDAD_MAXIMA, 'km/h');
    if (ec) errores[`unidades.${i}.capacidad`] = ec;
    if (ev) errores[`unidades.${i}.velocidadKmH`] = ev;
    if (!Number.isFinite(u.costoPorKm) || u.costoPorKm < 0) errores[`unidades.${i}.costoPorKm`] = 'Debe ser un número mayor o igual a 0.';
  });
  const av = p.averias;
  (Object.keys(av) as (keyof ParametrosAveriaApi)[]).forEach((campo) => {
    const e = entero(av[campo], 1, DURACION_MAXIMA, 'min');
    if (e) errores[`averias.${campo}`] = e;
  });
  if (!errores['averias.trasvaseMinutos'] && (av.trasvaseMinutos >= av.tipo1Minutos || av.trasvaseMinutos >= av.permanenciaSitioMinutos)) {
    errores['averias.trasvaseMinutos'] = 'Debe ser más corto que la detención de cada tipo: termina antes de que la unidad averiada se vaya.';
  }
  if (!errores['averias.tipo3MinimoMinutos'] && av.tipo3MinimoMinutos < av.permanenciaSitioMinutos) {
    errores['averias.tipo3MinimoMinutos'] = 'No puede durar menos que la permanencia en el sitio.';
  }
  return errores;
}
