import { describe, expect, it } from 'vitest';
import { pasoCuadricula, puntoEnRecorrido, tramoOrtogonal } from './malla';

describe('malla', () => {
  it('tramoOrtogonal avanza primero en x y luego en y', () => {
    expect(tramoOrtogonal({ x: 1, y: 1 }, { x: 4, y: 5 })).toEqual([{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 5 }]);
  });

  it('puntoEnRecorrido interpola por longitud y cruza esquinas', () => {
    const camino = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    expect(puntoEnRecorrido(camino, 0)).toEqual({ punto: { x: 0, y: 0 }, tramo: 0 });
    expect(puntoEnRecorrido(camino, 0.25)).toEqual({ punto: { x: 5, y: 0 }, tramo: 0 });
    expect(puntoEnRecorrido(camino, 0.75)).toEqual({ punto: { x: 10, y: 5 }, tramo: 1 });
    expect(puntoEnRecorrido(camino, 1).punto).toEqual({ x: 10, y: 10 });
  });

  it('puntoEnRecorrido acota la fracción a [0, 1]', () => {
    const camino = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    expect(puntoEnRecorrido(camino, -3).punto).toEqual({ x: 0, y: 0 });
    expect(puntoEnRecorrido(camino, 9).punto).toEqual({ x: 10, y: 0 });
  });

  it('pasoCuadricula se afina al acercar', () => {
    expect(pasoCuadricula(1)).toBe(10);
    expect(pasoCuadricula(3)).toBe(5);
    expect(pasoCuadricula(8)).toBe(1);
  });
});
