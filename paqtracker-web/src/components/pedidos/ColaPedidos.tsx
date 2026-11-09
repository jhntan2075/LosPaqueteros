import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  ChevronDown,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Download,
  Plus,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { PLAZOS_HORAS, UNIDADES, esPlazoRegular, type PlazoHoras, type TipoUnidad } from '../../config/dominio';
import { ESTADO_EN_ESPERA, NOMBRE_HOLGURA, RANGO_HOLGURA, etiquetaPlazo } from '../../config/glosario';
import { capitalizar, formatearMiles } from '../../lib/formato';
import { cn } from '../../lib/clases';
import { useColaPedidos } from '../../hooks/usePedidos';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import type { EstadoPedidoCola, NivelHolgura, PedidoEnCola } from '../../types/pedidos';
import { Boton, EncabezadoPagina, Entrada, EstadoVacio, Insignia, Tarjeta } from '../ui';
import { DetallePedido } from './DetallePedido';
import { COLOR_HOLGURA, TONO_ESTADO } from './estilos';
import { PuntoHolgura } from './iconos';

const ESTADOS: Record<EstadoPedidoCola, { etiqueta: string }> = {
  EN_TRANSITO: { etiqueta: 'En tránsito' },
  PLANIFICADO: { etiqueta: 'Planificado' },
  REGISTRADO: { etiqueta: ESTADO_EN_ESPERA },
  ENTREGADO: { etiqueta: 'Entregado' },
  INCUMPLIDO: { etiqueta: 'Incumplido' },
};

const InsigniaEstado: React.FC<{ estado: EstadoPedidoCola }> = ({ estado }) => (
  <Insignia tono={TONO_ESTADO[estado]} punto>
    {ESTADOS[estado].etiqueta}
  </Insignia>
);

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

type CampoOrden = 'codigo' | 'cliente' | 'cantidad' | 'horaLimite' | 'holgura' | 'estado';
type Orden = { campo: CampoOrden; asc: boolean };

const RANGO_ORDEN_HOLGURA: Record<NivelHolgura, number> = { ROJO: 0, AMBAR: 1, VERDE: 2, CERRADO: 3 };

function comparar(a: PedidoEnCola, b: PedidoEnCola, campo: CampoOrden): number {
  switch (campo) {
    case 'codigo':
      return a.codigo.localeCompare(b.codigo, undefined, { numeric: true });
    case 'cliente':
      return a.cliente.localeCompare(b.cliente);
    case 'cantidad':
      return a.cantidad - b.cantidad;
    case 'horaLimite':
      return a.horaLimiteMs - b.horaLimiteMs;
    case 'holgura':
      return RANGO_ORDEN_HOLGURA[a.nivelHolgura] - RANGO_ORDEN_HOLGURA[b.nivelHolgura] || a.holguraMinutos - b.holguraMinutos;
    case 'estado':
      return ESTADOS[a.estado].etiqueta.localeCompare(ESTADOS[b.estado].etiqueta);
  }
}

const CELDA = 'py-2 px-4';

/**
 * Encabezado de columna ordenable: clic alterna ascendente → descendente → sin orden. Sin orden activo
 * muestra el ícono ascendente atenuado (lo que hará el primer clic); al ordenar, el de la dirección vigente
 * en azul, como en Flota.
 */
