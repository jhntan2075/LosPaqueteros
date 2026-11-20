import { describe, expect, it } from 'vitest';
import { nivelDeOcupacion, nivelDeStock } from './semaforo';

describe('nivelDeOcupacion', () => {
  it('sin carga es vacío', () => {
    expect(nivelDeOcupacion(0, 10)).toBe('VACIO');
  });

  it('aplica los cortes ámbar (70 %) y rojo (90 %)', () => {
    expect(nivelDeOcupacion(1, 10)).toBe('VERDE');
    expect(nivelDeOcupacion(6, 10)).toBe('VERDE');
    expect(nivelDeOcupacion(7, 10)).toBe('AMBAR');
    expect(nivelDeOcupacion(9, 10)).toBe('ROJO');
    expect(nivelDeOcupacion(10, 10)).toBe('ROJO');
  });

  it('capacidad cero no divide por cero', () => {
    expect(nivelDeOcupacion(5, 0)).toBe('VACIO');
  });
});

describe('nivelDeStock', () => {
  it('lleno es verde y el stock bajo, rojo (cortes del inventario: rojo < 20 %, ámbar < 50 %)', () => {
    expect(nivelDeStock(0, 100)).toBe('VACIO');
    expect(nivelDeStock(10, 100)).toBe('ROJO');
    expect(nivelDeStock(19, 100)).toBe('ROJO');
    expect(nivelDeStock(20, 100)).toBe('AMBAR');
    expect(nivelDeStock(49, 100)).toBe('AMBAR');
    expect(nivelDeStock(50, 100)).toBe('VERDE');
    expect(nivelDeStock(100, 100)).toBe('VERDE');
  });
});
