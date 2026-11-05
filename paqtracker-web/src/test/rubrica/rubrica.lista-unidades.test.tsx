// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EstadoFlota } from '../../components/operacion/EstadoFlota';
import { datosRubrica } from './escenario';
import { renderConDatos } from './montaje';

// Rúbrica 91.EvaSw · E · lista de UT del panel: ocupación con semáforo, orden y búsqueda por minutos.
// Escenario: A-01 salió hace 30 min y llega en 30 min (20/24); M-01 8/8 y B-01 0/4 sin tramo en curso.

afterEach(cleanup);

const lista = () => within(screen.getByRole('region', { name: 'Todas las unidades' }));
const codigos = () => lista().getAllByRole('button').map((b) => b.getAttribute('data-unidad')).filter(Boolean);
const montar = () => renderConDatos(<EstadoFlota onSeleccionar={() => {}} />, datosRubrica());

describe('Rúbrica · PANEL · lista de unidades', () => {
  it('E02–E03 · cada unidad muestra su ocupación en número y % con el semáforo + vacío', () => {
    montar();
    const fila = lista().getAllByRole('button').find((b) => b.getAttribute('data-unidad') === 'A-01')!;
    expect(fila.textContent).toContain('20/24 · 83 %');
    expect(within(fila).getByRole('img', { name: 'Ocupación alta' })).toBeTruthy();
    const bici = lista().getAllByRole('button').find((b) => b.getAttribute('data-unidad') === 'B-01')!;
    expect(within(bici).getByRole('img', { name: 'Vacío' })).toBeTruthy();
  });

  it('E13 · se ordena por ocupación ascendente y descendente', () => {
    montar();
    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'OCUPACION' } });
    expect(codigos().slice(0, 2)).toEqual(['M-01', 'A-01']);
    fireEvent.click(screen.getByRole('button', { name: /Orden descendente/ }));
    expect(codigos()[0]).toBe('A-02');
  });

  it('E14–E15 · se ordena por hora de salida y de llegada (las que no tienen tramo, al final)', () => {
    montar();
    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'SALIDA' } });
    expect(codigos()[0]).toBe('A-01');
    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'LLEGADA' } });
    expect(codigos()[0]).toBe('A-01');
    fireEvent.click(screen.getByRole('button', { name: /Orden ascendente/ }));
    expect(codigos()[0]).toBe('A-01');
  });

  it('E06 · se buscan las unidades a ≤ N minutos de llegar a su destino inmediato', () => {
    montar();
    fireEvent.change(screen.getByLabelText('Minutos como máximo'), { target: { value: '30' } });
    expect(codigos()).toEqual(['A-01']);
    fireEvent.change(screen.getByLabelText('Minutos como máximo'), { target: { value: '20' } });
    expect(codigos()).toEqual([]);
    expect(lista().getByText('Ninguna unidad dentro de ese tiempo.')).toBeTruthy();
  });

  it('E07 · se buscan las unidades que salieron de su origen hace ≤ N minutos (se distingue de la llegada)', () => {
    montar();
    fireEvent.click(screen.getByRole('radio', { name: 'Salida del origen' }));
    fireEvent.change(screen.getByLabelText('Minutos como máximo'), { target: { value: '30' } });
    expect(codigos()).toEqual(['A-01']);
    const fila = lista().getAllByRole('button').find((b) => b.getAttribute('data-unidad') === 'A-01')!;
    expect(fila.textContent).toMatch(/salió \d{2}:\d{2} · hace 30 min/);
    expect(fila.textContent).toMatch(/llega \d{2}:\d{2} · en 30 min/);
  });
});