const EncabezadoOrdenable: React.FC<{
  campo: CampoOrden;
  orden: Orden | null;
  onOrdenar: (campo: CampoOrden) => void;
  alinear?: 'right';
  children: React.ReactNode;
}> = ({ campo, orden, onOrdenar, alinear, children }) => {
  const activo = orden?.campo === campo;
  const descendente = activo && !orden!.asc;
  const Icono = descendente ? ArrowDownWideNarrow : ArrowUpNarrowWide;
  return (
    <th className={cn(CELDA, alinear === 'right' && 'text-right')} aria-sort={activo ? (descendente ? 'descending' : 'ascending') : undefined}>
      <button
        type="button"
        onClick={() => onOrdenar(campo)}
        className={cn(
          'group/orden inline-flex items-center gap-1 uppercase transition-colors hover:text-neutral-900 cursor-pointer',
          alinear === 'right' && 'flex-row-reverse',
          activo && 'text-neutral-900',
        )}
      >
        {children}
        <Icono
          className={cn('size-3.5 shrink-0', activo ? 'text-primary-600' : 'text-neutral-400 group-hover/orden:text-neutral-600')}
          aria-hidden="true"
        />
      </button>
    </th>
  );
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
      className={cn(
        'relative inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-body-sm transition-colors cursor-pointer focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-600/20',
        activo
          ? 'border-primary-600/40 bg-primary-50 font-medium text-primary-700'
          : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50',
      )}
    >
      <span className="font-normal text-neutral-600">{label}:</span>
      <span className="max-w-32 truncate">{etiquetaSeleccionada}</span>
      <ChevronDown className="size-3.5 shrink-0 text-neutral-500" aria-hidden="true" />
      <select
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        aria-label={`Filtrar por ${label}`}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
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

/** Acceso rápido a un filtro (botón de alternar con aria-pressed). */
const FiltroRapido: React.FC<{ activo: boolean; tono: 'critical' | 'primary'; onClick: () => void; children: React.ReactNode }> = ({
  activo,
  tono,
  onClick,
  children,
}) => (
  <button
    type="button"
    aria-pressed={activo}
    onClick={onClick}
    className={cn(
      'h-8 rounded-control border px-2.5 text-body-sm font-medium transition-colors cursor-pointer',
      activo
        ? tono === 'critical'
          ? 'border-critical-600/40 bg-critical-50 text-critical-600'
          : 'border-primary-600/40 bg-primary-50 text-primary-700'
        : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900',
    )}
  >
    {children}
  </button>
);

function exportarCsv(pedidos: PedidoEnCola[]) {
  const encabezado = ['ID', 'Cliente', 'Destino', 'Cantidad', 'Plazo', 'Hora límite', 'Salida', 'Llegada estimada', 'Holgura', 'Vehículo', 'Unidades', 'Estado'];
  const filas = pedidos.map((p) => [
    p.codigo,
    p.cliente,
    p.destino ? `(${p.destino.x}; ${p.destino.y})` : '',
    p.cantidad,
    etiquetaPlazo(p.plazoHoras),
    p.horaLimite,
    p.salida ?? '',
    p.eta ?? '',
    p.holgura,
    p.vehiculo ? etiquetaVehiculo(p) : '',
    p.unidades.join(' / '),
    ESTADOS[p.estado].etiqueta,
  ]);
  const csv = [encabezado, ...filas]
    .map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  enlace.download = `pedidos-paqtracker-${new Date().toISOString().slice(0, 10)}.csv`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 0);
}

