import { describe, expect, it } from 'vitest';
import { INICIO_MS, datosOperacion, mensajeEstado, pedidoApi, unidadApi } from '../test/fabricas';
import type { MensajeEventoApi } from '../types/api';
import { adaptarEvento, construirDatosOperacion } from './adaptadorOperacion';

const evento = (sobrescribir: Partial<MensajeEventoApi>): MensajeEventoApi => ({
  id: 'ev-1',
  ejecucionId: 'ej-1',
  tipo: 'NUEVO_PEDIDO',
  mensaje: 'mensaje del servidor',
  timestampSimuladoMs: INICIO_MS + 65_000,
  detalle: {},
  ...sobrescribir,
});

describe('adaptador de pedidos', () => {
  it('calcula holgura, plazo y estado desde la instantánea', () => {
    const datos = datosOperacion({
      pedidos: [
        pedidoApi({
          estado: 'EN_TRANSITO',
          etaMs: INICIO_MS + 3 * 3_600_000,
          horaLimiteMs: INICIO_MS + 4 * 3_600_000,
          unidad: 'A-01',
          nivelHolgura: 'AMBAR',
        }),
      ],
    });
    const pedido = datos.pedidos['#1001'];
    expect(pedido.estado).toBe('En tránsito');
    expect(pedido.plazoHoras).toBe(4);
    expect(pedido.holguraMinutos).toBe(60);
    expect(pedido.holgura).toBe('01:00');
    expect(pedido.nivel).toBe('AMBAR');
    expect(pedido.unidad).toBe('A-01');
    expect(pedido.eta).toBe('03/03 11:00');
  });

  it('sin ETA mide la holgura contra el reloj y muestra "—"', () => {
    const pedido = datosOperacion({ pedidos: [pedidoApi()] }).pedidos['#1001'];
    expect(pedido.eta).toBe('—');
    expect(pedido.unidad).toBe('—');
    expect(pedido.estado).toBe('En espera');
    expect(pedido.holguraMinutos).toBe(240);
  });

  it('una holgura vencida es negativa', () => {
    const datos = datosOperacion({ pedidos: [pedidoApi({ horaLimiteMs: INICIO_MS - 36 * 60_000 })] });
    expect(datos.pedidos['#1001'].holgura).toBe('-00:36');
  });
});

describe('adaptador de unidades', () => {
  it('un estado desconocido se muestra como disponible y EN_ENTREGA como en ruta', () => {
    const { flota } = datosOperacion({
      unidades: [unidadApi({ estado: 'ALGO_NUEVO' }), unidadApi({ id: 2, codigo: 'A-02', estado: 'EN_ENTREGA' })],
    });
    expect(flota.map((u) => u.estado)).toEqual(['DISPONIBLE', 'EN_RUTA']);
  });

  it('sin tramo en curso usa la ubicación y la ruta restante de la API', () => {
    const [unidad] = datosOperacion({
      unidades: [unidadApi({ ubicacionActual: { x: 3, y: 4 }, rutaRestante: [{ x: 3, y: 4 }, { x: 9, y: 4 }] })],
    }).flota;
    expect(unidad.posicion).toEqual({ x: 3, y: 4 });
    expect(unidad.ruta).toEqual([{ x: 3, y: 4 }, { x: 9, y: 4 }]);
  });

  it('interpola la posición sobre el camino del tramo con el reloj simulado', () => {
    const tramo = {
      tipo: 'VIAJE_A_ENTREGA' as const,
      origen: { x: 0, y: 0 },
      destino: { x: 10, y: 0 },
      tiempoSalidaSimulado: INICIO_MS,
      tiempoLlegadaEstimado: INICIO_MS + 600_000,
      codigoPedido: '#1001',
      camino: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
    };
    const unidad = unidadApi({
      estado: 'EN_RUTA',
      tramoEnCurso: tramo,
      rutaRestante: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }],
    });
    const [mitad] = datosOperacion({ unidades: [unidad] }, INICIO_MS + 300_000).flota;
    expect(mitad.posicion).toEqual({ x: 5, y: 0 });
    // Parte de la posición interpolada, termina el tramo y conserva los tramos posteriores.
    expect(mitad.ruta).toEqual([{ x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }]);
    const [llegada] = datosOperacion({ unidades: [unidad] }, INICIO_MS + 9_999_999).flota;
    expect(llegada.posicion).toEqual({ x: 10, y: 0 });
  });

  it('incluye la avería vigente con sus instantes como fechas', () => {
    const [unidad] = datosOperacion({
      unidades: [
        unidadApi({
          estado: 'AVERIADA',
          averia: { tipo: 2, desdeMs: INICIO_MS, reincorporacionMs: INICIO_MS + 7_200_000, trasladoCentralMs: INICIO_MS + 3_600_000 },
        }),
      ],
    }).flota;
    expect(unidad.estado).toBe('AVERIADA');
    expect(unidad.averia?.tipo).toBe(2);
    expect(unidad.averia?.vuelve.getTime()).toBe(INICIO_MS + 7_200_000);
    expect(unidad.averia?.trasladoCentral?.getTime()).toBe(INICIO_MS + 3_600_000);
  });

  it('la avería de tipo 1 no tiene traslado al almacén central', () => {
    const [unidad] = datosOperacion({
      unidades: [
        unidadApi({ estado: 'AVERIADA', averia: { tipo: 1, desdeMs: INICIO_MS, reincorporacionMs: INICIO_MS + 3_600_000, trasladoCentralMs: null } }),
      ],
    }).flota;
    expect(unidad.averia?.trasladoCentral).toBeNull();
  });

  it('una unidad no averiada no trae avería', () => {
    expect(datosOperacion({ unidades: [unidadApi()] }).flota[0].averia).toBeUndefined();
  });
});

