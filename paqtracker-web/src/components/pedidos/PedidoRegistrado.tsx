import React from 'react';
import { ALMACENES, UNIDADES, esPlazoRegular } from '../../config/dominio';
import { capitalizar, formatearHolgura, formatearHoraRelativa } from '../../lib/formato';
import { proyectar, tramoOrtogonal, trazado } from '../../lib/malla';
import type { PedidoRegistrado as Pedido } from '../../types/pedidos';
import { MiniMapaMalla } from '../map/MiniMapaMalla';
import { COLOR_HOLGURA } from './estilos';
import { MarcadorAlmacen, PinDestino, PuntoHolgura, RotuloMapa, UnidadEnMapa } from './iconos';

import holguraAmbarTriangulo from '../../assets/figma/pedidos/holgura-ambar-triangulo.svg';

// PE-01 · Pedido registrado (Figma 1:12733).

const FilaResumen: React.FC<{ etiqueta: string; valor: string; mono?: boolean }> = ({ etiqueta, valor, mono = false }) => (
  <div className="flex items-center justify-between w-full">
    <span className="font-sans text-[#64748B]">{etiqueta}</span>
    <span className={mono ? 'font-mono font-medium text-[#0F172A]' : 'font-sans font-medium text-[#0F172A]'}>{valor}</span>
  </div>
);

const Celda: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({ etiqueta, children }) => (
  <div className="flex-1 min-w-0 bg-[#F8FAFC] rounded-[8px] px-[12px] py-[10px] flex flex-col gap-[4px] whitespace-nowrap">
    <span className="font-sans text-[12px] text-[#64748B]">{etiqueta}</span>
    {children}
  </div>
);

