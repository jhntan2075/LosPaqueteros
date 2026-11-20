// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteApi } from '../../services/clienteApi';
import { ConfiguracionEscenario } from './ConfiguracionEscenario';

beforeEach(() => {
  vi.spyOn(clienteApi, 'listarEjecuciones').mockResolvedValue([]);
  vi.spyOn(clienteApi, 'crearEjecucion').mockRejectedValue(new Error('no debería crearse'));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ejecutar = () => screen.getByRole('button', { name: 'Ejecutar simulación' });

describe('ConfiguracionEscenario · validación en el campo', () => {
  it('el botón está habilitado y no hay errores antes de intentar', () => {
    render(<ConfiguracionEscenario onAbrir={() => {}} />);
    expect((ejecutar() as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText('Elige la fecha de inicio.')).toBeNull();
    expect(screen.queryByText(/Define la fecha/)).toBeNull();
  });

  it('sin fecha, al ejecutar muestra el error en el campo, enfoca la fecha y no crea la simulación', () => {
    render(<ConfiguracionEscenario onAbrir={() => {}} />);
    fireEvent.click(ejecutar());
    const fecha = screen.getByLabelText(/Fecha de inicio/);
    expect(screen.getByText('Elige la fecha de inicio.')).toBeTruthy();
    expect(fecha.getAttribute('aria-invalid')).toBe('true');
    expect(fecha.getAttribute('aria-describedby')).toBe('inicio-fecha-error');
    expect(document.activeElement).toBe(fecha);
    expect(clienteApi.crearEjecucion).not.toHaveBeenCalled();
  });

  it('la fecha es obligatoria (asterisco) y el error desaparece al elegirla', () => {
    render(<ConfiguracionEscenario onAbrir={() => {}} />);
    expect(screen.getByLabelText(/Fecha de inicio/).closest('div')!.textContent).toContain('*');
    fireEvent.click(ejecutar());
    fireEvent.change(screen.getByLabelText(/Fecha de inicio/), { target: { value: '2026-03-03' } });
    expect(screen.queryByText('Elige la fecha de inicio.')).toBeNull();
  });

  it.each([['-3'], ['51']])('flota con %s: muestra el error, conserva lo escrito y no crea', (valor) => {
    render(<ConfiguracionEscenario onAbrir={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Fecha de inicio/), { target: { value: '2026-03-03' } });
    const motos = screen.getByLabelText('Motos') as HTMLInputElement;
    fireEvent.change(motos, { target: { value: valor } });
    expect(motos.value).toBe(valor);
    expect(screen.getByText('Debe estar entre 0 y 50 unidades.')).toBeTruthy();
    expect(motos.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(/10 autos · — motos/)).toBeTruthy();
    fireEvent.click(ejecutar());
    expect(document.activeElement).toBe(motos);
    expect(clienteApi.crearEjecucion).not.toHaveBeenCalled();
  });

  it('con fecha y flota inválidas, el foco va primero a la fecha', () => {
    render(<ConfiguracionEscenario onAbrir={() => {}} />);
    fireEvent.change(screen.getByLabelText('Autos'), { target: { value: '99' } });
    fireEvent.click(ejecutar());
    expect(document.activeElement).toBe(screen.getByLabelText(/Fecha de inicio/));
  });
});
