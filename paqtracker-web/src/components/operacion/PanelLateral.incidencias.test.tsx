// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextoAverias } from '../../hooks/useAverias';
import { ContextoAvisos } from '../../hooks/useAvisos';
import { ContextoDatosOperacion } from '../../hooks/useDatosOperacion';
import { datosOperacion, INICIO_MS, pedidoApi } from '../../test/fabricas';
import type { AlmacenEnMapaApi, MensajeEstadoApi, PedidoEnMapaApi } from '../../types/api';
import type { SeccionIncidencias } from '../../types/operacion';
import { PanelLateral } from './PanelLateral';

// Pestaña Incidencias del panel: lo urgente primero (llegarán tarde, en riesgo), lo ajustado plegado, y luego
// averías, bloqueos y almacenes con stock bajo. Sin nada que atender, un estado vacío positivo.

const MIN = 60_000;
const LIMITE = INICIO_MS + 4 * 3_600_000;

/** Pedido con holgura exacta: la hora de llegada estimada es el límite menos la holgura (negativa: llega tarde). */
const pedido = (codigo: string, nivelHolgura: PedidoEnMapaApi['nivelHolgura'], holguraMin: number): PedidoEnMapaApi =>
  pedidoApi({ id: Number(codigo.slice(1)), codigo, estado: 'EN_TRANSITO', nivelHolgura, horaLimiteMs: LIMITE, etaMs: LIMITE - holguraMin * MIN, unidad: 'A-01' });

const almacen = (codigo: AlmacenEnMapaApi['codigo'], nombre: string, stockActual: number, nivelInventario: AlmacenEnMapaApi['nivelInventario']): AlmacenEnMapaApi => ({
  id: 2,
  codigo,
  nombre,
  ubicacion: { x: 12, y: 38 },
  capacidadMaxima: 100,
  stockActual,
  esPrincipal: false,
  nivelInventario,
});

function montar(mensaje: Partial<MensajeEstadoApi> = {}, seccionIncidencias: { seccion: SeccionIncidencias; vez: number } | null = null) {
  const onSeleccionar = vi.fn();
  render(
    <ContextoDatosOperacion.Provider value={datosOperacion(mensaje)}>
      <ContextoAverias.Provider value={{ pendientes: {}, registrar: vi.fn(), cancelar: vi.fn() }}>
        <ContextoAvisos.Provider value={vi.fn()}>
          <PanelLateral
            seleccion={{ tipo: 'incidencias' }}
            onSeleccionar={onSeleccionar}
            onCerrar={vi.fn()}
            onCentrar={vi.fn()}
            seccionIncidencias={seccionIncidencias}
          />
        </ContextoAvisos.Provider>
      </ContextoAverias.Provider>
    </ContextoDatosOperacion.Provider>,
  );
  return { onSeleccionar };
}

const region = (nombre: string) => within(screen.getByRole('region', { name: nombre }));
const regionAusente = (nombre: string) => screen.queryByRole('region', { name: nombre });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const MENSAJE_MIXTO: Partial<MensajeEstadoApi> = {
  pedidos: [
    pedido('#1001', 'ROJO', 30),
    pedido('#1002', 'ROJO', -10),
    pedido('#1003', 'ROJO', -67),
    pedido('#1004', 'AMBAR', 90),
    pedido('#1005', 'AMBAR', 120),
    pedido('#1006', 'VERDE', 600),
  ],
};

