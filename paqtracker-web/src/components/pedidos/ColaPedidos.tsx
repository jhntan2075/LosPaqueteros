import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { ESTADO_EN_ESPERA, NOMBRE_HOLGURA, RANGO_HOLGURA, etiquetaPlazo } from '../../config/glosario';
import { capitalizar, formatearMiles } from '../../lib/formato';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { useFocoAtrapado } from '../../hooks/useFocoAtrapado';
import { useColaPedidos } from '../../hooks/usePedidos';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { useTrazabilidadPedido } from '../../hooks/useTrazabilidadPedido';
import type { EstadoPedidoCola, NivelHolgura, PedidoEnCola } from '../../types/pedidos';
import { COLOR_HOLGURA } from './estilos';
import { PuntoHolgura } from './iconos';
import { Boton } from '../ui/Boton';
import { Etiqueta, type TonoEtiqueta } from '../ui/Etiqueta';
import { Campo } from '../ui/Campo';
import { Tarjeta } from '../ui/Tarjeta';

const ESTADOS: Record<EstadoPedidoCola, { etiqueta: string; tono: TonoEtiqueta }> = {
  EN_TRANSITO: { etiqueta: 'En tránsito', tono: 'primario' },
  PLANIFICADO: { etiqueta: 'Planificado', tono: 'info' },
  REGISTRADO: { etiqueta: ESTADO_EN_ESPERA, tono: 'neutro' },
  ENTREGADO: { etiqueta: 'Entregado', tono: 'ok' },
  INCUMPLIDO: { etiqueta: 'Incumplido', tono: 'critico' },
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
      className={`relative inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-body font-sans border transition cursor-pointer ${
        activo
          ? 'bg-primary-50 border-primary-100 text-primary-700 font-medium'
          : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
      }`}
    >
      <span className="text-neutral-500 font-normal">{label}:</span>
      <span className="truncate max-w-[120px]">{etiquetaSeleccionada}</span>
      <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
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

/** Panel lateral con el detalle y la trazabilidad del pedido; se cierra con Esc o tocando fuera. */
const DrawerDetallePedido: React.FC<{
  pedido: PedidoEnCola;
  ejecucionId: string;
  onCerrar: () => void;
  onVerEnLienzo?: () => void;
}> = ({ pedido, ejecucionId, onCerrar, onVerEnLienzo }) => {
  const hitos = useTrazabilidadPedido(ejecucionId, pedido.codigo, pedido.estado);
  const estadoInfo = ESTADOS[pedido.estado];
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const dialogo = useRef<HTMLElement>(null);
  useCerrarConEscape(true, onCerrar);
  useFocoAtrapado(dialogo);
  useEffect(() => {
    cerrarRef.current?.focus();
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onCerrar} aria-hidden="true" />
      <aside
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalle-pedido-titulo"
        className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white shadow-2xl border-l border-neutral-200 flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header Drawer */}
        <div className="h-16 px-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-[10px] bg-primary-100/70 border border-primary-100 flex items-center justify-center text-primary-600">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="detalle-pedido-titulo" className="tabular-nums font-bold text-title text-neutral-900">
                  {pedido.codigo}
                </h3>
                <Etiqueta tono={estadoInfo.tono} punto>
                    {estadoInfo.etiqueta}
                  </Etiqueta>
              </div>
              <p className="text-body text-neutral-600 font-sans">Detalle y trazabilidad en vivo</p>
            </div>
          </div>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            className="size-8 rounded-lg border border-neutral-200 hover:bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-800 transition"
            title="Cerrar"
            aria-label="Cerrar detalle del pedido"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-body font-sans">
          {/* Tarjeta de Datos del Cliente & Pedido */}
          <div className="p-4 rounded-[10px] border border-neutral-200 bg-white space-y-3">
            <h4 className="text-caption font-semibold text-neutral-500 tracking-wider uppercase">Información del pedido</h4>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  Cliente
                </span>
                <span className="font-medium text-neutral-900 text-right">{pedido.cliente}</span>
              </div>
              {pedido.destino && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                    Destino (malla)
                  </span>
                  <span className="tabular-nums font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                    X: {pedido.destino.x} · Y: {pedido.destino.y}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-neutral-500" />
                  Cantidad
                </span>
                <span className="tabular-nums font-medium text-neutral-900">{pedido.cantidad} unidades de P</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  Tipo de entrega
                </span>
                <span className="font-medium text-neutral-900">{etiquetaPlazo(pedido.plazoHoras)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Hora límite</span>
                <span className="tabular-nums font-semibold text-neutral-900">{pedido.horaLimite}</span>
              </div>
            </div>
          </div>

          {/* Tarjeta de transporte y holgura */}
          <div className="p-4 rounded-[10px] border border-neutral-200 bg-neutral-50/50 space-y-3">
            <h4 className="text-caption font-semibold text-neutral-500 tracking-wider uppercase">Transporte y holgura</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <span className="text-caption text-neutral-500 block mb-1">Vehículo asignado</span>
                <div className="flex items-center gap-1.5 tabular-nums font-semibold text-neutral-900">
                  <Truck className="w-3.5 h-3.5 text-primary-600" />
                  {pedido.vehiculo ? etiquetaVehiculo(pedido) : 'Sin asignar'}
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <span className="text-caption text-neutral-500 block mb-1">ETA</span>
                <div className="tabular-nums font-semibold text-neutral-900">
                  {pedido.eta ? pedido.eta : 'Aún sin calcular'}
                </div>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-neutral-200 flex items-center justify-between">
              <span className="text-neutral-600">Holgura restante</span>
              <div className="flex items-center gap-2">
                <PuntoHolgura nivel={pedido.nivelHolgura} />
                <span className={`tabular-nums font-bold text-body-lg ${COLOR_HOLGURA[pedido.nivelHolgura]}`}>
                  {pedido.holgura}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline de Trazabilidad */}
          <div className="space-y-3">
            <h4 className="text-caption font-semibold text-neutral-500 tracking-wider uppercase">Trazabilidad</h4>
            {hitos.length > 0 ? (
              <div className="relative pl-5 border-l-2 border-neutral-200 space-y-4">
                {hitos.map((hito, idx) => (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-[27px] top-0.5 size-3.5 rounded-full border-2 border-white ${
                        hito.reciente ? 'bg-primary-600 ring-2 ring-primary-100' : 'bg-neutral-300'
                      }`}
                    />
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-neutral-900">{hito.titulo}</span>
                      <span className="tabular-nums text-neutral-500 text-caption">{hito.hora}</span>
                    </div>
                    <p className="text-neutral-600 leading-relaxed">{hito.detalle}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 bg-neutral-50 rounded-lg text-neutral-500 text-center">
                Pedido registrado. Los hitos de ruta aparecerán cuando salga a reparto.
              </div>
            )}
          </div>
        </div>

        {/* Footer Acciones */}
        <div className="p-4 border-t border-neutral-200 bg-white flex items-center gap-3">
          {onVerEnLienzo && (
            <Boton variante="primario" tamano="lg" className="flex-1"
              onClick={() => {
                onCerrar();
                onVerEnLienzo();
              }}
            >
              <MapPin className="w-4 h-4" />
              Ubicar en el mapa en vivo
            </Boton>
          )}
          <Boton variante="secundario" tamano="lg"
            onClick={onCerrar}
          >
            Cerrar
          </Boton>
        </div>
      </aside>
    </>
  );
};

export const ColaPedidos: React.FC<{
  onRegistrar: () => void;
  onVerEnLienzo?: (codigo: string) => void;
}> = ({ onRegistrar, onVerEnLienzo }) => {
  const { pedidos, total, cargando, error } = useColaPedidos();
  const datos = useDatosOperacion();
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [codigoSeleccionado, setCodigoSeleccionado] = useState<string | null>(null);
  const pedidoSeleccionado = codigoSeleccionado ? (pedidos.find((p) => p.codigo === codigoSeleccionado) ?? null) : null;

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
    <Tarjeta como="section" className="flex-1 min-h-0 flex flex-col shadow-xs overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="px-6 py-4 border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-sans font-bold text-title text-neutral-800 tracking-tight">Cola de pedidos</h2>
            <span className="px-2.5 py-0.5 rounded-full text-body tabular-nums font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
              {formatearMiles(total)} pedidos
            </span>
          </div>
          <p className="text-body text-neutral-500 font-sans mt-0.5">
            Seguimiento de cada pedido: su holgura, la unidad asignada y su estado.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Boton variante="secundario" tamano="sm"
            onClick={() => exportarCsv(visibles)}
            title="Descargar lista visible en formato CSV"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Exportar CSV</span>
          </Boton>
          <Boton variante="primario" tamano="sm"
            onClick={onRegistrar}
          >
            <Plus className="w-4 h-4" />
            <span>Registrar pedido</span>
          </Boton>
        </div>
      </div>

      {/* 2. Filtros y Búsqueda */}
      <div className="px-6 py-3 border-b border-neutral-200 bg-neutral-50/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Buscador omnibox */}
          <div className="relative w-64 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Campo
              type="text"
              placeholder="Buscar por código, cliente, destino o unidad…"
              aria-label="Buscar pedidos"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full h-8 pl-8 pr-7 text-body"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-neutral-500 hover:text-neutral-600"
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
            label="Holgura"
            valor={filtros.holgura}
            activo={filtros.holgura !== TODOS}
            opciones={[
              { valor: 'ROJO', etiqueta: `${NOMBRE_HOLGURA.ROJO} (${RANGO_HOLGURA.ROJO})` },
              { valor: 'AMBAR', etiqueta: `${NOMBRE_HOLGURA.AMBAR} (${RANGO_HOLGURA.AMBAR})` },
              { valor: 'VERDE', etiqueta: `${NOMBRE_HOLGURA.VERDE} (${RANGO_HOLGURA.VERDE})` },
              { valor: 'CERRADO', etiqueta: NOMBRE_HOLGURA.CERRADO },
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
              className="inline-flex items-center gap-1 text-body text-primary-600 hover:text-primary-900 font-medium px-2 py-1 rounded hover:bg-primary-50 transition"
            >
              <RotateCcw className="w-3 h-3" />
              Limpiar filtros ({filtrosActivos})
            </button>
          )}
        </div>

        <div className="text-body text-neutral-500 font-sans">
          Mostrando <span className="tabular-nums font-semibold text-neutral-800">{visibles.length}</span> de{' '}
          <span className="tabular-nums text-neutral-700">{formatearMiles(total)}</span>
        </div>
      </div>

      {/* 3. Data Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full table-auto text-left text-body font-sans border-collapse whitespace-nowrap">
          <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200 z-10 text-neutral-600 font-semibold tracking-wider text-caption uppercase">
            <tr>
              <th className="py-2.5 px-4">Código</th>
              <th className="py-2.5 px-4">Cliente</th>
              <th className="py-2.5 px-4">Destino</th>
              <th className="py-2.5 px-4 text-right">Cant.</th>
              <th className="py-2.5 px-4">Plazo</th>
              <th className="py-2.5 px-4">Hora límite</th>
              <th className="py-2.5 px-4">ETA</th>
              <th className="py-2.5 px-4">Holgura</th>
              <th className="py-2.5 px-4">Vehículo</th>
              <th className="py-2.5 px-4">Estado</th>
              <th className="py-2.5 px-3 w-10 text-center">
                <span className="sr-only">Abrir detalle</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {visibles.map((pedido) => {
              const estado = ESTADOS[pedido.estado];
              const regular = esPlazoRegular(pedido.plazoHoras);
              return (
                <tr
                  key={pedido.codigo}
                  onClick={() => setCodigoSeleccionado(pedido.codigo)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setCodigoSeleccionado(pedido.codigo);
                    }
                  }}
                  tabIndex={0}
                  className="hover:bg-primary-50/40 focus-visible:bg-primary-50/60 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 tabular-nums font-semibold text-neutral-900 group-hover:text-primary-600">
                    {pedido.codigo}
                  </td>
                  <td className="py-3 px-4 font-medium text-neutral-800" title={pedido.cliente}>
                    <div className="max-w-[260px] truncate">{pedido.cliente}</div>
                  </td>
                  <td className="py-3 px-4 tabular-nums text-neutral-500">
                    {pedido.destino ? `(${pedido.destino.x}, ${pedido.destino.y})` : '—'}
                  </td>
                  <td className="py-3 px-4 tabular-nums text-right text-neutral-700 font-medium">
                    {pedido.cantidad} u.
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-caption font-sans font-medium ${
                        regular ? 'bg-neutral-100 text-neutral-700' : 'bg-warn-50 text-warn-700 border border-warn-500/40'
                      }`}
                    >
                      {etiquetaPlazo(pedido.plazoHoras)}
                    </span>
                  </td>
                  <td className="py-3 px-4 tabular-nums text-neutral-600">{pedido.horaLimite}</td>
                  <td className="py-3 px-4 tabular-nums text-neutral-700 font-medium">{pedido.eta ?? '—'}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 tabular-nums font-medium">
                      <PuntoHolgura nivel={pedido.nivelHolgura} />
                      <span className={COLOR_HOLGURA[pedido.nivelHolgura]}>{pedido.holgura}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 tabular-nums text-neutral-700">
                    {pedido.vehiculo ? (
                      <span className="font-medium text-primary-600">{etiquetaVehiculo(pedido)}</span>
                    ) : (
                      <span className="text-neutral-500">Sin asignar</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Etiqueta tono={estado.tono} punto>
                    {estado.etiqueta}
                  </Etiqueta>
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 group-hover:text-primary-600 transition">
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
            <AlertTriangle className="w-8 h-8 text-critical-600 mx-auto" />
            <p className="text-critical-600 font-medium">{error}</p>
          </div>
        )}

        {!error && visibles.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <div className="size-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <p className="text-neutral-800 font-semibold text-body-lg">
                {cargando
                  ? 'Cargando cola de pedidos…'
                  : pedidos.length === 0
                  ? 'No hay pedidos registrados en este momento'
                  : 'Ningún pedido coincide con la búsqueda o filtros aplicados'}
              </p>
              <p className="text-neutral-500 text-body mt-1">
                {filtrosActivos > 0 ? 'Intenta modificar o limpiar los filtros seleccionados.' : 'Registra un nuevo pedido para iniciar la planificación.'}
              </p>
            </div>
            {filtrosActivos > 0 && (
              <Boton variante="secundario" tamano="sm"
                onClick={limpiarFiltros}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer búsqueda y filtros
              </Boton>
            )}
          </div>
        )}
      </div>

      {/* Drawer Lateral si hay pedido seleccionado */}
      {pedidoSeleccionado && (
        <DrawerDetallePedido
          pedido={pedidoSeleccionado}
          ejecucionId={datos.ejecucionId}
          onCerrar={() => setCodigoSeleccionado(null)}
          // Solo se ofrece si el pedido figura en el estado en vivo: si no, no hay nada que ubicar en el mapa.
          onVerEnLienzo={
            onVerEnLienzo && datos.pedidos[pedidoSeleccionado.codigo] ? () => onVerEnLienzo(pedidoSeleccionado.codigo) : undefined
          }
        />
      )}
    </Tarjeta>
  );
};
