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

  // Nivel 5 · distancias en km. A-01 va por (27,19): 5 km desde el origen del tramo, 5 km al destino y
  // 18 km por recorrer de una ruta de 23. M-01 no tiene tramo en curso: le faltan 7 km y lleva 13.

  const kmBusqueda = () => fireEvent.click(screen.getByRole('radio', { name: 'Kilómetros' }));
  const limiteKm = (valor: string) => fireEvent.change(screen.getByLabelText('Kilómetros como máximo'), { target: { value: valor } });

  it('E08 · se buscan las unidades a ≤ N km de su destino inmediato', () => {
    montar();
    kmBusqueda();
    limiteKm('5');
    expect(codigos()).toEqual(['A-01']);
    const fila = lista().getAllByRole('button').find((b) => b.getAttribute('data-unidad') === 'A-01')!;
    expect(fila.textContent).toMatch(/en 30 min · 5 km/);
    limiteKm('4');
    expect(codigos()).toEqual([]);
    expect(lista().getByText('Ninguna unidad dentro de esa distancia.')).toBeTruthy();
  });

  it('E09 · se buscan las unidades a ≤ N km de su origen inmediato (se distingue del destino)', () => {
    montar();
    kmBusqueda();
    fireEvent.click(screen.getByRole('radio', { name: 'Salida del origen' }));
    limiteKm('5');
    expect(codigos()).toEqual(['A-01']);
    const fila = lista().getAllByRole('button').find((b) => b.getAttribute('data-unidad') === 'A-01')!;
    expect(fila.textContent).toMatch(/hace 30 min · 5 km/);
  });

  it('E11 · el filtro por rangos de km al destino es permanente y se combina con la búsqueda', () => {
    localStorage.clear();
    const { unmount } = montar();
    const rango = (nombre: string) => within(screen.getByRole('group', { name: 'Distancia al destino' })).getByRole('button', { name: nombre });
    fireEvent.click(rango('0–10 km'));
    expect(rango('0–10 km').getAttribute('aria-pressed')).toBe('true');
    expect(codigos()).toEqual(['A-01']);
    // Sobre el resultado del filtro opera la búsqueda: a ≤ 20 min no llega ninguna.
    fireEvent.change(screen.getByLabelText('Minutos como máximo'), { target: { value: '20' } });
    expect(codigos()).toEqual([]);
    fireEvent.change(screen.getByLabelText('Minutos como máximo'), { target: { value: '' } });
    fireEvent.click(rango('0–10 km'));
    fireEvent.click(rango('10–20 km'));
    expect(lista().getByText('Ninguna unidad en esos rangos de distancia.')).toBeTruthy();

    // Al cerrar y volver a abrir el panel sigue aplicado.
    unmount();
    montar();
    expect(rango('10–20 km').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Todas las distancias' }));
    expect(codigos()).toContain('B-01');
    localStorage.clear();
  });

  it('E16 · se ordena por km por recorrer (las que no están en ruta, al final)', () => {
    montar();
    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'KM_POR_RECORRER' } });
    expect(codigos().slice(0, 2)).toEqual(['M-01', 'A-01']);
    fireEvent.click(screen.getByRole('button', { name: /Orden ascendente/ }));
    expect(codigos().slice(0, 2)).toEqual(['A-01', 'M-01']);
    const fila = lista().getAllByRole('button').find((b) => b.getAttribute('data-unidad') === 'A-01')!;
    expect(fila.textContent).toContain('faltan 18 km');
  });

  it('E17 · se ordena por km recorridos de la ruta en curso', () => {
    montar();
    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'KM_RECORRIDOS' } });
    expect(codigos().slice(0, 2)).toEqual(['M-01', 'A-01']);
    const fila = lista().getAllByRole('button').find((b) => b.getAttribute('data-unidad') === 'A-01')!;
    expect(fila.textContent).toContain('recorrió 5 km');
    fireEvent.click(screen.getByRole('button', { name: /Orden descendente/ }));
    expect(codigos().slice(0, 2)).toEqual(['A-01', 'M-01']);
  });
});
