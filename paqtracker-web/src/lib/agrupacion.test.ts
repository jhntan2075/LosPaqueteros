import { describe, expect, it } from 'vitest';
import { agruparCercanas } from './agrupacion';

type Punto = { codigo: string; x: number; y: number };
const p = (codigo: string, x: number, y: number): Punto => ({ codigo, x, y });
const agrupar = (items: Punto[], radio = 10, excluir: (t: Punto) => boolean = () => false) => agruparCercanas(items, (t) => t, radio, excluir);
const codigos = (grupos: ReturnType<typeof agrupar>) => grupos.map((g) => g.miembros.map((m) => m.codigo));

describe('agruparCercanas', () => {
  it('tres puntos a 4 px forman un solo grupo de 3', () => {
    const grupos = agrupar([p('A', 100, 100), p('B', 104, 100), p('C', 100, 104)]);
    expect(codigos(grupos)).toEqual([['A', 'B', 'C']]);
  });

  it('un punto a 30 px queda en su propio grupo', () => {
    expect(codigos(agrupar([p('A', 0, 0), p('B', 3, 0), p('C', 30, 0)]))).toEqual([['A', 'B'], ['C']]);
  });

  it('el centro es la posición del primer miembro y no se mueve al sumar otros', () => {
    const [g] = agrupar([p('A', 0, 0), p('B', 8, 0)]);
    expect(g.centro).toEqual({ x: 0, y: 0 });
    // C está a 12 px del ancla (aunque a 4 px de B): no se une.
    expect(codigos(agrupar([p('A', 0, 0), p('B', 8, 0), p('C', 12, 0)]))).toEqual([['A', 'B'], ['C']]);
  });

  it('el radio es inclusivo y se mide en distancia euclidiana', () => {
    expect(codigos(agrupar([p('A', 0, 0), p('B', 6, 8)]))).toEqual([['A', 'B']]);
    expect(codigos(agrupar([p('A', 0, 0), p('B', 8, 8)]))).toEqual([['A'], ['B']]);
  });

  it('un excluido a 2 px de otro queda solo y el otro también', () => {
    const grupos = agrupar([p('A', 0, 0), p('X', 2, 0)], 10, (t) => t.codigo === 'X');
    expect(codigos(grupos)).toEqual([['A'], ['X']]);
    // El excluido tampoco atrae a los que vienen después, venga antes o después.
    expect(codigos(agrupar([p('X', 0, 0), p('A', 2, 0)], 10, (t) => t.codigo === 'X'))).toEqual([['X'], ['A']]);
    expect(codigos(agrupar([p('X', 0, 0), p('A', 2, 0), p('B', 3, 0)], 10, (t) => t.codigo === 'X'))).toEqual([['X'], ['A', 'B']]);
  });

  it('grupos y miembros siguen el orden de entrada', () => {
    const grupos = agrupar([p('A', 0, 0), p('B', 50, 0), p('C', 1, 0), p('D', 51, 0)]);
    expect(codigos(grupos)).toEqual([['A', 'C'], ['B', 'D']]);
    expect(grupos.map((g) => g.centro)).toEqual([{ x: 0, y: 0 }, { x: 50, y: 0 }]);
  });

  it('con radio 0 solo se agrupan posiciones idénticas', () => {
    expect(codigos(agrupar([p('A', 5, 5), p('B', 5, 5), p('C', 5, 5.5)], 0))).toEqual([['A', 'B'], ['C']]);
  });

  it('sin elementos no hay grupos', () => {
    expect(agrupar([])).toEqual([]);
  });
});
