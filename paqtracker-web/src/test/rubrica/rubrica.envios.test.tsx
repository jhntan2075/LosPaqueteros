// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteApi } from '../../services/clienteApi';
import type { FraccionEnvioApi, MensajeEstadoApi, PedidoEnMapaApi } from '../../types/api';
import { INICIO_MS, pedidoApi } from '../fabricas';
import { AHORA_MS, MIN, datosRubrica, mensajeRubrica, objetoMapa, prepararEntornoMapa } from './escenario';
import { montarOperacion } from './montaje';

// Rúbrica 91.EvaSw · equipo de 4: lista de almacenes (E18, E19), envíos de cada almacén en camino, por salir
// en 4 h y entregados en 4 h (E20–E22), lista de pedidos con sus fracciones (E31), selección de una fracción
// (F02) y del pedido entero (F03), y selección compartida entre mapa y listas (F01, F05).
//
// Escenario (reloj = inicio + 30 min):
//  - #1001: una fracción en A-01 desde el central, en camino.
//  - #1002: fraccionado: #1002·1 en M-01 desde el Intermedio 2 y #1002·2 en A-01 desde el central, en camino.
//  - #1005: en A-02 desde el central, por salir dentro de 90 min.
//  - #0999: entregado hace 20 min desde el central (dentro de la ventana); #0998, hace 5 h (fuera).

