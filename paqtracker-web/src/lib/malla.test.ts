import { describe, expect, it } from 'vitest';
import { escalaDeEncuadre, limitarVista, pasoCuadricula, puntoEnRecorrido, tramoOrtogonal, vistaCompleta, proyectar, type Lienzo } from './malla';

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

  describe('límites de la vista', () => {
    const lienzo: Lienzo = { ancho: 1000, alto: 700, margen: 40 };

    it('no se aleja más allá de la malla completa', () => {
      const vista = limitarVista({ escala: 1, x: 0, y: 0 }, lienzo);
      expect(vista.escala).toBe(escalaDeEncuadre(lienzo));
      expect(vista).toEqual(vistaCompleta(lienzo));
    });

    it('en la vista completa la malla queda centrada y no se puede arrastrar', () => {
      const completa = vistaCompleta(lienzo);
      expect(limitarVista({ ...completa, x: completa.x + 300, y: completa.y - 200 }, lienzo)).toEqual(completa);
    });

    it('acercada, se puede centrar un nodo del borde pero el borde no pasa del centro del área útil', () => {
      const escala = 40; // 2800 × 2000 px: mucho más que el área útil (920 × 620)
      const centro = { x: 40 + 920 / 2, y: 40 + 620 / 2 };
      // Nodo (0, 0) en el centro: posible.
      expect(limitarVista({ escala, x: centro.x, y: centro.y }, lienzo)).toEqual({ escala, x: centro.x, y: centro.y });
      // Más allá: se detiene con el borde en el centro.
      expect(limitarVista({ escala, x: centro.x + 500, y: centro.y + 500 }, lienzo)).toEqual({ escala, x: centro.x, y: centro.y });
    });
  });

  describe('llenarAlto en pantallas angostas', () => {
    const lienzo: Lienzo = { ancho: 390, alto: 700, margen: 16 };

    it('la escala hace caber la malla en el alto y la deja centrada en el almacén central', () => {
      const normal = vistaCompleta(lienzo);
      const lleno = vistaCompleta(lienzo, { llenarAlto: true });
      expect(lleno.escala).toBeGreaterThan(normal.escala);
      expect(lleno.escala).toBeCloseTo((700 - 32) / 50, 5);
      const central = proyectar(lleno, { x: 27, y: 14 });
      expect(central.x).toBeCloseTo(390 / 2, 5);
    });

    it('permite desplazar en X cuando la malla es más ancha que el lienzo', () => {
      const lleno = vistaCompleta(lienzo, { llenarAlto: true });
      const movida = limitarVista({ ...lleno, x: lleno.x - 100 }, lienzo);
      expect(movida.x).toBe(lleno.x - 100);
    });

    it('sin lienzo vertical, llenarAlto no cambia nada', () => {
      const ancho: Lienzo = { ancho: 1000, alto: 700, margen: 40 };
      expect(vistaCompleta(ancho, { llenarAlto: true })).toEqual(vistaCompleta(ancho));
    });
  });
});
