// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatearDiaMesHora } from '../../lib/formato';
import { clienteApi } from '../../services/clienteApi';
import { INICIO_MS, pedidoApi } from '../../test/fabricas';
import { MIN, datosRubrica, mensajeRubrica, objetoMapa, prepararEntornoMapa } from '../../test/rubrica/escenario';
import { montarOperacion } from '../../test/rubrica/montaje';
import type { MensajeEstadoApi } from '../../types/api';

// Detalle de pedido y de unidad: cliente, vehículos de un pedido fraccionado, llegada estimada con fecha,
// trazabilidad en orden, qué hace la unidad y el pin del pedido que se está entregando.

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

const panel = () => within(screen.getByRole('complementary', { name: 'Incidencias, flota y bitácora' }));
const tocar = (elemento: Element) => {
  fireEvent.pointerDown(elemento, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
  fireEvent.pointerUp(elemento, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
};
const dato = (etiqueta: string) => panel().getByText(etiqueta).parentElement!.textContent ?? '';

/** Escenario de la rúbrica con A-01 cambiada (tramo en curso, paradas) y los pedidos indicados. */
function datosCon(cambios: { a01?: object; m01?: object; pedidos?: MensajeEstadoApi['pedidos'] }) {
  const base = mensajeRubrica();
  const unidades = base.unidades!.map((u) =>
    u.codigo === 'A-01' && cambios.a01 ? { ...u, ...cambios.a01 } : u.codigo === 'M-01' && cambios.m01 ? { ...u, ...cambios.m01 } : u,
  );
  return datosRubrica({ unidades, ...(cambios.pedidos ? { pedidos: cambios.pedidos } : {}) });
}

describe('Detalle de pedido', () => {
  it('muestra el cliente que trae el pedido', () => {
    const pedidos = mensajeRubrica().pedidos!.map((p) => (p.codigo === '#1001' ? pedidoApi({ ...p, cliente: 'c4910' }) : p));
    montarOperacion({ datos: datosCon({ pedidos }), pedidoAEnfocar: '#1001' });
    expect(dato('Cliente')).toContain('c4910');
  });

  it('muestra la llegada estimada con fecha y hora, sin la sigla ETA', () => {
    montarOperacion({ pedidoAEnfocar: '#1001' });
    expect(dato('Llegada estimada')).toContain(formatearDiaMesHora(new Date(INICIO_MS + 60 * MIN)));
    expect(panel().queryByText(/ETA/)).toBeNull();
  });

  it('un pedido fraccionado lista todas las unidades que lo llevan, con su parte', () => {
    const m01 = mensajeRubrica().unidades!.find((u) => u.codigo === 'M-01')!;
    const datos = datosCon({
      m01: { paradas: [...m01.paradas, { codigoPedido: '#1001', destino: { x: 27, y: 24 }, cantidad: 1, etaMs: INICIO_MS + 80 * MIN }] },
    });
    montarOperacion({ datos, pedidoAEnfocar: '#1001' });
    const lista = panel().getByRole('list', { name: 'Vehículos asignados' });
    const filas = within(lista).getAllByRole('button').map((b) => b.textContent);
    expect(filas).toHaveLength(2);
    expect(filas[0]).toMatch(/Auto A-01.*3 de \d+ paq\..*llega/);
    expect(filas[1]).toMatch(/Moto M-01.*1 de \d+ paq\..*llega/);
  });

  it('la trazabilidad se lee en orden cronológico, con fecha, y resalta el último hito', async () => {
    vi.mocked(clienteApi.detallePedido).mockResolvedValue({
      hitos: [
        { instanteMs: INICIO_MS + 5 * MIN, titulo: 'Despachado', detalle: '3 paquetes en A-01' },
        { instanteMs: INICIO_MS, titulo: 'Registrado', detalle: '3 paquetes a (27,24)' },
      ],
    } as never);
    montarOperacion({ pedidoAEnfocar: '#1001' });
    await waitFor(() => expect(panel().getByText('Despachado')).toBeTruthy());
    const hitos = panel().getByText('Trazabilidad').closest('section')!.querySelectorAll('li');
    expect(Array.from(hitos).map((li) => li.textContent)).toEqual([
      expect.stringContaining('Registrado'),
      expect.stringContaining('Despachado'),
    ]);
    expect(hitos[0].textContent).toContain(formatearDiaMesHora(new Date(INICIO_MS)));
    expect(hitos[1].querySelector('.bg-\\[\\#1E40AF\\]')).toBeTruthy();
  });
});

describe('Qué hace la unidad', () => {
  const encabezado = (codigo: string) => {
    tocar(objetoMapa(document.body, `vehiculo:${codigo}`)!);
    return panel().getByRole('heading', { name: new RegExp(codigo) }).parentElement!.textContent;
  };

  it('distingue ir a entregar, esperar la salida y regresar al almacén', () => {
    const a01 = mensajeRubrica().unidades!.find((u) => u.codigo === 'A-01')!;
    montarOperacion();
    expect(encabezado('A-01')).toContain('En ruta a entrega');
    expect(encabezado('M-01')).toContain('En espera'); // en ruta, sin tramo en curso
    cleanup();
    montarOperacion({ datos: datosCon({ a01: { tramoEnCurso: { ...a01.tramoEnCurso!, tipo: 'RETORNO', codigoPedido: null } } }) });
    expect(encabezado('A-01')).toContain('Regresando al almacén');
  });

  it('el tooltip de la unidad dice qué está haciendo', () => {
    const { container } = montarOperacion();
    fireEvent.pointerMove(objetoMapa(container, 'vehiculo:A-01')!, { clientX: 10, clientY: 10 });
    expect(screen.getByRole('tooltip').textContent).toContain('En ruta a entrega');
  });

  it('el detalle redondea el nodo de una unidad que va entre dos nodos', () => {
    const datos = datosCon({ a01: { tramoEnCurso: null, ubicacionActual: { x: 25.009999999999998, y: 38 } } });
    montarOperacion({ datos });
    tocar(objetoMapa(document.body, 'vehiculo:A-01')!);
    expect(panel().getByText('nodo (25,38)')).toBeTruthy();
  });
});

describe('Pedido en entrega', () => {
  const entregando = () => {
    const a01 = mensajeRubrica().unidades!.find((u) => u.codigo === 'A-01')!;
    const servicio = { ...a01.tramoEnCurso!, tipo: 'SERVICIO' as const, origen: { x: 27, y: 24 }, destino: { x: 27, y: 24 }, camino: [{ x: 27, y: 24 }] };
    return datosCon({ a01: { ubicacionActual: { x: 27, y: 24 }, tramoEnCurso: servicio, rutaRestante: [{ x: 27, y: 24 }] } });
  };

  it('el pin del pedido que se está entregando cambia de color y su tooltip lo indica', () => {
    const { container } = montarOperacion({ datos: entregando() });
    const pin = objetoMapa(container, 'pedido:#1001')!;
    expect(pin.querySelector('path')!.getAttribute('fill')).toBe('#7C3AED');
    // Los demás pines conservan el color de su holgura.
    expect(objetoMapa(container, 'pedido:#1002')!.querySelector('path')!.getAttribute('fill')).toBe('#B91C1C');
    fireEvent.pointerMove(pin, { clientX: 10, clientY: 10 });
    expect(screen.getByRole('tooltip').textContent).toContain('Entregando ahora · A-01');
  });

  it('si el pedido ya salió de las paradas (el servidor lo da por entregado al llegar), el pin se dibuja en la unidad', () => {
    const datos = entregando();
    datos.flota.find((u) => u.codigo === 'A-01')!.paradas = [];
    const { container } = montarOperacion({ datos });
    expect(objetoMapa(container, 'pedido:#1001')).toBeNull();
    const [pin, unidad] = Array.from(container.querySelectorAll('[data-objeto="vehiculo:A-01"]'));
    expect(pin.querySelector('path')!.getAttribute('fill')).toBe('#7C3AED');
    expect(pin.getAttribute('transform')).toBe(unidad.getAttribute('transform'));
    fireEvent.pointerMove(pin, { clientX: 10, clientY: 10 });
    expect(screen.getByRole('tooltip').textContent).toContain('Entregando #1001');
  });

  it('la unidad que entrega aparece como "Entregando pedido"', () => {
    montarOperacion({ datos: entregando() });
    tocar(objetoMapa(document.body, 'vehiculo:A-01')!);
    expect(panel().getByRole('heading', { name: /A-01/ }).parentElement!.textContent).toContain('Entregando pedido');
  });
});
