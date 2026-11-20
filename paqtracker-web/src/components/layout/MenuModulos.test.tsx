// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TopNavbar } from './TopNavbar';

afterEach(cleanup);

describe('Menú de módulos (celular)', () => {
  it('el encabezado muestra el módulo actual y el menú lista los cinco, con el activo marcado', () => {
    render(<TopNavbar tabActiva="metricas" onCambiarTab={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Módulo actual: Métricas. Cambiar de módulo' }));
    const menu = within(screen.getByRole('dialog', { name: 'Menú de módulos' }));
    const nombres = menu.getAllByRole('button').map((b) => b.textContent);
    expect(nombres).toEqual(expect.arrayContaining(['Operación', 'Pedidos', 'Simulación', 'Métricas', 'Configuración']));
    expect(menu.getByRole('button', { name: 'Métricas' }).getAttribute('aria-current')).toBe('page');
  });

  it('elegir un módulo navega y cierra el menú', () => {
    const onCambiarTab = vi.fn();
    render(<TopNavbar tabActiva="operacion" onCambiarTab={onCambiarTab} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de módulos' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Simulación' }));
    expect(onCambiarTab).toHaveBeenCalledWith('simulacion');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape cierra el menú', () => {
    render(<TopNavbar tabActiva="operacion" onCambiarTab={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de módulos' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
