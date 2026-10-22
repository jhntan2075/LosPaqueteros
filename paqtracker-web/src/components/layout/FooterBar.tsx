import React from 'react';
import { RANGO_HOLGURA } from '../../config/glosario';

export interface FooterBarProps {
  nodoSeleccionado?: { x: number; y: number };
  totalPedidos?: number;
  entregados?: number;
  enRuta?: number;
  /** Pedidos en nivel crítico (rojo) del semáforo de holgura. */
  criticos?: number;
  bloqueosActivos?: number;
  averiasActivas?: number;
  segundosDesdeActualizacion?: number;
  /** Estado de la conexión STOMP; sin conexión, el indicador deja de mostrarse como en vivo. */
  conectado?: boolean;
  /** Reemplaza "actualizado hace N s" (p. ej. "mapa congelado al detectar el colapso"). */
  estadoAlerta?: string;
}

const SEGUNDOS_SIN_ACTUALIZAR = 10;

const formatearAntiguedad = (segundos: number) => (segundos < 60 ? `${segundos} s` : `${Math.floor(segundos / 60)} min`);

export const FooterBar: React.FC<FooterBarProps> = ({
  nodoSeleccionado,
  totalPedidos = 0,
  entregados = 0,
  enRuta = 0,
  criticos = 0,
  bloqueosActivos = 0,
  averiasActivas = 0,
  segundosDesdeActualizacion = 0,
  conectado = true,
  estadoAlerta,
}) => {
  // El estado llega cada Sc (1 s): pasado el umbral sin instantáneas, el dato ya no es "en vivo".
  const desfasado = segundosDesdeActualizacion >= SEGUNDOS_SIN_ACTUALIZAR;
  const hace = formatearAntiguedad(segundosDesdeActualizacion);
  const indicador = !conectado
    ? { punto: 'bg-[#B91C1C]', texto: `sin conexión · último dato hace ${hace}`, color: 'text-[#B91C1C]' }
    : desfasado
      ? { punto: 'bg-[#B45309]', texto: `sin actualizaciones hace ${hace}`, color: 'text-[#B45309]' }
      : { punto: 'bg-[#15803D] animate-pulse', texto: `actualizado hace ${hace}`, color: 'text-[#64748B]' };
  const actualizacion = (
    <>
      <span className={`w-1.5 h-1.5 rounded-full ${indicador.punto}`}></span>
      <span className={`font-sans text-[12px] ${indicador.color}`}>{indicador.texto}</span>
    </>
  );
  return (
    <footer className="h-[30px] bg-white border-t border-[#E2E8F0] px-4 flex items-center justify-between text-[12px] select-none flex-shrink-0 z-20">
      <div className="flex items-center gap-4 overflow-x-auto">
        {/* Nodo bajo el cursor (solo sobre el lienzo) */}
        {nodoSeleccionado && (
          <>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[#64748B] font-sans font-normal">nodo</span>
              <span className="text-[#0F172A] tabular-nums font-medium">
                ({nodoSeleccionado.x},{nodoSeleccionado.y})
              </span>
            </div>

            <div className="w-[1px] h-[14px] bg-[#E2E8F0] flex-shrink-0"></div>
          </>
        )}

        {/* Pedidos */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[#64748B] font-sans font-normal">pedidos</span>
          <span className="text-[#0F172A] tabular-nums font-medium">{totalPedidos}</span>
        </div>

        {/* Entregados */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[#64748B] font-sans font-normal">entregados</span>
          <span className="text-[#0F172A] tabular-nums font-medium">{entregados}</span>
        </div>

        {/* En ruta */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[#64748B] font-sans font-normal">en tránsito</span>
          <span className="text-[#0F172A] tabular-nums font-medium">{enRuta}</span>
        </div>

        {/* En riesgo */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[#64748B] font-sans font-normal">críticos</span>
          <span className="text-[#B91C1C] tabular-nums font-medium">{criticos}</span>
        </div>

        {/* Bloqueos activos */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[#64748B] font-sans font-normal">bloqueos activos</span>
          <span className="text-[#B45309] tabular-nums font-medium">{bloqueosActivos}</span>
        </div>

        {/* Averías activas */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[#64748B] font-sans font-normal">averías activas</span>
          <span className="text-[#B91C1C] tabular-nums font-medium">{averiasActivas}</span>
        </div>
      </div>

      {/* Lado derecho: Leyenda de holguras y estado de actualización */}
      <div className="flex items-center gap-3.5 flex-shrink-0 pl-2">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-[#64748B] font-sans">holgura</span>

          <div className="flex items-center gap-1">
            <span className="w-[7px] h-[7px] bg-[#15803D] rounded-[1px] inline-block"></span>
            <span className="text-[#15803D] tabular-nums font-normal">{RANGO_HOLGURA.VERDE}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[#B45309] text-[11px] leading-none">▲</span>
            <span className="text-[#B45309] tabular-nums font-normal">{RANGO_HOLGURA.AMBAR}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-[7px] h-[7px] bg-[#B91C1C] rounded-full inline-block"></span>
            <span className="text-[#B91C1C] tabular-nums font-normal">{RANGO_HOLGURA.ROJO}</span>
          </div>
        </div>

        <div className="w-[1px] h-[14px] bg-[#E2E8F0]"></div>

        {/* Antigüedad del último dato recibido */}
        {estadoAlerta ? (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#B91C1C] rounded-full"></span>
            <span className="text-[#64748B] font-sans text-[12px]">{estadoAlerta}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">{actualizacion}</div>
        )}
      </div>
    </footer>
  );
};
