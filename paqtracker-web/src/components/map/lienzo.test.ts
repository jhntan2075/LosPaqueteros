import { describe, expect, it } from 'vitest';
import { vistaCompleta } from '../../lib/malla';
import { ALTO_PILA_REDUCIDA_PX } from './estilosMapa';
import { crearLienzo } from './lienzo';

// El lienzo reserva lugar a los controles que flotan sobre el mapa.

describe('crearLienzo', () => {
  it('en escritorio ya no reserva una columna a la izquierda: el margen izquierdo es el margen normal', () => {
    const l = crearLienzo(1200, 800, 0, 0, false);
    // Sin margen izquierdo propio: rige `margen`, el mismo de arriba, no los 248 px de la columna que había.
    expect(l.margen).toBe(32);
    expect(l.margenSuperior).toBeUndefined();
    // A la derecha deja el lugar de la barra de herramientas.
    expect(l.margenDerecho).toBeGreaterThan(l.margen);
  });

  it('un panel flotante a la derecha empuja la reserva de la barra a su izquierda', () => {
    expect(crearLienzo(1200, 800, 352, 0, false).margenDerecho).toBeGreaterThan(crearLienzo(1200, 800, 0, 0, false).margenDerecho!);
  });

  it('en compacto reserva arriba la pila de búsqueda y alertas: más que el margen normal', () => {
    const l = crearLienzo(390, 700, 0, 0, true);
    expect(l.margenSuperior).toBeGreaterThan(l.margen);
    expect(l.margenSuperior).toBeGreaterThanOrEqual(ALTO_PILA_REDUCIDA_PX);
  });

  it('en compacto la malla de la vista inicial empieza debajo de la pila reducida', () => {
    const l = crearLienzo(390, 700, 0, 0, true);
    const vista = vistaCompleta(l, { llenarAlto: true });
    // El origen de la malla (0,0) se proyecta en vista.y: no sube más arriba de la reserva.
    expect(vista.y).toBeGreaterThanOrEqual(ALTO_PILA_REDUCIDA_PX);
  });

  it('en compacto con hoja inferior abierta, la malla se encuadra encima de ella', () => {
    const sinHoja = crearLienzo(390, 700, 0, 0, true).margenInferior!;
    expect(crearLienzo(390, 700, 0, 300, true).margenInferior).toBe(312);
    expect(crearLienzo(390, 700, 0, 300, true).margenInferior).toBeGreaterThan(sinHoja);
  });
});
