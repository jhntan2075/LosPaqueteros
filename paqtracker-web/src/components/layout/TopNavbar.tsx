import React from 'react';
import { LayoutGrid, Package, PlayCircle, BarChart3, Clock, Radio } from 'lucide-react';

export type TabModulo = 'operacion' | 'pedidos' | 'simulacion' | 'metricas';

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
    { id: 'simulacion' as TabModulo, label: 'Simulación', icon: PlayCircle },
    { id: 'metricas' as TabModulo, label: 'Métricas', icon: BarChart3 },
  ];

  return (
    <header className="h-[52px] bg-white border-b border-[#CBD5E1] px-3 md:px-4 flex items-center justify-between z-30 select-none shadow-xs shrink-0">
      {/* 1. Lado Izquierdo: Marca + Pestañas de Módulos */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
        {/* Isotipo y Nombre */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-[30px] h-[30px] bg-[#1E40AF] rounded-[6px] flex items-center justify-center shadow-xs">
            <span className="text-white tabular-nums font-bold text-sm">P</span>
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
                aria-current={esActivo ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[12px] tabular-nums font-medium transition cursor-pointer ${
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

      {/* 2. Lado Derecho: Reloj, Turno y Estado de Conexión (sin usuario: aún no hay autenticación) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
        {/* Reloj de la operación día a día (oculto en Simulación, que muestra el de su corrida) */}
        {relojSimulado && (
          <div
            className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px] px-2.5 py-1 shrink-0"
            title="Reloj de la operación día a día"
          >
            <Clock className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="tabular-nums font-semibold text-[12px] sm:text-[13px] text-[#0F172A]">
              {relojSimulado}
            </span>
          </div>
        )}

        {/* Turno */}
        {turno && (
          <span className="bg-[#DBEAFE] text-[#1E40AF] rounded-[4px] px-2 py-1 tabular-nums font-medium text-[11px] shrink-0 hidden md:inline">
            Turno {turno}
          </span>
        )}

        {/* Conexión con el servidor */}
        <span
          title={conectado ? 'Conectado: el estado llega en vivo desde el servidor' : 'Sin conexión con el servidor: reintentando'}
          className={`rounded-[4px] px-2.5 py-1 flex items-center gap-1.5 font-sans font-semibold text-[11px] tracking-wider shrink-0 ${
            conectado ? 'bg-[#DBEAFE] text-[#1E40AF]' : 'bg-[#FEF2F2] text-[#B91C1C]'
          }`}
        >
          <Radio className={`w-3 h-3 ${conectado ? 'text-[#1E40AF] animate-pulse' : 'text-[#B91C1C]'}`} />
          <span className="hidden sm:inline">{conectado ? 'CONECTADO' : 'SIN CONEXIÓN'}</span>
        </span>
      </div>
    </header>
  );
};
