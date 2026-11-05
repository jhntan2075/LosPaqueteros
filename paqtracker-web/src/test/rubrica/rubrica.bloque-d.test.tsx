// @vitest-environment jsdom
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLOR_AVERIA } from '../../components/map/iconosVehiculo';
import { COLOR_BLOQUEO, COLOR_EN_ENTREGA, FONDO_BLOQUEO, OPACIDAD_LINEA_BLOQUEO } from '../../components/map/simbolos';
import { COLOR_SEMAFORO } from '../../lib/semaforo';
import { clienteApi } from '../../services/clienteApi';
import { INICIO_MS, unidadApi } from '../fabricas';
import { MIN, datosRubrica, mensajeRubrica, objetoMapa, posicionEnPantalla, prepararEntornoMapa } from './escenario';
import { montarOperacion } from './montaje';

// Bloque D de la evaluación: colores del bloqueo y de las averías (D2, D3, D9, D10) y la insignia de una
// avería tipo 2 o 3 que ya pasó al almacén central (D11).

const BLANCO = '#FFFFFF';
const MALLA = '#E2E8F0';
const CENTRAL = '#0F172A';

const canal = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luminancia = (hex: string) => {
  const [r, g, b] = rgb(hex).map((c) => canal(c / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** Color que se ve al pintar `color` con opacidad `alfa` sobre `fondo`. */
const mezcla = (color: string, fondo: string, alfa: number) =>
  `#${rgb(color)
    .map((c, i) => Math.round(c * alfa + rgb(fondo)[i] * (1 - alfa)).toString(16).padStart(2, '0'))
    .join('')}`;

beforeEach(() => {
  prepararEntornoMapa();
  vi.spyOn(clienteApi, 'detallePedido').mockResolvedValue({ hitos: [] } as never);
  vi.spyOn(clienteApi, 'estimarAverias').mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Bloque D · colores', () => {
  it('D2 · el bloqueo no usa ningún color del semáforo', () => {
    expect(Object.values(COLOR_SEMAFORO)).not.toContain(COLOR_BLOQUEO);
  });

  it('D3 · la línea translúcida del bloqueo y su aspa llegan a 3:1 sobre el fondo y sobre la malla', () => {
    expect(OPACIDAD_LINEA_BLOQUEO).toBeLessThan(1);
    expect(contraste(mezcla(COLOR_BLOQUEO, BLANCO, OPACIDAD_LINEA_BLOQUEO), BLANCO)).toBeGreaterThanOrEqual(3);
    expect(contraste(mezcla(COLOR_BLOQUEO, MALLA, OPACIDAD_LINEA_BLOQUEO), MALLA)).toBeGreaterThanOrEqual(3);
    expect(contraste(COLOR_BLOQUEO, BLANCO)).toBeGreaterThanOrEqual(3);
    expect(contraste(COLOR_BLOQUEO, MALLA)).toBeGreaterThanOrEqual(3);
    expect(contraste(COLOR_BLOQUEO, FONDO_BLOQUEO)).toBeGreaterThanOrEqual(3);
  });

  it('D9–D10 · cada avería tiene un color propio: no del semáforo, ni del central, ni del bloqueo', () => {
    const colores = Object.values(COLOR_AVERIA);
    expect(new Set(colores).size).toBe(3);
    const ocupados = [...Object.values(COLOR_SEMAFORO), CENTRAL, COLOR_BLOQUEO, COLOR_EN_ENTREGA];
    colores.forEach((color) => {
      expect(ocupados).not.toContain(color);
      expect(contraste(color, BLANCO)).toBeGreaterThanOrEqual(3);
      expect(contraste(color, MALLA)).toBeGreaterThanOrEqual(3);
      // El número blanco de la insignia se lee sobre el color.
      expect(contraste(BLANCO, color)).toBeGreaterThanOrEqual(4.5);
    });
  });
});

describe('Bloque D · D11 · avería tipo 2 o 3 en el almacén central', () => {
  /** M-02 se averió (tipo 2) a los 10 min y a las 4 h pasó al central, donde sigue averiada. */
  const datosConAveriadaEnCentral = () => {
    const base = mensajeRubrica();
    const enCentral = unidadApi({
      id: 9,
      codigo: 'M-02',
      tipo: 'MOTO',
      capacidadMaxima: 8,
      cargaActual: 0,
      estado: 'AVERIADA',
      almacenOrigen: 'CENTRAL',
      ubicacionActual: { x: 27, y: 14 },
      averia: {
        tipo: 2,
        desdeMs: INICIO_MS + 10 * MIN,
        reincorporacionMs: INICIO_MS + 15 * 60 * MIN,
        trasladoCentralMs: INICIO_MS + 250 * MIN,
      },
    });
    return datosRubrica({ unidades: [...(base.unidades ?? []), enCentral] }, INICIO_MS + 300 * MIN);
  };

  it('la insignia se dibuja después (encima) de la capa de almacenes', () => {
    const { container } = montarOperacion({ datos: datosConAveriadaEnCentral() });
    const unidad = objetoMapa(container, 'vehiculo:M-02')!;
    const central = objetoMapa(container, 'almacen:CENTRAL')!;

    expect(unidad.querySelector('[data-averia="2"]')).toBeTruthy();
    expect(central.compareDocumentPosition(unidad) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('la insignia queda bajo el símbolo del central, fuera de su rótulo', () => {
    const { container } = montarOperacion({ datos: datosConAveriadaEnCentral() });
    const unidad = objetoMapa(container, 'vehiculo:M-02')!;
    const central = objetoMapa(container, 'almacen:CENTRAL')!;

    // Mismo nodo que el central, pero el contenido de la unidad baja una fila.
    expect(posicionEnPantalla(unidad)).toEqual(posicionEnPantalla(central));
    const desplazado = unidad.querySelector('[data-en-almacen]')!;
    expect(posicionEnPantalla(desplazado).y).toBeGreaterThanOrEqual(26);
    expect(unidad.textContent).toContain('M-02');
    expect(unidad.textContent).toMatch(/vuelve/);
  });

  it('la averiada en la calle (tipo 1) sigue en su punto, sin desplazamiento', () => {
    const { container } = montarOperacion({ datos: datosConAveriadaEnCentral() });
    const enCalle = objetoMapa(container, 'vehiculo:B-01')!;

    expect(enCalle.querySelector('[data-en-almacen]')).toBeNull();
    expect(enCalle.querySelector('[data-averia="1"]')).toBeTruthy();
  });
});
