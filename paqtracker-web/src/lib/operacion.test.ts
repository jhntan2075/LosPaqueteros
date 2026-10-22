import { describe, expect, it } from 'vitest';
import { INICIO_MS, datosOperacion, pedidoApi, unidadApi } from '../test/fabricas';
import { estadoFlota, fueraDelAlmacen, nivelDeOcupacion, pedidosEnRiesgo, resumenRiesgo, unidadPorCodigo } from './operacion';

describe('nivelDeOcupacion', () => {
  it('aplica los cortes ámbar (70 %) y rojo (90 %)', () => {
    expect(nivelDeOcupacion(6, 10)).toBe('VERDE');
    expect(nivelDeOcupacion(7, 10)).toBe('AMBAR');
    expect(nivelDeOcupacion(9, 10)).toBe('ROJO');
  });

  it('capacidad cero no divide por cero', () => {
    expect(nivelDeOcupacion(5, 0)).toBe('VERDE');
  });
});

describe('estado de la flota', () => {
  const datos = datosOperacion({
    unidades: [
      unidadApi({ codigo: 'A-01', estado: 'EN_RUTA', cargaActual: 10, capacidadMaxima: 10 }),
      unidadApi({ id: 2, codigo: 'A-02', estado: 'DISPONIBLE_EN_ALMACEN' }),
      unidadApi({ id: 3, codigo: 'M-01', tipo: 'MOTO', estado: 'EN_REFRIGERIO', cargaActual: 2, capacidadMaxima: 4 }),
      unidadApi({ id: 4, codigo: 'M-02', tipo: 'MOTO', estado: 'FUERA_DE_TURNO' }),
      unidadApi({ id: 5, codigo: 'M-03', tipo: 'MOTO', estado: 'AVERIADA', cargaActual: 0, capacidadMaxima: 4 }),
    ],
  });

  it('cuenta las unidades por estado', () => {
    const flota = estadoFlota(datos);
    expect(flota.total).toBe(5);
    expect(flota.enRuta).toBe(1);
    expect(flota.disponibles).toBe(1);
    expect(flota.fueraDeTurno).toBe(1);
    expect(flota.enRefrigerio.map((u) => u.codigo)).toEqual(['M-01']);
    expect(flota.averiadas.map((u) => u.codigo)).toEqual(['M-03']);
    expect(flota.llenas.map((u) => u.codigo)).toEqual(['A-01']);
  });

  it('calcula la carga a bordo solo con unidades fuera del almacén', () => {
    const porTipo = Object.fromEntries(estadoFlota(datos).porTipo.map((t) => [t.tipo, t]));
    expect(porTipo.AUTO.cargaABordo).toBe(1);
    // Motos fuera: M-01 (2 de 4) y M-03 averiada (0 de 4); M-02 fuera de turno no cuenta.
    expect(porTipo.MOTO.cargaABordo).toBeCloseTo(2 / 8);
    expect(porTipo.BICICLETA.cargaABordo).toBeNull();
  });

  it('fueraDelAlmacen excluye disponibles y fuera de turno', () => {
    const [ruta, libre, , fuera, averiada] = datos.flota;
    expect(fueraDelAlmacen(ruta)).toBe(true);
    expect(fueraDelAlmacen(averiada)).toBe(true);
    expect(fueraDelAlmacen(libre)).toBe(false);
    expect(fueraDelAlmacen(fuera)).toBe(false);
  });

  it('busca unidades por código', () => {
    expect(unidadPorCodigo(datos, 'M-01')?.estado).toBe('EN_REFRIGERIO');
    expect(unidadPorCodigo(datos, 'X-99')).toBeUndefined();
  });
});

describe('riesgo de pedidos', () => {
  const datos = datosOperacion({
    pedidos: [
      pedidoApi({ codigo: '#1', nivelHolgura: 'VERDE' }),
      pedidoApi({ id: 2, codigo: '#2', nivelHolgura: 'AMBAR', horaLimiteMs: INICIO_MS + 30 * 60_000 }),
      pedidoApi({ id: 3, codigo: '#3', nivelHolgura: 'ROJO', horaLimiteMs: INICIO_MS + 10 * 60_000 }),
    ],
  });

  it('lista rojos y ámbar de menor a mayor holgura', () => {
    expect(pedidosEnRiesgo(datos).map((p) => p.codigo)).toEqual(['#3', '#2']);
  });

  it('resume el riesgo con la holgura mínima', () => {
    expect(resumenRiesgo(datos)).toEqual({ rojo: 1, ambar: 1, holguraMinima: '00:10' });
  });

  it('sin pedidos en riesgo la holgura mínima es "—"', () => {
    expect(resumenRiesgo(datosOperacion()).holguraMinima).toBe('—');
  });
});
