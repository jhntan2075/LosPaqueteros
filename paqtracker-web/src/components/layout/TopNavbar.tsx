import React from 'react';
import {
  LayoutGrid,
  Package,
  GitFork,
  PlayCircle,
  BarChart3,
  Sliders,
  Clock,
  Radio,
} from 'lucide-react';

export type TabModulo = 'operacion' | 'pedidos' | 'planes' | 'simulacion' | 'metricas' | 'ajustes';

interface TopNavbarProps {
  tabActiva: TabModulo;
  onCambiarTab: (tab: TabModulo) => void;
  relojSimulado?: string;
  turno?: string;
  conectado?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  tabActiva,
  onCambiarTab,
  relojSimulado,
  turno,
  conectado = true,
}) => {
  const menuItems = [
    { id: 'operacion' as TabModulo, label: 'Operación', icon: LayoutGrid },
    { id: 'pedidos' as TabModulo, label: 'Pedidos', icon: Package },
    { id: 'planes' as TabModulo, label: 'Planes', icon: GitFork },
    { id: 'simulacion' as TabModulo, label: 'Simulación', icon: PlayCircle },
    { id: 'metricas' as TabModulo, label: 'Métricas', icon: BarChart3 },
    { id: 'ajustes' as TabModulo, label: 'Ajustes', icon: Sliders },
  ];

  return (
    <header className="h-[52px] bg-white border-b border-[#CBD5E1] px-3 md:px-4 flex items-center justify-between z-30 select-none shadow-xs shrink-0">
      {/* 1. Lado Izquierdo: Marca + Pestañas de Módulos */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
        {/* Isotipo y Nombre */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-[30px] h-[30px] bg-[#1E40AF] rounded-[6px] flex items-center justify-center shadow-xs">
            <span className="text-white font-mono font-bold text-sm">P</span>
          </div>
          <span className="font-sans font-bold text-[14px] text-slate-900 tracking-tight hidden sm:inline">
            PaqTracker
          </span>
        </div>

        {/* Separador vertical */}
        <div className="h-5 w-[1px] bg-[#E2E8F0] shrink-0 mx-1" />

        {/* Pestañas Principales (Segmented Navigation) */}
        <nav className="flex items-center gap-1 shrink-0" aria-label="Navegación principal">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const esActivo = tabActiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onCambiarTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[12px] font-mono font-medium transition cursor-pointer ${
                  esActivo
                    ? 'bg-[#DBEAFE] text-[#1E40AF] shadow-xs font-semibold'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${esActivo ? 'text-[#1E40AF]' : 'text-[#64748B]'}`}
                  strokeWidth={esActivo ? 2.2 : 1.8}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 2. Lado Derecho: Reloj, Turno, Estado de Conexión y Usuario */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
        {/* Reloj de la Operación */}
        {relojSimulado && (
          <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px] px-2.5 py-1 shrink-0">
            <Clock className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="font-mono font-semibold text-[12px] sm:text-[13px] text-[#0F172A]">
              {relojSimulado}
            </span>
          </div>
        )}

        {/* Turno */}
        {turno && (
          <span className="bg-[#DBEAFE] text-[#1E40AF] rounded-[4px] px-2 py-1 font-mono font-medium text-[11px] shrink-0 hidden md:inline">
            Turno {turno}
          </span>
        )}

        {/* Indicador EN VIVO / STOMP */}
        <span
          title={conectado ? 'Recibiendo estado en vivo por STOMP' : 'Sin conexión con el servidor'}
          className={`rounded-[4px] px-2.5 py-1 flex items-center gap-1.5 font-sans font-semibold text-[11px] tracking-wider shrink-0 ${
            conectado ? 'bg-[#DBEAFE] text-[#1E40AF]' : 'bg-[#F1F5F9] text-[#64748B]'
          }`}
        >
          <Radio className={`w-3 h-3 ${conectado ? 'text-[#1E40AF] animate-pulse' : 'text-[#94A3B8]'}`} />
          <span className="hidden sm:inline">{conectado ? 'EN VIVO' : 'SIN CONEXIÓN'}</span>
        </span>

        {/* Separador vertical */}
        <div className="h-5 w-[1px] bg-[#E2E8F0] shrink-0" />

        {/* Perfil del Operador */}
        <div
          className="flex items-center gap-2 p-1 rounded-[6px] hover:bg-slate-100 transition cursor-pointer"
          title="Operador JD · J. Doe"
        >
          <div className="w-[28px] h-[28px] bg-[#DBEAFE] border border-[#BFDBFE] rounded-full flex items-center justify-center shrink-0">
            <span className="text-[#1E40AF] font-mono font-bold text-[11px]">JD</span>
          </div>
          <div className="hidden xl:flex flex-col text-left leading-none">
            <span className="font-mono text-[11px] font-semibold text-[#0F172A]">J. Doe</span>
            <span className="text-[10px] text-[#64748B]">Operador</span>
          </div>
        </div>
      </div>
    </header>
  );
};
