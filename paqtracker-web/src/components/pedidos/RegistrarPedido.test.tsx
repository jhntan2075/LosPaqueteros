// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteApi } from '../../services/clienteApi';
import { pedidosColaRubrica, prepararEntornoMapa } from '../../test/rubrica/escenario';
import { renderConDatos } from '../../test/rubrica/montaje';
import { RegistrarPedido } from './RegistrarPedido';

// Registrar pedido: el botón siempre está activo; al pulsarlo se marca lo que falta y el foco va al primer error.

let registrar: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  prepararEntornoMapa();
  vi.spyOn(clienteApi, 'listarPedidos').mockResolvedValue(pedidosColaRubrica());
  registrar = vi.spyOn(clienteApi, 'registrarPedido').mockResolvedValue({} as never);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const montar = () => renderConDatos(<RegistrarPedido onCancelar={() => {}} onRegistrado={() => {}} />);
const pulsarRegistrar = () => fireEvent.click(screen.getByRole('button', { name: 'Registrar y planificar pedido' }));
const escribir = (nombre: RegExp | string, valor: string) => fireEvent.change(screen.getByLabelText(nombre), { target: { value: valor } });

describe('Registrar pedido · validación al enviar', () => {
  it('no muestra errores antes de intentar enviar y el botón está activo', () => {
    montar();
    expect((screen.getByRole('button', { name: 'Registrar y planificar pedido' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText('Ingresa el cliente.')).toBeNull();
    expect(screen.queryByText(/^Falta:/)).toBeNull();
  });

  it('con el formulario vacío no envía, marca los tres errores y enfoca el cliente', () => {
    montar();
    pulsarRegistrar();
    expect(registrar).not.toHaveBeenCalled();
    expect(screen.getByText('Ingresa el cliente.')).toBeTruthy();
    expect(screen.getByText('Elige un destino dentro de la malla.')).toBeTruthy();
    expect(screen.getByText('Elige un plazo de entrega.')).toBeTruthy();
    expect(screen.getByText('Falta: cliente, destino y plazo')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(/^Cliente/));
  });

  it('enfoca la coordenada X cuando solo faltan destino y plazo', () => {
    montar();
    escribir(/^Cliente/, 'Acme');
    pulsarRegistrar();
    expect(document.activeElement).toBe(screen.getByLabelText(/Coordenada X/));
    expect(screen.getByText('Falta: destino y plazo')).toBeTruthy();
  });

  it('con cliente y destino, el resumen dice "Falta: plazo" y el foco va al primer plazo', () => {
    montar();
    escribir(/^Cliente/, 'Acme');
    escribir(/Coordenada X/, '10');
    escribir(/Coordenada Y/, '10');
    pulsarRegistrar();
    expect(screen.getByText('Falta: plazo')).toBeTruthy();
    expect(registrar).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getAllByRole('radio')[0]);
  });

  it('los errores se actualizan al corregir los campos', () => {
    montar();
    pulsarRegistrar();
    escribir(/^Cliente/, 'Acme');
    expect(screen.queryByText('Ingresa el cliente.')).toBeNull();
    expect(screen.getByText('Falta: destino y plazo')).toBeTruthy();
  });

  it('una cantidad fuera de rango conserva lo escrito, muestra el error y bloquea el envío', () => {
    montar();
    escribir(/^Cliente/, 'Acme');
    escribir(/Coordenada X/, '10');
    escribir(/Coordenada Y/, '10');
    fireEvent.click(screen.getAllByRole('radio')[0]);
    escribir('Cantidad de paquetes', '1500');
    expect(screen.getByText('Debe estar entre 1 y 999 paquetes.')).toBeTruthy();
    expect((screen.getByLabelText('Cantidad de paquetes') as HTMLInputElement).value).toBe('1500');
    pulsarRegistrar();
    expect(registrar).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText('Cantidad de paquetes'));
  });
});
