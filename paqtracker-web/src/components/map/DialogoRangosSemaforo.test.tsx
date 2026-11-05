// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RANGOS_POR_DEFECTO, fijarRangos } from '../../config/rangosSemaforo';
import { ErrorDeApi, clienteApi } from '../../services/clienteApi';
import type { RangosSemaforoApi } from '../../types/api';
import { LeyendaMapa } from './LeyendaMapa';

// Punto 6 de la evaluación: el operador ve y edita los rangos desde la leyenda, y al guardar el semáforo
// y su leyenda cambian sin recargar.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  fijarRangos(RANGOS_POR_DEFECTO);
});

const abrir = () => {
  render(<LeyendaMapa onCerrar={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Configurar rangos' }));
  return screen.getByRole('dialog', { name: 'Rangos del semáforo' });
};

const campo = (dialogo: HTMLElement, nombre: RegExp) => within(dialogo).getByLabelText(nombre) as HTMLInputElement;

const tablaLeyenda = () => screen.getByRole('table', { name: 'Semáforo de carga y stock' });

describe('DialogoRangosSemaforo', () => {
  it('muestra los rangos vigentes en porcentaje, incluido el vacío', () => {
    const dialogo = abrir();

    expect(campo(dialogo, /Holgura del pedido: rojo por debajo de/).value).toBe('15');
    expect(campo(dialogo, /Carga de unidades: vacío hasta/).value).toBe('0');
    expect(campo(dialogo, /Carga de unidades: ámbar desde/).value).toBe('70');
    expect(campo(dialogo, /Stock de almacenes: rojo desde/).value).toBe('80');
  });

  it('guarda en la API como fracciones y la leyenda cambia de inmediato', async () => {
    const guardar = vi
      .spyOn(clienteApi, 'guardarRangosSemaforo')
      .mockImplementation(async (rangos: RangosSemaforoApi) => rangos);
    const dialogo = abrir();
    expect(within(tablaLeyenda()).getByText('70–90 %')).toBeTruthy();

    fireEvent.change(campo(dialogo, /Carga de unidades: vacío hasta/), { target: { value: '5' } });
    fireEvent.change(campo(dialogo, /Carga de unidades: ámbar desde/), { target: { value: '60' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar rangos' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(guardar).toHaveBeenCalledWith({
      ...RANGOS_POR_DEFECTO,
      ocupacionUnidad: { vacio: 0.05, ambar: 0.6, rojo: 0.9 },
    });
    expect(within(tablaLeyenda()).getByText('≤ 5 %')).toBeTruthy();
    expect(within(tablaLeyenda()).getByText('60–90 %')).toBeTruthy();
  });

  it('no envía umbrales fuera de orden y explica el motivo', () => {
    const guardar = vi.spyOn(clienteApi, 'guardarRangosSemaforo');
    const dialogo = abrir();

    fireEvent.change(campo(dialogo, /Holgura del pedido: rojo por debajo de/), { target: { value: '50' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar rangos' }));

    expect(within(dialogo).getByRole('alert').textContent).toMatch(/Holgura del pedido: el rojo .* menor que el ámbar/);
    expect(guardar).not.toHaveBeenCalled();
  });

  it('si la API rechaza los rangos, muestra su mensaje y no los aplica', async () => {
    vi.spyOn(clienteApi, 'guardarRangosSemaforo').mockRejectedValue(new ErrorDeApi(400, 'Holgura: rango inválido'));
    const dialogo = abrir();

    fireEvent.change(campo(dialogo, /Carga de unidades: ámbar desde/), { target: { value: '60' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar rangos' }));

    expect(await within(dialogo).findByText('Holgura: rango inválido')).toBeTruthy();
    expect(within(tablaLeyenda()).getByText('70–90 %')).toBeTruthy();
  });

  it('"Valores por defecto" vuelve a llenar el formulario con los valores de siempre', () => {
    fijarRangos({ ...RANGOS_POR_DEFECTO, holgura: { rojo: 0.1, ambar: 0.3 } });
    const dialogo = abrir();
    expect(campo(dialogo, /Holgura del pedido: rojo por debajo de/).value).toBe('10');

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Valores por defecto' }));

    expect(campo(dialogo, /Holgura del pedido: rojo por debajo de/).value).toBe('15');
    expect(campo(dialogo, /Holgura del pedido: ámbar por debajo de/).value).toBe('40');
  });
});
