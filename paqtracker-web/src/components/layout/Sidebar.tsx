import React, { useState } from 'react';
import {
  LayoutGrid,
  Package,
  GitFork,
  PlayCircle,
  BarChart3,
  Sliders,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export type TabModulo = 'operacion' | 'pedidos' | 'planes' | 'simulacion' | 'metricas' | 'ajustes';

interface SidebarProps {
  tabActiva: TabModulo;
  onCambiarTab: (tab: TabModulo) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ tabActiva, onCambiarTab }) => {
  const [expandido, setExpandido] = useState(false);

  const menuItems = [
    { id: 'operacion' as TabModulo, label: 'Operación', icon: LayoutGrid },
    { id: 'pedidos' as TabModulo, label: 'Pedidos', icon: Package },
    { id: 'planes' as TabModulo, label: 'Planes', icon: GitFork },
    { id: 'simulacion' as TabModulo, label: 'Simulación', icon: PlayCircle },
    { id: 'metricas' as TabModulo, label: 'Métricas', icon: BarChart3 },
    { id: 'ajustes' as TabModulo, label: 'Ajustes', icon: Sliders },
  ];

  return (
    <aside
      className={`h-screen bg-[#F1F5F9] border-r border-[#CBD5E1] transition-all duration-300 flex flex-col items-center py-2.5 z-30 select-none ${
        expandido ? 'w-[180px]' : 'w-[90px]'
      }`}
    >
      {/* Logo "P" PaqTracker */}
      <div className="flex flex-col items-center gap-1 mb-1">
        <div className="w-[34px] h-[34px] bg-[#1E40AF] rounded-[6px] flex items-center justify-center shadow-sm">
          <span className="text-white font-mono font-medium text-base">P</span>
        </div>
      </div>

      {/* Botón Expandir / Colapsar */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded hover:bg-slate-200/60 transition text-[#94A3B8] hover:text-[#64748B] mb-2"
        title={expandido ? 'Colapsar menú' : 'Expandir menú'}
      >
        {expandido ? (
          <ChevronLeft className="w-3.5 h-3.5 text-[#64748B]" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
        )}
        <span className="font-mono font-medium text-[11px] tracking-[0.96px] uppercase">
          {expandido ? 'Cerrar' : 'Expandir'}
        </span>
      </button>

      {/* Línea divisoria */}
      <div className="w-[56px] h-[1px] bg-[#E2E8F0] mb-2"></div>

      {/* Elementos de Navegación */}
      <div className="flex flex-col items-center gap-1 w-full px-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const esActivo = tabActiva === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onCambiarTab(item.id)}
              className={`flex rounded-[6px] transition-all cursor-pointer ${
                expandido
                  ? 'w-full px-3 py-2.5 flex-row items-center gap-3'
                  : 'w-[76px] h-[52px] flex-col items-center justify-center gap-1'
              } ${
                esActivo
                  ? 'bg-[#DBEAFE] text-[#1E40AF]'
                  : 'text-[#64748B] hover:bg-slate-200/50 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${
                  esActivo ? 'text-[#1E40AF]' : 'text-[#64748B]'
                }`}
                strokeWidth={1.8}
              />
              <span
                className={`font-mono font-medium text-[12px] tracking-[0.96px] ${
                  expandido ? 'text-left' : 'text-center'
                } ${esActivo ? 'text-[#1E40AF]' : 'text-[#64748B]'}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Espaciador flexible */}
      <div className="flex-1"></div>

      {/* Línea divisoria inferior */}
      <div className="w-[56px] h-[1px] bg-[#E2E8F0] my-2"></div>

      {/* Avatar de Usuario "JD" */}
      <div
        className={`flex items-center justify-center rounded-[6px] p-2 hover:bg-slate-200/50 cursor-pointer ${
          expandido ? 'w-full px-3 gap-2' : 'w-[76px]'
        }`}
        title="Operador JD"
      >
        <div className="w-[28px] h-[28px] bg-[#DBEAFE] rounded-full border border-[#E2E8F0] flex items-center justify-center">
          <span className="text-[#1E40AF] font-mono font-medium text-[12px] tracking-[0.96px]">
            JD
          </span>
        </div>
        {expandido && (
          <div className="flex flex-col text-left overflow-hidden">
            <span className="font-mono text-xs font-semibold text-[#0F172A] truncate">
              J. Doe
            </span>
            <span className="text-[10px] text-[#64748B] truncate">Operador</span>
          </div>
        )}
      </div>
    </aside>
  );
};
