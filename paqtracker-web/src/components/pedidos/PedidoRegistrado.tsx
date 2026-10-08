import React from 'react';
import {
  CheckCircle2,
  MapPin,
  Plus,
  ArrowLeft,
  Truck,
  Clock,
  RefreshCw,
  User,
  ShieldCheck,
} from 'lucide-react';
import { ALMACENES, UNIDADES, esPlazoRegular } from '../../config/dominio';
import { capitalizar, formatearHolgura, formatearHoraRelativa } from '../../lib/formato';
import { proyectar, tramoOrtogonal, trazado } from '../../lib/malla';
import type { Coordenada } from '../../types/domain';
import type { PedidoRegistrado as Pedido, VehiculoAsignado } from '../../types/pedidos';
import { MiniMapaMalla } from '../map/MiniMapaMalla';
import { COLOR_HOLGURA } from './estilos';
import { MarcadorAlmacen, PinDestino, PuntoHolgura, RotuloMapa, UnidadEnMapa } from './iconos';

import holguraAmbarTriangulo from '../../assets/figma/pedidos/holgura-ambar-triangulo.svg';

const FilaResumen: React.FC<{ etiqueta: string; valor: React.ReactNode }> = ({ etiqueta, valor }) => (
  <div className="flex items-center justify-between w-full text-xs py-1">
    <span className="font-sans text-slate-500">{etiqueta}</span>
    <span className="font-sans font-medium text-slate-800 text-right">{valor}</span>
  </div>
);

const CeldaKpi: React.FC<{ etiqueta: string; icono?: React.ReactNode; children: React.ReactNode }> = ({
  etiqueta,
  icono,
  children,
}) => (
  <div className="flex-1 min-w-0 bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex flex-col gap-1">
    <span className="font-sans text-[11px] text-slate-500 flex items-center gap-1.5">
      {icono}
      {etiqueta}
    </span>
    {children}
  </div>
);

/** Malla completa con la ruta de la unidad: tramo recorrido y tramo pendiente hasta el nuevo destino */
const MiniMapaRuta: React.FC<{ pedido: Pedido; vehiculo: VehiculoAsignado; unidad: Coordenada }> = ({
  pedido,
  vehiculo,
  unidad,
}) => {
  const almacen = ALMACENES.find((a) => a.id === pedido.almacenOrigen) ?? ALMACENES[0];
  const { destino } = pedido.borrador;
  return (
    <MiniMapaMalla
      alto={160}
      encuadrar={[almacen.ubicacion, unidad, destino]}
      etiqueta={`Ruta de ${vehiculo.codigo} desde ${almacen.nombre} hasta (${destino.x},${destino.y})`}
    >
      {(vista, { ancho }) => {
        const pOrigen = proyectar(vista, almacen.ubicacion);
        const pUnidad = proyectar(vista, unidad);
        const pDestino = proyectar(vista, destino);
        return (
          <>
            <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
              <path d={trazado(vista, tramoOrtogonal(almacen.ubicacion, unidad))} fill="none" stroke="#9EABBA" strokeWidth="2" />
              <path
                d={trazado(vista, tramoOrtogonal(unidad, destino))}
                fill="none"
                stroke="#1E40AF"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
            </svg>
            <MarcadorAlmacen almacen={almacen.id} enRuta cx={pOrigen.x} cy={pOrigen.y} />
            <RotuloMapa x={pOrigen.x} y={pOrigen.y + 18} anchoMapa={ancho} className="font-sans font-medium text-slate-500">
              {almacen.nombreCorto}
            </RotuloMapa>
            <UnidadEnMapa tipo={vehiculo.tipo} cx={pUnidad.x} cy={pUnidad.y} />
            <RotuloMapa x={pUnidad.x} y={pUnidad.y + 14} anchoMapa={ancho} className="font-mono font-medium text-blue-700">
              {vehiculo.codigo}
            </RotuloMapa>
            <PinDestino variante="ambar" x={pDestino.x} y={pDestino.y} />
            <RotuloMapa x={pDestino.x} y={pDestino.y + 2} anchoMapa={ancho} className="font-mono font-medium text-slate-900">
              ({destino.x},{destino.y})
            </RotuloMapa>
          </>
        );
      }}
    </MiniMapaMalla>
  );
};

interface PedidoRegistradoProps {
  pedido: Pedido;
  reloj: Date;
  onVerEnLienzo: () => void;
  onRegistrarOtro: () => void;
  onVerCola: () => void;
}

