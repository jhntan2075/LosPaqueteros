// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteApi } from '../../services/clienteApi';
import { objetoMapa, pedidosColaRubrica, prepararEntornoMapa } from '../../test/rubrica/escenario';
import { montarOperacion } from '../../test/rubrica/montaje';

// Arquitectura de la pantalla de Operación: cada dato tiene una casa (las alertas llevan a su sección de
// Incidencias), "Volver" regresa a donde estaba el usuario, y la presentación se adapta al espacio.

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

const panel = () => within(screen.getByRole('complementary', { name: 'Panel de detalle' }));

beforeEach(() => {
  localStorage.clear();
  prepararEntornoMapa();
  vi.spyOn(clienteApi, 'detallePedido').mockResolvedValue({ hitos: [] } as never);
  vi.spyOn(clienteApi, 'estimarAverias').mockResolvedValue([]);
  vi.spyOn(clienteApi, 'listarPedidos').mockResolvedValue(pedidosColaRubrica());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Operación · alertas y navegación', () => {
  it('la alerta de averías lleva a Incidencias, donde se listan y registran (no a Flota)', () => {
    montarOperacion();
    const alertas = within(screen.getByRole('region', { name: 'Alertas' }));
    fireEvent.click(alertas.getByRole('button', { name: /^1 avería\. Ver en Incidencias/ }));
    expect(screen.getByRole('tab', { name: /Incidencias/ }).getAttribute('aria-selected')).toBe('true');
    expect(panel().getByRole('region', { name: 'Averías activas' })).toBeTruthy();
  });

  it('la tarjeta de alertas del mapa abre Incidencias, y su cifra de riesgo, en esa sección', () => {
    montarOperacion();
    const alertas = within(screen.getByRole('region', { name: 'Alertas' }));
    fireEvent.click(alertas.getByRole('button', { name: /\. Ver Incidencias$/ }));
    expect(screen.getByRole('tab', { name: /Incidencias/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('complementary', { name: 'Panel de detalle' })).toBeTruthy();
  });

  it('solo Incidencias lleva insignia, con el mismo total que las alertas', () => {
    montarOperacion();
    const pestanas = within(screen.getByRole('tablist', { name: 'Paneles del mapa' }));
    expect(pestanas.getByRole('tab', { name: /^Incidencias, \d+ pendientes?$/ })).toBeTruthy();
    expect(pestanas.getByRole('tab', { name: /^Flota/ }).getAttribute('aria-label')).toBeNull();
  });

  it('un detalle abierto desde el mapa vuelve al mapa, no a una pestaña que no se abrió', () => {
    const { container } = montarOperacion();
    const a01 = objetoMapa(container, 'vehiculo:A-01')!;
    fireEvent.pointerDown(a01, { button: 0, clientX: 5, clientY: 5, pointerId: 1 });
    fireEvent.pointerUp(a01, { button: 0, clientX: 5, clientY: 5, pointerId: 1 });
    fireEvent.click(panel().getByRole('button', { name: 'Volver a Mapa' }));
    expect(screen.queryByRole('complementary', { name: 'Panel de detalle' })).toBeNull();
  });
});

describe('Operación · espacio y presentación', () => {
  it('abrir un panel derecho no pliega ni oculta nada del mapa: buscador, alertas y herramientas siguen sobre él', () => {
    simularTamano(4000, 700);
    montarOperacion();
    fireEvent.click(screen.getByRole('tab', { name: /Flota/ }));
    expect(screen.getByRole('complementary', { name: 'Panel de detalle' })).toBeTruthy();
    expect(screen.getByLabelText('Buscar pedido o unidad en el mapa')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Alertas' })).toBeTruthy();
    expect(screen.getByRole('toolbar', { name: 'Herramientas del mapa' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mostrar los controles del mapa' })).toBeNull();
    expect(screen.queryByRole('complementary', { name: 'Controles del mapa' })).toBeNull();
  });

  it('el mapa ya no reserva una columna a su izquierda: lo ocupa todo y sus controles flotan encima', () => {
    simularTamano(1200, 800);
    montarOperacion();
    const mapa = screen.getByRole('region', { name: /^Mapa de la malla/ });
    // Nada junto al mapa dentro de su contenedor (antes, la columna de controles de 248 px), y los controles
    // son hijos del propio mapa.
    expect(mapa.parentElement!.children).toHaveLength(1);
    expect(mapa.parentElement!.querySelector('aside')).toBeNull();
    expect(mapa.contains(screen.getByRole('toolbar', { name: 'Herramientas del mapa' }))).toBe(true);
    expect(mapa.contains(screen.getByLabelText('Buscar pedido o unidad en el mapa'))).toBe(true);
  });

  it('el modo enfoque deja solo el mapa y las herramientas, y cierra el panel sin reabrirlo al apagarlo', () => {
    simularTamano(1600, 800);
    montarOperacion();
    fireEvent.click(screen.getByRole('tab', { name: /Flota/ }));
    expect(screen.getByRole('complementary', { name: 'Panel de detalle' })).toBeTruthy();

    const enfoque = screen.getByRole('button', { name: 'Modo enfoque' });
    expect(enfoque.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText(/^\d+ km$/)).toBeTruthy();
    fireEvent.click(enfoque);
    expect(screen.queryByText(/^\d+ km$/)).toBeNull();
    expect(enfoque.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('complementary', { name: 'Panel de detalle' })).toBeNull();
    expect(screen.queryByLabelText('Buscar pedido o unidad en el mapa')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Alertas' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Ocupación global' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Zoom' })).toBeNull();
    expect(screen.getByRole('toolbar', { name: 'Herramientas del mapa' })).toBeTruthy();

    fireEvent.click(enfoque);
    expect(enfoque.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByLabelText('Buscar pedido o unidad en el mapa')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Zoom' })).toBeTruthy();
    expect(screen.getByText(/^\d+ km$/)).toBeTruthy();
    expect(screen.queryByRole('complementary', { name: 'Panel de detalle' })).toBeNull();
  });

  it('abrir un panel con el modo enfoque activo (una pestaña o un objeto del mapa) sale del modo y trae de vuelta la pila', () => {
    simularTamano(1600, 800);
    const { container } = montarOperacion();
    const enfoque = screen.getByRole('button', { name: 'Modo enfoque' });
    fireEvent.click(enfoque);
    expect(screen.queryByRole('region', { name: 'Alertas' })).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /Flota/ }));
    expect(screen.getByRole('complementary', { name: 'Panel de detalle' })).toBeTruthy();
    expect(enfoque.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('region', { name: 'Alertas' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Zoom' })).toBeTruthy();

    // Cerrar ese panel no reactiva el modo.
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar panel' }));
    expect(enfoque.getAttribute('aria-pressed')).toBe('false');

    // Lo mismo al tocar un objeto del mapa.
    fireEvent.click(enfoque);
    expect(enfoque.getAttribute('aria-pressed')).toBe('true');
    const a01 = objetoMapa(container, 'vehiculo:A-01')!;
    fireEvent.pointerDown(a01, { button: 0, clientX: 5, clientY: 5, pointerId: 1 });
    fireEvent.pointerUp(a01, { button: 0, clientX: 5, clientY: 5, pointerId: 1 });
    expect(screen.getByRole('complementary', { name: 'Panel de detalle' })).toBeTruthy();
    expect(enfoque.getAttribute('aria-pressed')).toBe('false');
  });

  it('en escritorio el lado derecho es un solo bloque: pestañas arriba y panel debajo; oculto queda la tira', () => {
    simularTamano(1600, 800);
    montarOperacion();
    // Sin panel: solo la tira vertical, fuera de cualquier bloque.
    expect(screen.queryByRole('region', { name: 'Bloque derecho' })).toBeNull();
    expect(screen.getByRole('tablist', { name: 'Paneles del mapa' }).getAttribute('aria-orientation')).toBe('vertical');

    fireEvent.click(screen.getByRole('tab', { name: /Flota/ }));
    const bloque = within(screen.getByRole('region', { name: 'Bloque derecho' }));
    // Las seis pestañas y el panel viven dentro del mismo bloque; la tira vertical ya no se ve.
    expect(bloque.getAllByRole('tab')).toHaveLength(6);
    expect(bloque.getByRole('tablist', { name: 'Paneles del mapa' }).getAttribute('aria-orientation')).toBe('horizontal');
    expect(bloque.getByRole('complementary', { name: 'Panel de detalle' })).toBeTruthy();
    expect(screen.getAllByRole('tablist', { name: 'Paneles del mapa' })).toHaveLength(1);

    // El chevron oculta el panel y vuelve la tira vertical.
    fireEvent.click(bloque.getByRole('button', { name: 'Ocultar panel' }));
    expect(screen.queryByRole('region', { name: 'Bloque derecho' })).toBeNull();
    expect(screen.getByRole('tablist', { name: 'Paneles del mapa' }).getAttribute('aria-orientation')).toBe('vertical');
  });

  it('la leyenda muestra el detalle completo de "Almacén intermedio", sin cortarlo', () => {
    montarOperacion();
    fireEvent.click(screen.getByRole('button', { name: 'Leyenda' }));
    const nombre = screen.getByText('Almacén intermedio', { exact: false, selector: 'li *' });
    const fila = nombre.closest('li')!;
    expect(fila.textContent).toContain('barra = stock');
    expect(fila.querySelector('.truncate')).toBeNull();
  });

  it('en un celular: mismas herramientas sobre el mapa, buscador plegado, panel como hoja y pestañas al pie con "Más"', () => {
    simularTamano(390, 760);
    montarOperacion();
    expect(screen.queryByRole('complementary', { name: 'Controles del mapa' })).toBeNull();
    expect(screen.getByRole('toolbar', { name: 'Herramientas del mapa' })).toBeTruthy();
    // Sin zoom por botones (se acerca con pellizco): "Ver todo" queda en las herramientas.
    expect(screen.queryByRole('group', { name: 'Zoom' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver la malla completa' })).toBeTruthy();
    expect(screen.getByRole('tablist', { name: 'Paneles del mapa' }).getAttribute('aria-orientation')).toBe('horizontal');
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Actividad' }));
    expect(screen.getByRole('button', { name: 'Ampliar el panel' })).toBeTruthy();

    // El buscador se pliega a un botón de 44 px con el mismo nombre accesible; al tocarlo despliega la entrada.
    expect(screen.queryByRole('search')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar pedido o unidad en el mapa' }));
    expect(document.activeElement).toBe(screen.getByLabelText('Buscar pedido o unidad en el mapa'));

    // Los popovers ocupan el ancho libre a la izquierda de la barra.
    fireEvent.click(screen.getByRole('button', { name: 'Capas' }));
    const popover = screen.getByRole('dialog', { name: 'Capas del mapa' });
    expect(popover.style.left).toBe('12px');
    expect(popover.style.right).toBe('68px');

    fireEvent.click(screen.getByRole('button', { name: /\. Ver Incidencias$/ }));
    expect(panel().getByRole('region', { name: 'En riesgo' })).toBeTruthy();
  });
});

describe('Operación · Resumen sin alertas repetidas', () => {
  it('el Resumen no repite el riesgo, nombra la flota "Unidades en ruta" y deja el reporte al final', () => {
    montarOperacion();
    fireEvent.click(screen.getByRole('tab', { name: /^Resumen/ }));
    const resumen = panel();
    expect(resumen.queryByText(/en riesgo/)).toBeNull();
    expect(resumen.queryByText(/Saturación/)).toBeNull();
    expect(resumen.getByText('Unidades en ruta')).toBeTruthy();
    expect(resumen.getByText(/^\d+ de \d+ \(\d+ %\)$/)).toBeTruthy();
    const botones = resumen.getAllByRole('button');
    expect(botones[botones.length - 1].textContent).toMatch(/Generar reporte de cierre|Ver la última planificación/);
  });
});
