import { ALMACENES, CORTE_OCUPACION, UNIDADES, type IdAlmacen, type PlazoHoras, type TipoUnidad } from '../config/dominio';
import { distanciaManhattan } from '../lib/factibilidad';
import { capitalizar } from '../lib/formato';
import type { Coordenada } from '../types/domain';
import type {
  BloqueoOperacion,
  CategoriaEvento,
  EventoBitacora,
  HitoTrazabilidad,
  PedidoOperacion,
  ResumenPedidos,
  UnidadOperacion,
} from '../types/operacion';
import type { NivelHolgura } from '../types/pedidos';

// Estado de operación de ejemplo mientras paqtracker-api no publica el estado en vivo por STOMP.
// Es un único conjunto coherente: los KPIs, la flota, las incidencias y el lienzo se derivan de él.
// Reloj de referencia: 25/08/2026 · 11:15:40 (turno 07:00–15:00).

const ubicacion = (id: IdAlmacen) => ALMACENES.find((a) => a.id === id)!.ubicacion;

type UnidadEnRuta = Omit<UnidadOperacion, 'estado' | 'totalParadas' | 'paradaActual'> & { paradaActual?: number; totalParadas?: number };

const EN_RUTA: UnidadEnRuta[] = [
  {
    // Ruta ya replanificada: rodea por x = 36 el bloqueo BQ-1 de la calle x = 34.
    codigo: 'A-04', tipo: 'AUTO', origen: 'CENTRAL', carga: 18, posicion: { x: 36, y: 15 },
    ruta: [ubicacion('CENTRAL'), { x: 36, y: 14 }, { x: 36, y: 22 }, { x: 42, y: 22 }, { x: 48, y: 22 }, { x: 48, y: 30 }],
    paradas: [
      { pedido: '#1088', destino: { x: 42, y: 22 }, eta: '14:37', holgura: '00:22', nivel: 'ROJO' },
      { pedido: '#1102', destino: { x: 48, y: 30 }, eta: '14:58', holgura: '01:47', nivel: 'AMBAR' },
    ],
    paradaActual: 5, totalParadas: 7, distanciaRecorridaKm: 214, conductor: 'J. Ramírez', alimentacion: { hora: '13:10', cumplida: false },
  },
  {
    codigo: 'M-07', tipo: 'MOTO', origen: 'CENTRAL', carga: 6, posicion: { x: 23, y: 9 },
    ruta: [ubicacion('CENTRAL'), { x: 27, y: 9 }, { x: 19, y: 9 }, { x: 19, y: 4 }],
    paradas: [{ pedido: '#1107', destino: { x: 19, y: 4 }, eta: '12:44', holgura: '00:18', nivel: 'ROJO' }],
    distanciaRecorridaKm: 96, conductor: 'L. Quispe', alimentacion: { hora: '12:30', cumplida: false },
  },
  {
    codigo: 'A-09', tipo: 'AUTO', origen: 'INTERMEDIO_2', carga: 20, posicion: { x: 62, y: 20 },
    ruta: [ubicacion('INTERMEDIO_2'), { x: 62, y: 27 }, { x: 62, y: 12 }],
    paradas: [{ pedido: '#1150', destino: { x: 62, y: 12 }, eta: '11:48', holgura: '02:42', nivel: 'VERDE' }],
    distanciaRecorridaKm: 158, conductor: 'R. Salas', alimentacion: { hora: '10:40', cumplida: true },
  },
  {
    codigo: 'A-05', tipo: 'AUTO', origen: 'INTERMEDIO_1', carga: 9, posicion: { x: 24, y: 38 },
    ruta: [ubicacion('INTERMEDIO_1'), { x: 28, y: 38 }, { x: 28, y: 33 }, { x: 36, y: 33 }],
    paradas: [{ pedido: '#1094', destino: { x: 36, y: 33 }, eta: '12:21', holgura: '00:39', nivel: 'AMBAR' }],
    distanciaRecorridaKm: 121, conductor: 'C. Vega', alimentacion: { hora: '12:00', cumplida: false },
  },
  {
    codigo: 'M-11', tipo: 'MOTO', origen: 'CENTRAL', carga: 5, posicion: { x: 40, y: 14 },
    ruta: [ubicacion('CENTRAL'), { x: 45, y: 14 }, { x: 45, y: 6 }],
    paradas: [{ pedido: '#1147', destino: { x: 45, y: 6 }, eta: '11:52', holgura: '01:20', nivel: 'VERDE' }],
    distanciaRecorridaKm: 88, conductor: 'P. Huamán', alimentacion: { hora: '11:30', cumplida: false },
  },
  {
    codigo: 'M-02', tipo: 'MOTO', origen: 'INTERMEDIO_2', carga: 8, posicion: { x: 66, y: 31 },
    ruta: [ubicacion('INTERMEDIO_2'), { x: 66, y: 27 }, { x: 66, y: 40 }],
    paradas: [{ pedido: '#1162', destino: { x: 66, y: 40 }, eta: '12:05', holgura: '03:05', nivel: 'VERDE' }],
    distanciaRecorridaKm: 73, conductor: 'D. Rojas', alimentacion: { hora: '11:00', cumplida: true },
  },
  {
    codigo: 'B-11', tipo: 'BICICLETA', origen: 'INTERMEDIO_1', carga: 2, posicion: { x: 12, y: 42 },
    ruta: [ubicacion('INTERMEDIO_1'), { x: 12, y: 44 }, { x: 18, y: 44 }],
    paradas: [{ pedido: '#1131', destino: { x: 18, y: 44 }, eta: '12:12', holgura: '00:53', nivel: 'AMBAR' }],
    distanciaRecorridaKm: 31, conductor: 'S. Flores', alimentacion: { hora: '12:15', cumplida: false },
  },
  {
    codigo: 'B-03', tipo: 'BICICLETA', origen: 'INTERMEDIO_2', carga: 4, posicion: { x: 57, y: 32 },
    ruta: [ubicacion('INTERMEDIO_2'), { x: 57, y: 35 }, { x: 52, y: 35 }],
    paradas: [{ pedido: '#1158', destino: { x: 52, y: 35 }, eta: '11:52', holgura: '00:12', nivel: 'ROJO' }],
    distanciaRecorridaKm: 27, conductor: 'M. Torres', alimentacion: { hora: '11:45', cumplida: false },
  },
];

