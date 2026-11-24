// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EnBarraSuperior, ID_RANURA_BARRA_SUPERIOR, RanuraBarraSuperior } from './RanuraBarraSuperior';

afterEach(cleanup);

describe('EnBarraSuperior', () => {
  it('con la ranura montada, el contenido va dentro de la ranura', () => {
    render(
      <>
        <RanuraBarraSuperior />
        <div data-testid="otro">
          <EnBarraSuperior>
            <span>Pulso</span>
          </EnBarraSuperior>
        </div>
      </>,
    );
    expect(document.getElementById(ID_RANURA_BARRA_SUPERIOR)!.textContent).toBe('Pulso');
    expect(screen.getByTestId('otro').textContent).toBe('');
  });

  it('sin ranura, el contenido se muestra en su lugar', () => {
    render(
      <div data-testid="otro">
        <EnBarraSuperior>
          <span>Pulso</span>
        </EnBarraSuperior>
      </div>,
    );
    expect(screen.getByTestId('otro').textContent).toBe('Pulso');
  });

  it('con visible=false no muestra nada', () => {
    render(
      <>
        <RanuraBarraSuperior />
        <EnBarraSuperior visible={false}>
          <span>Pulso</span>
        </EnBarraSuperior>
      </>,
    );
    expect(screen.queryByText('Pulso')).toBeNull();
  });
});
