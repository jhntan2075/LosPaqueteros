// @vitest-environment jsdom
import React, { useRef } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDeslizamientoUnidades } from './useDeslizamientoUnidades';

const VISTA = { escala: 10, x: 0, y: 0 };

/** Una unidad en (kx, ky) km, dibujada como lo hace el mapa (translate en px y data-kx / data-ky). */
const Lienzo: React.FC<{ kx: number; ky: number }> = ({ kx, ky }) => {
  const ref = useRef<SVGSVGElement>(null);
  useDeslizamientoUnidades(ref, VISTA);
  return (
    <svg ref={ref}>
      <g data-testid="u" data-mover="A-01" data-kx={kx} data-ky={ky} transform={`translate(${kx * 10}, ${ky * 10})`} />
    </svg>
  );
};

const posicionX = (g: Element) => Number(/translate\(([-\d.]+)/.exec(g.getAttribute('transform')!)![1]);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useDeslizamientoUnidades (C29)', () => {
  it('tras un tic, la unidad parte desde donde se veía y se desliza hasta su nueva posición', async () => {
    const { getByTestId, rerender } = render(<Lienzo kx={10} ky={0} />);
    rerender(<Lienzo kx={10.3} ky={0} />);
    // Justo después del render sigue donde se veía: no salta.
    expect(posicionX(getByTestId('u'))).toBeLessThan(103);
    await waitFor(() => expect(posicionX(getByTestId('u'))).toBeCloseTo(103, 5));
  });

  it('un cambio de plan (salto mayor a 0,5 km) también se suaviza en lugar de saltar', async () => {
    const { getByTestId, rerender } = render(<Lienzo kx={10} ky={0} />);
    rerender(<Lienzo kx={12} ky={0} />);
    expect(posicionX(getByTestId('u'))).toBeLessThan(120);
    await waitFor(() => expect(posicionX(getByTestId('u'))).toBeCloseTo(120, 5));
  });

  it('una reubicación grande (más de 5 km) se coloca directamente', () => {
    const { getByTestId, rerender } = render(<Lienzo kx={10} ky={0} />);
    rerender(<Lienzo kx={30} ky={0} />);
    expect(posicionX(getByTestId('u'))).toBe(300);
  });

  it('con prefers-reduced-motion no se anima', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { getByTestId, rerender } = render(<Lienzo kx={10} ky={0} />);
    rerender(<Lienzo kx={10.3} ky={0} />);
    expect(posicionX(getByTestId('u'))).toBeCloseTo(103, 5);
  });
});