export const ColaPedidos: React.FC<{
  onRegistrar: () => void;
  onVerEnLienzo?: (codigo: string) => void;
}> = ({ onRegistrar, onVerEnLienzo }) => {
  const { pedidos, total, cargando, error } = useColaPedidos();
  const datos = useDatosOperacion();
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [orden, setOrden] = useState<Orden | null>(null);
  const [codigoSeleccionado, setCodigoSeleccionado] = useState<string | null>(null);
  const pedidoSeleccionado = codigoSeleccionado ? (pedidos.find((p) => p.codigo === codigoSeleccionado) ?? null) : null;
  const buscadorRef = useRef<HTMLInputElement>(null);

  // Atajo "/" para enfocar el buscador, salvo que ya se esté escribiendo en algún campo o el detalle esté abierto.
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      const activo = document.activeElement;
      const escribiendo = activo instanceof HTMLElement && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA' || activo.isContentEditable);
      if (e.key === '/' && !escribiendo && !pedidoSeleccionado) {
        e.preventDefault();
        buscadorRef.current?.focus();
      }
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [pedidoSeleccionado]);

  const alternarOrden = (campo: CampoOrden) =>
    setOrden((actual) => {
      if (actual?.campo !== campo) return { campo, asc: true };
      if (actual.asc) return { campo, asc: false };
      return null;
    });

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = pedidos.filter((pedido) => {
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
    if (!orden) return filtradas;
    const factor = orden.asc ? 1 : -1;
    return [...filtradas].sort((a, b) => factor * comparar(a, b, orden.campo));
  }, [pedidos, busqueda, filtros, orden]);

  const filtrosActivos =
    Object.values(filtros).filter((v) => v !== TODOS).length + (busqueda.trim() !== '' ? 1 : 0);

  const limpiarFiltros = () => {
    setFiltros(SIN_FILTROS);
    setBusqueda('');
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Pedidos"
        estado={<Insignia className="tabular-nums">{formatearMiles(total)} pedidos</Insignia>}
        descripcion="Seguimiento de cada pedido: su holgura, la unidad asignada y su estado."
        acciones={
          <>
            <Boton icono={Download} onClick={() => exportarCsv(visibles)} title="Descargar lista visible en formato CSV">
              Exportar CSV
            </Boton>
            <Boton variante="primario" icono={Plus} onClick={onRegistrar}>
              Registrar pedido
            </Boton>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col p-4 lg:p-6">
        <Tarjeta sinRelleno className="min-h-0 flex-1 overflow-hidden" cuerpoClassName="flex min-h-0 flex-1 flex-col">
          {/* Filtros y búsqueda */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 lg:px-6">
            <div className="flex min-w-72 flex-1 flex-wrap items-center gap-2">
              {/* Buscador */}
              <div className="relative w-64 min-w-52">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
                <Entrada
                  ref={buscadorRef}
                  type="text"
                  placeholder="Buscar por código, cliente, destino o unidad…"
                  aria-label="Buscar pedidos"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-8 pr-7 text-body-sm"
                />
                {!busqueda && (
                  <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-neutral-200 px-1 font-sans text-caption text-neutral-500">
                    /
                  </kbd>
                )}
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Accesos rápidos a los filtros más usados */}
              <FiltroRapido
                tono="critical"
                activo={filtros.holgura === 'ROJO'}
                onClick={() => setFiltros({ ...filtros, holgura: filtros.holgura === 'ROJO' ? TODOS : 'ROJO' })}
              >
                Críticos
              </FiltroRapido>
              <FiltroRapido
                tono="primary"
                activo={filtros.estado === 'REGISTRADO'}
                onClick={() => setFiltros({ ...filtros, estado: filtros.estado === 'REGISTRADO' ? TODOS : 'REGISTRADO' })}
              >
                {ESTADO_EN_ESPERA}
              </FiltroRapido>
              <span className="h-5 w-px bg-neutral-200" aria-hidden="true" />

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
                <Boton
                  variante="fantasma"
                  tamano="sm"
                  icono={RotateCcw}
                  onClick={limpiarFiltros}
                  className="text-primary-700 hover:bg-primary-50 hover:text-primary-700"
                >
                  Limpiar filtros ({filtrosActivos})
                </Boton>
              )}
            </div>

            <div className="text-body-sm text-neutral-600">
              Mostrando <span className="font-semibold tabular-nums text-neutral-900">{visibles.length}</span> de{' '}
              <span className="tabular-nums text-neutral-700">{formatearMiles(total)}</span>
            </div>
          </div>

          {/* Tabla */}
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full table-auto border-collapse whitespace-nowrap text-left text-body-sm">
              <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50 text-overline uppercase text-neutral-600 [&_th]:font-semibold">
                <tr>
                  <EncabezadoOrdenable campo="codigo" orden={orden} onOrdenar={alternarOrden}>Código</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="cliente" orden={orden} onOrdenar={alternarOrden}>Cliente</EncabezadoOrdenable>
                  <th className={CELDA}>Destino</th>
                  <EncabezadoOrdenable campo="cantidad" orden={orden} onOrdenar={alternarOrden} alinear="right">Cant.</EncabezadoOrdenable>
                  <th className={CELDA}>Plazo</th>
                  <EncabezadoOrdenable campo="horaLimite" orden={orden} onOrdenar={alternarOrden}>Hora límite</EncabezadoOrdenable>
                  <th className={CELDA}>Salida</th>
                  <th className={CELDA}>Llegada estimada</th>
                  <EncabezadoOrdenable campo="holgura" orden={orden} onOrdenar={alternarOrden}>Holgura</EncabezadoOrdenable>
                  <th className={CELDA}>Vehículo</th>
                  <EncabezadoOrdenable campo="estado" orden={orden} onOrdenar={alternarOrden}>Estado</EncabezadoOrdenable>
                  <th className="w-10 px-3 py-2 text-center">
                    <span className="sr-only">Abrir detalle</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {visibles.map((pedido) => (
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
                    className="group cursor-pointer outline-none transition-colors hover:bg-neutral-100 focus-visible:bg-primary-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600/40"
                  >
                    <td className={cn(CELDA, 'font-semibold tabular-nums text-neutral-900 group-hover:text-primary-700')}>{pedido.codigo}</td>
                    <td className={cn(CELDA, 'font-medium text-neutral-900')} title={pedido.cliente}>
                      <div className="max-w-64 truncate">{pedido.cliente}</div>
                    </td>
                    <td className={cn(CELDA, 'tabular-nums text-neutral-600')}>
                      {pedido.destino ? `(${pedido.destino.x}, ${pedido.destino.y})` : '—'}
                    </td>
                    <td className={cn(CELDA, 'text-right font-medium tabular-nums text-neutral-700')}>{pedido.cantidad} u.</td>
                    <td className={CELDA}>
                      <Insignia tono={esPlazoRegular(pedido.plazoHoras) ? 'neutral' : 'warn'}>{etiquetaPlazo(pedido.plazoHoras)}</Insignia>
                    </td>
                    <td className={cn(CELDA, 'tabular-nums text-neutral-600')}>{pedido.horaLimite}</td>
                    <td className={cn(CELDA, 'tabular-nums text-neutral-600')}>{pedido.salida ?? '—'}</td>
                    <td className={cn(CELDA, 'font-medium tabular-nums text-neutral-700')}>{pedido.eta ?? '—'}</td>
                    <td className={CELDA}>
                      <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
                        <PuntoHolgura nivel={pedido.nivelHolgura} />
                        <span className={COLOR_HOLGURA[pedido.nivelHolgura]}>{pedido.holgura}</span>
                      </span>
                    </td>
                    <td className={cn(CELDA, 'tabular-nums text-neutral-700')}>
                      {pedido.vehiculo ? (
                        // Fraccionado: la unidad principal y cuántas más; el título nombra todas.
                        <span className="font-medium text-neutral-900" title={pedido.unidades.length > 1 ? `Va en ${pedido.unidades.join(', ')}` : undefined}>
                          {etiquetaVehiculo(pedido)}
                          {pedido.unidades.length > 1 && <span className="font-normal text-neutral-600"> +{pedido.unidades.length - 1}</span>}
                        </span>
                      ) : (
                        <span className="text-neutral-600">Sin asignar</span>
                      )}
                    </td>
                    <td className={CELDA}>
                      <InsigniaEstado estado={pedido.estado} />
                    </td>
                    <td className="px-3 py-2 text-center text-neutral-400 transition-colors group-hover:text-primary-600">
                      <ArrowRight className="inline-block size-3.5" aria-hidden="true" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Estados de error o vacío */}
            {error && <EstadoVacio tono="critical" icono={AlertTriangle} titulo={error} />}

            {!error && visibles.length === 0 && (
              <EstadoVacio
                icono={Search}
                titulo={
                  cargando
                    ? 'Cargando cola de pedidos…'
                    : pedidos.length === 0
                      ? 'No hay pedidos registrados en este momento'
                      : 'Ningún pedido coincide con la búsqueda o filtros aplicados'
                }
                descripcion={
                  filtrosActivos > 0 ? 'Intenta modificar o limpiar los filtros seleccionados.' : 'Registra un nuevo pedido para iniciar la planificación.'
                }
                accion={
                  filtrosActivos > 0 && (
                    <Boton tamano="sm" icono={RotateCcw} onClick={limpiarFiltros}>
                      Restablecer búsqueda y filtros
                    </Boton>
                  )
                }
              />
            )}
          </div>
        </Tarjeta>
      </div>

      {/* Detalle lateral del pedido seleccionado */}
      {pedidoSeleccionado && (
        <DetallePedido
          pedido={pedidoSeleccionado}
          ejecucionId={datos.ejecucionId}
          estado={<InsigniaEstado estado={pedidoSeleccionado.estado} />}
          onCerrar={() => setCodigoSeleccionado(null)}
          // Solo se ofrece si el pedido figura en el estado en vivo: si no, no hay nada que ubicar en el mapa.
          onVerEnLienzo={
            onVerEnLienzo && datos.pedidos[pedidoSeleccionado.codigo] ? () => onVerEnLienzo(pedidoSeleccionado.codigo) : undefined
          }
        />
      )}
    </>
  );
};
