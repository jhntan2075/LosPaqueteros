// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Download } from 'lucide-react';
import { MenuAcciones, type ItemMenuAcciones } from '.';

afterEach(cleanup);

const montar = (items?: ItemMenuAcciones[]) => {
  const alElegir = vi.fn();
  const lista = items ?? [
    { clave: 'a', etiqueta: 'Primera', onSelect: () => alElegir('a'), icono: Download },
    { clave: 'b', etiqueta: 'Segunda', onSelect: () => alElegir('b'), disabled: true },
    { clave: 'c', etiqueta: 'Tercera', onSelect: () => alElegir('c') },
    { clave: 'd', etiqueta: 'Cuarta', onSelect: () => alElegir('d') },
  ];
  render(
    <div>
      <MenuAcciones etiqueta="Más acciones" items={lista} />
      <button type="button">Fuera</button>
    </div>,
  );
  return { alElegir, boton: screen.getByRole('button', { name: 'Más acciones' }) };
};
const abrir = (boton: HTMLElement) => fireEvent.click(boton);
const enfocado = () => (document.activeElement as HTMLElement).textContent;

describe('MenuAcciones', () => {
  it('el botón anuncia el menú y su estado; cerrado no hay menú', () => {
    const { boton } = montar();
    expect(boton.getAttribute('aria-haspopup')).toBe('menu');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menu')).toBeNull();
    abrir(boton);
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('menuitem')).toHaveLength(4);
  });

  it('al abrir, el foco va al primer elemento habilitado', () => {
    const { boton } = montar();
    abrir(boton);
    expect(enfocado()).toBe('Primera');
  });

  it('al abrir, si el primero está deshabilitado el foco va al primer habilitado', () => {
    const { boton } = montar([
      { clave: 'a', etiqueta: 'Primera', onSelect: () => {}, disabled: true },
      { clave: 'b', etiqueta: 'Segunda', onSelect: () => {} },
    ]);
    abrir(boton);
    expect(enfocado()).toBe('Segunda');
  });

  it('las flechas recorren los habilitados con vuelta y saltan los deshabilitados', () => {
    const { boton } = montar();
    abrir(boton);
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(enfocado()).toBe('Tercera'); // salta "Segunda", deshabilitada
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(enfocado()).toBe('Cuarta');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(enfocado()).toBe('Primera'); // vuelve al inicio
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(enfocado()).toBe('Cuarta'); // y hacia arriba, al final
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(enfocado()).toBe('Tercera');
  });

  it('Inicio y Fin van al primero y al último habilitado', () => {
    const { boton } = montar();
    abrir(boton);
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'End' });
    expect(enfocado()).toBe('Cuarta');
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(enfocado()).toBe('Primera');
  });

  it('Escape cierra el menú y devuelve el foco al botón', () => {
    const { boton } = montar();
    abrir(boton);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(boton);
  });

  it('Tab cierra el menú y deja el foco en el botón', () => {
    const { boton } = montar();
    abrir(boton);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(boton);
  });

  it('un clic fuera cierra el menú', () => {
    const { boton } = montar();
    abrir(boton);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Fuera' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('un clic dentro del menú no lo cierra por sí solo', () => {
    const { boton } = montar();
    abrir(boton);
    fireEvent.pointerDown(screen.getByRole('menu'));
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('si el foco sale del menú hacia otro control, se cierra', () => {
    const { boton } = montar();
    abrir(boton);
    act(() => screen.getByRole('button', { name: 'Fuera' }).focus());
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('elegir un elemento cierra el menú, devuelve el foco al botón y llama a onSelect', () => {
    const { boton, alElegir } = montar();
    abrir(boton);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Tercera' }));
    expect(alElegir).toHaveBeenCalledExactlyOnceWith('c');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(boton);
  });

  it('un elemento deshabilitado no se puede elegir', () => {
    const { boton, alElegir } = montar();
    abrir(boton);
    const segunda = screen.getByRole('menuitem', { name: 'Segunda' }) as HTMLButtonElement;
    expect(segunda.disabled).toBe(true);
    fireEvent.click(segunda);
    expect(alElegir).not.toHaveBeenCalled();
  });
});
