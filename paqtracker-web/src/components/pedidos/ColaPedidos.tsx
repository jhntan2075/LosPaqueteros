import React, { useMemo, useState } from 'react';
import { PLAZOS_HORAS, UNIDADES, esPlazoRegular, type PlazoHoras, type TipoUnidad } from '../../config/dominio';
import { capitalizar, formatearMiles } from '../../lib/formato';
import { useColaPedidos } from '../../hooks/usePedidos';
import type { EstadoPedidoCola, PedidoEnCola } from '../../types/pedidos';
import { COLOR_HOLGURA } from './estilos';
import { PuntoHolgura } from './iconos';

// PE-02 · Cola de pedidos en curso (Figma 1:10963).

const ESTADOS: Record<EstadoPedidoCola, { etiqueta: string; color: string }> = {
  EN_TRANSITO: { etiqueta: 'En tránsito', color: 'text-[#1E40AF]' },
  PLANIFICADO: { etiqueta: 'Planificado', color: 'text-[#1E40AF]' },
  REGISTRADO: { etiqueta: 'Registrado', color: 'text-[#64748B]' },
  ENTREGADO: { etiqueta: 'Entregado', color: 'text-[#64748B]' },
  INCUMPLIDO: { etiqueta: 'Incumplido', color: 'text-[#0F172A]' },
};

const TODOS = 'TODOS';
const SIN_ASIGNAR = 'SIN_ASIGNAR';

interface Filtros {
  estado: EstadoPedidoCola | typeof TODOS;
  plazo: PlazoHoras | typeof TODOS;
  vehiculo: TipoUnidad | typeof SIN_ASIGNAR | typeof TODOS;
}

const SIN_FILTROS: Filtros = { estado: TODOS, plazo: TODOS, vehiculo: TODOS };

const etiquetaPlazo = (plazo: number) => `${esPlazoRegular(plazo) ? 'Regular' : 'Priorizado'} ${plazo} h`;

const etiquetaVehiculo = (pedido: PedidoEnCola) =>
  pedido.vehiculo ? `${capitalizar(UNIDADES[pedido.vehiculo.tipo].nombre)} ${pedido.vehiculo.codigo}` : '—';

const COLUMNAS = 'grid grid-cols-[95px_200px_70px_150px_105px_95px_150px_130px_minmax(0,1fr)] pl-[20px] items-center';

interface ChipFiltroProps {
  titulo: string;
  valor: string;
  opciones: { valor: string; etiqueta: string }[];
  resaltado: boolean;
  onCambiar: (valor: string) => void;
}

/** Chip con un <select> nativo superpuesto: conserva el aspecto del diseño y la accesibilidad del control. */
const ChipFiltro: React.FC<ChipFiltroProps> = ({ titulo, valor, opciones, resaltado, onCambiar }) => {
  const actual = opciones.find((opcion) => opcion.valor === valor)?.etiqueta ?? 'Todos';
  return (
    <label
      className={`relative flex items-start px-[7px] py-[3px] rounded-[4px] text-[12px] whitespace-nowrap cursor-pointer focus-within:ring-2 focus-within:ring-[#1E40AF]/40 ${
        resaltado ? 'bg-[#DBEAFE] text-[#1E40AF] font-medium' : 'bg-white border border-[#E2E8F0] text-[#64748B]'
      }`}
    >
      {titulo}: {actual}
      <select
        value={valor}
        onChange={(evento) => onCambiar(evento.target.value)}
        aria-label={`Filtrar por ${titulo.toLowerCase()}`}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        <option value={TODOS}>Todos</option>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
};

function exportarCsv(pedidos: PedidoEnCola[]) {
  const encabezado = ['ID', 'Cliente', 'Cantidad', 'Plazo', 'Hora límite', 'ETA', 'Holgura', 'Vehículo', 'Estado'];
  const filas = pedidos.map((pedido) => [
    pedido.codigo,
    pedido.cliente,
    pedido.cantidad,
    etiquetaPlazo(pedido.plazoHoras),
    pedido.horaLimite,
    pedido.eta ?? '',
    pedido.holgura,
    pedido.vehiculo ? etiquetaVehiculo(pedido) : '',
    ESTADOS[pedido.estado].etiqueta,
  ]);
  const csv = [encabezado, ...filas]
    .map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  enlace.download = 'pedidos-en-curso.csv';
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 0);
}