const AVERIADAS: Record<string, { posicion: Coordenada; origen: IdAlmacen; carga: number; tipoFalla: 1 | 2 | 3; fuera: string; conductor: string }> = {
  'M-14': { posicion: { x: 30, y: 25 }, origen: 'CENTRAL', carga: 3, tipoFalla: 2, fuera: '01:05', conductor: 'A. Ccori' },
  'A-03': { posicion: { x: 45, y: 30 }, origen: 'INTERMEDIO_2', carga: 0, tipoFalla: 1, fuera: '00:18', conductor: 'E. Paredes' },
};

/** Minutos sin asignación de las unidades disponibles que llevan más tiempo ociosas. */
const OCIOSAS: Record<string, number> = { 'A-07': 42, 'A-10': 38, 'B-02': 35, 'B-12': 33, 'M-09': 31 };

const ORIGENES: IdAlmacen[] = ['CENTRAL', 'INTERMEDIO_1', 'INTERMEDIO_2'];

function construirFlota(): UnidadOperacion[] {
  const flota: UnidadOperacion[] = [];
  (Object.keys(UNIDADES) as TipoUnidad[]).forEach((tipo) => {
    for (let n = 1; n <= UNIDADES[tipo].cantidad; n++) {
      const codigo = `${UNIDADES[tipo].prefijoCodigo}-${String(n).padStart(2, '0')}`;
      const enRuta = EN_RUTA.find((u) => u.codigo === codigo);
      const averiada = AVERIADAS[codigo];
      if (enRuta) {
        flota.push({ ...enRuta, estado: 'EN_RUTA', paradaActual: enRuta.paradaActual ?? 1, totalParadas: enRuta.totalParadas ?? enRuta.paradas.length });
      } else if (averiada) {
        flota.push({
          codigo, tipo, estado: 'AVERIADA', posicion: averiada.posicion, origen: averiada.origen, carga: averiada.carga,
          ruta: [], paradas: [], paradaActual: 0, totalParadas: 0, distanciaRecorridaKm: 64, conductor: averiada.conductor,
          alimentacion: { hora: '12:00', cumplida: false }, averia: { tipo: averiada.tipoFalla, fueraDeServicio: averiada.fuera },
        });
      } else {
        const origen = ORIGENES[n % ORIGENES.length];
        flota.push({
          codigo, tipo, estado: 'DISPONIBLE', posicion: ubicacion(origen), origen, carga: 0, ruta: [], paradas: [],
          paradaActual: 0, totalParadas: 0, distanciaRecorridaKm: 40 + n * 7, conductor: '—',
          alimentacion: { hora: '12:00', cumplida: false }, minutosOciosa: OCIOSAS[codigo],
        });
      }
    }
  });
  return flota;
}

export const FLOTA: UnidadOperacion[] = construirFlota();

export const unidadPorCodigo = (codigo: string) => FLOTA.find((u) => u.codigo === codigo);

// --- Pedidos a bordo -------------------------------------------------------------------------

interface DatosPedido {
  cliente: string;
  cantidad: number;
  plazoHoras: PlazoHoras;
  registrado: string;
  horaLimite: string;
  reasignacion?: string;
}

