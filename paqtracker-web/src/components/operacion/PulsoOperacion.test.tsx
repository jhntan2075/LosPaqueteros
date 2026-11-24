// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { datosRubrica, prepararEntornoMapa } from '../../test/rubrica/escenario';
import { renderConDatos } from '../../test/rubrica/montaje';
import { PulsoOperacion } from './PulsoOperacion';

beforeEach(() => {
  prepararEntornoMapa();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PulsoOperacion', () => {
  it('G01–G04 · incluye los indicadores globales', () => {
    renderConDatos(<PulsoOperacion onSeleccionar={() => {}} />);
    const g = within(screen.getByRole('region', { name: 'Ocupación global' }));
    expect(g.getByRole('button', { name: /^Flota: 78 %/ })).toBeTruthy();
    expect(g.getByRole('button', { name: /^Almacenes: 25 %/ })).toBeTruthy();
  });

  it('muestra los resultados del día de la API', () => {
    renderConDatos(<PulsoOperacion onSeleccionar={() => {}} />);
    const dia = within(screen.getByRole('region', { name: 'Resultados del día' }));
    expect(dia.getByRole('button', { name: /^Cumplimiento: 100,0 %/ })).toBeTruthy();
    expect(dia.getByRole('button', { name: /^En camino: 2 pedidos/ })).toBeTruthy();
    expect(dia.getByRole('button', { name: /^En espera de unidad: 1/ })).toBeTruthy();
    expect(dia.getByRole('button', { name: /^Entregados hoy: 1, 0 con retraso/ })).toBeTruthy();
  });

  it('los resultados abren Pedidos; los indicadores, Flota y Almacenes', () => {
    const onSeleccionar = vi.fn();
    renderConDatos(<PulsoOperacion onSeleccionar={onSeleccionar} />);
    fireEvent.click(screen.getByRole('button', { name: /^En camino/ }));
    expect(onSeleccionar).toHaveBeenLastCalledWith({ tipo: 'pedidos' });
    fireEvent.click(screen.getByRole('button', { name: /^Almacenes: 25 %/ }));
    expect(onSeleccionar).toHaveBeenLastCalledWith({ tipo: 'almacenes' });
  });

  it('prioridad en pantallas angostas', () => {
    renderConDatos(<PulsoOperacion onSeleccionar={() => {}} />);
    expect(screen.getByRole('button', { name: /^En espera/ }).className).toContain('hidden xl:flex');
    expect(screen.getByRole('button', { name: /^Entregados hoy/ }).className).toContain('hidden 2xl:flex');
  });

  it('G09 · el reporte de cierre está en el pulso', () => {
    renderConDatos(<PulsoOperacion onSeleccionar={() => {}} />, datosRubrica({ tipoEscenario: 'DIA_A_DIA' }));
    expect(screen.getByRole('button', { name: 'Generar reporte de cierre' })).toBeTruthy();
  });
});
