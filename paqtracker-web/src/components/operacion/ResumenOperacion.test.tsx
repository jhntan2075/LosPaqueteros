// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextoDatosOperacion } from '../../hooks/useDatosOperacion';
import { datosOperacion, INICIO_MS } from '../../test/fabricas';
import type { CategoriaEvento, EventoBitacora } from '../../types/operacion';
import type { ConfiguracionCorrida } from '../../types/simulacion';
import { ResumenOperacion } from './ResumenOperacion';

// Resumen: los indicadores de siempre, más la actividad reciente (solo incidencias) y, en una simulación,
// con qué configuración corre.

afterEach(cleanup);

const evento = (n: number, categoria: CategoriaEvento, titulo = `Evento ${n}`): EventoBitacora => ({
  id: `e${n}`,
  instanteMs: INICIO_MS + n * 60_000,
  hora: `08:${String(n).padStart(2, '0')}`,
  titulo,
  detalle: '',
  categoria,
  color: categoria === 'INCIDENCIA' ? 'rojo' : 'gris',
});

const CONFIGURACION: ConfiguracionCorrida = {
  escenario: 'Simulación 7 días',
  inicio: new Date(2026, 2, 3, 8, 0, 0),
  flota: { autos: 4, motos: 6, bicicletas: 2 },
  factorAceleracion: 120,
};

function montar(eventos: EventoBitacora[] = [], simulacion?: ConfiguracionCorrida) {
  const onSeleccionar = vi.fn();
  render(
    <ContextoDatosOperacion.Provider value={{ ...datosOperacion(), eventos }}>
      <ResumenOperacion onSeleccionar={onSeleccionar} simulacion={simulacion} />
    </ContextoDatosOperacion.Provider>,
  );
  return { onSeleccionar };
}

describe('Resumen · actividad reciente', () => {
  it('muestra solo incidencias, las 5 más recientes primero, con su hora', () => {
    // Del más nuevo al más antiguo, como llegan en datos.eventos: 7 incidencias y 2 eventos de otro tipo mezclados.
    const eventos = [
      evento(9, 'INCIDENCIA', 'Avería A-09'),
      evento(8, 'PLANIFICADOR', 'Planificación 8'),
      evento(7, 'INCIDENCIA', 'Bloqueo 7'),
      evento(6, 'INCIDENCIA', 'Avería 6'),
      evento(5, 'ENTREGA', 'Entrega 5'),
      evento(4, 'INCIDENCIA', 'Avería 4'),
      evento(3, 'INCIDENCIA', 'Bloqueo 3'),
      evento(2, 'INCIDENCIA', 'Avería 2'),
      evento(1, 'INCIDENCIA', 'Avería 1'),
    ];
    montar(eventos);
    const seccion = within(screen.getByRole('region', { name: 'Actividad reciente' }));
    const filas = seccion.getAllByRole('listitem').map((f) => f.textContent);
    expect(filas).toEqual(['08:09Avería A-09', '08:07Bloqueo 7', '08:06Avería 6', '08:04Avería 4', '08:03Bloqueo 3']);
    expect(seccion.queryByText(/Planificación/)).toBeNull();
    expect(seccion.queryByText(/Entrega 5/)).toBeNull();
  });

  it('"Ver actividad" abre la pestaña de actividad', () => {
    const { onSeleccionar } = montar([evento(1, 'INCIDENCIA')]);
    fireEvent.click(screen.getByRole('button', { name: 'Ver actividad' }));
    expect(onSeleccionar).toHaveBeenCalledWith({ tipo: 'bitacora' });
  });

  it('sin incidencias lo dice, aunque haya otros eventos', () => {
    montar([evento(1, 'PLANIFICADOR'), evento(2, 'ENTREGA')]);
    expect(screen.getByText('Sin incidencias recientes.')).toBeTruthy();
    expect(screen.queryByText('Evento 1')).toBeNull();
  });

  it('va después de los indicadores y antes del botón del reporte', () => {
    montar([evento(1, 'INCIDENCIA')]);
    const botones = screen.getAllByRole('button').map((b) => b.textContent);
    expect(botones.indexOf('Ver actividad')).toBeGreaterThan(-1);
    expect(botones.indexOf('Ver actividad')).toBeLessThan(botones.findIndex((t) => /reporte de cierre|última planificación/.test(t ?? '')));
  });
});

describe('Resumen · simulación', () => {
  it('en una simulación muestra escenario, inicio, flota y ritmo', () => {
    montar([], CONFIGURACION);
    const bloque = within(screen.getByRole('region', { name: 'Simulación' }));
    expect(bloque.getByText('Simulación 7 días')).toBeTruthy();
    expect(bloque.getByText('3 mar 2026 · 08:00')).toBeTruthy();
    expect(bloque.getByText('4 autos · 6 motos · 2 bicis')).toBeTruthy();
    expect(bloque.getByText('×120')).toBeTruthy();
  });

  it('en el día a día no hay bloque de simulación', () => {
    montar([]);
    expect(screen.queryByRole('region', { name: 'Simulación' })).toBeNull();
  });
});