const DATOS_PEDIDO: Record<string, DatosPedido> = {
  '#1088': { cliente: 'C-0318', cantidad: 14, plazoHoras: 4, registrado: '10:59', horaLimite: '14:59', reasignacion: '+6 u. desde #1042 · salva el plazo de 4 h' },
  '#1102': { cliente: 'C-0402', cantidad: 4, plazoHoras: 8, registrado: '08:45', horaLimite: '16:45' },
  '#1107': { cliente: 'C-0277', cantidad: 6, plazoHoras: 4, registrado: '09:02', horaLimite: '13:02' },
  '#1150': { cliente: 'C-0119', cantidad: 20, plazoHoras: 12, registrado: '02:30', horaLimite: '14:30' },
  '#1094': { cliente: 'C-0350', cantidad: 9, plazoHoras: 8, registrado: '05:00', horaLimite: '13:00' },
  '#1147': { cliente: 'C-0088', cantidad: 5, plazoHoras: 4, registrado: '09:12', horaLimite: '13:12' },
  '#1162': { cliente: 'C-0211', cantidad: 8, plazoHoras: 8, registrado: '07:10', horaLimite: '15:10' },
  '#1131': { cliente: 'C-0164', cantidad: 2, plazoHoras: 4, registrado: '09:05', horaLimite: '13:05' },
  '#1158': { cliente: 'C-0390', cantidad: 4, plazoHoras: 4, registrado: '08:04', horaLimite: '12:04' },
};

const aMinutos = (hhmm: string) => {
  const negativo = hhmm.startsWith('-');
  const [h, m] = hhmm.replace('-', '').split(':').map(Number);
  return (negativo ? -1 : 1) * (h * 60 + m);
};

function construirPedidos(): Record<string, PedidoOperacion> {
  const pedidos: Record<string, PedidoOperacion> = {};
  FLOTA.filter((u) => u.estado === 'EN_RUTA').forEach((unidad) => {
    unidad.paradas.forEach((parada, i) => {
      const datos = DATOS_PEDIDO[parada.pedido];
      const traza: HitoTrazabilidad[] = [];
      if (datos.reasignacion) traza.push({ hora: '11:14', titulo: 'Reasignación recibida', detalle: datos.reasignacion, reciente: true });
      traza.push(
        { hora: '10:04', titulo: 'En tránsito', detalle: `${capitalizar(UNIDADES[unidad.tipo].nombre)} ${unidad.codigo} sale de almacén ${ALMACENES.find((a) => a.id === unidad.origen)!.nombre}`, reciente: !datos.reasignacion },
        { hora: datos.registrado === '10:59' ? '11:01' : '09:40', titulo: 'Planificado', detalle: `ruta de ${unidad.totalParadas} paradas · parada ${unidad.paradaActual + i} de ${unidad.totalParadas}` },
        { hora: datos.registrado, titulo: 'Registrado', detalle: `${datos.plazoHoras === 36 ? 'regular' : 'priorizado'} ${datos.plazoHoras} h · límite ${datos.horaLimite}` },
      );
      pedidos[parada.pedido] = {
        codigo: parada.pedido,
        ...datos,
        eta: parada.eta,
        holgura: parada.holgura,
        holguraMinutos: aMinutos(parada.holgura),
        nivel: parada.nivel,
        estado: 'En tránsito',
        destino: parada.destino,
        unidad: unidad.codigo,
        trazabilidad: traza,
      };
    });
  });
  return pedidos;
}

export const PEDIDOS_OPERACION = construirPedidos();

/** Pedidos con holgura en rojo o ámbar, de menor a mayor holgura. */
export const pedidosEnRiesgo = () =>
  Object.values(PEDIDOS_OPERACION)
    .filter((p) => p.nivel === 'ROJO' || p.nivel === 'AMBAR')
    .sort((a, b) => a.holguraMinutos - b.holguraMinutos);

export const distanciaDesdeOrigen = (pedido: PedidoOperacion) => {
  const unidad = unidadPorCodigo(pedido.unidad)!;
  return distanciaManhattan(ubicacion(unidad.origen), pedido.destino);
};

// --- Bloqueos y bitácora ---------------------------------------------------------------------

export const BLOQUEOS: BloqueoOperacion[] = [
  { id: 'BQ-1', desde: { x: 34, y: 16 }, hasta: { x: 34, y: 18 }, fin: '15:19', rutasAfectadas: 1 },
  { id: 'BQ-2', desde: { x: 12, y: 7 }, hasta: { x: 14, y: 7 }, fin: '13:40', rutasAfectadas: 0 },
  { id: 'BQ-3', desde: { x: 50, y: 40 }, hasta: { x: 50, y: 43 }, fin: '12:30', rutasAfectadas: 0 },
  { id: 'BQ-4', desde: { x: 20, y: 25 }, hasta: { x: 23, y: 25 }, fin: '16:05', rutasAfectadas: 0 },
];

