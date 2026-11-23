// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextoDatosOperacion } from '../../hooks/useDatosOperacion';
import { datosRubrica } from '../../test/rubrica/escenario';
import type { DatosOperacion } from '../../types/operacion';
import type { ConfiguracionCorrida } from '../../types/simulacion';
import type { UbicacionResumen } from './estilosMapa';
import { ResumenMapa } from './ResumenMapa';

// Franja de resumen sobre el mapa: cuatro métricas y un desplegable con el resto. En la rúbrica hay 4 pedidos
// registrados, 1 entregado a tiempo, 2 en tránsito, 1 en espera y 2 unidades en ruta de 4.

afterEach(cleanup);

const CENTRO: UbicacionResumen = { donde: 'centro', izquierdaPx: 400, anchoPx: 480, metricas: 4 };
const CONFIGURACION: ConfiguracionCorrida = {
  escenario: 'Simulación 7 días',
  inicio: new Date(2026, 2, 3, 8, 0, 0),
  flota: { autos: 4, motos: 6, bicicletas: 2 },
  factorAceleracion: 120,
};

interface Montaje {
  datos?: DatosOperacion;
  ubicacion?: UbicacionResumen;
  altoMapaPx?: number;
  altoHojaPx?: number;
  reducida?: boolean;
  simulacion?: ConfiguracionCorrida;
  onAbrirFlota?: () => void;
  abierto?: boolean;
}

function montar({ datos = datosRubrica(), ubicacion = CENTRO, altoMapaPx = 800, altoHojaPx = 0, reducida = false, simulacion, onAbrirFlota, abierto = false }: Montaje = {}) {
  const Envoltura = () => {
    const [estaAbierto, setAbierto] = useState(abierto);
    return (
      <div>
        <button type="button">fuera de la franja</button>
        <ResumenMapa
          ubicacion={ubicacion}
          abierto={estaAbierto}
          onAlternar={setAbierto}
          altoMapaPx={altoMapaPx}
          altoHojaPx={altoHojaPx}
          reducida={reducida}
          simulacion={simulacion}
          onAbrirFlota={onAbrirFlota}
        />
      </div>
    );
  };
  return render(
    <ContextoDatosOperacion.Provider value={datos}>
      <Envoltura />
    </ContextoDatosOperacion.Provider>,
  );
}

const franja = () => screen.getByRole('region', { name: 'Resumen de la operación' });
const disclosure = () => screen.getByRole('button', { name: 'Ver más del resumen' });
const metricas = () => within(franja()).getAllByRole('term').map((t) => [t.textContent, t.nextElementSibling?.textContent]);

describe('ResumenMapa · la franja', () => {
  it('muestra las cuatro métricas, cada una con su etiqueta y su valor', () => {
    montar();
    expect(metricas()).toEqual([
      ['En plazo', '100,0 %'],
      ['En tránsito', '2'],
      ['En espera', '1'],
      ['En ruta', '2 de 4'],
    ]);
  });

  it('las etiquetas son caption y los valores title-sm tabulares, en tonos neutros (sin rojo)', () => {
    montar();
    within(franja()).getAllByRole('term').forEach((t) => {
      expect(t.className).toContain('text-caption');
      expect(t.nextElementSibling!.className).toContain('text-title-sm');
      expect(t.nextElementSibling!.className).toContain('tabular-nums');
    });
    expect(franja().innerHTML).not.toMatch(/critical|warn/);
  });

  it('sin entregas todavía, "En plazo" no inventa un porcentaje', () => {
    const base = datosRubrica();
    montar({ datos: { ...base, resumen: { ...base.resumen, entregados: 0, enPlazo: 0, fueraDePlazo: 0 } } });
    expect(metricas()[0]).toEqual(['En plazo', '—']);
  });

  it('"En plazo" lleva un decimal con coma, truncado: con entregas tardías nunca llega a 100', () => {
    const base = datosRubrica();
    const conEntregas = (enPlazo: number, fueraDePlazo: number) => ({ ...base, resumen: { ...base.resumen, entregados: enPlazo + fueraDePlazo, enPlazo, fueraDePlazo } });
    montar({ datos: conEntregas(2, 1) });
    expect(metricas()[0]).toEqual(['En plazo', '66,6 %']);
    cleanup();
    montar({ datos: conEntregas(9999, 1) });
    expect(metricas()[0]).toEqual(['En plazo', '99,9 %']);
    cleanup();
    montar({ datos: conEntregas(0, 3) });
    expect(metricas()[0]).toEqual(['En plazo', '0,0 %']);
  });

  it('con la ubicación de dos métricas muestra solo En plazo y En ruta', () => {
    montar({ ubicacion: { donde: 'pila', metricas: 2 } });
    expect(metricas()).toEqual([
      ['En plazo', '100,0 %'],
      ['En ruta', '2 de 4'],
    ]);
  });

  it('es una tarjeta de 44 px que no mueve el mapa (data-sin-zoom), centrada en su franja o a todo el ancho de la pila', () => {
    montar();
    expect(franja().hasAttribute('data-sin-zoom')).toBe(true);
    expect(franja().style.left).toBe('400px');
    expect(franja().style.width).toBe('480px');
    expect((franja().firstElementChild as HTMLElement).style.height).toBe('44px');
    cleanup();
    montar({ ubicacion: { donde: 'pila', metricas: 2 } });
    expect(franja().style.left).toBe('');
    expect(franja().className).toContain('relative');
  });
});

