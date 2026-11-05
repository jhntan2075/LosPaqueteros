import { describe, expect, it } from 'vitest';
import { dentroDeMinutos, minutosDesdeSalida, minutosParaLlegar, ordenarUnidades } from './listaUnidades';
import type { UnidadOperacion } from '../types/operacion';

const AHORA = new Date(2026, 0, 5, 12, 0);
const min = (m: number) => new Date(AHORA.getTime() + m * 60_000);
const unidad = (codigo: string, carga: number, tramo?: [number, number]) =>
  ({
    codigo,
    carga,
    capacidad: 10,
    tramo: tramo && { origen: { x: 0, y: 0 }, destino: { x: 1, y: 0 }, salida: min(tramo[0]), llegada: min(tramo[1]) },
  }) as UnidadOperacion;

const A = unidad('A-01', 9, [-20, 10]);
const B = unidad('B-01', 2, [-5, 40]);
const M = unidad('M-01', 5);
const codigos = (lista: UnidadOperacion[]) => lista.map((u) => u.codigo);

describe('lista de unidades', () => {
  it('ordena por ocupación en ambos sentidos', () => {
    expect(codigos(ordenarUnidades([A, B, M], 'OCUPACION', 'DESC'))).toEqual(['A-01', 'M-01', 'B-01']);
    expect(codigos(ordenarUnidades([A, B, M], 'OCUPACION', 'ASC'))).toEqual(['B-01', 'M-01', 'A-01']);
  });

  it('ordena por hora de salida y de llegada; sin tramo va al final en cualquier sentido', () => {
    expect(codigos(ordenarUnidades([M, B, A], 'SALIDA', 'ASC'))).toEqual(['A-01', 'B-01', 'M-01']);
    expect(codigos(ordenarUnidades([M, B, A], 'SALIDA', 'DESC'))).toEqual(['B-01', 'A-01', 'M-01']);
    expect(codigos(ordenarUnidades([M, B, A], 'LLEGADA', 'ASC'))).toEqual(['A-01', 'B-01', 'M-01']);
    expect(codigos(ordenarUnidades([M, B, A], 'LLEGADA', 'DESC'))).toEqual(['B-01', 'A-01', 'M-01']);
  });

  it('mide minutos para llegar al destino y desde la salida del origen', () => {
    expect(minutosParaLlegar(A, AHORA)).toBe(10);
    expect(minutosDesdeSalida(A, AHORA)).toBe(20);
    expect(minutosParaLlegar(M, AHORA)).toBeNull();
  });

  it('busca por minutos distinguiendo llegada y salida', () => {
    expect(dentroDeMinutos(A, 15, 'LLEGADA', AHORA)).toBe(true);
    expect(dentroDeMinutos(B, 15, 'LLEGADA', AHORA)).toBe(false);
    expect(dentroDeMinutos(A, 15, 'SALIDA', AHORA)).toBe(false);
    expect(dentroDeMinutos(B, 15, 'SALIDA', AHORA)).toBe(true);
    expect(dentroDeMinutos(M, 999, 'LLEGADA', AHORA)).toBe(false);
  });
});