export const PedidoRegistrado: React.FC<PedidoRegistradoProps> = ({
  pedido,
  reloj,
  onVerEnLienzo,
  onRegistrarOtro,
  onVerCola,
}) => {
  const { borrador, replanificacion, vehiculo } = pedido;
  const almacen = ALMACENES.find((a) => a.id === pedido.almacenOrigen);
  const nombreVehiculo = vehiculo ? `${capitalizar(UNIDADES[vehiculo.tipo].nombre)} ${vehiculo.codigo}` : 'En espera';

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-4 lg:p-6 flex flex-col gap-6">
        {/* Banner de confirmación */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-sans font-bold text-lg text-slate-900">
                  Pedido #{pedido.codigo} registrado exitosamente
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-sans font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {vehiculo ? 'Planificado' : 'En cola'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                {vehiculo
                  ? `Asignado automáticamente a ${nombreVehiculo} e incorporado a la ruta vigente.`
                  : 'Sin unidad libre al momento del registro: el pedido queda en cola para el próximo ciclo de optimización.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onVerEnLienzo}
            className="h-10 px-5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-sans font-medium text-xs flex items-center gap-2 shadow-xs transition shrink-0"
          >
            <MapPin className="w-4 h-4" />
            <span>Ver en el mapa</span>
          </button>
        </div>

        {/* Doble columna: Resumen del Pedido vs Planificación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Tarjeta 1: Resumen del Pedido */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-sans font-bold text-xs text-slate-700 tracking-wider uppercase">
                Resumen del Pedido
              </h3>
              <User className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-1 divide-y divide-slate-50">
              <FilaResumen etiqueta="Cliente" valor={borrador.cliente} />
              <FilaResumen
                etiqueta="Nodo de destino"
                valor={
                  <span className="font-mono font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    X: {borrador.destino.x} · Y: {borrador.destino.y}
                  </span>
                }
              />
              <FilaResumen etiqueta="Cantidad a entregar" valor={`${borrador.cantidad} u. de producto P`} />
              <FilaResumen
                etiqueta="Tipo de servicio"
                valor={`${esPlazoRegular(borrador.plazoHoras) ? 'Regular' : 'Priorizado'} · ${borrador.plazoHoras} horas`}
              />
              <FilaResumen
                etiqueta="Hora límite calculada"
                valor={<span className="font-mono font-bold text-slate-900">{formatearHoraRelativa(pedido.horaLimite, reloj)}</span>}
              />
              <FilaResumen etiqueta="Almacén de despacho" valor={almacen?.nombre ?? '—'} />
            </div>
          </div>

          {/* Tarjeta 2: Resultado de la Planificación */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-sans font-bold text-xs text-slate-700 tracking-wider uppercase">
                Resultado de Planificación
              </h3>
              <ShieldCheck className="w-4 h-4 text-slate-400" />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <CeldaKpi etiqueta="Vehículo" icono={<Truck className="w-3 h-3 text-blue-600" />}>
                <span className="font-mono font-bold text-sm text-slate-900 truncate">{nombreVehiculo}</span>
              </CeldaKpi>
              <CeldaKpi etiqueta="ETA" icono={<Clock className="w-3 h-3 text-slate-400" />}>
                <span className="font-mono font-bold text-sm text-slate-900">
                  {pedido.eta ? formatearHoraRelativa(pedido.eta, reloj) : '—'}
                </span>
              </CeldaKpi>
              <CeldaKpi etiqueta="Holgura SLA">
                <span className="flex items-center gap-1.5 font-mono font-bold text-sm">
                  {pedido.nivelHolgura === 'AMBAR' ? (
                    <img src={holguraAmbarTriangulo} alt="" className="block size-3.5" />
                  ) : (
                    <PuntoHolgura nivel={pedido.nivelHolgura} />
                  )}
                  <span className={COLOR_HOLGURA[pedido.nivelHolgura]}>
                    {formatearHolgura(pedido.holguraMinutos)}
                  </span>
                </span>
              </CeldaKpi>
            </div>

            {/* Minimapa de la ruta */}
            {vehiculo && pedido.posicionVehiculo && (
              <figure className="flex flex-col gap-1.5 mt-1">
                <MiniMapaRuta pedido={pedido} vehiculo={vehiculo} unidad={pedido.posicionVehiculo} />
                <figcaption className="font-sans text-[11px] text-slate-500 text-center">
                  Nuevo nodo de entrega insertado en el plan de ruta de {vehiculo.codigo}.
                </figcaption>
              </figure>
            )}

            {/* Replanificación en vivo */}
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 flex items-center gap-2.5 text-xs text-blue-900">
              <RefreshCw className="w-4 h-4 text-blue-700 shrink-0" />
              <p className="leading-relaxed">
                {replanificacion.replanifico
                  ? `Plan optimizado por el motor en ${replanificacion.milisegundos} ms · ${replanificacion.unidadesDespachadas} ${
                      replanificacion.unidadesDespachadas === 1 ? 'unidad en despacho' : 'unidades en despacho'
                    }.`
                  : 'El pedido se integrará al próximo ciclo de replanificación del planificador.'}
              </p>
            </div>
          </div>
        </div>

        {/* Acciones Finales */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVerEnLienzo}
              className="h-10 px-5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-sans font-medium text-xs flex items-center gap-2 shadow-xs transition"
            >
              <MapPin className="w-4 h-4" />
              <span>Ver seguimiento en el mapa en vivo</span>
            </button>
            <button
              type="button"
              onClick={onRegistrarOtro}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-sans font-medium text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar otro pedido</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onVerCola}
            className="h-10 px-4 rounded-xl text-blue-700 hover:text-blue-800 hover:bg-blue-50 font-sans font-medium text-xs flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la cola de pedidos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