export const ColaPedidos: React.FC<{ onRegistrar: () => void }> = ({ onRegistrar }) => {
  const { pedidos, total, cargando, error } = useColaPedidos();
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);

  const visibles = useMemo(
    () =>
      pedidos.filter(
        (pedido) =>
          (filtros.estado === TODOS || pedido.estado === filtros.estado) &&
          (filtros.plazo === TODOS || pedido.plazoHoras === filtros.plazo) &&
          (filtros.vehiculo === TODOS ||
            (filtros.vehiculo === SIN_ASIGNAR ? pedido.vehiculo === null : pedido.vehiculo?.tipo === filtros.vehiculo)),
      ),
    [pedidos, filtros],
  );

  const filtrosActivos = Object.values(filtros).filter((valor) => valor !== TODOS).length;
  const resumenFiltros =
    filtrosActivos === 0 ? 'sin filtros activos' : `${filtrosActivos} ${filtrosActivos === 1 ? 'filtro activo' : 'filtros activos'}`;

  return (
    <section className="flex-1 min-h-0 flex flex-col leading-[normal] bg-white border border-[#E2E8F0] rounded-[10px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.16)] overflow-hidden">
      {/* Título */}
      <div className="flex items-center px-[12px] pt-[11px] pb-[5px] text-[12px]">
        <h2 className="font-sans font-semibold text-[#64748B] tracking-[0.7px]">COLA DE PEDIDOS EN CURSO</h2>
        <span className="ml-auto font-mono text-[#94A3B8]">{formatearMiles(total)} pedidos</span>
        {/* PE-01 no tiene otro acceso: el lienzo de Operación ya no lleva este botón en el diseño vigente */}
        <button
          type="button"
          onClick={onRegistrar}
          className="ml-[12px] h-[28px] px-[12px] rounded-full bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-sans font-medium text-[12px] flex items-center gap-[6px]"
        >
          <span className="font-semibold text-[14px] leading-none">+</span> Registrar pedido
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-[7px] px-[12px] pt-[10px] pb-[9px]">
        <div className="flex gap-[4px]">
          <ChipFiltro
            titulo="Estado"
            valor={filtros.estado}
            resaltado
            opciones={Object.entries(ESTADOS).map(([valor, { etiqueta }]) => ({ valor, etiqueta }))}
            onCambiar={(valor) => setFiltros({ ...filtros, estado: valor as Filtros['estado'] })}
          />
          <ChipFiltro
            titulo="Plazo"
            valor={String(filtros.plazo)}
            resaltado={filtros.plazo !== TODOS}
            opciones={PLAZOS_HORAS.map((plazo) => ({ valor: String(plazo), etiqueta: etiquetaPlazo(plazo) }))}
            onCambiar={(valor) => setFiltros({ ...filtros, plazo: valor === TODOS ? TODOS : (Number(valor) as PlazoHoras) })}
          />
          <ChipFiltro
            titulo="Vehículo"
            valor={filtros.vehiculo}
            resaltado={filtros.vehiculo !== TODOS}
            opciones={[
              ...(Object.keys(UNIDADES) as TipoUnidad[]).map((tipo) => ({ valor: tipo, etiqueta: capitalizar(UNIDADES[tipo].nombre) })),
              { valor: SIN_ASIGNAR, etiqueta: 'Sin asignar' },
            ]}
            onCambiar={(valor) => setFiltros({ ...filtros, vehiculo: valor as Filtros['vehiculo'] })}
          />
        </div>
        <div className="flex items-center gap-[8px] text-[12px]">
          <p className="text-[#64748B]">
            Mostrando {visibles.length} de {formatearMiles(total)} pedidos · {resumenFiltros}
          </p>
          <button
            type="button"
            onClick={() => setFiltros(SIN_FILTROS)}
            className="ml-auto bg-white border border-[#E2E8F0] rounded-[4px] px-[7px] py-[3px] text-[#0F172A] hover:bg-[#F8FAFC] transition"
          >
            limpiar filtros
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 overflow-y-auto" role="table" aria-label="Pedidos en curso">
        <div
          role="row"
          className={`${COLUMNAS} h-[28px] border-b border-[#E2E8F0] font-sans font-semibold text-[12px] text-[#64748B] sticky top-0 bg-white`}
        >
          {['ID', 'CLIENTE', 'CANT.', 'PLAZO', 'HORA LÍMITE', 'ETA', 'HOLGURA', 'VEHÍCULO', 'ESTADO'].map((titulo) => (
            <span key={titulo} role="columnheader">
              {titulo}
            </span>
          ))}
        </div>

        {visibles.map((pedido, indice) => (
          <div
            key={pedido.codigo}
            role="row"
            className={`${COLUMNAS} h-[36px] border-b border-[#E2E8F0] text-[12px] whitespace-nowrap ${indice % 2 === 1 ? 'bg-[#F8FAFC]' : ''}`}
          >
            <span role="cell" className="font-mono font-medium text-[#0F172A]">{pedido.codigo}</span>
            <span role="cell" className="font-sans text-[#0F172A] truncate pr-2">{pedido.cliente}</span>
            <span role="cell" className="font-mono text-[#64748B]">{pedido.cantidad} u.</span>
            <span role="cell" className="font-sans text-[#64748B]">{etiquetaPlazo(pedido.plazoHoras)}</span>
            <span role="cell" className="font-mono text-[#64748B]">{pedido.horaLimite}</span>
            <span role="cell" className="font-mono text-[#64748B]">{pedido.eta ?? '—'}</span>
            <span role="cell" className="flex items-center gap-[6px]">
              <PuntoHolgura nivel={pedido.nivelHolgura} />
              <span className={`font-mono font-medium ${COLOR_HOLGURA[pedido.nivelHolgura]}`}>{pedido.holgura}</span>
            </span>
            <span role="cell" className="font-mono text-[#64748B]">{etiquetaVehiculo(pedido)}</span>
            <span role="cell" className={`font-sans font-medium ${ESTADOS[pedido.estado].color}`}>
              {ESTADOS[pedido.estado].etiqueta}
            </span>
          </div>
        ))}

        {error && <p className="px-[20px] py-[14px] text-[12px] text-[#B91C1C]">{error}</p>}
        {!error && visibles.length === 0 && (
          <p className="px-[20px] py-[14px] text-[12px] text-[#64748B]">
            {cargando ? 'Cargando pedidos…' : pedidos.length === 0 ? 'Aún no hay pedidos registrados.' : 'Ningún pedido coincide con los filtros.'}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-start h-[44px] px-[20px] py-[14px] text-[12px] shrink-0">
        <button type="button" onClick={() => setFiltros(SIN_FILTROS)} className="font-sans font-medium text-[#1E40AF] hover:underline">
          Todos los pedidos en curso
        </button>
        <button type="button" onClick={() => exportarCsv(visibles)} className="ml-auto font-sans text-[#64748B] hover:text-[#0F172A]">
          exportar CSV
        </button>
      </div>
    </section>
  );
};
