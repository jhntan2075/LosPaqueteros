// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { datosOperacion, mensajeEstado, unidadApi } from '../../test/fabricas';
import { ModuloMetricas } from './ModuloMetricas';

// Métricas con contexto: duración legible, valores sin color sin umbral, planificador aparte y antigüedad del dato.

afterEach(cleanup);

const datos = () => {
  const unidades = Array.from({ length: 37 }, (_, i) =>
    unidadApi({ id: i + 1, codigo: `A-${String(i + 1).padStart(2, '0')}`, estado: i < 25 ? 'EN_RUTA' : 'DISPONIBLE_EN_ALMACEN' }),
  );
  const base = mensajeEstado().indicadores;
  return datosOperacion({ unidades, indicadores: { ...base, tiempoPromedioEntregaMinutos: 1159, porcentajeCumplimiento: 96.5 } });
};

describe('ModuloMetricas', () => {
  it('muestra el tiempo promedio de entrega en horas y minutos', () => {
    render(<ModuloMetricas datos={datos()} segundosDesdeActualizacion={3} />);
    expect(screen.getByText('19 h 19 min')).toBeTruthy();
  });

  it('los valores de los indicadores no llevan color sin un umbral definido', () => {
    render(<ModuloMetricas datos={datos()} segundosDesdeActualizacion={3} />);
    for (const valor of [screen.getByText('25 / 37'), screen.getByText(/^96,5 %$/)]) {
      expect(valor.className).toContain('text-neutral-900');
      expect(valor.className).not.toMatch(/text-(ok|primary|critical|warn)-/);
    }
  });

  it('agrupa el rendimiento del planificador en su propia tarjeta', () => {
    render(<ModuloMetricas datos={datos()} segundosDesdeActualizacion={3} />);
    const titulo = screen.getByRole('heading', { name: 'Rendimiento del planificador' });
    const tarjeta = titulo.closest('div')!.parentElement!;
    expect(within(tarjeta).getByText('Planificaciones ejecutadas')).toBeTruthy();
    expect(within(tarjeta).getByText('Tiempo de la última planificación')).toBeTruthy();
    expect(within(tarjeta).queryByText('Distancia recorrida')).toBeNull();
  });

  it('indica hace cuánto se actualizó el dato, y lo omite sin datos en vivo', () => {
    const { rerender } = render(<ModuloMetricas datos={datos()} segundosDesdeActualizacion={3} />);
    expect(screen.getByText('Actualizado hace 3 s')).toBeTruthy();
    rerender(<ModuloMetricas datos={datos()} segundosDesdeActualizacion={125} />);
    expect(screen.getByText('Actualizado hace 2 min')).toBeTruthy();
    rerender(<ModuloMetricas datos={datos()} />);
    expect(screen.queryByText(/Actualizado hace/)).toBeNull();
  });
});
