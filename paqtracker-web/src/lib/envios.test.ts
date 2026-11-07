import { describe, expect, it } from 'vitest';
import type { Fraccion, PedidoOperacion } from '../types/operacion';
import {
  accionAlElegirEnMapa,
  destinoResaltado,
  entregadasDesde,
  listarPedidos,
  pedidoDeFraccion,
  pedidosConocidos,
  porSalirDesde,
  unidadesResaltadas,
  VENTANA_PANEL_MS,
} from './envios';

const AHORA = new Date(2026, 2, 3, 12, 0, 0);
const en = (ms: number) => new Date(AHORA.getTime() + ms);

const fraccion = (sobrescribir: Partial<Fraccion>): Fraccion => ({
  codigo: 'P-1·1',
  pedido: 'P-1',
  indice: 1,
  unidad: 'A-01',
  origen: 'CENTRAL',
  cantidad: 2,
  salida: AHORA,
  llegada: en(60 * 60_000),
  estado: 'EN_CAMINO',
  ...sobrescribir,
});

const pedido = (codigo: string, fracciones: Fraccion[], extra: Partial<PedidoOperacion> = {}): PedidoOperacion => ({
  codigo,
  cliente: '—',
  cantidad: 2,
  plazoHoras: 36,
  registrado: '',
  horaLimite: '',
  eta: '',
  holgura: '',
  holguraMinutos: 0,
  nivel: 'VERDE',
  estado: 'En tránsito',
  destino: { x: 1, y: 1 },
  unidad: 'A-01',
  trazabilidad: [],
  horaLimiteFecha: en(10 * 3_600_000),
  entrega: null,
  fracciones,
  ...extra,
});

describe('ventanas de 4 h del almacén', () => {
  it('por salir: incluye la salida justo a las 4 h y excluye la de ahora y la de después', () => {
    const datos = {
      pedidos: {
        'P-1': pedido('P-1', [
          fraccion({ codigo: 'P-1·1', estado: 'PROGRAMADA', salida: en(VENTANA_PANEL_MS) }),
          fraccion({ codigo: 'P-1·2', estado: 'PROGRAMADA', salida: en(VENTANA_PANEL_MS + 1) }),
          fraccion({ codigo: 'P-1·3', estado: 'PROGRAMADA', salida: AHORA }),
          fraccion({ codigo: 'P-1·4', estado: 'PROGRAMADA', salida: en(60_000), origen: 'INTERMEDIO_1' }),
        ]),
      },
      entregadosRecientes: [],
    };
    expect(porSalirDesde(datos, 'CENTRAL', AHORA).map((f) => f.codigo)).toEqual(['P-1·1']);
  });

  it('entregados: incluye la entrega justo hace 4 h y ordena las más recientes primero', () => {
    const entregado = (codigo: string, hace: number) =>
      pedido(codigo, [fraccion({ codigo: `${codigo}·1`, pedido: codigo, estado: 'ENTREGADA', llegada: en(-hace) })], {
        estado: 'Entregado',
        entrega: en(-hace),
      });
    const datos = {
      pedidos: {},
      entregadosRecientes: [entregado('P-7', VENTANA_PANEL_MS), entregado('P-8', 60_000), entregado('P-9', VENTANA_PANEL_MS + 1)],
    };
    expect(entregadasDesde(datos, 'CENTRAL', AHORA).map((f) => f.pedido)).toEqual(['P-8', 'P-7']);
  });

  it('un pedido activo y en entregados recientes a la vez se cuenta una sola vez', () => {
    const p = pedido('P-1', [fraccion({})]);
    expect(pedidosConocidos({ pedidos: { 'P-1': p }, entregadosRecientes: [p] })).toHaveLength(1);
  });
});

describe('lista de pedidos', () => {
  it('ordena por salida y deja al final los que aún no salen; los empates, por código', () => {
    const lista = [
      pedido('P-3', [], { estado: 'En espera' }),
      pedido('P-2', [fraccion({ salida: en(60_000) })]),
      pedido('P-1', [fraccion({ salida: en(60_000) })]),
    ];
    expect(listarPedidos(lista, 'TODOS', '', 'SALIDA', AHORA).map((p) => p.codigo)).toEqual(['P-1', 'P-2', 'P-3']);
  });

  it('busca también por unidad y no cuenta las fracciones liberadas en la salida', () => {
    const p = pedido('P-1', [fraccion({ unidad: 'M-07' }), fraccion({ unidad: 'B-02', estado: 'LIBERADA', salida: en(-99_000) })]);
    expect(listarPedidos([p], 'TODOS', 'm-07', 'HORA_LIMITE', AHORA)).toHaveLength(1);
    expect(listarPedidos([p], 'TODOS', 'X-99', 'HORA_LIMITE', AHORA)).toHaveLength(0);
  });
});

describe('selección compartida', () => {
  it('con la lista de su tipo abierta, tocar en el mapa resalta; en cualquier otro caso, abre el detalle', () => {
    const unidad = { tipo: 'vehiculo', codigo: 'A-01' } as const;
    expect(accionAlElegirEnMapa(unidad, { detalleAbierto: false, pestana: 'flota' })).toBe('resaltar');
    expect(accionAlElegirEnMapa(unidad, { detalleAbierto: false, pestana: null })).toBe('abrir');
    expect(accionAlElegirEnMapa(unidad, { detalleAbierto: true, pestana: 'flota' })).toBe('abrir');
    expect(accionAlElegirEnMapa(unidad, { detalleAbierto: false, pestana: 'almacenes' })).toBe('abrir');
    expect(accionAlElegirEnMapa({ tipo: 'almacen', codigo: 'CENTRAL' }, { detalleAbierto: false, pestana: 'almacenes' })).toBe('resaltar');
  });

  it('el pedido resalta todas sus unidades (F03); la fracción, solo la suya (F02)', () => {
    const destinos = [
      { pedido: 'P-1', unidad: 'A-01' },
      { pedido: 'P-1', unidad: 'M-01' },
    ];
    expect([...unidadesResaltadas({ tipo: 'pedido', codigo: 'P-1' }, destinos)]).toEqual(['A-01', 'M-01']);
    const fraccionM01 = { tipo: 'fraccion', codigo: 'P-1·2', pedido: 'P-1', unidad: 'M-01' } as const;
    expect([...unidadesResaltadas(fraccionM01, destinos)]).toEqual(['M-01']);
    expect(destinoResaltado(fraccionM01, destinos[0])).toBe(false);
    expect(destinoResaltado(fraccionM01, destinos[1])).toBe(true);
    expect(pedidoDeFraccion('P-00042·2')).toBe('P-00042');
  });
});