describe('adaptador de la instantánea', () => {
  it('divide un bloqueo en tramos de calle con id por segmento', () => {
    const { bloqueos } = datosOperacion({
      bloqueos: [
        { id: 7, inicioMs: INICIO_MS, finMs: INICIO_MS + 3_600_000, puntos: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }] },
        { id: 8, inicioMs: INICIO_MS, finMs: INICIO_MS + 3_600_000, puntos: [{ x: 1, y: 1 }, { x: 2, y: 1 }] },
      ],
    });
    expect(bloqueos.map((b) => b.id)).toEqual(['BQ-7.1', 'BQ-7.2', 'BQ-8']);
    expect(bloqueos[0].fin).toBe('09:00');
  });

  it('calcula porcentaje de stock y deja null el almacén sin tope', () => {
    const { almacenes } = datosOperacion({
      almacenes: [
        { id: 1, codigo: 'CENTRAL', nombre: 'Central', ubicacion: { x: 12, y: 8 }, capacidadMaxima: null, stockActual: null, esPrincipal: true, nivelInventario: null },
        { id: 2, codigo: 'INTERMEDIO_1', nombre: 'Norte', ubicacion: { x: 42, y: 42 }, capacidadMaxima: 160, stockActual: 40, esPrincipal: false, nivelInventario: 'VERDE' },
      ],
    });
    expect(almacenes[0].porcentajeStock).toBeNull();
    expect(almacenes[1].porcentajeStock).toBe(25);
  });

  it('resume los pedidos desde los indicadores y la próxima entrega', () => {
    const base = mensajeEstado();
    const datos = construirDatosOperacion(
      {
        ...base,
        unidades: [unidadApi(), unidadApi({ id: 2, codigo: 'A-02' })],
        pedidos: [
          pedidoApi({ estado: 'EN_TRANSITO', etaMs: INICIO_MS + 20 * 60_000 }),
          pedidoApi({ id: 2, codigo: '#1002', estado: 'EN_TRANSITO', etaMs: INICIO_MS + 8 * 60_000 }),
          pedidoApi({ id: 3, codigo: '#1003', estado: 'EN_TRANSITO', etaMs: INICIO_MS - 60_000 }),
        ],
        indicadores: {
          ...base.indicadores,
          pedidosRegistrados: 10,
          pedidosEntregadosATiempo: 4,
          pedidosEntregadosConRetraso: 1,
          pedidosEnTransito: 3,
          pedidosPendientes: 2,
          unidadesEnRuta: 1,
        },
      },
      INICIO_MS,
      [],
    );
    expect(datos.resumen).toMatchObject({ total: 10, entregados: 5, enPlazo: 4, fueraDePlazo: 1, enRuta: 3, enEspera: 2, proximaEntregaMin: 8, saturacion: 0.5 });
  });

  it('sin pedidos en tránsito ni flota no hay próxima entrega ni saturación', () => {
    const { resumen } = datosOperacion();
    expect(resumen.proximaEntregaMin).toBeNull();
    expect(resumen.saturacion).toBe(0);
  });

  it('el tiempo real corre solo en curso; detenida usa el valor del servidor', () => {
    const enCurso = datosOperacion({ estado: 'EN_CURSO', relojRealInicioMs: Date.now() - 5_000 });
    expect(enCurso.transcurridoRealMs).toBeGreaterThanOrEqual(5_000);
    const pausada = datosOperacion({ estado: 'PAUSADA', relojRealInicioMs: Date.now() - 5_000, tiempoRealTranscurridoMs: 777 });
    expect(pausada.transcurridoRealMs).toBe(777);
  });
});

