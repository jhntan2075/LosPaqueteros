// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AHORA_MS, datosRubrica } from '../../test/rubrica/escenario';
import { ContextoAverias } from '../../hooks/useAverias';
import { ContextoAvisos } from '../../hooks/useAvisos';
import { ContextoDatosOperacion } from '../../hooks/useDatosOperacion';
import { averiasFalsas } from '../../test/rubrica/escenario';
import { renderConDatos } from '../../test/rubrica/montaje';
import type { CategoriaEvento, EventoBitacora } from '../../types/operacion';
import { BitacoraEventos } from './BitacoraEventos';

afterEach(cleanup);

const MIN = 60_000;
const evento = (id: string, tipo: string, haceMin: number, categoria: CategoriaEvento = 'PLANIFICADOR', titulo = `Evento ${id}`): EventoBitacora => ({
  id,
  tipo,
  instanteMs: AHORA_MS - haceMin * MIN,
  hora: `10:${String(60 - haceMin).padStart(2, '0')}:00`,
  titulo,
  detalle: `detalle ${id}`,
  categoria,
  color: 'gris',
});

function montar(eventos: EventoBitacora[]) {
  const datos = { ...datosRubrica(), eventos };
  return renderConDatos(<BitacoraEventos onSeleccionar={vi.fn()} />, datos);
}

const lista = () => within(screen.getByRole('list', { name: 'Eventos' }));

describe('BitacoraEventos (Actividad)', () => {
  it('por defecto muestra todos los eventos, también los de hace más de 30 min', () => {
    montar([evento('a', 'UNIDAD_AVERIADA', 5, 'INCIDENCIA'), evento('b', 'UNIDAD_AVERIADA', 120, 'INCIDENCIA')]);
    expect(screen.getByText('2 eventos')).toBeTruthy();
    expect(lista().getByText('Evento b')).toBeTruthy();
  });

  it('el filtro "Últimos 30 min" oculta los más viejos', () => {
    montar([evento('a', 'UNIDAD_AVERIADA', 5, 'INCIDENCIA'), evento('b', 'UNIDAD_AVERIADA', 120, 'INCIDENCIA')]);
    fireEvent.click(screen.getByRole('button', { name: 'Últimos 30 min' }));
    expect(screen.getByText('1 evento')).toBeTruthy();
    expect(lista().queryByText('Evento b')).toBeNull();
  });

  it('colapsa replanificaciones consecutivas y se expanden al pulsar', () => {
    montar([evento('3', 'PLAN_ACTUALIZADO', 1), evento('2', 'PLAN_ACTUALIZADO', 2), evento('1', 'PLAN_ACTUALIZADO', 3)]);
    const grupo = screen.getByRole('button', { name: /3 replanificaciones · última 10:59:00/ });
    expect(grupo.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Evento 2')).toBeNull();
    fireEvent.click(grupo);
    expect(grupo.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Evento 2')).toBeTruthy();
  });

  it('un único pedido registrado se muestra como fila normal', () => {
    montar([evento('p', 'NUEVO_PEDIDO', 1, 'ENTREGA', 'Pedido registrado')]);
    expect(screen.getByText('Pedido registrado')).toBeTruthy();
  });

  it('sin eventos muestra el estado vacío de la ejecución', () => {
    montar([]);
    expect(screen.getByText('Aún no hay actividad en esta ejecución.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ver todos' })).toBeNull();
  });

  it('si los filtros ocultan todo, lo dice y "Ver todos" los limpia', () => {
    montar([evento('b', 'UNIDAD_AVERIADA', 120, 'INCIDENCIA', 'Avería vieja')]);
    fireEvent.click(screen.getByRole('button', { name: 'Últimos 30 min' }));
    fireEvent.click(screen.getByRole('button', { name: 'Entregas' }));
    expect(screen.getByText('Ningún evento con estos filtros.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ver todos' }));
    expect(screen.getByText('Avería vieja')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Todos' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Últimos 30 min' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('un grupo expandido sigue expandido cuando llega un evento más nuevo del mismo tipo', () => {
    const conDatos = (eventos: EventoBitacora[]) => (
      <ContextoDatosOperacion.Provider value={{ ...datosRubrica(), eventos }}>
        <ContextoAverias.Provider value={averiasFalsas()}>
          <ContextoAvisos.Provider value={() => {}}>
            <BitacoraEventos onSeleccionar={vi.fn()} />
          </ContextoAvisos.Provider>
        </ContextoAverias.Provider>
      </ContextoDatosOperacion.Provider>
    );
    const { rerender } = render(conDatos([evento('2', 'PLAN_ACTUALIZADO', 2), evento('1', 'PLAN_ACTUALIZADO', 3)]));
    fireEvent.click(screen.getByRole('button', { name: /2 replanificaciones/ }));
    expect(screen.getByText('Evento 1')).toBeTruthy();

    rerender(conDatos([evento('3', 'PLAN_ACTUALIZADO', 1), evento('2', 'PLAN_ACTUALIZADO', 2), evento('1', 'PLAN_ACTUALIZADO', 3)]));

    const grupo = screen.getByRole('button', { name: /3 replanificaciones/ });
    expect(grupo.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Evento 3')).toBeTruthy();
  });

  it('en pantallas angostas, filtros, grupos y "Ver todos" miden al menos 44 px', () => {
    montar([evento('2', 'PLAN_ACTUALIZADO', 2), evento('1', 'PLAN_ACTUALIZADO', 3)]);
    for (const nombre of ['Todos', 'Incidencias', 'Planificador', 'Entregas', 'Últimos 30 min', /replanificaciones/]) {
      expect(screen.getByRole('button', { name: nombre }).className).toContain('max-md:min-h-11');
    }
    fireEvent.click(screen.getByRole('button', { name: 'Entregas' }));
    expect(screen.getByRole('button', { name: 'Ver todos' }).className).toContain('max-md:min-h-11');
  });
});
