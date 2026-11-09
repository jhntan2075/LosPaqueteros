// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteApi } from '../../services/clienteApi';
import type { PedidoApi } from '../../types/api';
import { INICIO_MS } from '../../test/fabricas';
import { MIN, pedidosColaRubrica } from '../../test/rubrica/escenario';
import { renderConDatos } from '../../test/rubrica/montaje';
import { ColaPedidos } from './ColaPedidos';

// Detalle de un pedido en Pedidos: un pedido fraccionado muestra todas las unidades que lo llevan, no solo
// la principal.

const fraccionado: PedidoApi = {
  ...pedidosColaRubrica()[0],
  codigo: 'P-05000',
  cantidad: 45,
  estado: 'ENTREGADO',
  unidad: 'A-01',
  etaMs: INICIO_MS + 60 * MIN,
  fracciones: [
    { indice: 1, unidad: 'A-07', almacenOrigen: 'INTERMEDIO_1', cantidad: 21, salidaMs: INICIO_MS, llegadaMs: INICIO_MS + 30 * MIN, estado: 'ENTREGADA' },
    { indice: 2, unidad: 'A-01', almacenOrigen: 'INTERMEDIO_1', cantidad: 24, salidaMs: INICIO_MS, llegadaMs: INICIO_MS + 30 * MIN, estado: 'ENTREGADA' },
    { indice: 3, unidad: 'M-02', almacenOrigen: 'CENTRAL', cantidad: 5, salidaMs: INICIO_MS, llegadaMs: INICIO_MS + 30 * MIN, estado: 'LIBERADA' },
  ],
};

beforeEach(() => {
  vi.spyOn(clienteApi, 'detallePedido').mockResolvedValue({ hitos: [] } as never);
  vi.spyOn(clienteApi, 'listarPedidos').mockResolvedValue([fraccionado]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const abrirDetalle = async () => {
  renderConDatos(<ColaPedidos onRegistrar={() => {}} />);
  fireEvent.click(await screen.findByText('P-05000'));
  return within(screen.getByRole('dialog', { name: 'Pedido P-05000' }));
};

describe('Pedidos · detalle del pedido', () => {
  it('lista todas las unidades de un pedido fraccionado, sin las liberadas por avería', async () => {
    const detalle = await abrirDetalle();
    expect(detalle.getByText('Vehículos asignados')).toBeTruthy();
    expect(detalle.getByText('pedido fraccionado en 2')).toBeTruthy();
    const filas = within(detalle.getByRole('list', { name: 'Vehículos asignados' })).getAllByRole('listitem');
    expect(filas[0].textContent).toContain('21 de 45 paq.');
    expect(filas.map((f) => f.textContent)).toEqual([expect.stringContaining('Auto A-07'), expect.stringContaining('Auto A-01')]);
    expect(detalle.queryByText(/M-02/)).toBeNull();
  });

  it('las filas de unidades son de solo lectura (no se presentan como botones)', async () => {
    const detalle = await abrirDetalle();
    const lista = detalle.getByRole('list', { name: 'Vehículos asignados' });
    expect(within(lista).queryAllByRole('button')).toHaveLength(0);
  });

  it('un pedido sin despachar dice que aún no tiene unidad', async () => {
    vi.spyOn(clienteApi, 'listarPedidos').mockResolvedValue([{ ...fraccionado, estado: 'REGISTRADO', unidad: null, etaMs: null, fracciones: [] }]);
    const detalle = await abrirDetalle();
    expect(detalle.getByText('Vehículo asignado')).toBeTruthy();
    expect(detalle.getByText(/Sin asignar/)).toBeTruthy();
  });
});
