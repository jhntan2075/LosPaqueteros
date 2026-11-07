// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALMACENES, DURACIONES_AVERIA, UNIDADES } from '../../config/dominio';
import { TIPO_AVERIA } from '../../config/glosario';
import { validarParametros } from '../../lib/parametrosDominio';
import { clienteApi } from '../../services/clienteApi';
import type { ParametrosDominioApi } from '../../types/api';
import { ModuloConfiguracion } from './ModuloConfiguracion';

const porDefecto = (): ParametrosDominioApi => ({
  almacenes: [
    { codigo: 'CENTRAL', x: 27, y: 14, capacidad: null },
    { codigo: 'INTERMEDIO_1', x: 12, y: 38, capacidad: 1000 },
    { codigo: 'INTERMEDIO_2', x: 57, y: 27, capacidad: 1000 },
  ],
  unidades: [
    { tipo: 'AUTO', capacidad: 24, velocidadKmH: 40, costoPorKm: 1.2 },
    { tipo: 'MOTO', capacidad: 8, velocidadKmH: 25, costoPorKm: 0.6 },
    { tipo: 'BICICLETA', capacidad: 4, velocidadKmH: 12, costoPorKm: 0.15 },
  ],
  averias: { tipo1Minutos: 120, permanenciaSitioMinutos: 240, tipo3MinimoMinutos: 2880, trasvaseMinutos: 30 },
});

beforeEach(() => {
  vi.spyOn(clienteApi, 'consultarParametros').mockResolvedValue(porDefecto());
  // jsdom no mide elementos: el minimapa queda sin dibujar, que aquí no importa.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('validarParametros', () => {
  it('los valores por defecto no tienen errores', () => {
    expect(validarParametros(porDefecto())).toEqual({});
  });

  it('marca almacenes en el mismo nodo o fuera de la malla, y averías incoherentes', () => {
    const p = porDefecto();
    p.almacenes[2] = { ...p.almacenes[2], x: 27, y: 14 };
    p.almacenes[1] = { ...p.almacenes[1], x: 71 };
    p.unidades[0] = { ...p.unidades[0], velocidadKmH: 0 };
    p.averias = { ...p.averias, trasvaseMinutos: 200 };
    const errores = validarParametros(p);
    expect(errores['almacenes.2.x']).toMatch(/mismo nodo/);
    expect(errores['almacenes.1.x']).toMatch(/entre 0 y 70/);
    expect(errores['unidades.0.velocidadKmH']).toBeTruthy();
    expect(errores['averias.trasvaseMinutos']).toMatch(/más corto/);
  });
});

describe('ModuloConfiguracion (B02, B04, B07-B09)', () => {
  it('guarda los cambios y los aplica a la pantalla', async () => {
    const nuevos = porDefecto();
    nuevos.almacenes[1] = { ...nuevos.almacenes[1], x: 15 };
    nuevos.unidades[0] = { ...nuevos.unidades[0], capacidad: 30 };
    nuevos.averias = { ...nuevos.averias, tipo1Minutos: 90 };
    const guardar = vi.spyOn(clienteApi, 'guardarParametros').mockResolvedValue(nuevos);
    render(<ModuloConfiguracion />);

    const x = (await screen.findByLabelText('X', { selector: '#almacen-1-x' })) as HTMLInputElement;
    const guardarBoton = screen.getByRole('button', { name: /Guardar cambios/ }) as HTMLButtonElement;
    expect(guardarBoton.disabled).toBe(true);
    fireEvent.change(x, { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Capacidad', { selector: '#unidad-0-capacidad' }), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/Tipo 1/), { target: { value: '90' } });
    fireEvent.click(guardarBoton);

    await waitFor(() => expect(guardar).toHaveBeenCalledWith(nuevos));
    expect(ALMACENES[1].ubicacion).toEqual({ x: 15, y: 38 });
    expect(UNIDADES.AUTO.capacidad).toBe(30);
    expect(DURACIONES_AVERIA.tipo1Minutos).toBe(90);
    expect(TIPO_AVERIA[1].duracion).toBe('1 h 30 min detenida en el lugar');
    // La operación día a día sigue con los anteriores hasta aplicarlos.
    expect(screen.getByRole('button', { name: /Aplicar a la operación día a día/ })).toBeTruthy();
  });

  it('muestra el error junto al campo al salir de él y no envía valores inválidos', async () => {
    const guardar = vi.spyOn(clienteApi, 'guardarParametros');
    render(<ModuloConfiguracion />);

    const velocidad = await screen.findByLabelText('Velocidad', { selector: '#unidad-2-velocidad' });
    fireEvent.change(velocidad, { target: { value: '0' } });
    expect(screen.queryByText(/Debe estar entre 1 y 120 km\/h/)).toBeNull();
    fireEvent.blur(velocidad);
    expect(screen.getByText(/Debe estar entre 1 y 120 km\/h/)).toBeTruthy();
    expect(velocidad.getAttribute('aria-invalid')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }));
    expect(screen.getByText('Corrige los campos marcados antes de guardar.')).toBeTruthy();
    expect(guardar).not.toHaveBeenCalled();
  });

  it('aplicar a la operación pide confirmación y reinicia el día a día', async () => {
    const nuevos = porDefecto();
    nuevos.unidades[1] = { ...nuevos.unidades[1], velocidadKmH: 30 };
    vi.spyOn(clienteApi, 'guardarParametros').mockResolvedValue(nuevos);
    const reiniciar = vi.spyOn(clienteApi, 'reiniciarDiaADia').mockResolvedValue({} as never);
    render(<ModuloConfiguracion />);

    fireEvent.change(await screen.findByLabelText('Velocidad', { selector: '#unidad-1-velocidad' }), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Aplicar a la operación día a día/ }));
    expect(reiniciar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar y reiniciar' }));

    await waitFor(() => expect(reiniciar).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Aplicar a la operación día a día/ })).toBeNull());
  });
});
