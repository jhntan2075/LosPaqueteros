// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prepararEntornoMapa } from '../../test/rubrica/escenario';
import { renderConDatos } from '../../test/rubrica/montaje';
import type { PedidoRegistrado as Pedido } from '../../types/pedidos';
import { PedidoRegistrado } from './PedidoRegistrado';

beforeEach(() => prepararEntornoMapa());
afterEach(cleanup);

const pedidoCon = (holguraMinutos: number, nivelHolgura: Pedido['nivelHolgura']): Pedido => ({
  codigo: 'PED-1',
  borrador: { cliente: 'Acme', destino: { x: 10, y: 10 }, cantidad: 5, plazoHoras: 12 },
  almacenOrigen: null,
  horaLimite: new Date(2026, 0, 2, 10, 0),
  vehiculo: null,
  posicionVehiculo: null,
  eta: null,
  holguraMinutos,
  nivelHolgura,
  replanificacion: { replanifico: false, milisegundos: 0, unidadesDespachadas: 0 },
});

const montar = (pedido: Pedido) => renderConDatos(<PedidoRegistrado pedido={pedido} onRegistrarOtro={() => {}} onVerCola={() => {}} />);

describe('PedidoRegistrado · holgura', () => {
  it('una holgura negativa se lee "1 h 07 min tarde", sin el formato "-01:07"', () => {
    const { container } = montar(pedidoCon(-67, 'ROJO'));
    expect(screen.getByText('1 h 07 min tarde')).toBeTruthy();
    expect(container.textContent).not.toMatch(/-0/);
  });

  it('una holgura positiva se lee como duración', () => {
    montar(pedidoCon(67, 'VERDE'));
    expect(screen.getByText('1 h 07 min')).toBeTruthy();
  });
});
