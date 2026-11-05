import { CORTE_OCUPACION, CORTE_STOCK } from '../config/dominio';

// Semáforo + vacío de la rúbrica (glosario): cuánto contiene una unidad o un almacén sobre su capacidad.
// Vacío = nada; verde = poco (mucho espacio); ámbar = cantidad importante; rojo = casi lleno o lleno.
// Mapa, panel, leyenda y filtros lo toman de aquí para que nunca muestren colores distintos.

export type NivelCarga = 'VACIO' | 'VERDE' | 'AMBAR' | 'ROJO';

/** De menos a más lleno: el orden de la leyenda y de los filtros. */
export const NIVELES_CARGA: NivelCarga[] = ['VACIO', 'VERDE', 'AMBAR', 'ROJO'];

interface Cortes {
  /** Fracción hasta la que se considera vacío (0 = solo sin carga). */
  vacio: number;
  ambar: number;
  rojo: number;
}

function nivelSegun(cantidad: number, capacidad: number, cortes: Cortes): NivelCarga {
  if (cantidad <= 0 || capacidad <= 0) return 'VACIO';
  const fraccion = cantidad / capacidad;
  if (fraccion <= cortes.vacio) return 'VACIO';
  if (fraccion >= cortes.rojo) return 'ROJO';
  if (fraccion >= cortes.ambar) return 'AMBAR';
  return 'VERDE';
}

/** Carga de una unidad sobre su capacidad (CF-02). */
export const nivelDeOcupacion = (carga: number, capacidad: number) => nivelSegun(carga, capacidad, CORTE_OCUPACION);

/** Stock de un almacén intermedio sobre su capacidad. */
export const nivelDeStock = (stock: number, capacidad: number) => nivelSegun(stock, capacidad, CORTE_STOCK);

/** Vacío en gris pizarra (contraste 4,8:1 sobre blanco): se dibuja hueco, no relleno. */
export const COLOR_SEMAFORO: Record<NivelCarga, string> = {
  VACIO: '#64748B',
  VERDE: '#15803D',
  AMBAR: '#B45309',
  ROJO: '#B91C1C',
};

export const TEXTO_SEMAFORO: Record<NivelCarga, string> = {
  VACIO: 'text-[#64748B]',
  VERDE: 'text-[#15803D]',
  AMBAR: 'text-[#B45309]',
  ROJO: 'text-[#B91C1C]',
};

export const BORDE_SEMAFORO: Record<NivelCarga, string> = {
  VACIO: 'border-[#CBD5E1]',
  VERDE: 'border-[#15803D]',
  AMBAR: 'border-[#B45309]',
  ROJO: 'border-[#B91C1C]',
};

export const FONDO_SEMAFORO: Record<NivelCarga, string> = {
  VACIO: 'bg-[#64748B]',
  VERDE: 'bg-[#15803D]',
  AMBAR: 'bg-[#B45309]',
  ROJO: 'bg-[#B91C1C]',
};
