import { formatearDiaMes, formatearHolgura, formatearHora } from '../lib/formato';
import { puntoEnRecorrido } from '../lib/malla';
import type {
  BloqueoEnMapaApi,
  CoordenadaApi,
  MensajeEstadoApi,
  MensajeEventoApi,
  PedidoEnMapaApi,
  TipoEventoApi,
  UnidadEnMapaApi,
} from '../types/api';
import type { Coordenada } from '../types/domain';
import type {
  AlmacenOperacion,
  BloqueoOperacion,
  CategoriaEvento,
  DatosOperacion,
  EventoBitacora,
  Parada,
  PedidoOperacion,
  ResumenPedidos,
  UnidadOperacion,
} from '../types/operacion';

// Adapta el estado que difunde paqtracker-api a los modelos de vista que ya usan los componentes.
// La posición de las unidades se interpola en el cliente sobre el camino del tramo en curso a partir
// del reloj simulado interpolado, así se mueven de forma continua entre dos instantáneas.

const MS_POR_MINUTO = 60_000;
const MS_POR_HORA = 3_600_000;

const ESTADO_PEDIDO: Record<PedidoEnMapaApi['estado'], PedidoOperacion['estado']> = {
  REGISTRADO: 'Registrado',
  EN_TRANSITO: 'En tránsito',
  // Los entregados no se muestran como activos; el valor solo completa el registro.
  ENTREGADO: 'En tránsito',
};

const EVENTO: Record<TipoEventoApi, { titulo: string; categoria: CategoriaEvento; color: EventoBitacora['color'] }> = {
  NUEVO_PEDIDO: { titulo: 'Pedido registrado', categoria: 'ENTREGA', color: 'gris' },
  PLAN_ACTUALIZADO: { titulo: 'Replanificación', categoria: 'PLANIFICADOR', color: 'azul' },
  PEDIDO_ENTREGADO: { titulo: 'Entrega realizada', categoria: 'ENTREGA', color: 'gris' },
  BLOQUEO_INICIADO: { titulo: 'Bloqueo iniciado', categoria: 'INCIDENCIA', color: 'ambar' },
  BLOQUEO_LEVANTADO: { titulo: 'Bloqueo levantado', categoria: 'INCIDENCIA', color: 'gris' },
  ALERTA_COLAPSO: { titulo: 'Colapso logístico', categoria: 'INCIDENCIA', color: 'rojo' },
  EJECUCION_FINALIZADA: { titulo: 'Ejecución finalizada', categoria: 'OPERACION', color: 'gris' },
};

const dosDigitos = (n: number) => String(n).padStart(2, '0');
const horaConSegundos = (fecha: Date) => `${formatearHora(fecha)}:${dosDigitos(fecha.getSeconds())}`;
const coordenada = ({ x, y }: CoordenadaApi): Coordenada => ({ x, y });
/** "03/03 02:00": un plazo de hasta 36 h cruza de día, así que la hora sola no basta. */
const fechaYHora = (ms: number) => { const fecha = new Date(ms); return `${formatearDiaMes(fecha)} ${formatearHora(fecha)}`; };

function adaptarPedido(pedido: PedidoEnMapaApi, ahoraMs: number): PedidoOperacion {
  const referencia = pedido.etaMs ?? ahoraMs;
  const holguraMinutos = Math.round((pedido.horaLimiteMs - referencia) / MS_POR_MINUTO);
  return {
    codigo: pedido.codigo,
    cliente: '—',
    cantidad: pedido.cantidad,
    plazoHoras: Math.round((pedido.horaLimiteMs - pedido.registroMs) / MS_POR_HORA),
    registrado: fechaYHora(pedido.registroMs),
    horaLimite: fechaYHora(pedido.horaLimiteMs),
    eta: pedido.etaMs === null ? '—' : fechaYHora(pedido.etaMs),
    holgura: formatearHolgura(holguraMinutos),
    holguraMinutos,
    nivel: pedido.nivelHolgura,
    estado: ESTADO_PEDIDO[pedido.estado],
    destino: coordenada(pedido.destino),
    unidad: pedido.unidad ?? '—',
    trazabilidad: [],
  };
}

