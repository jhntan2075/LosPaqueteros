// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteApi } from '../../services/clienteApi';
import { unidadApi } from '../../test/fabricas';
import { datosRubrica, mensajeRubrica, objetoMapa, posicionEnPantalla, prepararEntornoMapa } from '../../test/rubrica/escenario';
import { montarOperacion, renderConDatos } from '../../test/rubrica/montaje';
import { GridMap, type ObjetoMapa } from './GridMap';

// Unidades agrupadas en la vista lejana: varias unidades en el mismo punto (p. ej. recién salidas del
// central) se dibujan como un solo ícono con el número de unidades; al acercar vuelven a verse una por una.

beforeEach(() => {
  prepararEntornoMapa();
  localStorage.clear();
  // Sin animación: el zoom por botón o por toque es inmediato.
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.spyOn(clienteApi, 'detallePedido').mockResolvedValue({ hitos: [] } as never);
  vi.spyOn(clienteApi, 'estimarAverias').mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const CENTRAL = { x: 27, y: 14 };
const saliendo = (codigo: string, id: number, cargaActual: number, extra: Parameters<typeof unidadApi>[0] = {}) =>
  unidadApi({
    id,
    codigo,
    tipo: 'AUTO',
    capacidadMaxima: 24,
    cargaActual,
    estado: 'EN_RUTA',
    almacenOrigen: 'CENTRAL',
    ubicacionActual: CENTRAL,
    rutaRestante: [CENTRAL, { x: 27, y: 24 }],
    ...extra,
  });

/** Las unidades de la rúbrica (A-01 lejos del central, M-01 en el Intermedio 2) más las que se pidan. */
const datosCon = (...extra: ReturnType<typeof unidadApi>[]) =>
  datosRubrica({ unidades: [...(mensajeRubrica().unidades ?? []).filter((u) => u.codigo === 'A-01' || u.codigo === 'M-01'), ...extra] });

/** Solo el mapa, con los datos dados y la selección que se quiera. */
const montarMapa = (datos: ReturnType<typeof datosRubrica>, seleccion: ObjetoMapa | null = null) => {
  const onSeleccionar = vi.fn();
  const resultado = renderConDatos(
    <GridMap unidades={datos.flota} destinos={[]} bloqueos={[]} seleccion={seleccion} riesgo={{ rojo: 0, ambar: 0 }} onSeleccionar={onSeleccionar} onAbrirIncidencias={() => {}} />,
    datos,
  );
  return { ...resultado, onSeleccionar };
};

const tresEnElCentral = () => [saliendo('G-1', 11, 4), saliendo('G-2', 12, 20), saliendo('G-3', 13, 8)];
const grupos = (c: HTMLElement) => Array.from(c.querySelectorAll('[data-objeto^="grupo:"]'));
const alTocar = (el: Element) => {
  fireEvent.pointerDown(el, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
  fireEvent.pointerUp(el, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
};
const acercar = () => fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));
const separacionPx = (c: HTMLElement) => posicionEnPantalla(objetoMapa(c, 'vehiculo:M-01')!).x - posicionEnPantalla(objetoMapa(c, 'vehiculo:A-01')!).x;
const iconoDe = (el: Element | null) => el!.querySelector('image')!.getAttribute('href');

describe('Unidades agrupadas en la vista lejana', () => {
  it('las unidades de la rúbrica, lejos entre sí, siguen cada una con su propio objeto', () => {
    const { container } = montarOperacion();
    expect(grupos(container)).toHaveLength(0);
    expect(objetoMapa(container, 'vehiculo:A-01')).toBeTruthy();
    expect(objetoMapa(container, 'vehiculo:M-01')).toBeTruthy();
  });

  it('tres unidades en el mismo nodo forman un solo grupo con el número 3 y ninguna se dibuja suelta', () => {
    const { container } = montarMapa(datosCon(...tresEnElCentral()));
    const [grupo, ...otros] = grupos(container);
    expect(otros).toHaveLength(0);
    expect(grupo.getAttribute('data-objeto')).toBe('grupo:G-1,G-2,G-3');
    expect(grupo.textContent).toBe('3'); // solo la insignia: sin rótulo de carga
    ['G-1', 'G-2', 'G-3'].forEach((c) => expect(objetoMapa(container, `vehiculo:${c}`)).toBeNull());
  });

  it('el grupo se mueve como su primer miembro y hay un solo [data-mover] por unidad', () => {
    const { container } = montarMapa(datosCon(...tresEnElCentral()));
    const grupo = grupos(container)[0];
    expect(grupo.getAttribute('data-mover')).toBe('G-1');
    expect(grupo.getAttribute('data-kx')).toBe('27');
    expect(grupo.getAttribute('data-ky')).toBe('14');
    const movibles = Array.from(container.querySelectorAll('[data-mover]')).map((g) => g.getAttribute('data-mover'));
    expect(movibles.sort()).toEqual(['A-01', 'G-1', 'M-01']);
  });

  it('el grupo lleva el ícono de su miembro más cargado, con el color de ese miembro', () => {
    const { container } = montarMapa(datosCon(...tresEnElCentral()));
    const solo = (carga: number) => montarMapa(datosCon(saliendo('G-1', 11, carga))).container.querySelector('[data-objeto="vehiculo:G-1"]');
    // G-2 es el más cargado (20/24): el ícono es el de una unidad con esa carga, no el de G-1 (4/24).
    expect(iconoDe(grupos(container)[0])).toBe(iconoDe(solo(20)));
    expect(iconoDe(grupos(container)[0])).not.toBe(iconoDe(solo(4)));
  });

  it('una unidad seleccionada sigue suelta y las demás se agrupan', () => {
    const { container } = montarMapa(datosCon(...tresEnElCentral()), { tipo: 'vehiculo', codigo: 'G-2' });
    expect(objetoMapa(container, 'vehiculo:G-2')).toBeTruthy();
    const [grupo, ...otros] = grupos(container);
    expect(otros).toHaveLength(0);
    expect(grupo.getAttribute('data-objeto')).toBe('grupo:G-1,G-3');
    expect(grupo.textContent).toBe('2');
  });

  it('una unidad averiada nunca se agrupa', () => {
    const averiada = saliendo('G-3', 13, 0, {
      estado: 'AVERIADA',
      ubicacionActual: { x: 27, y: 14.1 },
      averia: { tipo: 1, desdeMs: 0, reincorporacionMs: 10 ** 12, trasladoCentralMs: null },
    });
    const { container } = montarMapa(datosCon(saliendo('G-1', 11, 4), saliendo('G-2', 12, 20), averiada));
    expect(grupos(container).map((g) => g.getAttribute('data-objeto'))).toEqual(['grupo:G-1,G-2']);
    expect(objetoMapa(container, 'vehiculo:G-3')).toBeTruthy();
  });

  it('el tooltip del grupo dice cuántas unidades son y las nombra', () => {
    const { container } = montarMapa(datosCon(...tresEnElCentral()));
    fireEvent.pointerMove(grupos(container)[0], { clientX: 10, clientY: 10 });
    const texto = screen.getByRole('tooltip').textContent ?? '';
    expect(texto).toContain('3 unidades');
    expect(texto).toContain('G-1, G-2, G-3');
  });

  it('el tooltip del grupo nombra las primeras 4 unidades y resume el resto', () => {
    const seis = [1, 2, 3, 4, 5, 6].map((n) => saliendo(`G-${n}`, 10 + n, n));
    const { container } = montarMapa(datosCon(...seis));
    fireEvent.pointerMove(grupos(container)[0], { clientX: 10, clientY: 10 });
    const texto = screen.getByRole('tooltip').textContent ?? '';
    expect(texto).toContain('6 unidades');
    expect(texto).toContain('G-1, G-2, G-3, G-4 +2');
    expect(texto).not.toContain('G-5');
  });

  it('con zoom de detalle ya no hay grupos: cada unidad vuelve a verse suelta', () => {
    const { container } = montarMapa(datosCon(...tresEnElCentral()));
    expect(grupos(container)).toHaveLength(1);
    for (let i = 0; i < 6 && grupos(container).length > 0; i++) acercar();
    expect(grupos(container)).toHaveLength(0);
    ['G-1', 'G-2', 'G-3'].forEach((c) => expect(objetoMapa(container, `vehiculo:${c}`)).toBeTruthy());
  });

  it('tocar el grupo acerca la vista al doble y no selecciona nada', () => {
    const { container, onSeleccionar } = montarMapa(datosCon(...tresEnElCentral()));
    const antes = separacionPx(container);
    alTocar(grupos(container)[0]);
    expect(separacionPx(container) / antes).toBeCloseTo(2, 1);
    expect(onSeleccionar).not.toHaveBeenCalled();
  });

  it('en Operación, tocar el grupo no abre el panel de detalle', () => {
    const { container } = montarOperacion({ datos: datosCon(...tresEnElCentral()) });
    alTocar(grupos(container)[0]);
    expect(screen.queryByRole('complementary', { name: 'Panel de detalle' })).toBeNull();
  });

  it('tocar una unidad suelta sigue seleccionándola', () => {
    const { container, onSeleccionar } = montarMapa(datosCon(...tresEnElCentral()));
    alTocar(objetoMapa(container, 'vehiculo:A-01')!);
    expect(onSeleccionar).toHaveBeenCalledWith({ tipo: 'vehiculo', codigo: 'A-01' });
  });
});
