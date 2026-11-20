// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { PuntoHolgura } from './iconos';

afterEach(cleanup);

describe('PuntoHolgura', () => {
  it.each([
    ['VERDE', 'circulo'],
    ['AMBAR', 'triangulo'],
    ['ROJO', 'rombo'],
    ['CERRADO', 'anillo'],
  ] as const)('el nivel %s usa la forma %s', (nivel, forma) => {
    const { container } = render(<PuntoHolgura nivel={nivel} />);
    expect(container.querySelector(`[data-forma="${forma}"]`)).toBeTruthy();
  });
});
