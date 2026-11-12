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
    ? { punto: 'bg-critical-600', texto: `sin conexión · último dato hace ${hace}`, color: 'text-critical-600' }
    : desfasado
      ? { punto: 'bg-warn-500', texto: `sin actualizaciones hace ${hace}`, color: 'text-warn-700' }
      : { punto: 'bg-ok-600 animate-pulse', texto: `actualizado hace ${hace}`, color: 'text-neutral-600' };
  const actualizacion = (
    <>
      <span className={`size-1.5 rounded-full ${indicador.punto}`}></span>
      <span className={`font-sans text-body-sm ${indicador.color}`}>{indicador.texto}</span>
    </>
  );
  return (
    <footer className="h-[30px] bg-superficie border-t border-neutral-200 px-4 flex items-center justify-between text-body-sm select-none flex-shrink-0 z-20">
      <div className="flex items-center gap-4 overflow-x-auto">
        {/* Nodo bajo el cursor (solo sobre el lienzo) */}
        {nodoSeleccionado && (
          <>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-neutral-600 font-sans font-normal">nodo</span>
              <span className="text-neutral-900 tabular-nums font-medium">
                ({nodoSeleccionado.x},{nodoSeleccionado.y})
              </span>
            </div>

            <div className="w-px h-3.5 bg-neutral-200 flex-shrink-0"></div>
          </>
        )}

        {/* Pedidos */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-neutral-600 font-sans font-normal">pedidos</span>
          <span className="text-neutral-900 tabular-nums font-medium">{totalPedidos}</span>
        </div>

        {/* Entregados */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-neutral-600 font-sans font-normal">entregados</span>
          <span className="text-neutral-900 tabular-nums font-medium">{entregados}</span>
        </div>

        {/* En ruta */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-neutral-600 font-sans font-normal">en tránsito</span>
          <span className="text-neutral-900 tabular-nums font-medium">{enRuta}</span>
        </div>

        {/* En riesgo */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-neutral-600 font-sans font-normal">críticos</span>
          <span className="text-critical-600 tabular-nums font-medium">{criticos}</span>
        </div>

        {/* Bloqueos activos */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-neutral-600 font-sans font-normal">bloqueos activos</span>
          <span className="text-critical-600 tabular-nums font-medium">{bloqueosActivos}</span>
        </div>

        {/* Averías activas */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-neutral-600 font-sans font-normal">averías activas</span>
          <span className="text-critical-600 tabular-nums font-medium">{averiasActivas}</span>
        </div>
      </div>

      {/* Lado derecho: Leyenda de holguras y estado de actualización */}
      <div className="flex items-center gap-3 flex-shrink-0 pl-2">
        <div className="hidden lg:flex items-center gap-2 text-body-sm">
          <span className="text-neutral-600 font-sans">holgura</span>

          <div className="flex items-center gap-1">
            <span className="size-2 bg-ok-600 rounded-sm inline-block"></span>
            <span className="text-ok-700 tabular-nums font-normal">{RANGO_HOLGURA.VERDE}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-warn-700 text-caption leading-none">▲</span>
            <span className="text-warn-700 tabular-nums font-normal">{RANGO_HOLGURA.AMBAR}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="size-2 bg-critical-600 rounded-full inline-block"></span>
            <span className="text-critical-600 tabular-nums font-normal">{RANGO_HOLGURA.ROJO}</span>
          </div>
        </div>

        <div className="hidden lg:block w-px h-3.5 bg-neutral-200"></div>

        {/* Antigüedad del último dato recibido */}
        {estadoAlerta ? (
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 bg-critical-600 rounded-full"></span>
            <span className="text-neutral-600 font-sans text-body-sm">{estadoAlerta}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">{actualizacion}</div>
        )}

        <div className="hidden md:block w-px h-3.5 bg-neutral-200"></div>
        {/* Versión del front y commit del build (A01): permite comprobar qué versión se está evaluando. */}
        <span className="hidden md:inline text-neutral-600 font-sans text-body-sm tabular-nums" title={`Commit ${__APP_COMMIT__}`}>
          v{__APP_VERSION__} · {__APP_COMMIT__}
        </span>
      </div>
    </footer>
  );
};