/**
 * Posición y ruta pendiente de una unidad en el instante simulado: se interpola sobre el camino del
 * tramo en curso y se le añade lo que la API indica que queda después de ese tramo.
 */
function moverUnidad(unidad: UnidadEnMapaApi, ahoraMs: number): { posicion: Coordenada; ruta: Coordenada[] } {
  const tramo = unidad.tramoEnCurso;
  if (!tramo || tramo.camino.length < 2) {
    return { posicion: coordenada(unidad.ubicacionActual), ruta: unidad.rutaRestante.map(coordenada) };
  }
  const duracion = tramo.tiempoLlegadaEstimado - tramo.tiempoSalidaSimulado;
  const fraccion = duracion <= 0 ? 1 : (ahoraMs - tramo.tiempoSalidaSimulado) / duracion;
  const { punto, tramo: segmento } = puntoEnRecorrido(tramo.camino, fraccion);
  // La ruta restante de la API empieza en la posición de la instantánea y pasa por el destino del
  // tramo en curso: lo que sigue a ese destino son los tramos posteriores.
  const finTramo = unidad.rutaRestante.findIndex((p, i) => i > 0 && p.x === tramo.destino.x && p.y === tramo.destino.y);
  const posteriores = finTramo < 0 ? [] : unidad.rutaRestante.slice(finTramo + 1);
  return { posicion: punto, ruta: [punto, ...tramo.camino.slice(segmento + 1), ...posteriores].map(coordenada) };
}

function adaptarUnidad(unidad: UnidadEnMapaApi, pedidos: Record<string, PedidoOperacion>, ahoraMs: number): UnidadOperacion {
  const { posicion, ruta } = moverUnidad(unidad, ahoraMs);
  const paradas: Parada[] = unidad.paradas.map((parada) => {
    const pedido = pedidos[parada.codigoPedido];
    return {
      pedido: parada.codigoPedido,
      destino: coordenada(parada.destino),
      eta: formatearHora(new Date(parada.etaMs)),
      holgura: formatearHolgura(pedido?.holguraMinutos ?? 0),
      nivel: pedido?.nivel ?? 'VERDE',
    };
  });
  return {
    codigo: unidad.codigo,
    tipo: unidad.tipo,
    estado: unidad.estado === 'EN_RUTA' ? 'EN_RUTA' : 'DISPONIBLE',
    posicion,
    origen: unidad.almacenOrigen,
    carga: unidad.cargaActual,
    ruta,
    paradas,
    paradaActual: paradas.length > 0 ? 1 : 0,
    totalParadas: paradas.length,
    distanciaRecorridaKm: 0,
    conductor: '—',
    alimentacion: { hora: unidad.estado === 'EN_REFRIGERIO' ? 'ahora' : '—', cumplida: unidad.estado !== 'EN_REFRIGERIO' },
  };
}

/** Cada segmento de la polilínea de un bloqueo se dibuja como un tramo de calle cortado. */
function adaptarBloqueo(bloqueo: BloqueoEnMapaApi): BloqueoOperacion[] {
  const fin = formatearHora(new Date(bloqueo.finMs));
  return bloqueo.puntos.slice(1).map((hasta, i) => ({
    id: `BQ-${bloqueo.id}${bloqueo.puntos.length > 2 ? `.${i + 1}` : ''}`,
    desde: coordenada(bloqueo.puntos[i]),
    hasta: coordenada(hasta),
    fin,
    rutasAfectadas: 0,
  }));
}

