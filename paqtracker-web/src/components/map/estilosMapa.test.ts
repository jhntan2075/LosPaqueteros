import { describe, expect, it } from 'vitest';
import { AIRE_FLOTANTE_PX, ANCHO_ANGOSTO_PX, ANCHO_BARRA_PX, ANCHO_PILA_MAX_PX, ubicarResumen } from './estilosMapa';
import { derechaDeControles } from './lienzo';

// Dónde va la franja de resumen respecto de la pila de la izquierda y la barra de herramientas de la derecha.

const DERECHA = derechaDeControles(0);

describe('ubicarResumen', () => {
  it('en un mapa ancho va al centro con las cuatro métricas, centrada en el espacio libre y sin tocar la pila ni la barra', () => {
    const u = ubicarResumen(1200, DERECHA, false);
    if (u.donde !== 'centro') throw new Error('debía ir al centro');
    expect(u.metricas).toBe(4);
    const izquierdaLibre = AIRE_FLOTANTE_PX + ANCHO_PILA_MAX_PX + AIRE_FLOTANTE_PX;
    const derechaLibre = 1200 - (DERECHA + ANCHO_BARRA_PX + AIRE_FLOTANTE_PX);
    expect(u.izquierdaPx).toBeGreaterThanOrEqual(izquierdaLibre);
    expect(u.izquierdaPx + u.anchoPx).toBeLessThanOrEqual(derechaLibre);
    // Centrada: la misma holgura a un lado y a otro.
    expect(Math.abs(u.izquierdaPx - izquierdaLibre - (derechaLibre - (u.izquierdaPx + u.anchoPx)))).toBeLessThanOrEqual(1);
  });

  it('un panel flotante a la derecha estrecha el espacio: con poco ancho libre quedan dos métricas', () => {
    const u = ubicarResumen(1200, derechaDeControles(352), false);
    if (u.donde !== 'centro') throw new Error('debía ir al centro');
    expect(u.metricas).toBe(2);
    // Sigue sin pasar de la barra, que se corrió a la izquierda del panel.
    expect(u.izquierdaPx + u.anchoPx).toBeLessThanOrEqual(1200 - (derechaDeControles(352) + ANCHO_BARRA_PX + AIRE_FLOTANTE_PX));
  });

  it('sin ancho libre suficiente va dentro de la pila, con dos métricas', () => {
    expect(ubicarResumen(700, DERECHA, false)).toEqual({ donde: 'pila', metricas: 2 });
  });

  it('en compacto (celular) siempre va dentro de la pila, con dos métricas', () => {
    expect(ubicarResumen(390, DERECHA, true)).toEqual({ donde: 'pila', metricas: 2 });
    expect(ubicarResumen(1200, DERECHA, true)).toEqual({ donde: 'pila', metricas: 2 });
  });

  it('un mapa angosto (< 600 px) no deja espacio en el centro: dos métricas en la pila', () => {
    expect(ANCHO_ANGOSTO_PX).toBe(600);
    expect(ubicarResumen(ANCHO_ANGOSTO_PX - 1, DERECHA, false)).toEqual({ donde: 'pila', metricas: 2 });
  });
});
