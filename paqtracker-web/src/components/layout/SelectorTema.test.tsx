// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLAVE_TEMA } from '../../hooks/useTema';
import { SelectorTema } from './SelectorTema';

/** matchMedia simulado: `oscuro` es el tema del sistema; `cambiar` simula que el usuario lo cambia. */
function simularSistema(oscuro: boolean) {
  const oyentes = new Set<() => void>();
  const consulta = {
    get matches() {
      return oscuro;
    },
    addEventListener: (_: string, f: () => void) => oyentes.add(f),
    removeEventListener: (_: string, f: () => void) => oyentes.delete(f),
  };
  vi.stubGlobal('matchMedia', () => consulta);
  return {
    cambiar(nuevo: boolean) {
      oscuro = nuevo;
      act(() => oyentes.forEach((f) => f()));
    },
  };
}

const esOscuro = () => document.documentElement.classList.contains('oscuro');
const abrir = () => fireEvent.click(screen.getByRole('button', { name: /Cambiar tema/ }));

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('oscuro');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SelectorTema', () => {
  it('sin elección guardada usa el automático y sigue al sistema', () => {
    const sistema = simularSistema(true);
    render(<SelectorTema />);
    expect(esOscuro()).toBe(true);
    expect(screen.getByRole('button', { name: /Tema: automático/ })).toBeTruthy();
    sistema.cambiar(false);
    expect(esOscuro()).toBe(false);
  });

  it('elegir Oscuro aplica el tema, lo guarda y deja de seguir al sistema', () => {
    const sistema = simularSistema(false);
    render(<SelectorTema />);
    abrir();
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Oscuro/ }));
    expect(esOscuro()).toBe(true);
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('oscuro');
    expect(screen.queryByRole('menu')).toBeNull();
    sistema.cambiar(false);
    expect(esOscuro()).toBe(true);
  });

  it('recuerda la elección guardada', () => {
    simularSistema(true);
    localStorage.setItem(CLAVE_TEMA, 'claro');
    render(<SelectorTema />);
    expect(esOscuro()).toBe(false);
    abrir();
    expect(screen.getByRole('menuitemradio', { name: /Claro/ }).getAttribute('aria-checked')).toBe('true');
  });

  it('el menú se maneja con teclado y Esc lo cierra devolviendo el foco', () => {
    simularSistema(false);
    render(<SelectorTema />);
    abrir();
    const menu = screen.getByRole('menu');
    expect(document.activeElement).toBe(screen.getByRole('menuitemradio', { name: /Automático/ }));
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitemradio', { name: /Claro/ }));
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Cambiar tema/ }));
  });
});
