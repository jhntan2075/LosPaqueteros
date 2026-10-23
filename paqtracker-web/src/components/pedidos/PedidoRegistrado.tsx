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
import { ALMACENES, UNIDADES } from '../../config/dominio';
import { ESTADO_EN_ESPERA, etiquetaPlazo } from '../../config/glosario';
import { capitalizar, formatearHolgura, formatearHoraRelativa } from '../../lib/formato';
import { proyectar, tramoOrtogonal, trazado } from '../../lib/malla';
import type { Coordenada } from '../../types/domain';
import type { PedidoRegistrado as Pedido, VehiculoAsignado } from '../../types/pedidos';
import { NEUTRO, PRIMARIO } from '../../config/colores';
import { MiniMapaMalla } from '../map/MiniMapaMalla';
import { COLOR_SIN_DATO, colorDeUnidad } from '../map/iconosVehiculo';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { COLOR_HOLGURA } from './estilos';
import { MarcadorAlmacen, PinDestino, PuntoHolgura, RotuloMapa, UnidadEnMapa } from './iconos';

import holguraAmbarTriangulo from '../../assets/figma/pedidos/holgura-ambar-triangulo.svg';
import { Boton } from '../ui/Boton';
import { Etiqueta } from '../ui/Etiqueta';

const FilaResumen: React.FC<{ etiqueta: string; valor: React.ReactNode }> = ({ etiqueta, valor }) => (
  <div className="flex items-center justify-between w-full text-body py-1">
    <span className="font-sans text-neutral-500">{etiqueta}</span>
    <span className="font-sans font-medium text-neutral-800 text-right">{valor}</span>
  </div>
);