const evento = (hora: string, titulo: string, detalle: string, categoria: CategoriaEvento, color: EventoBitacora['color']): EventoBitacora => ({
  hora, titulo, detalle, categoria, color,
});

/** Eventos más recientes primero. */
export const EVENTOS: EventoBitacora[] = [
  evento('11:14:52', 'Entrega realizada', 'Pedido #1174 · (22,15) · holgura 02:14', 'ENTREGA', 'gris'),
  evento('11:14:10', 'Reasignación', '6 u. de #1042 → #1088 · preserva plazo de 4 h', 'PLANIFICADOR', 'azul'),
  evento('11:13:41', 'Replanificación', 'disparador: avería M-14 · 4,2 s · 8 rutas', 'PLANIFICADOR', 'azul'),
  evento('11:13:38', 'Avería registrada', 'Moto M-14 · tipo 2 · 3 pedidos a bordo', 'INCIDENCIA', 'rojo'),
  evento('11:09:05', 'Bloqueo iniciado', '(34,16)–(34,18) · hasta 15:19 · 1 ruta afectada', 'INCIDENCIA', 'ambar'),
  evento('11:06:47', 'Entrega realizada', 'Pedido #1169 · (41,7) · holgura 05:02', 'ENTREGA', 'gris'),
  evento('11:00:12', 'Alimentación tomada', 'Auto A-09 · 30 min · vuelve a ruta 11:30', 'OPERACION', 'gris'),
  evento('10:58:33', 'Pedido registrado', '#1191 · priorizado 8 h · límite 18:58', 'ENTREGA', 'gris'),
  evento('10:57:12', 'Avería registrada', 'Auto A-03 · tipo 1 · sin pedidos a bordo', 'INCIDENCIA', 'rojo'),
  evento('10:52:30', 'Replanificación', 'ciclo Sa · 3,1 s · 8 rutas', 'PLANIFICADOR', 'azul'),
  evento('10:47:20', 'Bloqueo iniciado', '(12,7)–(14,7) · hasta 13:40 · sin rutas afectadas', 'INCIDENCIA', 'ambar'),
  evento('10:45:02', 'Entrega realizada', 'Pedido #1160 · (8,30) · holgura 01:12', 'ENTREGA', 'gris'),
  evento('10:31:44', 'Pedido registrado', '#1188 · regular 36 h · límite 22:31 +1d', 'ENTREGA', 'gris'),
];

// --- Resumen y flota --------------------------------------------------------------------------

export const RESUMEN_PEDIDOS: ResumenPedidos = {
  total: 1305, entregados: 412, enPlazo: 408, fueraDePlazo: 4, enRuta: 87, enEspera: 806, sinRuta: 12, proximaEntregaMin: 6, saturacion: 0.82,
};

export const nivelDeOcupacion = (carga: number, capacidad: number): NivelHolgura => {
  const fraccion = capacidad === 0 ? 0 : carga / capacidad;
  if (fraccion >= CORTE_OCUPACION.rojo) return 'ROJO';
  if (fraccion >= CORTE_OCUPACION.ambar) return 'AMBAR';
  return 'VERDE';
};

export function estadoFlota() {
  const porEstado = (estado: UnidadOperacion['estado']) => FLOTA.filter((u) => u.estado === estado);
  const enRuta = porEstado('EN_RUTA');
  const porTipo = (Object.keys(UNIDADES) as TipoUnidad[]).map((tipo) => {
    const delTipo = FLOTA.filter((u) => u.tipo === tipo);
    const enRutaTipo = delTipo.filter((u) => u.estado === 'EN_RUTA');
    const ocupacion = enRutaTipo.length === 0 ? 0 : enRutaTipo.reduce((s, u) => s + u.carga / UNIDADES[tipo].capacidad, 0) / enRutaTipo.length;
    return { tipo, enRuta: enRutaTipo.length, total: delTipo.length, ocupacion };
  });
  return {
    total: FLOTA.length,
    enRuta: enRuta.length,
    disponibles: porEstado('DISPONIBLE').length,
    averiadas: porEstado('AVERIADA'),
    porTipo,
    llenas: enRuta.filter((u) => u.carga >= UNIDADES[u.tipo].capacidad),
    ociosas: FLOTA.filter((u) => (u.minutosOciosa ?? 0) > 30),
    sinAlimentacion: enRuta.filter((u) => !u.alimentacion.cumplida && aMinutos(u.alimentacion.hora) < 11 * 60 + 15),
  };
}

/** Resumen de averías de la corrida (OP-07). */
export const AVERIAS_CORRIDA = { registradas: 6, porTipo: { 1: 3, 2: 2, 3: 1 }, minutosFueraDeServicio: 142, reincidente: 'Moto M-14 (2 veces)' };