describe('ResumenMapa · el desplegable', () => {
  it('el botón "Ver más del resumen" mide 44 px, abre y cierra el desplegable y lo enlaza con aria-controls', () => {
    montar();
    expect(disclosure().className).toContain('size-11');
    expect(disclosure().getAttribute('aria-expanded')).toBe('false');
    expect(disclosure().getAttribute('aria-controls')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Más del resumen' })).toBeNull();

    fireEvent.click(disclosure());
    const desplegable = screen.getByRole('region', { name: 'Más del resumen' });
    expect(disclosure().getAttribute('aria-expanded')).toBe('true');
    expect(disclosure().getAttribute('aria-controls')).toBe(desplegable.id);

    fireEvent.click(disclosure());
    expect(screen.queryByRole('region', { name: 'Más del resumen' })).toBeNull();
    expect(disclosure().getAttribute('aria-expanded')).toBe('false');
  });

  it('suma entregados, el uso de la flota y la próxima llegada, que la franja no trae', () => {
    montar({ abierto: true });
    const desplegable = within(screen.getByRole('region', { name: 'Más del resumen' }));
    expect(desplegable.getByText('Pedidos entregados').parentElement!.parentElement!.textContent).toContain('25,0 % de 4 pedidos');
    expect(desplegable.getByText('1 en plazo · 0 fuera de plazo')).toBeTruthy();
    expect(desplegable.getByText('Unidades en ruta').parentElement!.parentElement!.textContent).toContain('2 de 4 (50 %)');
    expect(desplegable.getByText('Próxima llegada').parentElement!.textContent).toMatch(/\d+ min$/);
  });

  it('sin llegadas en tránsito lo dice en la fila de la próxima llegada', () => {
    const base = datosRubrica();
    montar({ abierto: true, datos: { ...base, resumen: { ...base.resumen, proximaEntregaMin: null } } });
    expect(screen.getByText('Próxima llegada').parentElement!.textContent).toContain('Sin llegadas en tránsito');
  });

  it('con la flota entera en ruta marca la ficha con el semáforo rojo', () => {
    const base = datosRubrica();
    montar({ abierto: true, datos: { ...base, flota: base.flota.map((u) => ({ ...u, estado: 'EN_RUTA' as const })) } });
    const ficha = screen.getByText('Unidades en ruta').parentElement!.parentElement!;
    expect(ficha.textContent).toContain('4 de 4 (100 %)');
    expect(within(ficha).getByRole('img', { name: 'Toda la flota en ruta' })).toBeTruthy();
  });

  it('el bloque Simulación aparece solo en una simulación, con escenario, inicio, flota y ritmo', () => {
    montar({ abierto: true });
    expect(screen.queryByRole('region', { name: 'Simulación' })).toBeNull();
    cleanup();
    montar({ abierto: true, simulacion: CONFIGURACION });
    const bloque = within(screen.getByRole('region', { name: 'Simulación' }));
    expect(bloque.getByText('Simulación 7 días')).toBeTruthy();
    expect(bloque.getByText('3 mar 2026 · 08:00')).toBeTruthy();
    expect(bloque.getByText('4 autos · 6 motos · 2 bicis')).toBeTruthy();
    expect(bloque.getByText('×120')).toBeTruthy();
  });

  it('la ficha de unidades en ruta abre Flota y cierra el desplegable, dejando el foco en el botón si no hay panel', async () => {
    const onAbrirFlota = vi.fn();
    montar({ abierto: true, onAbrirFlota });
    fireEvent.click(screen.getByText('Unidades en ruta').closest('button')!);
    expect(onAbrirFlota).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('region', { name: 'Más del resumen' })).toBeNull();
    await Promise.resolve();
    expect(document.activeElement).toBe(disclosure());
  });

  it('Escape lo cierra y el foco vuelve al botón, aunque estuviera dentro del desplegable', () => {
    montar({ abierto: true, onAbrirFlota: () => {} });
    const ficha = screen.getByText('Unidades en ruta').closest('button')!;
    ficha.focus();
    fireEvent.keyDown(ficha, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Más del resumen' })).toBeNull();
    expect(document.activeElement).toBe(disclosure());
  });

  it('un Escape con un diálogo modal encima no lo cierra', () => {
    montar({ abierto: true });
    const dialogo = document.body.appendChild(document.createElement('div'));
    dialogo.setAttribute('aria-modal', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('region', { name: 'Más del resumen' })).toBeTruthy();
    dialogo.remove();
  });

  it('tocar fuera lo cierra; tocar dentro de la franja o del desplegable, no', () => {
    montar({ abierto: true });
    fireEvent.pointerDown(screen.getByRole('region', { name: 'Más del resumen' }));
    fireEvent.pointerDown(screen.getByText('En plazo'));
    expect(screen.getByRole('region', { name: 'Más del resumen' })).toBeTruthy();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'fuera de la franja' }));
    expect(screen.queryByRole('region', { name: 'Más del resumen' })).toBeNull();
  });

  it('se detiene sobre la hoja inferior abierta y desplaza su contenido por dentro', () => {
    montar({ abierto: true, altoMapaPx: 800, altoHojaPx: 300 });
    const desplegable = screen.getByRole('region', { name: 'Más del resumen' });
    // 800 − 64 (franja y aire arriba) − 12 (aire abajo) − 300 (hoja).
    expect(desplegable.style.maxHeight).toBe('424px');
    expect(desplegable.className).toContain('overflow-y-auto');
  });
});
