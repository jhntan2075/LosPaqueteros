// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColaPedidos } from '../../components/pedidos/ColaPedidos';
import { SelectorUnidad } from '../../components/operacion/SelectorUnidad';
import { clienteApi } from '../../services/clienteApi';
import { INICIO_MS } from '../fabricas';
import {
  ALTO_MAPA,
  ANCHO_MAPA,
  MIN,
  datosRubrica,
  mensajeRubrica,
  objetoMapa,
  pedidosColaRubrica,
  posicionEnPantalla,
  prepararEntornoMapa,
} from './escenario';
import { montarOperacion, renderConDatos } from './montaje';

// Rúbrica c.1inf54.26-2 · "MAPA ENLAZADO AL PANEL BIDIRECCIONAL" (48–54) y "PANEL" (59–76). Las brechas
// van con `it.fails` (ver rubrica.mapa.test.tsx).

/** El panel lateral mide 340 px + 12 de margen: el mapa centra en el área que queda libre. */
const CENTRO_LIBRE = { x: (ANCHO_MAPA - 352) / 2, y: ALTO_MAPA / 2 };

beforeEach(() => {
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

const panel = () => within(screen.getByRole('complementary', { name: 'Incidencias, flota y bitácora' }));

/** Clic sin arrastre sobre un objeto del mapa, como lo interpreta GridMap. */
function tocar(elemento: Element) {
  fireEvent.pointerDown(elemento, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
  fireEvent.pointerUp(elemento, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
}

function esperarCentrado(contenedor: HTMLElement, id: string) {
  const p = posicionEnPantalla(objetoMapa(contenedor, id)!);
  expect(p.x).toBeCloseTo(CENTRO_LIBRE.x, 0);
  expect(p.y).toBeCloseTo(CENTRO_LIBRE.y, 0);
}

describe('Rúbrica · mapa → panel', () => {
  it('C48 · seleccionar el almacén central en el mapa abre su detalle en el panel', () => {
    const { container } = montarOperacion();
    tocar(objetoMapa(container, 'almacen:CENTRAL')!);
    expect(panel().getByRole('heading', { name: 'Almacén Central' })).toBeTruthy();
  });

  it('C49 · seleccionar un almacén intermedio en el mapa abre su detalle en el panel', () => {
    const { container } = montarOperacion();
    tocar(objetoMapa(container, 'almacen:INTERMEDIO_1')!);
    expect(panel().getByRole('heading', { name: 'Almacén Intermedio 1' })).toBeTruthy();
    expect(panel().getByText('Intermedio')).toBeTruthy();
  });

  it('C50 · seleccionar una unidad en el mapa abre su detalle en el panel', () => {
    const { container } = montarOperacion();
    tocar(objetoMapa(container, 'vehiculo:A-01')!);
    expect(panel().getByRole('heading', { name: /Auto A-01/ })).toBeTruthy();
    // Y queda resaltada en el mapa.
    expect(objetoMapa(container, 'vehiculo:A-01')!.querySelectorAll('image')).toHaveLength(2);
  });
});

describe('Rúbrica · panel → mapa', () => {
  it('C52 · desde el detalle del almacén central, "Centrar en el mapa" lo centra', () => {
    const { container } = montarOperacion();
    tocar(objetoMapa(container, 'almacen:CENTRAL')!);
    fireEvent.click(panel().getByRole('button', { name: 'Centrar en el mapa' }));
    esperarCentrado(container, 'almacen:CENTRAL');
  });

  it('C53 · desde el detalle de un intermedio, "Centrar en el mapa" lo centra', () => {
    const { container } = montarOperacion();
    tocar(objetoMapa(container, 'almacen:INTERMEDIO_2')!);
    fireEvent.click(panel().getByRole('button', { name: 'Centrar en el mapa' }));
    esperarCentrado(container, 'almacen:INTERMEDIO_2');
  });

  it('C54 · desde la lista de averías del panel se abre la unidad y se centra en el mapa', () => {
    const { container } = montarOperacion({ subvista: 'incidencias' });
    fireEvent.click(panel().getByRole('button', { name: /Bicicleta B-01/ }));
    expect(panel().getByRole('heading', { name: /Bicicleta B-01/ })).toBeTruthy();
    fireEvent.click(panel().getByRole('button', { name: 'Centrar en el mapa' }));
    esperarCentrado(container, 'vehiculo:B-01');
  });

  it('C54 · un pedido pedido desde otra pantalla ("Ubicar en el mapa") se abre en el panel', () => {
    montarOperacion({ pedidoAEnfocar: '#1002' });
    expect(panel().getByRole('heading', { name: 'Pedido #1002' })).toBeTruthy();
  });
});

describe('Rúbrica · panel · almacenes', () => {
  it('C59 · el detalle del intermedio muestra su stock en números y porcentaje', () => {
    const { container } = montarOperacion();
    tocar(objetoMapa(container, 'almacen:INTERMEDIO_1')!);
    expect(panel().getByText('40/100')).toBeTruthy();
    expect(panel().getByText('40 % de capacidad')).toBeTruthy();
  });

  it('C60 · el stock del almacén usa semáforo en el panel (ámbar 40 %, rojo 10 %)', () => {
    const { container } = montarOperacion();
    tocar(objetoMapa(container, 'almacen:INTERMEDIO_1')!);
    expect(panel().getByText('40/100').className).toContain('text-[#B45309]');
    tocar(objetoMapa(container, 'almacen:INTERMEDIO_2')!);
    expect(panel().getByText('10/100').className).toContain('text-[#B91C1C]');
  });

  it('C61 · se puede buscar un almacén (p. ej. "Central") desde el buscador del mapa', () => {
    montarOperacion();
    const buscador = screen.getByLabelText('Buscar pedido o unidad en el mapa');
    fireEvent.change(buscador, { target: { value: 'Central' } });
    fireEvent.submit(buscador.closest('form')!);
    expect(panel().getByRole('heading', { name: 'Almacén Central' })).toBeTruthy();
  });
});

describe('Rúbrica · panel · incidencias (cancelaciones = averías en este dominio)', () => {
  it('C64 · lista las averías activas con su tipo y la hora en que vuelve la unidad', () => {
    montarOperacion({ subvista: 'incidencias' });
    const fila = panel().getByRole('button', { name: /Bicicleta B-01/ });
    expect(fila.textContent).toMatch(/Tipo 1/i);
    expect(fila.textContent).toContain('hoy 10:10'); // vuelve INICIO + 130 min = 10:10
  });

  it('C64 · la lista de averías indica la ubicación (nodo) de la unidad', () => {
    montarOperacion({ subvista: 'incidencias' });
    expect(panel().getByRole('button', { name: /Bicicleta B-01/ }).textContent).toContain('(10,10)');
  });
});

describe('Rúbrica · panel · pedidos', () => {
  const montarCola = () =>
    renderConDatos(<ColaPedidos onRegistrar={() => {}} onVerEnLienzo={() => {}} />, datosRubrica());

  it('C65 · se presenta la lista de pedidos planificados', async () => {
    montarCola();
    await waitFor(() => expect(screen.getByText('#1001')).toBeTruthy());
    ['#1002', '#1003', '#1004'].forEach((codigo) => expect(screen.getByText(codigo)).toBeTruthy());
  });

  it('C66 · cada pedido planificado muestra la unidad que lo atiende', async () => {
    montarCola();
    const fila = (await screen.findByText('#1001')).closest('tr')!;
    expect(fila.textContent).toContain('A-01');
    expect(screen.getByText('#1002').closest('tr')!.textContent).toContain('M-01');
  });

  it('C67 · al seleccionar un pedido se resalta en el mapa la ruta de la unidad que lo lleva', () => {
    const { container } = montarOperacion();
    tocar(objetoMapa(container, 'pedido:#1001')!);
    const destacadas = container.querySelectorAll('path[stroke="#1E40AF"][stroke-dasharray]');
    expect(destacadas).toHaveLength(1);
    expect(panel().getByRole('heading', { name: 'Pedido #1001' })).toBeTruthy();
  });

  it('C67 · un pedido fraccionado en dos unidades resalta las dos rutas', () => {
    // #1001 repartido entre A-01 y M-01: ambas lo llevan en sus paradas.
    const base = mensajeRubrica();
    const unidades = base.unidades!.map((u) =>
      u.codigo === 'M-01' ? { ...u, paradas: [...u.paradas, { codigoPedido: '#1001', destino: { x: 27, y: 24 }, cantidad: 1, etaMs: INICIO_MS + 80 * MIN }] } : u,
    );
    const { container } = montarOperacion({ datos: datosRubrica({ unidades }) });
    tocar(container.querySelectorAll('[data-objeto="pedido:#1001"]')[0]);
    expect(container.querySelectorAll('path[stroke="#1E40AF"][stroke-dasharray]')).toHaveLength(2);
  });

  it('C68 · se busca un pedido planificado desde el mapa y se abre su detalle', () => {
    montarOperacion();
    const buscador = screen.getByLabelText('Buscar pedido o unidad en el mapa');
    fireEvent.change(buscador, { target: { value: '1002' } }); // sin "#" también lo encuentra
    fireEvent.submit(buscador.closest('form')!);
    expect(panel().getByRole('heading', { name: 'Pedido #1002' })).toBeTruthy();
  });

  it('C68 · se busca un pedido planificado en la cola de pedidos', async () => {
    montarCola();
    await screen.findByText('#1001');
    fireEvent.change(screen.getByLabelText('Buscar pedidos'), { target: { value: '#1002' } });
    expect(screen.queryByText('#1001')).toBeNull();
    expect(screen.getByText('#1002')).toBeTruthy();
  });

  it('C69 · se busca un pedido ya entregado en la cola de pedidos', async () => {
    montarCola();
    await screen.findByText('#1001');
    fireEvent.change(screen.getByLabelText('Buscar pedidos'), { target: { value: '1003' } });
    const fila = screen.getByText('#1003').closest('tr')!;
    expect(fila.textContent).toContain('Entregado');
  });
});

describe('Rúbrica · panel · unidades de transporte', () => {
  const datos = datosRubrica();
  const montarSelector = () =>
    render(<SelectorUnidad unidades={datos.flota} valor="" onCambiar={() => {}} esBloqueada={(u) => u.estado === 'AVERIADA'} reloj={datos.reloj} />);

  it('C70 · se presenta una lista de todas las unidades de transporte', () => {
    montarSelector();
    fireEvent.click(screen.getByRole('combobox', { name: 'Unidad' }));
    const codigos = screen.getAllByRole('option').map((o) => o.textContent?.slice(0, 4));
    expect(codigos.sort()).toEqual(['A-01', 'A-02', 'B-01', 'M-01']);
  });

  it('C71 · la lista de unidades muestra la carga actual de cada una', () => {
    montarSelector();
    fireEvent.click(screen.getByRole('combobox', { name: 'Unidad' }));
    expect(screen.getByRole('option', { name: /^A-01/ }).textContent).toContain('20/24');
    expect(screen.getByRole('option', { name: /^M-01/ }).textContent).toContain('8/8');
  });

  it('C72 · el detalle de la unidad muestra su ruta planificada (pestaña Ruta)', () => {
    const { container } = montarOperacion();
    tocar(objetoMapa(container, 'vehiculo:A-01')!);
    fireEvent.click(panel().getByRole('tab', { name: 'Ruta' }));
    expect(panel().getByText('(27,19) → (27,24) → (40,24)')).toBeTruthy();
  });

  it('C73 · el detalle de la unidad lista los pedidos asignados (próximas paradas)', () => {
    const { container } = montarOperacion();
    tocar(objetoMapa(container, 'vehiculo:A-01')!);
    expect(panel().getByText('Próximas paradas')).toBeTruthy();
    const parada = panel().getByRole('button', { name: /#1001/ });
    expect(parada.textContent).toContain('(27,24)');
    expect(parada.textContent).toMatch(/llega \d{2}\/\d{2} 09:00/); // llegada estimada con fecha y hora
  });

  it('C74 · se busca una unidad desde el mapa y se abre su detalle', () => {
    montarOperacion();
    const buscador = screen.getByLabelText('Buscar pedido o unidad en el mapa');
    fireEvent.change(buscador, { target: { value: 'm-01' } });
    fireEvent.submit(buscador.closest('form')!);
    expect(panel().getByRole('heading', { name: /Moto M-01/ })).toBeTruthy();
  });

  it('C76 · se distingue si la unidad está operativa (en ruta), disponible o averiada', () => {
    const { container } = montarOperacion();
    tocar(objetoMapa(container, 'vehiculo:A-01')!);
    const estadoA01 = panel().getByRole('heading', { name: /Auto A-01/ }).parentElement!.textContent;
    tocar(objetoMapa(container, 'vehiculo:B-01')!);
    const estadoB01 = panel().getByRole('heading', { name: /Bicicleta B-01/ }).parentElement!.textContent;
    expect(estadoA01).not.toEqual(estadoB01);
    expect(estadoB01).toMatch(/Averiada/i);
    expect(panel().getByText(/Averiada · /)).toBeTruthy();
    // En el mapa, la averiada lleva una marca ✕ junto a su código.
    expect(objetoMapa(container, 'vehiculo:B-01')!.textContent).toContain('✕ B-01');
  });
});
