// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteApi } from '../../services/clienteApi';
import { objetoMapa, posicionEnPantalla, prepararEntornoMapa } from '../../test/rubrica/escenario';
import { montarOperacion } from '../../test/rubrica/montaje';

// Los controles que flotan sobre el mapa conviven con sus gestos (arrastrar, zoom) sin pisarse.

beforeEach(() => {
  localStorage.clear();
  prepararEntornoMapa();
  vi.spyOn(clienteApi, 'detallePedido').mockResolvedValue({ hitos: [] } as never);
  vi.spyOn(clienteApi, 'estimarAverias').mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Diálogo de rangos del semáforo sobre el mapa', () => {
  const abrirRangos = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Leyenda' }));
    fireEvent.click(screen.getByRole('button', { name: 'Configurar rangos' }));
    return screen.getByRole('dialog', { name: 'Rangos del semáforo' });
  };

  it('tocar y arrastrar dentro del diálogo no mueve el mapa (el portal burbujea eventos de React al mapa)', () => {
    // Sin animación y con zoom: en la vista completa la malla no se puede desplazar.
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { container } = montarOperacion();
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));
    const central = () => posicionEnPantalla(objetoMapa(container, 'almacen:CENTRAL')!);
    const dialogo = abrirRangos();
    const antes = central();
    fireEvent.pointerDown(dialogo, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(dialogo, { clientX: 220, clientY: 170, pointerId: 1 });
    fireEvent.pointerUp(dialogo, { clientX: 220, clientY: 170, pointerId: 1 });
    expect(central()).toEqual(antes);
    expect(container.querySelector('.cursor-grabbing')).toBeNull();
  });

  it('al cerrarlo con Escape el foco vuelve a "Configurar rangos"', () => {
    montarOperacion();
    const dialogo = abrirRangos();
    fireEvent.keyDown(dialogo, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Rangos del semáforo' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Configurar rangos' }));
  });

  it('al cerrarlo con Cancelar el foco vuelve a "Configurar rangos"', () => {
    montarOperacion();
    abrirRangos();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Rangos del semáforo' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Configurar rangos' }));
  });
});
