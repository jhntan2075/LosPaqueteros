import type { CortesCargaApi, CortesPorDebajoApi, RangosSemaforoApi } from '../types/api';

// Rangos vigentes de los semáforos. El operador los cambia desde la leyenda del mapa; la API los guarda y
// aquí quedan en un almacén en memoria que el mapa, los paneles, la leyenda y el glosario leen al pintar.
// Al cambiar, se avisa a los suscriptores (useRangosSemaforo) para que la pantalla se vuelva a dibujar.

/** Valores que regían antes de ser configurables; se usan hasta que responde la API. */
export const RANGOS_POR_DEFECTO: RangosSemaforoApi = {
  holgura: { rojo: 0.15, ambar: 0.4 },
  inventario: { rojo: 0.2, ambar: 0.5 },
  ocupacionUnidad: { vacio: 0, ambar: 0.7, rojo: 0.9 },
  ocupacionAlmacen: { vacio: 0, ambar: 0.5, rojo: 0.8 },
};

/** Nombre visible de cada semáforo, en el mismo orden que en el diálogo. */
export const NOMBRE_RANGO: Record<keyof RangosSemaforoApi, string> = {
  holgura: 'Holgura del pedido',
  inventario: 'Stock bajo de almacén',
  ocupacionUnidad: 'Carga de unidades',
  ocupacionAlmacen: 'Stock de almacenes',
};

let vigentes: RangosSemaforoApi = RANGOS_POR_DEFECTO;
const oyentes = new Set<() => void>();

export const obtenerRangos = (): RangosSemaforoApi => vigentes;

export function fijarRangos(rangos: RangosSemaforoApi): void {
  vigentes = rangos;
  oyentes.forEach((oyente) => oyente());
}

export function suscribirRangos(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

const porcentaje = (fraccion: number) => `${Math.round(fraccion * 1000) / 10} %`;
const esFraccion = (valor: number) => Number.isFinite(valor) && valor >= 0 && valor <= 1;

function erroresPorDebajo(nombre: string, cortes: CortesPorDebajoApi): string[] {
  if (!esFraccion(cortes.rojo) || !esFraccion(cortes.ambar)) return [`${nombre}: cada umbral debe estar entre 0 % y 100 %.`];
  if (cortes.rojo >= cortes.ambar) {
    return [`${nombre}: el rojo (${porcentaje(cortes.rojo)}) debe ser menor que el ámbar (${porcentaje(cortes.ambar)}).`];
  }
  return [];
}

function erroresCarga(nombre: string, cortes: CortesCargaApi): string[] {
  if (![cortes.vacio, cortes.ambar, cortes.rojo].every(esFraccion)) return [`${nombre}: cada umbral debe estar entre 0 % y 100 %.`];
  if (cortes.vacio >= cortes.ambar || cortes.ambar >= cortes.rojo) {
    return [`${nombre}: debe cumplirse vacío < ámbar < rojo.`];
  }
  return [];
}

/** Las mismas reglas que valida la API, para avisar antes de enviar. Vacío si los rangos son coherentes. */
export function validarRangos(rangos: RangosSemaforoApi): string[] {
  return [
    ...erroresPorDebajo(NOMBRE_RANGO.holgura, rangos.holgura),
    ...erroresPorDebajo(NOMBRE_RANGO.inventario, rangos.inventario),
    ...erroresCarga(NOMBRE_RANGO.ocupacionUnidad, rangos.ocupacionUnidad),
    ...erroresCarga(NOMBRE_RANGO.ocupacionAlmacen, rangos.ocupacionAlmacen),
  ];
}
