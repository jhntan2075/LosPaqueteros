// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TITULO_PESTANA } from '../../hooks/useNavegacionPanel';
import { BarraPaneles } from './BarraPaneles';

// Orden de las pestañas del panel derecho: lo urgente primero (Incidencias, Resumen) y el historial al final.

afterEach(cleanup);

const montar = (orientacion: 'vertical' | 'horizontal' | 'superior') =>
  render(<BarraPaneles activa="incidencias" onSeleccionar={vi.fn()} orientacion={orientacion} />);

describe('BarraPaneles · orden y nombres', () => {
  it('las pestañas van en el orden Incidencias, Resumen, Envíos, Flota, Almacenes, Actividad', () => {
    montar('superior');
    const nombres = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(nombres).toEqual(['Incidencias', 'Resumen', 'Envíos', 'Flota', 'Almacenes', 'Actividad']);
  });

  it('la pestaña interna "bitacora" se llama Actividad también en el título del panel', () => {
    expect(TITULO_PESTANA.bitacora).toBe('Actividad');
    expect(TITULO_PESTANA.incidencias).toBe('Incidencias');
  });

  it('en celular caben las cuatro primeras y "Más" guarda Almacenes y Actividad', () => {
    const onSeleccionar = vi.fn();
    render(<BarraPaneles activa="incidencias" onSeleccionar={onSeleccionar} orientacion="horizontal" />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Incidencias', 'Resumen', 'Envíos', 'Flota']);
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    const items = within(screen.getByRole('menu')).getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['Almacenes', 'Actividad']);
    fireEvent.click(items[1]);
    expect(onSeleccionar).toHaveBeenCalledWith('bitacora');
  });
});
