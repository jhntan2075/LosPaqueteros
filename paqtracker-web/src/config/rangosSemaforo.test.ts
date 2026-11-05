import { afterEach, describe, expect, it, vi } from 'vitest';
import { RANGO_HOLGURA, RANGO_OCUPACION, alertaStockBajo } from './glosario';
import { RANGOS_POR_DEFECTO, fijarRangos, obtenerRangos, suscribirRangos, validarRangos } from './rangosSemaforo';
import { nivelDeOcupacion, nivelDeStock } from '../lib/semaforo';
import type { RangosSemaforoApi } from '../types/api';

const con = (cambios: Partial<RangosSemaforoApi>): RangosSemaforoApi => ({ ...RANGOS_POR_DEFECTO, ...cambios });

afterEach(() => {
  fijarRangos(RANGOS_POR_DEFECTO);
});

describe('validarRangos', () => {
  it('acepta los valores por defecto', () => {
    expect(validarRangos(RANGOS_POR_DEFECTO)).toEqual([]);
  });

  it('rechaza rojo no menor que ámbar en holgura y en stock bajo', () => {
    expect(validarRangos(con({ holgura: { rojo: 0.5, ambar: 0.4 } }))).toHaveLength(1);
    expect(validarRangos(con({ inventario: { rojo: 0.5, ambar: 0.5 } }))).toHaveLength(1);
  });

  it('exige vacío < ámbar < rojo en la carga', () => {
    expect(validarRangos(con({ ocupacionUnidad: { vacio: 0.7, ambar: 0.7, rojo: 0.9 } }))[0]).toMatch(/vacío < ámbar < rojo/);
    expect(validarRangos(con({ ocupacionAlmacen: { vacio: 0, ambar: 0.9, rojo: 0.8 } }))).toHaveLength(1);
  });

  it('rechaza valores fuera de 0–100 % o que no son números', () => {
    expect(validarRangos(con({ ocupacionUnidad: { vacio: 0, ambar: 0.7, rojo: 1.2 } }))).toHaveLength(1);
    expect(validarRangos(con({ holgura: { rojo: Number.NaN, ambar: 0.4 } }))).toHaveLength(1);
  });
});

describe('fijarRangos', () => {
  it('avisa a los suscriptores y deja de avisar al desuscribirse', () => {
    const oyente = vi.fn();
    const desuscribir = suscribirRangos(oyente);
    const nuevos = con({ holgura: { rojo: 0.1, ambar: 0.3 } });

    fijarRangos(nuevos);
    desuscribir();
    fijarRangos(RANGOS_POR_DEFECTO);

    expect(oyente).toHaveBeenCalledTimes(1);
    expect(obtenerRangos()).toEqual(RANGOS_POR_DEFECTO);
  });

  it('el semáforo y sus textos usan los rangos nuevos sin recargar', () => {
    expect(nivelDeOcupacion(1, 10)).toBe('VERDE');
    expect(RANGO_OCUPACION.VACIO).toBe('0');

    fijarRangos(con({
      ocupacionUnidad: { vacio: 0.1, ambar: 0.5, rojo: 0.8 },
      ocupacionAlmacen: { vacio: 0, ambar: 0.3, rojo: 0.6 },
      holgura: { rojo: 0.1, ambar: 0.3 },
      inventario: { rojo: 0.25, ambar: 0.5 },
    }));

    expect(nivelDeOcupacion(1, 10)).toBe('VACIO');
    expect(nivelDeOcupacion(5, 10)).toBe('AMBAR');
    expect(nivelDeOcupacion(8, 10)).toBe('ROJO');
    expect(nivelDeStock(30, 100)).toBe('AMBAR');
    expect(RANGO_OCUPACION.VACIO).toBe('≤ 10 %');
    expect(RANGO_OCUPACION.VERDE).toBe('10–50 %');
    expect(RANGO_HOLGURA.AMBAR).toBe('10–30 %');
    expect(alertaStockBajo()).toBe('Stock bajo (< 25 %)');
  });
});
