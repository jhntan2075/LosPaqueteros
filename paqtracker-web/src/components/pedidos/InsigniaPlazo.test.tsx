// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { InsigniaPlazo } from './InsigniaPlazo';

// El plazo es un dato, no una alerta: el chip es neutro y "Priorizado" se distingue por un ícono.

afterEach(cleanup);

describe('InsigniaPlazo', () => {
  it('"Priorizado" es neutral, sin tono de advertencia, y lleva el ícono de rayo', () => {
    render(<InsigniaPlazo plazoHoras={4} />);
    const chip = screen.getByText('Priorizado 4 h');
    expect(chip.className).not.toContain('warn');
    expect(chip.querySelector('svg')).not.toBeNull();
  });

  it('"Regular" no lleva ícono', () => {
    render(<InsigniaPlazo plazoHoras={36} />);
    const chip = screen.getByText('Regular 36 h');
    expect(chip.className).not.toContain('warn');
    expect(chip.querySelector('svg')).toBeNull();
  });

  it('con soloTipo muestra solo "Priorizado" o "Regular"', () => {
    render(<InsigniaPlazo plazoHoras={12} soloTipo />);
    expect(screen.getByText('Priorizado')).toBeTruthy();
  });
});
