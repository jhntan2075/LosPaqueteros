// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MarcadorDestino, MarcaSemaforo } from './simbolos';

afterEach(cleanup);

describe('una forma por nivel', () => {
  it.each([
    ['VERDE', 'circulo'],
    ['AMBAR', 'triangulo'],
    ['ROJO', 'rombo'],
    ['VACIO', 'anillo'],
  ] as const)('el nivel %s se dibuja como %s en la marca y en el destino', (nivel, forma) => {
    const { container } = render(
      <svg>
        <MarcaSemaforo nivel={nivel} />
      </svg>,
    );
    expect(container.querySelector(`[data-forma="${forma}"]`)).toBeTruthy();
    if (nivel !== 'VACIO') {
      const destino = render(
        <svg>
          <MarcadorDestino variante={nivel} color="#000" />
        </svg>,
      );
      expect(destino.container.querySelector(`[data-forma="${forma}"]`)).toBeTruthy();
    }
  });

  it('el destino cerrado es un anillo y el de entrega conserva su color en data-marcador', () => {
    const cerrado = render(
      <svg>
        <MarcadorDestino variante="CERRADO" color="#000" />
      </svg>,
    );
    expect(cerrado.container.querySelector('[data-forma="anillo"][data-marcador="CERRADO"]')).toBeTruthy();
    const entrega = render(
      <svg>
        <MarcadorDestino variante="ENTREGA" color="#7C3AED" />
      </svg>,
    );
    expect(entrega.container.querySelector('[data-marcador="ENTREGA"]')!.getAttribute('fill')).toBe('#7C3AED');
  });
});
