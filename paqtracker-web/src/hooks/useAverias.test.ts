import { describe, expect, it } from 'vitest';
import { INICIO_MS, datosOperacion, unidadApi } from '../test/fabricas';
import type { RespuestaRegistroAveriaApi } from '../types/api';
import { admisionDeAverias, averiaPendiente, claveAveria } from './useAverias';

const pendiente = (instanteMs: number): RespuestaRegistroAveriaApi => ({
  id: 1,
  ejecucionId: 'ej-1',
  unidad: 'A-01',
  tipo: 1,
  estado: 'PROGRAMADA',
  instanteMs,
  reincorporacionMs: instanteMs + 7_200_000,
  trasladoCentralMs: null,
});

describe('averiaPendiente', () => {
  const pendientes = { [claveAveria('ej-1', 'A-01')]: pendiente(INICIO_MS + 60_000) };

  it('mientras la unidad no figura averiada, la avería sigue aplicándose', () => {
    const datos = datosOperacion({ unidades: [unidadApi()] });
    expect(averiaPendiente(datos, pendientes, 'A-01')).toBe(pendientes['ej-1:A-01']);
  });

  it('deja de ser pendiente cuando la unidad ya figura averiada', () => {
    const datos = datosOperacion({ unidades: [unidadApi({ estado: 'AVERIADA' })] });
    expect(averiaPendiente(datos, pendientes, 'A-01')).toBeNull();
  });

  it('caduca pasado el margen simulado de 5 minutos', () => {
    const limite = INICIO_MS + 60_000 + 5 * 60_000;
    expect(averiaPendiente(datosOperacion({ unidades: [unidadApi()] }, limite), pendientes, 'A-01')).not.toBeNull();
    expect(averiaPendiente(datosOperacion({ unidades: [unidadApi()] }, limite + 1), pendientes, 'A-01')).toBeNull();
  });

  it('es null sin registro o con una unidad que no existe', () => {
    const datos = datosOperacion({ unidades: [unidadApi()] });
    expect(averiaPendiente(datos, {}, 'A-01')).toBeNull();
    expect(averiaPendiente(datos, { [claveAveria('ej-1', 'X-99')]: pendiente(INICIO_MS) }, 'X-99')).toBeNull();
  });

  it('no mezcla registros de otra ejecución', () => {
    const datos = datosOperacion({ ejecucionId: 'ej-2', unidades: [unidadApi()] });
    expect(averiaPendiente(datos, pendientes, 'A-01')).toBeNull();
  });
});

describe('admisionDeAverias', () => {
  it('admite averías en ejecuciones en curso o pausadas', () => {
    expect(admisionDeAverias(datosOperacion({ estado: 'EN_CURSO' }))).toEqual({ admite: true });
    expect(admisionDeAverias(datosOperacion({ estado: 'PAUSADA' }))).toEqual({ admite: true });
  });

  it('no admite averías en la simulación hasta el colapso', () => {
    const r = admisionDeAverias(datosOperacion({ tipoEscenario: 'COLAPSO_LOGISTICO' }));
    expect(r.admite).toBe(false);
    expect(r.motivo).toBe('Esta simulación no admite averías.');
  });

  it.each(['FINALIZADA', 'COLAPSADA', 'CONFIGURADA'] as const)('no admite averías si la ejecución está %s', (estado) => {
    const r = admisionDeAverias(datosOperacion({ estado }));
    expect(r.admite).toBe(false);
    expect(r.motivo).toBe('La ejecución terminó: no admite averías.');
  });
});
