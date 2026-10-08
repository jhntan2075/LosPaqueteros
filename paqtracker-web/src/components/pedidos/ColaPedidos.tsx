import React, { useMemo, useState } from 'react';
import {
  Search,
  X,
  ChevronDown,
  Download,
  Plus,
  MapPin,
  Clock,
  RotateCcw,
  User,
  Package,
  Truck,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { PLAZOS_HORAS, UNIDADES, esPlazoRegular, type PlazoHoras, type TipoUnidad } from '../../config/dominio';
import { capitalizar, formatearMiles } from '../../lib/formato';
import { useColaPedidos } from '../../hooks/usePedidos';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { useTrazabilidadPedido } from '../../hooks/useTrazabilidadPedido';
import type { EstadoPedidoCola, NivelHolgura, PedidoEnCola } from '../../types/pedidos';
import { COLOR_HOLGURA } from './estilos';
import { PuntoHolgura } from './iconos';

const ESTADOS: Record<EstadoPedidoCola, { etiqueta: string; badge: string; dot: string }> = {
  EN_TRANSITO: {
    etiqueta: 'En tránsito',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-600',
  },
  PLANIFICADO: {
    etiqueta: 'Planificado',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-600',
  },
  REGISTRADO: {
    etiqueta: 'En espera',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
  },
  ENTREGADO: {
    etiqueta: 'Entregado',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-600',
  },
  INCUMPLIDO: {
    etiqueta: 'Incumplido',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-600',
  },
};

const TODOS = 'TODOS';
const SIN_ASIGNAR = 'SIN_ASIGNAR';

interface Filtros {
  estado: EstadoPedidoCola | typeof TODOS;
  plazo: PlazoHoras | typeof TODOS;
  vehiculo: TipoUnidad | typeof SIN_ASIGNAR | typeof TODOS;
  holgura: NivelHolgura | typeof TODOS;
}

const SIN_FILTROS: Filtros = {
  estado: TODOS,
  plazo: TODOS,
  vehiculo: TODOS,
  holgura: TODOS,
};

const etiquetaPlazo = (plazo: number) => `${esPlazoRegular(plazo) ? 'Regular' : 'Priorizado'} ${plazo} h`;

const etiquetaVehiculo = (pedido: PedidoEnCola) =>
  pedido.vehiculo ? `${capitalizar(UNIDADES[pedido.vehiculo.tipo].nombre)} ${pedido.vehiculo.codigo}` : '—';

interface SelectFiltroProps {
  label: string;
  valor: string;
  opciones: { valor: string; etiqueta: string }[];
  activo: boolean;
  onCambiar: (valor: string) => void;
}

const SelectFiltro: React.FC<SelectFiltroProps> = ({ label, valor, opciones, activo, onCambiar }) => {
  const etiquetaSeleccionada = opciones.find((o) => o.valor === valor)?.etiqueta ?? 'Todos';
  return (
    <div
      className={`relative inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-sans border transition cursor-pointer ${
        activo
          ? 'bg-blue-50 border-blue-300 text-blue-800 font-medium'
          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <span className="text-slate-400 font-normal">{label}:</span>
      <span className="truncate max-w-[120px]">{etiquetaSeleccionada}</span>
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <select
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        aria-label={`Filtrar por ${label}`}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      >
        <option value={TODOS}>Todos</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
};

function exportarCsv(pedidos: PedidoEnCola[]) {
  const encabezado = ['ID', 'Cliente', 'Destino', 'Cantidad', 'Plazo', 'Hora límite', 'ETA', 'Holgura', 'Vehículo', 'Estado'];
  const filas = pedidos.map((p) => [
    p.codigo,
    p.cliente,
    p.destino ? `(${p.destino.x}; ${p.destino.y})` : '',
    p.cantidad,
    etiquetaPlazo(p.plazoHoras),
    p.horaLimite,
    p.eta ?? '',
    p.holgura,
    p.vehiculo ? etiquetaVehiculo(p) : '',
    ESTADOS[p.estado].etiqueta,
  ]);
  const csv = [encabezado, ...filas]
    .map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  enlace.download = `pedidos-paqtracker-${new Date().toISOString().slice(0, 10)}.csv`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 0);
}

/** Drawer lateral deslizable con detalle y trazabilidad del pedido */
const DrawerDetallePedido: React.FC<{
  pedido: PedidoEnCola;
  ejecucionId: string;
  onCerrar: () => void;
  onVerEnLienzo?: () => void;
}> = ({ pedido, ejecucionId, onCerrar, onVerEnLienzo }) => {
  const hitos = useTrazabilidadPedido(ejecucionId, pedido.codigo, pedido.estado);
  const estadoInfo = ESTADOS[pedido.estado];

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 select-none"
      aria-label={`Detalle del pedido ${pedido.codigo}`}
    >
      {/* Header Drawer */}
      <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-blue-100/70 border border-blue-200 flex items-center justify-center text-blue-700">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono font-bold text-base text-slate-900">{pedido.codigo}</h3>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-sans font-medium border ${estadoInfo.badge}`}>
                <span className={`size-1.5 rounded-full ${estadoInfo.dot}`} />
                {estadoInfo.etiqueta}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans">Detalle y trazabilidad en vivo</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="size-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
          title="Cerrar panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs font-sans">
        {/* Tarjeta de Datos del Cliente & Pedido */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
          <h4 className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">Información del Pedido</h4>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Cliente
              </span>
              <span className="font-medium text-slate-900 text-right">{pedido.cliente}</span>
            </div>
            {pedido.destino && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Destino (malla)
                </span>
                <span className="font-mono font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  X: {pedido.destino.x} · Y: {pedido.destino.y}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                Carga
              </span>
              <span className="font-mono font-medium text-slate-900">{pedido.cantidad} unidades de P</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Tipo de entrega
              </span>
              <span className="font-medium text-slate-900">{etiquetaPlazo(pedido.plazoHoras)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Hora límite comprometida</span>
              <span className="font-mono font-semibold text-slate-900">{pedido.horaLimite}</span>
            </div>
          </div>
        </div>

        {/* Tarjeta de Transporte y Holgura SLA */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <h4 className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">Transporte y SLA</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block mb-1">Vehículo asignado</span>
              <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-900">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                {pedido.vehiculo ? etiquetaVehiculo(pedido) : 'En cola de asignación'}
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block mb-1">ETA estimado</span>
              <div className="font-mono font-semibold text-slate-900">
                {pedido.eta ? pedido.eta : 'Por calcular'}
              </div>
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="text-slate-600">Margen de holgura operativa:</span>
            <div className="flex items-center gap-2">
              <PuntoHolgura nivel={pedido.nivelHolgura} />
              <span className={`font-mono font-bold text-sm ${COLOR_HOLGURA[pedido.nivelHolgura]}`}>
                {pedido.holgura}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline de Trazabilidad */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">Línea de Tiempo (Trazabilidad)</h4>
          {hitos.length > 0 ? (
            <div className="relative pl-5 border-l-2 border-slate-200 space-y-4">
              {hitos.map((hito, idx) => (
                <div key={idx} className="relative">
                  <div
                    className={`absolute -left-[27px] top-0.5 size-3.5 rounded-full border-2 border-white ${
                      hito.reciente ? 'bg-blue-600 ring-2 ring-blue-100' : 'bg-slate-300'
                    }`}
                  />
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-slate-900">{hito.titulo}</span>
                    <span className="font-mono text-slate-400 text-[11px]">{hito.hora}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{hito.detalle}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 rounded-lg text-slate-500 text-center">
              Registrado en el sistema. Los hitos de ruta se actualizarán al iniciar despacho.
            </div>
          )}
        </div>
      </div>

      {/* Footer Acciones */}
      <div className="p-4 border-t border-slate-200 bg-white flex items-center gap-3">
        {onVerEnLienzo && (
          <button
            type="button"
            onClick={() => {
              onCerrar();
              onVerEnLienzo();
            }}
            className="flex-1 h-10 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition"
          >
            <MapPin className="w-4 h-4" />
            Ubicar en el mapa en vivo
          </button>
        )}
        <button
          type="button"
          onClick={onCerrar}
          className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs transition"
        >
          Cerrar
        </button>
      </div>
    </aside>
  );
};

export const ColaPedidos: React.FC<{
  onRegistrar: () => void;
  onVerEnLienzo?: () => void;
}> = ({ onRegistrar, onVerEnLienzo }) => {
  const { pedidos, total, cargando, error } = useColaPedidos();
  const datos = useDatosOperacion();
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<PedidoEnCola | null>(null);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pedidos.filter((pedido) => {
      if (q) {
        const coincideCodigo = pedido.codigo.toLowerCase().includes(q);
        const coincideCliente = pedido.cliente.toLowerCase().includes(q);
        const coincideDestino = pedido.destino ? `${pedido.destino.x},${pedido.destino.y}`.includes(q) : false;
        const coincideVehiculo = pedido.vehiculo ? pedido.vehiculo.codigo.toLowerCase().includes(q) : false;
        if (!coincideCodigo && !coincideCliente && !coincideDestino && !coincideVehiculo) return false;
      }
      if (filtros.estado !== TODOS && pedido.estado !== filtros.estado) return false;
      if (filtros.plazo !== TODOS && pedido.plazoHoras !== filtros.plazo) return false;
      if (filtros.vehiculo !== TODOS) {
        if (filtros.vehiculo === SIN_ASIGNAR && pedido.vehiculo !== null) return false;
        if (filtros.vehiculo !== SIN_ASIGNAR && pedido.vehiculo?.tipo !== filtros.vehiculo) return false;
      }
      if (filtros.holgura !== TODOS && pedido.nivelHolgura !== filtros.holgura) return false;

      return true;
    });
  }, [pedidos, busqueda, filtros]);

  const filtrosActivos =
    Object.values(filtros).filter((v) => v !== TODOS).length + (busqueda.trim() !== '' ? 1 : 0);

  const limpiarFiltros = () => {
    setFiltros(SIN_FILTROS);
    setBusqueda('');
  };

  return (
    <section className="flex-1 min-h-0 flex flex-col bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden select-none">
      {/* 1. Header Toolbar */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-sans font-bold text-base text-slate-800 tracking-tight">Cola de Pedidos</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {formatearMiles(total)} pedidos en sistema
            </span>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Seguimiento de pedidos en curso, cumplimiento de SLA y asignación de flota.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportarCsv(visibles)}
            className="h-9 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-sans text-xs font-medium flex items-center gap-2 transition"
            title="Descargar lista visible en formato CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={onRegistrar}
            className="h-9 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-sans text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar pedido</span>
          </button>
        </div>
      </div>

      {/* 2. Filtros y Búsqueda */}
      <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Buscador omnibox */}
          <div className="relative w-64 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, cliente o nodo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full h-8 pl-8 pr-7 text-xs font-sans bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 placeholder:text-slate-400"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filtros Dropdowns */}
          <SelectFiltro
            label="Estado"
            valor={filtros.estado}
            activo={filtros.estado !== TODOS}
            opciones={Object.entries(ESTADOS).map(([val, { etiqueta }]) => ({ valor: val, etiqueta }))}
            onCambiar={(val) => setFiltros({ ...filtros, estado: val as Filtros['estado'] })}
          />

          <SelectFiltro
            label="SLA / Holgura"
            valor={filtros.holgura}
            activo={filtros.holgura !== TODOS}
            opciones={[
              { valor: 'ROJO', etiqueta: 'Crítico (< 15%)' },
              { valor: 'AMBAR', etiqueta: 'Ajustado (15-40%)' },
              { valor: 'VERDE', etiqueta: 'Holgado (> 40%)' },
              { valor: 'CERRADO', etiqueta: 'Cerrado' },
            ]}
            onCambiar={(val) => setFiltros({ ...filtros, holgura: val as Filtros['holgura'] })}
          />

          <SelectFiltro
            label="Plazo"
            valor={String(filtros.plazo)}
            activo={filtros.plazo !== TODOS}
            opciones={PLAZOS_HORAS.map((p) => ({ valor: String(p), etiqueta: etiquetaPlazo(p) }))}
            onCambiar={(val) => setFiltros({ ...filtros, plazo: val === TODOS ? TODOS : (Number(val) as PlazoHoras) })}
          />

          <SelectFiltro
            label="Vehículo"
            valor={filtros.vehiculo}
            activo={filtros.vehiculo !== TODOS}
            opciones={[
              ...(Object.keys(UNIDADES) as TipoUnidad[]).map((t) => ({ valor: t, etiqueta: capitalizar(UNIDADES[t].nombre) })),
              { valor: SIN_ASIGNAR, etiqueta: 'Sin asignar' },
            ]}
            onCambiar={(val) => setFiltros({ ...filtros, vehiculo: val as Filtros['vehiculo'] })}
          />

          {filtrosActivos > 0 && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium px-2 py-1 rounded hover:bg-blue-50 transition"
            >
              <RotateCcw className="w-3 h-3" />
              Limpiar filtros ({filtrosActivos})
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-sans">
          Mostrando <span className="font-mono font-semibold text-slate-800">{visibles.length}</span> de{' '}
          <span className="font-mono text-slate-700">{formatearMiles(total)}</span>
        </div>
      </div>

      {/* 3. Data Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left text-xs font-sans border-collapse">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 text-slate-600 font-semibold tracking-wider text-[11px] uppercase">
            <tr>
              <th className="py-2.5 px-4 w-24">Código</th>
              <th className="py-2.5 px-4 min-w-[180px]">Cliente</th>
              <th className="py-2.5 px-3 w-20">Destino</th>
              <th className="py-2.5 px-3 w-20 text-right">Cant.</th>
              <th className="py-2.5 px-4 w-32">Plazo</th>
              <th className="py-2.5 px-3 w-28">Hora Límite</th>
              <th className="py-2.5 px-3 w-20">ETA</th>
              <th className="py-2.5 px-4 w-28">Holgura SLA</th>
              <th className="py-2.5 px-4 w-28">Vehículo</th>
              <th className="py-2.5 px-4 w-28">Estado</th>
              <th className="py-2.5 px-3 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibles.map((pedido) => {
              const estado = ESTADOS[pedido.estado];
              const regular = esPlazoRegular(pedido.plazoHoras);
              return (
                <tr
                  key={pedido.codigo}
                  onClick={() => setPedidoSeleccionado(pedido)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900 group-hover:text-blue-700">
                    {pedido.codigo}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 max-w-[240px] truncate" title={pedido.cliente}>
                    {pedido.cliente}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">
                    {pedido.destino ? `(${pedido.destino.x}, ${pedido.destino.y})` : '—'}
                  </td>
                  <td className="py-3 px-3 font-mono text-right text-slate-700 font-medium">
                    {pedido.cantidad} u.
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-sans font-medium ${
                        regular ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {etiquetaPlazo(pedido.plazoHoras)}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">{pedido.horaLimite}</td>
                  <td className="py-3 px-3 font-mono text-slate-700 font-medium">{pedido.eta ?? '—'}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 font-mono font-medium">
                      <PuntoHolgura nivel={pedido.nivelHolgura} />
                      <span className={COLOR_HOLGURA[pedido.nivelHolgura]}>{pedido.holgura}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {pedido.vehiculo ? (
                      <span className="font-medium text-blue-700">{etiquetaVehiculo(pedido)}</span>
                    ) : (
                      <span className="text-slate-400">Sin asignar</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${estado.badge}`}>
                      <span className={`size-1.5 rounded-full ${estado.dot}`} />
                      {estado.etiqueta}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300 group-hover:text-blue-600 transition">
                    <ChevronRight className="w-4 h-4 inline-block" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Estados de error o vacío */}
        {error && (
          <div className="p-8 text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-rose-700 font-medium">{error}</p>
          </div>
        )}

        {!error && visibles.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-800 font-semibold text-sm">
                {cargando
                  ? 'Cargando cola de pedidos…'
                  : pedidos.length === 0
                  ? 'No hay pedidos registrados en este momento'
                  : 'Ningún pedido coincide con la búsqueda o filtros aplicados'}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {filtrosActivos > 0 ? 'Intenta modificar o limpiar los filtros seleccionados.' : 'Registra un nuevo pedido para iniciar la planificación.'}
              </p>
            </div>
            {filtrosActivos > 0 && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs text-slate-700 font-medium transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer búsqueda y filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Drawer Lateral si hay pedido seleccionado */}
      {pedidoSeleccionado && (
        <DrawerDetallePedido
          pedido={pedidoSeleccionado}
          ejecucionId={datos.ejecucionId}
          onCerrar={() => setPedidoSeleccionado(null)}
          onVerEnLienzo={onVerEnLienzo}
        />
      )}
    </section>
  );
};
