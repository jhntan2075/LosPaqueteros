import React from 'react';

export interface FooterBarProps {
  nodoSeleccionado?: { x: number; y: number };
  totalPedidos?: number;
  entregados?: number;
  enRuta?: number;
  enRiesgo?: number;
  bloqueosActivos?: number;
  averiasActivas?: number;
  segundosDesdeActualizacion?: number;
  onAbrirLeyenda?: () => void;
}

export const FooterBar: React.FC<FooterBarProps> = ({
  nodoSeleccionado = { x: 19, y: 9 },
  totalPedidos = 1305,
  entregados = 412,
  enRuta = 87,
  enRiesgo = 3,
  bloqueosActivos = 4,
  averiasActivas = 2,
  segundosDesdeActualizacion = 1,
  onAbrirLeyenda,
}) => {
  return (
    <footer className="h-[30px] bg-white border-t border-[#E2E8F0] px-4 flex items-center justify-between text-[12px] select-none flex-shrink-0 z-20">
      <div className="flex items-center gap-4 overflow-x-auto">
        {/* Nodo actual */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[#64748B] font-sans font-normal">nodo</span>
          <span className="text-[#0F172A] font-mono font-medium">
            ({nodoSeleccionado.x},{nodoSeleccionado.y})
          </span>
        </div>

        <div className="w-[1px] h-[14px] bg-[#E2E8F0] flex-shrink-0"></div>

        {/* Pedidos */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[#64748B] font-sans font-normal">pedidos</span>
          <span className="text-[#0F172A] font-mono font-medium">{totalPedidos}</span>
        </div>

        {/* Entregados */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[#64748B] font-sans font-normal">entregados</span>
          <span className="text-[#0F172A] font-mono font-medium">{entregados}</span>
        </div>

        {/* En ruta */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[#64748B] font-sans font-normal">en ruta</span>
          <span className="text-[#0F172A] font-mono font-medium">{enRuta}</span>
        </div>

        {/* En riesgo */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[#64748B] font-sans font-normal">en riesgo</span>
          <span className="text-[#B91C1C] font-mono font-medium">{enRiesgo}</span>
        </div>

        {/* Bloqueos activos */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[#64748B] font-sans font-normal">bloqueos activos</span>
          <span className="text-[#B45309] font-mono font-medium">{bloqueosActivos}</span>
        </div>

        {/* Averías activas */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[#64748B] font-sans font-normal">averías activas</span>
          <span className="text-[#B91C1C] font-mono font-medium">{averiasActivas}</span>
        </div>
      </div>

      {/* Lado derecho: Leyenda de holguras y estado de actualización */}
      <div className="flex items-center gap-3.5 flex-shrink-0 pl-2">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-[#64748B] font-sans">holgura</span>

          <div className="flex items-center gap-1">
            <span className="w-[7px] h-[7px] bg-[#15803D] rounded-[1px] inline-block"></span>
            <span className="text-[#15803D] font-mono font-normal">&gt; 40 %</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[#B45309] text-[10px] leading-none">▲</span>
            <span className="text-[#B45309] font-mono font-normal">15–40 %</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-[7px] h-[7px] bg-[#B91C1C] rounded-full inline-block"></span>
            <span className="text-[#B91C1C] font-mono font-normal">&lt; 15 %</span>
          </div>
        </div>

        {/* Ver leyenda modal trigger */}
        <button
          onClick={onAbrirLeyenda}
          className="flex items-center gap-1 text-[#1E40AF] hover:text-blue-800 transition font-sans cursor-pointer"
        >
          <span className="font-semibold text-xs leading-none">?</span>
          <span className="font-medium text-[12px]">Ver leyenda</span>
        </button>

        <div className="w-[1px] h-[14px] bg-[#E2E8F0]"></div>

        {/* Timestamp de actualización */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#15803D] rounded-full animate-pulse"></span>
          <span className="text-[#64748B] font-sans text-[12px]">
            actualizado hace {segundosDesdeActualizacion} s
          </span>
        </div>
      </div>
    </footer>
  );
};