/** Evento de la API como entrada de la bitácora. */
export function adaptarEvento(evento: MensajeEventoApi): EventoBitacora {
  const formato = EVENTO[evento.tipo];
  const tarde = evento.tipo === 'PEDIDO_ENTREGADO' && evento.detalle.aTiempo === false;
  return {
    id: evento.id,
    instanteMs: evento.timestampSimuladoMs,
    hora: horaConSegundos(new Date(evento.timestampSimuladoMs)),
    titulo: tarde ? 'Entrega con retraso' : formato.titulo,
    detalle: evento.mensaje,
    categoria: formato.categoria,
    color: tarde ? 'rojo' : formato.color,
  };
}

function resumir(mensaje: MensajeEstadoApi, pedidos: PedidoEnMapaApi[], ahoraMs: number): ResumenPedidos {
  const i = mensaje.indicadores;
  const proximas = pedidos
    .filter((p) => p.estado === 'EN_TRANSITO' && p.etaMs !== null)
    .map((p) => ((p.etaMs as number) - ahoraMs) / MS_POR_MINUTO)
    .filter((minutos) => minutos >= 0);
  return {
    total: i.pedidosRegistrados,
    entregados: i.pedidosEntregadosATiempo + i.pedidosEntregadosConRetraso,
    enPlazo: i.pedidosEntregadosATiempo,
    fueraDePlazo: i.pedidosEntregadosConRetraso,
    enRuta: i.pedidosEnTransito,
    enEspera: i.pedidosPendientes,
    sinRuta: i.pedidosPendientes,
    proximaEntregaMin: proximas.length === 0 ? 0 : Math.round(Math.min(...proximas)),
    saturacion: mensaje.unidades.length === 0 ? 0 : i.unidadesEnRuta / mensaje.unidades.length,
  };
}

/**
 * @param mensaje   última instantánea de la ejecución
 * @param ahoraMs   reloj simulado interpolado en el cliente
 * @param eventos   eventos recibidos, el más reciente primero
 */
export function construirDatosOperacion(mensaje: MensajeEstadoApi, ahoraMs: number, eventos: MensajeEventoApi[]): DatosOperacion {
  const pedidos: Record<string, PedidoOperacion> = {};
  mensaje.pedidos.forEach((p) => {
    pedidos[p.codigo] = adaptarPedido(p, ahoraMs);
  });
  const almacenes: AlmacenOperacion[] = mensaje.almacenes.map((a) => ({
    id: a.codigo,
    stock: a.stockActual,
    capacidad: a.capacidadMaxima,
    porcentajeStock: a.stockActual === null || !a.capacidadMaxima ? null : Math.round((a.stockActual / a.capacidadMaxima) * 100),
    nivel: a.nivelInventario,
  }));
  return {
    ejecucionId: mensaje.ejecucionId,
    tipoEscenario: mensaje.tipoEscenario,
    estadoEjecucion: mensaje.estado,
    reloj: new Date(ahoraMs),
    relojInicio: new Date(mensaje.relojSimuladoInicioMs),
    transcurridoSimuladoMs: ahoraMs - mensaje.relojSimuladoInicioMs,
    relojRealInicio: mensaje.relojRealInicioMs === null ? null : new Date(mensaje.relojRealInicioMs),
    // En curso avanza con el reloj del navegador; detenida, queda el valor que informó el servidor.
    transcurridoRealMs:
      mensaje.estado === 'EN_CURSO' && mensaje.relojRealInicioMs !== null
        ? Math.max(0, Date.now() - mensaje.relojRealInicioMs)
        : mensaje.tiempoRealTranscurridoMs,
    factorAceleracion: mensaje.factorAceleracion,
    flota: mensaje.unidades.map((u) => adaptarUnidad(u, pedidos, ahoraMs)),
    pedidos,
    bloqueos: mensaje.bloqueos.flatMap(adaptarBloqueo),
    eventos: eventos.map(adaptarEvento),
    resumen: resumir(mensaje, mensaje.pedidos, ahoraMs),
    almacenes,
    indicadores: mensaje.indicadores,
  };
}
