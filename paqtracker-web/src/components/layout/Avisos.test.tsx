// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAvisos } from '../../hooks/useAvisos';
import { ProveedorAvisos } from './Avisos';

const Disparador: React.FC<{ texto: string; alHacer?: () => void }> = ({ texto, alHacer }) => {
  const avisar = useAvisos();
  return (
    <button onClick={() => avisar({ texto, accion: alHacer ? { etiqueta: 'Ver en bitácora', alHacer } : undefined })}>mostrar {texto}</button>
  );
};

const montar = (alHacer?: () => void) =>
  render(
    <ProveedorAvisos>
      <Disparador texto="uno" alHacer={alHacer} />
      <Disparador texto="dos" />
    </ProveedorAvisos>,
  );

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ProveedorAvisos', () => {
  it('muestra el aviso en una región anunciada a lectores de pantalla', () => {
    montar();
    fireEvent.click(screen.getByText('mostrar uno'));
    expect(screen.getByRole('status').textContent).toContain('uno');
  });

  it('se cierra solo a los 7 segundos', () => {
    montar();
    fireEvent.click(screen.getByText('mostrar uno'));
    act(() => void vi.advanceTimersByTime(6_999));
    expect(screen.getByRole('status').textContent).toContain('uno');
    act(() => void vi.advanceTimersByTime(1));
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('un aviso nuevo reemplaza al anterior y reinicia el plazo', () => {
    montar();
    fireEvent.click(screen.getByText('mostrar uno'));
    act(() => void vi.advanceTimersByTime(5_000));
    fireEvent.click(screen.getByText('mostrar dos'));
    const region = screen.getByRole('status');
    expect(region.textContent).toContain('dos');
    expect(region.textContent).not.toContain('uno');
    act(() => void vi.advanceTimersByTime(5_000));
    expect(region.textContent).toContain('dos');
  });

  it('la acción del aviso se ejecuta y lo cierra', () => {
    const alHacer = vi.fn();
    montar(alHacer);
    fireEvent.click(screen.getByText('mostrar uno'));
    fireEvent.click(screen.getByText('Ver en bitácora'));
    expect(alHacer).toHaveBeenCalledOnce();
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('el botón cerrar descarta el aviso', () => {
    montar();
    fireEvent.click(screen.getByText('mostrar uno'));
    fireEvent.click(screen.getByLabelText('Cerrar aviso'));
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('fuera de un proveedor, avisar no hace nada ni falla', () => {
    render(<Disparador texto="suelto" />);
    expect(() => fireEvent.click(screen.getByText('mostrar suelto'))).not.toThrow();
  });
});
