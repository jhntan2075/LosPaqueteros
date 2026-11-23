// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteApi } from '../../services/clienteApi';
import { datosRubrica, prepararEntornoMapa } from '../../test/rubrica/escenario';
import { montarOperacion, renderConDatos } from '../../test/rubrica/montaje';
import type { ConfiguracionCorrida } from '../../types/simulacion';
import { GridMap } from './GridMap';

// La franja de resumen sobre el mapa y su convivencia con el resto de lo que flota encima: la pila de la
// izquierda, las herramientas de la derecha, el modo enfoque y la simulación.

beforeEach(() => {
  localStorage.clear();
  prepararEntornoMapa();
  vi.spyOn(clienteApi, 'detallePedido').mockResolvedValue({ hitos: [] } as never);
  vi.spyOn(clienteApi, 'estimarAverias').mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** ResizeObserver que informa un tamaño fijo para todo elemento observado. */
function simularTamano(ancho: number, alto: number) {
  class Falso {
    private readonly cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }
    observe(elemento: Element) {
      this.cb([{ target: elemento, contentRect: { width: ancho, height: alto } } as unknown as ResizeObserverEntry], this as never);
    }
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', Falso);
}

const franja = () => screen.getByRole('region', { name: 'Resumen de la operación' });
const disclosure = () => screen.getByRole('button', { name: 'Ver más del resumen' });
const desplegable = () => screen.queryByRole('region', { name: 'Más del resumen' });
const etiquetas = () => within(franja()).getAllByRole('term').map((t) => t.textContent);

describe('Franja de resumen sobre el mapa', () => {
  it('en escritorio muestra las cuatro métricas al centro de arriba, dentro del mapa y entre la pila y las herramientas', () => {
    simularTamano(1200, 800);
    montarOperacion();
    const mapa = screen.getByRole('region', { name: /^Mapa de la malla/ });
    expect(mapa.contains(franja())).toBe(true);
    expect(etiquetas()).toEqual(['En plazo', 'En tránsito', 'En espera', 'En ruta']);
    // Ni dentro de la pila de la izquierda (340 px + 12 de aire) ni sobre la barra de la derecha.
    const izquierda = parseFloat(franja().style.left);
    const derecha = izquierda + parseFloat(franja().style.width);
    expect(izquierda).toBeGreaterThanOrEqual(12 + 340 + 12);
    expect(derecha).toBeLessThanOrEqual(1200 - (12 + 52 + 12));
    expect(franja().parentElement).toBe(mapa);
  });

  it('en un celular son dos métricas y la franja va en la pila, bajo las alertas', () => {
    simularTamano(390, 760);
    montarOperacion();
    expect(etiquetas()).toEqual(['En plazo', 'En ruta']);
    const alertas = screen.getByRole('region', { name: 'Alertas' });
    expect(franja().parentElement).toBe(alertas.parentElement);
    expect(alertas.nextElementSibling).toBe(franja());
  });

  it('con menos espacio libre entre la pila y las herramientas (mapa de 800 px) quedan dos métricas, aún al centro', () => {
    simularTamano(800, 800);
    montarOperacion();
    expect(etiquetas()).toEqual(['En plazo', 'En ruta']);
    const mapa = screen.getByRole('region', { name: /^Mapa de la malla/ });
    expect(franja().parentElement).toBe(mapa);
    expect(parseFloat(franja().style.left) + parseFloat(franja().style.width)).toBeLessThanOrEqual(800 - (12 + 52 + 12));
  });

  it('abrir el desplegable y luego un popover de las herramientas cierra el desplegable, y al revés', () => {
    simularTamano(1200, 800);
    montarOperacion();
    fireEvent.click(disclosure());
    expect(desplegable()).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Capas' }));
    expect(desplegable()).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Capas del mapa' })).toBeTruthy();

    fireEvent.click(disclosure());
    expect(desplegable()).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Capas del mapa' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Capas' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('el modo enfoque oculta la franja y su desplegable, y no vuelve abierto al salir del modo', () => {
    simularTamano(1600, 800);
    montarOperacion();
    fireEvent.click(disclosure());
    expect(desplegable()).toBeTruthy();

    const enfoque = screen.getByRole('button', { name: 'Modo enfoque' });
    fireEvent.click(enfoque);
    expect(screen.queryByRole('region', { name: 'Resumen de la operación' })).toBeNull();
    expect(desplegable()).toBeNull();

    fireEvent.click(enfoque);
    expect(franja()).toBeTruthy();
    expect(desplegable()).toBeNull();
    expect(disclosure().getAttribute('aria-expanded')).toBe('false');
  });

  it('en Operación el desplegable no trae el bloque Simulación', () => {
    simularTamano(1200, 800);
    montarOperacion();
    fireEvent.click(disclosure());
    expect(screen.queryByRole('region', { name: 'Simulación' })).toBeNull();
  });

  it('en una simulación el desplegable trae el bloque Simulación con la configuración de la corrida', () => {
    simularTamano(1200, 800);
    const configuracion: ConfiguracionCorrida = {
      escenario: 'Simulación 5 días',
      inicio: new Date(2026, 2, 3, 8, 0, 0),
      flota: { autos: 10, motos: 15, bicicletas: 12 },
      factorAceleracion: 180,
    };
    renderConDatos(
      <GridMap
        variante="simulacion"
        simulacion={configuracion}
        unidades={[]}
        destinos={[]}
        bloqueos={[]}
        seleccion={null}
        riesgo={{ rojo: 0, ambar: 0 }}
        onSeleccionar={() => {}}
        onAbrirIncidencias={() => {}}
      />,
      datosRubrica(),
    );
    fireEvent.click(disclosure());
    const bloque = within(screen.getByRole('region', { name: 'Simulación' }));
    expect(bloque.getByText('Simulación 5 días')).toBeTruthy();
    expect(bloque.getByText('10 autos · 15 motos · 12 bicis')).toBeTruthy();
    expect(bloque.getByText('×180')).toBeTruthy();
  });

  it('la ficha de unidades en ruta del desplegable abre la pestaña Flota', () => {
    simularTamano(1600, 800);
    montarOperacion();
    fireEvent.click(disclosure());
    fireEvent.click(screen.getByText('Unidades en ruta').closest('button')!);
    expect(screen.getByRole('tab', { name: /Flota/ }).getAttribute('aria-selected')).toBe('true');
    expect(desplegable()).toBeNull();
  });
});
