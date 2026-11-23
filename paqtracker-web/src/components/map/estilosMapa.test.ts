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

  it('en los límites: 728 px es lo mínimo para ir al centro; 727 va a la pila', () => {
    expect(ubicarResumen(727, DERECHA, false).donde).toBe('pila');
    expect(ubicarResumen(728, DERECHA, false)).toMatchObject({ donde: 'centro', metricas: 2, anchoPx: 288 });
  });

  it('en los límites: 840 px es lo mínimo para las cuatro métricas; 839 lleva dos', () => {
    expect(ubicarResumen(839, DERECHA, false)).toMatchObject({ donde: 'centro', metricas: 2 });
    expect(ubicarResumen(840, DERECHA, false)).toMatchObject({ donde: 'centro', metricas: 4, anchoPx: 400 });
  });

  it.each([
    ['sin panel flotante', 0],
    ['con el panel del diagnóstico (352 px)', 352],
  ])('de 1024 a 1920 px, %s, nunca toca la pila ni la barra de herramientas', (_nombre, panel) => {
    const derecha = derechaDeControles(panel);
    for (let ancho = 1024; ancho <= 1920; ancho += 64) {
      const u = ubicarResumen(ancho, derecha, false);
      if (u.donde !== 'centro') continue;
      // La pila ocupa 12 + 340 px y deja 12 de aire; la barra (44 + relleno) está a `derecha` del borde, con 12 de aire.
      expect(u.izquierdaPx, `izquierda a ${ancho} px`).toBeGreaterThanOrEqual(364);
      expect(u.izquierdaPx + u.anchoPx, `derecha a ${ancho} px`).toBeLessThanOrEqual(ancho - (derecha + 64));
    }
  });

  it('de 1024 a 1920 px con el espacio de siempre la franja va al centro (solo el panel del diagnóstico la manda a la pila)', () => {
    for (let ancho = 1024; ancho <= 1920; ancho += 64) expect(ubicarResumen(ancho, DERECHA, false).donde, `${ancho} px`).toBe('centro');
  });
});
