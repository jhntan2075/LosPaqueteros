// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TITULO_PESTANA } from '../../hooks/useNavegacionPanel';
import { BarraPaneles } from './BarraPaneles';

// Orden de las pestañas del panel derecho: lo urgente primero (Incidencias) y el historial al final. El resumen ya no
// es una pestaña: es la franja flotante del mapa.

afterEach(cleanup);

const montar = (orientacion: 'vertical' | 'horizontal' | 'superior') =>
  render(<BarraPaneles activa="incidencias" onSeleccionar={vi.fn()} orientacion={orientacion} />);

describe('BarraPaneles · orden y nombres', () => {
  it('son cinco pestañas, en el orden Incidencias, Envíos, Flota, Almacenes, Actividad, y ninguna es Resumen', () => {
    montar('superior');
    const nombres = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(nombres).toEqual(['Incidencias', 'Envíos', 'Flota', 'Almacenes', 'Actividad']);
    expect(nombres).not.toContain('Resumen');
  });

  it('la barra vertical también lleva las cinco, sin Resumen', () => {
    montar('vertical');
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Incidencias', 'Envíos', 'Flota', 'Almacenes', 'Actividad']);
  });

  it('la pestaña interna "bitacora" se llama Actividad también en el título del panel', () => {
    expect(TITULO_PESTANA.bitacora).toBe('Actividad');
    expect(TITULO_PESTANA.incidencias).toBe('Incidencias');
  });

  it('en celular caben las cuatro primeras y "Más" guarda Actividad', () => {
    const onSeleccionar = vi.fn();
    render(<BarraPaneles activa="incidencias" onSeleccionar={onSeleccionar} orientacion="horizontal" />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Incidencias', 'Envíos', 'Flota', 'Almacenes']);
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    const items = within(screen.getByRole('menu')).getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['Actividad']);
    fireEvent.click(items[0]);
    expect(onSeleccionar).toHaveBeenCalledWith('bitacora');
  });
});