describe('Incidencias · pedidos', () => {
  it('separa los que llegarán tarde (el más atrasado primero) de los críticos que aún tienen holgura', () => {
    montar(MENSAJE_MIXTO);
    const tarde = region('Llegarán tarde');
    const filas = tarde.getAllByRole('button').map((b) => b.textContent);
    expect(filas).toHaveLength(2);
    expect(filas[0]).toContain('#1003');
    expect(filas[0]).toContain('1 h 07 min tarde');
    expect(filas[1]).toContain('#1002');
    expect(tarde.getByText('2').className).toContain('rounded-full');

    const riesgo = region('En riesgo');
    expect(riesgo.getAllByRole('button')).toHaveLength(1);
    expect(riesgo.getByRole('button').textContent).toContain('#1001');
    expect(riesgo.queryByText(/#1003/)).toBeNull();
  });

  it('elegir un pedido que llegará tarde abre su detalle', () => {
    const { onSeleccionar } = montar(MENSAJE_MIXTO);
    fireEvent.click(region('Llegarán tarde').getAllByRole('button')[0]);
    expect(onSeleccionar).toHaveBeenCalledWith({ tipo: 'pedido', codigo: '#1003' });
  });

  it('los ajustados quedan plegados tras "Ver N ajustados" y se despliegan con el botón', () => {
    montar(MENSAJE_MIXTO);
    const boton = screen.getByRole('button', { name: 'Ver 2 ajustados' });
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText(/#1004/)).toBeNull();
    expect(screen.queryByText(/#1005/)).toBeNull();

    fireEvent.click(boton);
    const abierto = screen.getByRole('button', { name: 'Ocultar los ajustados' });
    expect(abierto.getAttribute('aria-expanded')).toBe('true');
    expect(region('Ajustados').getByText(/#1004/)).toBeTruthy();
    expect(region('Ajustados').getByText(/#1005/)).toBeTruthy();

    fireEvent.click(abierto);
    expect(screen.queryByText(/#1004/)).toBeNull();
  });

  it('los ajustados desplegados también se limitan: 8 filas y "Ver los N restantes"', () => {
    const ajustados = Array.from({ length: 12 }, (_, i) => pedido(`#${2000 + i}`, 'AMBAR', 60 + i));
    montar({ pedidos: ajustados });
    fireEvent.click(screen.getByRole('button', { name: 'Ver 12 ajustados' }));

    const seccion = region('Ajustados');
    expect(seccion.getByText(/#2007/)).toBeTruthy();
    expect(seccion.queryByText(/#2008/)).toBeNull();
    const mas = seccion.getByRole('button', { name: 'Ver los 4 restantes' });
    expect(mas.className).toContain('max-md:min-h-11');

    fireEvent.click(mas);
    expect(seccion.getByText(/#2011/)).toBeTruthy();
    expect(seccion.getByRole('button', { name: 'Ver menos' })).toBeTruthy();
  });

  it('un pedido en verde no aparece en ninguna sección de riesgo', () => {
    montar(MENSAJE_MIXTO);
    expect(screen.queryByText(/#1006/)).toBeNull();
  });
});

describe('Incidencias · almacenes con stock bajo', () => {
  const mensaje: Partial<MensajeEstadoApi> = {
    almacenes: [almacen('INTERMEDIO_1', 'Intermedio 1', 40, 'AMBAR'), almacen('INTERMEDIO_2', 'Intermedio 2', 10, 'ROJO')],
  };

  it('lista solo los almacenes con stock bajo, con su porcentaje, y abre su detalle al elegirlo', () => {
    const { onSeleccionar } = montar(mensaje);
    const seccion = region('Almacenes con stock bajo');
    expect(seccion.getAllByRole('button')).toHaveLength(1);
    const fila = seccion.getByRole('button');
    expect(fila.textContent).toContain('Intermedio 2');
    expect(fila.textContent).toContain('10 %');
    expect(screen.queryByText(/Intermedio 1/)).toBeNull();

    fireEvent.click(fila);
    expect(onSeleccionar).toHaveBeenCalledWith({ tipo: 'almacen', codigo: 'INTERMEDIO_2' });
  });
});

describe('Incidencias · estado vacío', () => {
  it('sin nada que atender dice que todo va en plazo y no muestra secciones de riesgo', () => {
    montar({ pedidos: [pedido('#1006', 'VERDE', 600)] });
    expect(screen.getByText('Sin incidencias: todo va en plazo.')).toBeTruthy();
    for (const nombre of ['Llegarán tarde', 'En riesgo', 'Ajustados', 'Almacenes con stock bajo']) expect(regionAusente(nombre)).toBeNull();
    // Registrar una avería sigue al alcance aunque no haya ninguna.
    expect(region('Averías activas').getByText('Ninguna unidad averiada.')).toBeTruthy();
  });

  it('con una incidencia ya no se muestra', () => {
    montar({ pedidos: [pedido('#1001', 'ROJO', 30)] });
    expect(screen.queryByText('Sin incidencias: todo va en plazo.')).toBeNull();
  });
});

describe('Incidencias · alertas del mapa', () => {
  it('la alerta de riesgo lleva a la primera sección de pedidos que exista', () => {
    const desplazar = vi.fn();
    HTMLElement.prototype.scrollIntoView = desplazar;
    montar(MENSAJE_MIXTO, { seccion: 'riesgo', vez: 1 });
    expect(desplazar).toHaveBeenCalledTimes(1);
    expect(desplazar.mock.contexts[0]).toBe(screen.getByRole('region', { name: 'Llegarán tarde' }));
  });

  it('sin atrasados, la alerta de riesgo lleva a "En riesgo"', () => {
    const desplazar = vi.fn();
    HTMLElement.prototype.scrollIntoView = desplazar;
    montar({ pedidos: [pedido('#1001', 'ROJO', 30)] }, { seccion: 'riesgo', vez: 1 });
    expect(desplazar.mock.contexts[0]).toBe(screen.getByRole('region', { name: 'En riesgo' }));
  });
});
