// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteApi } from '../../services/clienteApi';
import { objetoMapa, posicionEnPantalla, prepararEntornoMapa } from '../../test/rubrica/escenario';
import { montarOperacion } from '../../test/rubrica/montaje';

// Los controles que flotan sobre el mapa conviven con sus gestos (arrastrar, zoom) sin pisarse.

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

describe('Diálogo de rangos del semáforo sobre el mapa', () => {
  const abrirRangos = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Leyenda' }));
    fireEvent.click(screen.getByRole('button', { name: 'Configurar rangos' }));
    return screen.getByRole('dialog', { name: 'Rangos del semáforo' });
  };

  it('tocar y arrastrar dentro del diálogo no mueve el mapa (el portal burbujea eventos de React al mapa)', () => {
    // Sin animación y con zoom: en la vista completa la malla no se puede desplazar.
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { container } = montarOperacion();
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));
    const central = () => posicionEnPantalla(objetoMapa(container, 'almacen:CENTRAL')!);
    const dialogo = abrirRangos();
    const antes = central();
    fireEvent.pointerDown(dialogo, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(dialogo, { clientX: 220, clientY: 170, pointerId: 1 });
    fireEvent.pointerUp(dialogo, { clientX: 220, clientY: 170, pointerId: 1 });
    expect(central()).toEqual(antes);
    expect(container.querySelector('.cursor-grabbing')).toBeNull();
  });

  it('al cerrarlo con Escape el foco vuelve a "Configurar rangos"', () => {
    montarOperacion();
    const dialogo = abrirRangos();
    fireEvent.keyDown(dialogo, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Rangos del semáforo' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Configurar rangos' }));
  });

  it('al cerrarlo con Cancelar el foco vuelve a "Configurar rangos"', () => {
    montarOperacion();
    abrirRangos();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Rangos del semáforo' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Configurar rangos' }));
  });
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

describe('Pila de búsqueda y alertas según el espacio', () => {
  it('con poca altura (< 560 px) se reduce a buscador y una fila de alertas, aunque el ancho sea de escritorio', () => {
    simularTamano(1400, 500);
    montarOperacion();
    expect(screen.getByRole('search')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver detalle' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('region', { name: 'Ocupación global' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }));
    expect(screen.getByRole('region', { name: 'Ocupación global' })).toBeTruthy();
  });

  it('con altura suficiente se muestra completa y sin "Ver detalle"', () => {
    simularTamano(1400, 800);
    montarOperacion();
    expect(screen.queryByRole('button', { name: 'Ver detalle' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Ocupación global' })).toBeTruthy();
  });

  it('en un celular también va reducida', () => {
    simularTamano(390, 760);
    montarOperacion();
    expect(screen.getByRole('button', { name: 'Ver detalle' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Ocupación global' })).toBeNull();
  });
});

describe('Preferencias de la columna de controles que ya no existe', () => {
  it('al cargar el mapa se retiran sus claves huérfanas y se conservan las vigentes', async () => {
    localStorage.setItem('paqtracker.columnaPlegada', '1');
    localStorage.setItem('paqtracker.leyendaAbierta', '1');
    localStorage.setItem('paqtracker.colorUnidades', 'holgura');
    vi.resetModules();
    await import('./GridMap');
    expect(localStorage.getItem('paqtracker.columnaPlegada')).toBeNull();
    expect(localStorage.getItem('paqtracker.leyendaAbierta')).toBeNull();
    expect(localStorage.getItem('paqtracker.colorUnidades')).toBe('holgura');
  });
});