describe('adaptarEvento (bitácora)', () => {
  it('traduce el tipo a título, categoría y color', () => {
    expect(adaptarEvento(evento({ tipo: 'PLAN_ACTUALIZADO' }))).toMatchObject({ titulo: 'Replanificación', categoria: 'PLANIFICADOR', color: 'azul', hora: '08:01:05' });
  });

  it('un tipo desconocido no rompe y conserva el mensaje', () => {
    const e = adaptarEvento(evento({ tipo: 'TIPO_FUTURO' as MensajeEventoApi['tipo'] }));
    expect(e).toMatchObject({ titulo: 'Evento', categoria: 'OPERACION', detalle: 'mensaje del servidor' });
  });

  it('una entrega fuera de plazo se marca con retraso en rojo', () => {
    expect(adaptarEvento(evento({ tipo: 'PEDIDO_ENTREGADO', detalle: { aTiempo: false } }))).toMatchObject({ titulo: 'Entrega con retraso', color: 'rojo' });
    expect(adaptarEvento(evento({ tipo: 'PEDIDO_ENTREGADO', detalle: { aTiempo: true } }))).toMatchObject({ titulo: 'Entrega realizada', color: 'gris' });
  });

  describe('averías', () => {
    it('unidad averiada que conserva su carga y la recoge otra unidad', () => {
      const e = adaptarEvento(
        evento({ tipo: 'UNIDAD_AVERIADA', detalle: { unidad: 'M-03', tipo: 1, conservaCarga: true, unidadesReceptoras: ['A-01', 'A-02'] } }),
      );
      expect(e.detalle).toBe('M-03 · tipo 1 · conserva su carga; la recoge A-01, A-02');
      expect(e.color).toBe('rojo');
    });

    it('unidad averiada sin receptoras conserva su carga', () => {
      const e = adaptarEvento(evento({ tipo: 'UNIDAD_AVERIADA', detalle: { unidad: 'M-03', tipo: 1, conservaCarga: true, unidadesReceptoras: [] } }));
      expect(e.detalle).toBe('M-03 · tipo 1 · conserva su carga');
    });

    it('unidad averiada que libera pedidos los devuelve a planificación (singular y plural)', () => {
      const una = adaptarEvento(evento({ tipo: 'UNIDAD_AVERIADA', detalle: { unidad: 'A-01', tipo: 2, conservaCarga: false, pedidosLiberados: ['#1'] } }));
      const varias = adaptarEvento(evento({ tipo: 'UNIDAD_AVERIADA', detalle: { unidad: 'A-01', tipo: 2, conservaCarga: false, pedidosLiberados: ['#1', '#2'] } }));
      expect(una.detalle).toBe('A-01 · tipo 2 · 1 pedido vuelve a planificarse');
      expect(varias.detalle).toBe('A-01 · tipo 2 · 2 pedidos vuelven a planificarse');
    });

    it('unidad averiada sin pedidos', () => {
      const e = adaptarEvento(evento({ tipo: 'UNIDAD_AVERIADA', detalle: { unidad: 'A-01', tipo: 3, conservaCarga: false } }));
      expect(e.detalle).toBe('A-01 · tipo 3 · no llevaba pedidos');
    });

    it('trasbordo con ubicación y hora de recojo', () => {
      const e = adaptarEvento(
        evento({
          tipo: 'TRASBORDO',
          detalle: { unidadReceptora: 'A-02', unidadAveriada: 'M-03', pedidos: ['#1', '#2'], ubicacion: { x: 5, y: 7 }, recojoMs: INICIO_MS + 600_000 },
        }),
      );
      expect(e.detalle).toBe('A-02 recoge 2 pedidos de M-03 en (5,7) · 08:10');
    });

    it('trasbordo sin ubicación ni recojo', () => {
      const e = adaptarEvento(evento({ tipo: 'TRASBORDO', detalle: { unidadReceptora: 'A-02', unidadAveriada: 'M-03', pedidos: ['#1'] } }));
      expect(e.detalle).toBe('A-02 recoge 1 pedido de M-03');
    });

    it('unidad reincorporada', () => {
      expect(adaptarEvento(evento({ tipo: 'UNIDAD_REINCORPORADA', detalle: { unidad: 'M-03' } })).detalle).toBe('M-03 vuelve a operar tras su avería');
    });

    it('si el detalle no trae lo necesario usa el mensaje del servidor', () => {
      expect(adaptarEvento(evento({ tipo: 'UNIDAD_AVERIADA', detalle: {} })).detalle).toBe('mensaje del servidor');
      expect(adaptarEvento(evento({ tipo: 'TRASBORDO', detalle: {} })).detalle).toBe('mensaje del servidor');
    });
  });
});
