// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteApi } from '../../services/clienteApi';
import { pedidosColaRubrica } from '../../test/rubrica/escenario';
import { renderConDatos } from '../../test/rubrica/montaje';
import { ColaPedidos } from './ColaPedidos';

// Pedidos en celular: tarjetas en lugar de tabla, hoja de filtros y acciones secundarias en "Más acciones".

const simularAncho = (angosto: boolean) =>
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: angosto,
    media: consulta,
    addEventListener() {},
    removeEventListener() {},
  }));

beforeEach(() => {
  vi.spyOn(clienteApi, 'detallePedido').mockResolvedValue({ hitos: [] } as never);
  vi.spyOn(clienteApi, 'listarPedidos').mockResolvedValue(pedidosColaRubrica());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const montar = async (angosto: boolean) => {
  simularAncho(angosto);
  renderConDatos(<ColaPedidos onRegistrar={() => {}} />);
  await screen.findAllByText(/^#\d+$/);
};

describe('Pedidos · celular', () => {
  it('muestra tarjetas y no la tabla', async () => {
    await montar(true);
    expect(screen.getAllByRole('button', { name: /^Pedido #/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('abrir una tarjeta abre el detalle del pedido', async () => {
    await montar(true);
    const tarjeta = screen.getAllByRole('button', { name: /^Pedido #/ })[0];
    const codigo = tarjeta.getAttribute('aria-label')!.replace('Pedido ', '');
    fireEvent.click(tarjeta);
    expect(await screen.findByRole('dialog', { name: `Pedido ${codigo}` })).toBeTruthy();
  });

  it('el botón Filtros cuenta los selectores activos y la hoja los aplica de inmediato', async () => {
    await montar(true);
    expect(screen.getByRole('button', { name: 'Filtros' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    const hoja = within(screen.getByRole('dialog', { name: 'Filtros de pedidos' }));
    fireEvent.change(hoja.getByLabelText('Estado'), { target: { value: 'PLANIFICADO' } });
    expect(screen.getByRole('button', { name: /^Ver \d+ pedidos?$/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Ver \d+ pedidos?$/ }));
    expect(screen.queryByRole('dialog', { name: 'Filtros de pedidos' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Filtros (1)' })).toBeTruthy();
  });

  it('la hoja se cierra con Escape', async () => {
    await montar(true);
    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Filtros de pedidos' })).toBeNull();
  });

  it('Exportar CSV va en el menú "Más acciones"', async () => {
    await montar(true);
    expect(screen.queryByRole('button', { name: 'Exportar CSV' })).toBeNull();
    const mas = screen.getByRole('button', { name: 'Más acciones' });
    expect(mas.getAttribute('aria-haspopup')).toBe('menu');
    fireEvent.click(mas);
    expect(screen.getByRole('menuitem', { name: 'Exportar CSV' })).toBeTruthy();
  });

  it('el chip Críticos queda con aria-pressed al pulsarlo', async () => {
    await montar(true);
    const chip = screen.getByRole('button', { name: 'Críticos' });
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(chip);
    expect(screen.getByRole('button', { name: 'Críticos' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Pedidos · escritorio', () => {
  it('sigue mostrando la tabla, el botón Exportar CSV y los selectores', async () => {
    await montar(false);
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Pedido #/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeTruthy();
    expect(screen.getByLabelText('Filtrar por Estado')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Filtros' })).toBeNull();
  });
});