/** Malla completa con la ruta de la unidad: tramo ya recorrido (gris) y tramo pendiente hasta el nuevo destino (azul). */
const MiniMapaRuta: React.FC<{ pedido: Pedido }> = ({ pedido }) => {
  const almacen = ALMACENES.find((a) => a.id === pedido.almacenOrigen) ?? ALMACENES[0];
  const { destino } = pedido.borrador;
  const unidad = pedido.posicionVehiculo;
  return (
    <MiniMapaMalla
      alto={150}
      encuadrar={[almacen.ubicacion, unidad, destino]}
      etiqueta={`Ruta de ${pedido.vehiculo.codigo} desde ${almacen.nombre} hasta (${destino.x},${destino.y})`}
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
            <RotuloMapa x={pOrigen.x} y={pOrigen.y + 18} anchoMapa={ancho} className="font-sans font-medium text-[#64748B]">
              {almacen.nombreCorto}
            </RotuloMapa>
            <UnidadEnMapa tipo={pedido.vehiculo.tipo} cx={pUnidad.x} cy={pUnidad.y} />
            <RotuloMapa x={pUnidad.x} y={pUnidad.y + 14} anchoMapa={ancho} className="font-mono font-medium text-[#1E40AF]">
              {pedido.vehiculo.codigo}
            </RotuloMapa>
            <PinDestino variante="ambar" x={pDestino.x} y={pDestino.y} />
            <RotuloMapa x={pDestino.x} y={pDestino.y + 2} anchoMapa={ancho} className="font-mono font-medium text-[#0F172A]">
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

export const PedidoRegistrado: React.FC<PedidoRegistradoProps> = ({ pedido, reloj, onVerEnLienzo, onRegistrarOtro, onVerCola }) => {
  const { borrador, replanificacion } = pedido;
  const almacen = ALMACENES.find((a) => a.id === pedido.almacenOrigen);
  const nombreVehiculo = capitalizar(UNIDADES[pedido.vehiculo.tipo].nombre);

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="min-w-[1064px] px-[32px] pt-[38px] pb-[24px] flex justify-center leading-[normal]">
        <section className="w-[1000px] bg-white border border-[#E2E8F0] rounded-[12px] px-[32px] py-[28px] flex flex-col gap-[20px]">
          {/* Banner */}
          <div className="flex items-center gap-[14px]">
            <div className="relative bg-[#1E40AF] rounded-full size-[38px] shrink-0" aria-hidden="true">
              <span className="absolute left-[10px] top-[8px] font-sans font-semibold text-[20px] leading-[normal] text-white">✓</span>
            </div>
            <div className="flex flex-col gap-[2px]" role="status">
              <p className="font-sans font-semibold text-[17px] text-[#0F172A]">Pedido {pedido.codigo} registrado y planificado</p>
              <p className="font-sans text-[12px] text-[#64748B]">
                Asignado automáticamente a una unidad y añadido al plan de rutas vigente.
              </p>
            </div>
          </div>

          <div className="bg-[#E2E8F0] h-px w-full" />

          <div className="flex gap-[40px] items-start">
            {/* Resumen */}
            <div className="w-[400px] shrink-0 flex flex-col gap-[12px] text-[12px] whitespace-nowrap">
              <h2 className="font-sans font-semibold text-[#64748B] tracking-[0.7px]">RESUMEN DEL PEDIDO</h2>
              <FilaResumen etiqueta="Cliente" valor={borrador.cliente} />
              <FilaResumen
                etiqueta="Nodo de destino"
                valor={`(${borrador.destino.x},${borrador.destino.y})`}
                mono
              />
              <FilaResumen etiqueta="Cantidad" valor={`${borrador.cantidad} u. de P`} />
              <FilaResumen
                etiqueta="Tipo de entrega"
                valor={`${esPlazoRegular(borrador.plazoHoras) ? 'Regular' : 'Priorizada'} ${borrador.plazoHoras} h`}
              />
              <FilaResumen etiqueta="Hora límite" valor={formatearHoraRelativa(pedido.horaLimite, reloj)} mono />
              <FilaResumen etiqueta="Almacén de origen" valor={almacen?.nombre ?? '—'} />
            </div>

            {/* Resultado */}
            <div className="flex-1 min-w-0 flex flex-col gap-[14px]">
              <h2 className="font-sans font-semibold text-[12px] text-[#64748B] tracking-[0.7px]">RESULTADO DE LA PLANIFICACIÓN</h2>
              <div className="flex gap-[14px]">
                <Celda etiqueta="Vehículo asignado">
                  <span className="font-mono font-semibold text-[16px] text-[#0F172A]">
                    {nombreVehiculo} {pedido.vehiculo.codigo}
                  </span>
                </Celda>
                <Celda etiqueta="ETA">
                  <span className="font-mono font-semibold text-[16px] text-[#0F172A]">{formatearHoraRelativa(pedido.eta, reloj)}</span>
                </Celda>
                <Celda etiqueta="Holgura resultante">
                  <span className="flex items-center gap-[6px]">
                    {pedido.nivelHolgura === 'AMBAR' ? (
                      <img src={holguraAmbarTriangulo} alt="" className="block" />
                    ) : (
                      <PuntoHolgura nivel={pedido.nivelHolgura} />
                    )}
                    <span className={`font-mono font-semibold text-[16px] ${COLOR_HOLGURA[pedido.nivelHolgura]}`}>
                      {formatearHolgura(pedido.holguraMinutos)}
                    </span>
                  </span>
                </Celda>
              </div>

              <figure className="flex flex-col gap-[6px]">
                <MiniMapaRuta pedido={pedido} />
                <figcaption className="font-sans font-medium text-[12px] text-[#64748B]">
                  nuevo pedido insertado en la ruta de {pedido.vehiculo.codigo}
                </figcaption>
              </figure>

              <div className="bg-[#EDF2FC] rounded-[8px] px-[12px] py-[10px] flex items-center gap-[8px] text-[#1E40AF]">
                <span className="font-sans font-medium text-[13px]" aria-hidden="true">
                  ⟳
                </span>
                <p className="flex-1 font-sans text-[12px]">
                  Replanificación disparada — plan actualizado en {String(replanificacion.segundos).replace('.', ',')} s ·{' '}
                  {replanificacion.rutasAfectadas} rutas afectadas · {replanificacion.pedidosEnRiesgoNuevos} pedidos en riesgo
                  nuevos.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#E2E8F0] h-px w-full" />

          <div className="flex items-center gap-[12px]">
            <button
              type="button"
              onClick={onVerEnLienzo}
              className="bg-[#1E40AF] rounded-[8px] h-[44px] px-[20px] font-sans font-semibold text-[13px] text-white hover:bg-[#1E3A8A] transition"
            >
              Ver en el lienzo
            </button>
            <button
              type="button"
              onClick={onRegistrarOtro}
              className="border border-[#E2E8F0] rounded-[8px] h-[44px] px-[20px] font-sans font-medium text-[13px] text-[#64748B] hover:bg-[#F8FAFC] transition"
            >
              Registrar otro pedido
            </button>
            <button
              type="button"
              onClick={onVerCola}
              className="rounded-[8px] h-[44px] px-[20px] font-sans font-medium text-[13px] text-[#1E40AF] hover:underline"
            >
              Ver cola de pedidos
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