beforeEach(() => {
  prepararEntornoMapa();
  vi.spyOn(clienteApi, 'detallePedido').mockResolvedValue({ hitos: [] } as never);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const fraccion = (sobrescribir: Partial<FraccionEnvioApi>): FraccionEnvioApi => ({
  indice: 1,
  unidad: 'A-01',
  almacenOrigen: 'CENTRAL',
  cantidad: 3,
  salidaMs: INICIO_MS,
  llegadaMs: INICIO_MS + 60 * MIN,
  estado: 'EN_CAMINO',
  ...sobrescribir,
});

function datosEnvios() {
  const base = mensajeRubrica();
  const unidades = base.unidades!.map((u) =>
    u.codigo === 'A-01'
      ? { ...u, paradas: [...u.paradas, { codigoPedido: '#1002', destino: { x: 50, y: 27 }, cantidad: 2, etaMs: INICIO_MS + 100 * MIN }] }
      : u,
  );
  const pedidos: PedidoEnMapaApi[] = [
    pedidoApi({ id: 1, codigo: '#1001', destino: { x: 27, y: 24 }, cantidad: 3, estado: 'EN_TRANSITO', unidad: 'A-01', etaMs: INICIO_MS + 60 * MIN, fracciones: [fraccion({})] }),
    pedidoApi({
      id: 2,
      codigo: '#1002',
      destino: { x: 50, y: 27 },
      cantidad: 5,
      estado: 'EN_TRANSITO',
      unidad: 'M-01',
      nivelHolgura: 'ROJO',
      etaMs: INICIO_MS + 100 * MIN,
      fracciones: [
        fraccion({ indice: 1, unidad: 'M-01', almacenOrigen: 'INTERMEDIO_2', cantidad: 3, salidaMs: INICIO_MS + 20 * MIN, llegadaMs: INICIO_MS + 90 * MIN }),
        fraccion({ indice: 2, unidad: 'A-01', almacenOrigen: 'CENTRAL', cantidad: 2, salidaMs: INICIO_MS, llegadaMs: INICIO_MS + 100 * MIN }),
      ],
    }),
    pedidoApi({
      id: 5,
      codigo: '#1005',
      destino: { x: 40, y: 10 },
      cantidad: 4,
      estado: 'EN_TRANSITO',
      unidad: 'A-02',
      etaMs: INICIO_MS + 180 * MIN,
      fracciones: [fraccion({ unidad: 'A-02', cantidad: 4, salidaMs: INICIO_MS + 120 * MIN, llegadaMs: INICIO_MS + 180 * MIN, estado: 'PROGRAMADA' })],
    }),
    pedidoApi({ id: 4, codigo: '#1004', destino: { x: 30, y: 30 }, estado: 'REGISTRADO' }),
  ];
  const entregadosRecientes: PedidoEnMapaApi[] = [
    pedidoApi({
      id: 99,
      codigo: '#0999',
      destino: { x: 30, y: 12 },
      estado: 'ENTREGADO',
      nivelHolgura: 'CERRADO',
      unidad: 'A-02',
      entregaMs: AHORA_MS - 20 * MIN,
      fracciones: [fraccion({ unidad: 'A-02', salidaMs: INICIO_MS - 30 * MIN, llegadaMs: AHORA_MS - 20 * MIN, estado: 'ENTREGADA' })],
    }),
    pedidoApi({
      id: 98,
      codigo: '#0998',
      destino: { x: 31, y: 12 },
      estado: 'ENTREGADO',
      nivelHolgura: 'CERRADO',
      unidad: 'A-02',
      entregaMs: AHORA_MS - 300 * MIN,
      fracciones: [fraccion({ unidad: 'A-02', salidaMs: AHORA_MS - 360 * MIN, llegadaMs: AHORA_MS - 300 * MIN, estado: 'ENTREGADA' })],
    }),
  ];
  return datosRubrica({ unidades, pedidos, entregadosRecientes } as Partial<MensajeEstadoApi>);
}

const panel = () => within(screen.getByRole('complementary', { name: 'Incidencias, flota y bitácora' }));
const tocar = (elemento: Element) => {
  fireEvent.pointerDown(elemento, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
  fireEvent.pointerUp(elemento, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
};
const rutasDestacadas = (contenedor: HTMLElement) => contenedor.querySelectorAll('path[stroke="#1E40AF"][stroke-dasharray]');
const fila = (selector: string) => document.querySelector(selector) as HTMLElement;

describe('Rúbrica 91.EvaSw · lista de almacenes', () => {
  it('E18–E19 · lista los tres almacenes con su stock en número y %, el semáforo + vacío y el central sin tope', () => {
    montarOperacion({ datos: datosEnvios(), subvista: 'almacenes' });
    const lista = within(screen.getByRole('region', { name: 'Lista de almacenes' }));
    expect(lista.getAllByRole('listitem')).toHaveLength(3);
    const intermedio1 = fila('[data-almacen="INTERMEDIO_1"]');
    expect(intermedio1.textContent).toContain('40/100 · 40 %');
    expect(within(intermedio1).getByRole('img', { name: 'Con espacio' })).toBeTruthy();
    expect(fila('[data-almacen="CENTRAL"]').textContent).toContain('Sin tope');
    // Cada fila adelanta sus envíos: el central tiene 2 en camino, 1 por salir y 1 entregado en la ventana.
    expect(fila('[data-almacen="CENTRAL"]').textContent).toContain('↗ 2 en camino · ⏱ 1 por salir · ✓ 1 entregados');
  });

  it('F05 · mapa → lista: tocar un almacén con la lista abierta marca su fila y la lista se queda', () => {
    const { container } = montarOperacion({ datos: datosEnvios(), subvista: 'almacenes' });
    tocar(objetoMapa(container, 'almacen:INTERMEDIO_2')!);
    expect(screen.getByRole('region', { name: 'Lista de almacenes' })).toBeTruthy();
    expect(fila('[data-almacen="INTERMEDIO_2"]').getAttribute('aria-current')).toBe('true');
    expect(objetoMapa(container, 'almacen:INTERMEDIO_2')!.querySelector('circle[r="21"]')).toBeTruthy();
  });

  it('F05 · lista → mapa: un clic en la fila lo resalta en el mapa; otro clic abre su detalle', () => {
    const { container } = montarOperacion({ datos: datosEnvios(), subvista: 'almacenes' });
    const boton = within(fila('[data-almacen="INTERMEDIO_1"]')).getAllByRole('button')[0];
    fireEvent.click(boton);
    expect(objetoMapa(container, 'almacen:INTERMEDIO_1')!.querySelector('circle[r="21"]')).toBeTruthy();
    fireEvent.click(boton);
    expect(panel().getByRole('heading', { name: 'Almacén Intermedio 1' })).toBeTruthy();
  });
});

describe('Rúbrica 91.EvaSw · envíos del almacén', () => {
  const abrirCentral = () => {
    const resultado = montarOperacion({ datos: datosEnvios() });
    tocar(objetoMapa(resultado.container, 'almacen:CENTRAL')!);
    return within(screen.getByRole('region', { name: 'Envíos del almacén' }));
  };

  it('E20 · lista los envíos en camino que salieron del almacén, con su unidad y llegada', () => {
    const envios = abrirCentral();
    expect(envios.getByRole('tab', { name: 'En camino (2)' }).getAttribute('aria-selected')).toBe('true');
    const filas = envios.getAllByRole('listitem').map((li) => li.textContent);
    expect(filas[0]).toMatch(/#1001.*3 paq\..*A-01.*llega \d{2}:\d{2} · en 30 min/);
    expect(filas[1]).toMatch(/#1002·2.*2 paq\..*A-01/);
  });

  it('E21 · lista lo que sale del almacén en las próximas 4 h', () => {
    const envios = abrirCentral();
    fireEvent.click(envios.getByRole('tab', { name: 'Por salir · 4 h (1)' }));
    expect(envios.getByRole('listitem').textContent).toMatch(/#1005.*A-02.*sale \d{2}:\d{2} · en 1 h 30 min/);
  });

  it('E22 · lista lo entregado desde el almacén en las últimas 4 h, no lo anterior', () => {
    const envios = abrirCentral();
    fireEvent.click(envios.getByRole('tab', { name: 'Entregados · 4 h (1)' }));
    expect(envios.getByRole('listitem').textContent).toMatch(/#0999.*entregada \d{2}:\d{2} · hace 20 min/);
    expect(envios.queryByText(/#0998/)).toBeNull();
  });

  it('una lista vacía explica qué no hay y desde cuándo', () => {
    const resultado = montarOperacion({ datos: datosEnvios() });
    tocar(objetoMapa(resultado.container, 'almacen:INTERMEDIO_1')!);
    const envios = within(screen.getByRole('region', { name: 'Envíos del almacén' }));
    fireEvent.click(envios.getByRole('tab', { name: 'Entregados · 4 h (0)' }));
    expect(envios.getByText(/Nada entregado desde este almacén en las últimas 4 h \(desde las \d{2}:\d{2}\)\./)).toBeTruthy();
  });
});

describe('Rúbrica 91.EvaSw · lista de pedidos y fracciones', () => {
  it('E31 · cada pedido muestra destino, cantidad, ruta y horarios; el fraccionado, todas sus unidades', () => {
    montarOperacion({ datos: datosEnvios(), subvista: 'pedidos' });
    expect(fila('[data-pedido="#1001"]').textContent).toMatch(/→ \(27,24\) · 3 paq\..*Central → A-01 · sale \d{2}:\d{2} · llega \d{2}:\d{2}/);
    const fraccionado = within(fila('[data-pedido="#1002"]'));
    expect(fraccionado.getByText(/Va en 2 unidades/)).toBeTruthy();
    const fracciones = within(fraccionado.getByRole('list', { name: 'Fracciones del pedido #1002' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(fracciones[0]).toMatch(/#1002·1.*3 paq\..*M-01.*Intermedio 2 → M-01 · sale \d{2}:\d{2} · llega/);
    expect(fracciones[1]).toMatch(/#1002·2.*2 paq\..*A-01.*Central → A-01/);
  });

  it('F03 · seleccionar el pedido resalta las rutas de todas sus fracciones', () => {
    const { container } = montarOperacion({ datos: datosEnvios(), subvista: 'pedidos' });
    fireEvent.click(within(fila('[data-pedido="#1002"]')).getAllByRole('button')[0]);
    expect(rutasDestacadas(container)).toHaveLength(2);
  });

  it('F02 · seleccionar una fracción (producto) resalta solo la ruta de su unidad', () => {
    const { container } = montarOperacion({ datos: datosEnvios(), subvista: 'pedidos' });
    fireEvent.click(within(fila('[data-fraccion="#1002·1"]')).getByRole('button'));
    expect(rutasDestacadas(container)).toHaveLength(1);
    expect(fila('[data-fraccion="#1002·1"]').getAttribute('aria-current')).toBe('true');
    // Y la unidad que la lleva queda con el halo de selección.
    expect(objetoMapa(container, 'vehiculo:M-01')!.querySelectorAll('image')).toHaveLength(2);
  });

  it('F02 · desde el detalle del pedido se elige una fracción y se vuelve al pedido', () => {
    const { container } = montarOperacion({ datos: datosEnvios(), pedidoAEnfocar: '#1002' });
    const lista = within(panel().getByRole('list', { name: 'Fracciones del pedido' }));
    fireEvent.click(within(lista.getAllByRole('listitem')[1]).getByRole('button'));
    expect(panel().getByText('En el mapa se resalta solo la ruta de la fracción #1002·2.')).toBeTruthy();
    expect(rutasDestacadas(container)).toHaveLength(1);
    fireEvent.click(panel().getByRole('button', { name: 'Volver a Pedido #1002' }));
    expect(rutasDestacadas(container)).toHaveLength(2);
  });

  it('E32–E33 · filtros por ventana: entregados en las últimas 4 h y por entregar en las próximas 4 h', () => {
    montarOperacion({ datos: datosEnvios(), subvista: 'pedidos' });
    fireEvent.click(screen.getByRole('button', { name: 'Entregados · 4 h' }));
    expect(document.querySelectorAll('[data-pedido]')).toHaveLength(1);
    expect(fila('[data-pedido="#0999"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Por entregar · 4 h' }));
    const codigos = [...document.querySelectorAll('[data-pedido]')].map((e) => e.getAttribute('data-pedido'));
    expect(codigos.sort()).toEqual(['#1001', '#1002', '#1005']);
  });
});

describe('Rúbrica 91.EvaSw · F01 · selección bidireccional de unidades', () => {
  it('mapa → lista: tocar una unidad con la Flota abierta marca su fila y la lista se queda', () => {
    const { container } = montarOperacion({ datos: datosEnvios(), subvista: 'flota' });
    tocar(objetoMapa(container, 'vehiculo:M-01')!);
    expect(screen.getByRole('region', { name: 'Todas las unidades' })).toBeTruthy();
    expect(fila('[data-fila-unidad="M-01"]').getAttribute('aria-current')).toBe('true');
  });

  it('lista → mapa: un clic en la fila la resalta en el mapa; otro clic abre su detalle', () => {
    const { container } = montarOperacion({ datos: datosEnvios(), subvista: 'flota' });
    const boton = fila('[data-unidad="A-01"]');
    fireEvent.click(boton);
    expect(objetoMapa(container, 'vehiculo:A-01')!.querySelectorAll('image')).toHaveLength(2);
    fireEvent.click(boton);
    expect(panel().getByRole('heading', { name: /Auto A-01/ })).toBeTruthy();
  });
});
