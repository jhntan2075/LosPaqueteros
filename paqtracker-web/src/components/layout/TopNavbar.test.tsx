// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ID_RANURA_BARRA_SUPERIOR } from './RanuraBarraSuperior';
import { TopNavbar } from './TopNavbar';

afterEach(cleanup);

describe('TopNavbar', () => {
  it('incluye la ranura', () => {
    render(<TopNavbar tabActiva="operacion" onCambiarTab={() => {}} />);
    expect(document.getElementById(ID_RANURA_BARRA_SUPERIOR)).toBeTruthy();
  });

  it('los módulos inactivos muestran su nombre desde 2xl y lo conservan como nombre accesible', () => {
    render(<TopNavbar tabActiva="operacion" onCambiarTab={() => {}} />);
    expect(screen.getByRole('button', { name: 'Pedidos' }).querySelector('span')!.className).toContain('hidden 2xl:inline');
    expect(screen.getByRole('button', { name: 'Operación' }).querySelector('span')!.className).toContain('hidden xl:inline');
  });

  it('avisa cuando no llegan instantáneas hace 10 s o más', () => {
    render(<TopNavbar tabActiva="operacion" onCambiarTab={() => {}} segundosDesdeActualizacion={15} />);
    expect(screen.getByText('Sin datos hace 15 s')).toBeTruthy();
  });

  it('pasa los tiempos transcurridos a los relojes', () => {
    render(
      <TopNavbar
        tabActiva="operacion"
        onCambiarTab={() => {}}
        relojSimulado="28 oct 2026 · 15:04:05"
        transcurridoOperacionMs={3_600_000}
      />,
    );
    expect(screen.getByRole('group', { name: 'Reloj de la operación día a día' }).textContent).toContain('+0 d 01 h 00 m');
  });
});