const CeldaKpi: React.FC<{ etiqueta: string; icono?: React.ReactNode; children: React.ReactNode }> = ({
  etiqueta,
  icono,
  children,
}) => (
  <div className="flex-1 min-w-0 bg-neutral-50 rounded-[10px] p-3.5 border border-neutral-200/80 flex flex-col gap-1">
    <span className="font-sans text-caption text-neutral-500 flex items-center gap-1.5">
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
  // Color en vivo de la unidad asignada (su carga actual), igual que en el mapa de Operación.
  const actual = useDatosOperacion().flota.find((u) => u.codigo === vehiculo.codigo);
  const color = actual ? colorDeUnidad(actual) : COLOR_SIN_DATO;
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
              <path d={trazado(vista, tramoOrtogonal(almacen.ubicacion, unidad))} fill="none" stroke={NEUTRO[300]} strokeWidth="2" />
              <path
                d={trazado(vista, tramoOrtogonal(unidad, destino))}
                fill="none"
                stroke={PRIMARIO}
                strokeWidth="2"
                strokeDasharray="5 4"
              />
            </svg>
            <MarcadorAlmacen almacen={almacen.id} enRuta cx={pOrigen.x} cy={pOrigen.y} />
            <RotuloMapa x={pOrigen.x} y={pOrigen.y + 18} anchoMapa={ancho} className="font-sans font-medium text-neutral-500">
              {almacen.nombreCorto}
            </RotuloMapa>
            <UnidadEnMapa tipo={vehiculo.tipo} color={color} cx={pUnidad.x} cy={pUnidad.y} />
            <RotuloMapa x={pUnidad.x} y={pUnidad.y + 14} anchoMapa={ancho} className="tabular-nums font-medium text-primary-600">
              {vehiculo.codigo}
            </RotuloMapa>
            <PinDestino variante="ambar" x={pDestino.x} y={pDestino.y} />
            <RotuloMapa x={pDestino.x} y={pDestino.y + 2} anchoMapa={ancho} className="tabular-nums font-medium text-neutral-900">
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
  /** Sin valor, el pedido aún no figura en el estado en vivo y no se ofrece ubicarlo. */
  onVerEnLienzo?: () => void;
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
  const nombreVehiculo = vehiculo ? `${capitalizar(UNIDADES[vehiculo.tipo].nombre)} ${vehiculo.codigo}` : 'Sin asignar';

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-4 lg:p-6 flex flex-col gap-6">
        {/* Banner de confirmación */}
        <div className="bg-white border border-ok-600/30 rounded-[10px] p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-[10px] bg-ok-50 flex items-center justify-center text-ok-700 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-sans font-bold text-title text-neutral-900">Pedido {pedido.codigo} registrado</h2>
                <Etiqueta tono={vehiculo ? 'ok' : 'atencion'}>{vehiculo ? 'Planificado' : ESTADO_EN_ESPERA}</Etiqueta>
              </div>
              <p className="text-body text-neutral-500 font-sans mt-0.5">
                {vehiculo
                  ? `Asignado automáticamente a ${nombreVehiculo} e incorporado a la ruta vigente.`
                  : 'No había una unidad libre al registrarlo: queda en espera y entra en la próxima planificación.'}
              </p>
            </div>
          </div>

          {onVerEnLienzo && (
            <Boton variante="primario" tamano="lg" className="shrink-0"
              onClick={onVerEnLienzo}
            >
              <MapPin className="w-4 h-4" />
              <span>Ubicar en el mapa en vivo</span>
            </Boton>
          )}
        </div>

        {/* Doble columna: Resumen del Pedido vs Planificación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Tarjeta 1: Resumen del Pedido */}
          <div className="bg-white border border-neutral-200 rounded-[10px] p-6 shadow-xs flex flex-col gap-4">
            <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
              <h3 className="font-sans font-bold text-body text-neutral-700 tracking-wider uppercase">
                Resumen del pedido
              </h3>
              <User className="w-4 h-4 text-neutral-500" />
            </div>

            <div className="space-y-1 divide-y divide-neutral-50">
              <FilaResumen etiqueta="Cliente" valor={borrador.cliente} />
              <FilaResumen
                etiqueta="Nodo de destino"
                valor={
                  <span className="tabular-nums font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                    X: {borrador.destino.x} · Y: {borrador.destino.y}
                  </span>
                }
              />
              <FilaResumen etiqueta="Cantidad" valor={`${borrador.cantidad} unidades de P`} />
              <FilaResumen
                etiqueta="Tipo de entrega"
                valor={etiquetaPlazo(borrador.plazoHoras)}
              />
              <FilaResumen
                etiqueta="Hora límite"
                valor={<span className="tabular-nums font-bold text-neutral-900">{formatearHoraRelativa(pedido.horaLimite, reloj)}</span>}
              />
              <FilaResumen etiqueta="Almacén de despacho" valor={almacen?.nombre ?? '—'} />
            </div>
          </div>

          {/* Tarjeta 2: Resultado de la Planificación */}
          <div className="bg-white border border-neutral-200 rounded-[10px] p-6 shadow-xs flex flex-col gap-4">
            <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
              <h3 className="font-sans font-bold text-body text-neutral-700 tracking-wider uppercase">
                Resultado de la planificación
              </h3>
              <ShieldCheck className="w-4 h-4 text-neutral-500" />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <CeldaKpi etiqueta="Vehículo" icono={<Truck className="w-3 h-3 text-primary-600" />}>
                <span className="tabular-nums font-bold text-body-lg text-neutral-900 truncate">{nombreVehiculo}</span>
              </CeldaKpi>
              <CeldaKpi etiqueta="ETA" icono={<Clock className="w-3 h-3 text-neutral-500" />}>
                <span className="tabular-nums font-bold text-body-lg text-neutral-900">
                  {pedido.eta ? formatearHoraRelativa(pedido.eta, reloj) : '—'}
                </span>
              </CeldaKpi>
              <CeldaKpi etiqueta="Holgura">
                <span className="flex items-center gap-1.5 tabular-nums font-bold text-body-lg">
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
                <figcaption className="font-sans text-caption text-neutral-500 text-center">
                  El destino se agregó a la ruta de {vehiculo.codigo}.
                </figcaption>
              </figure>
            )}

            {/* Replanificación en vivo */}
            <div className="p-3 bg-primary-50/70 rounded-[10px] border border-primary-100/80 flex items-center gap-2.5 text-body text-primary-900">
              <RefreshCw className="w-4 h-4 text-primary-600 shrink-0" />
              <p className="leading-relaxed">
                {replanificacion.replanifico
                  ? `Planificado en ${replanificacion.milisegundos} ms · ${replanificacion.unidadesDespachadas} ${
                      replanificacion.unidadesDespachadas === 1 ? 'unidad en reparto' : 'unidades en reparto'
                    }.`
                  : 'El pedido entra en la próxima planificación.'}
              </p>
            </div>
          </div>
        </div>

        {/* Acciones Finales */}
        <div className="bg-white border border-neutral-200 rounded-[10px] p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <Boton variante="secundario" tamano="lg"
              onClick={onRegistrarOtro}
            >
              <Plus className="w-4 h-4" />
              <span>Registrar otro pedido</span>
            </Boton>
          </div>

          <button
            type="button"
            onClick={onVerCola}
            className="h-10 px-4 rounded-[6px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 font-sans font-medium text-body flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la cola de pedidos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
