import React from 'react';
import logo from '../../assets/marca/logo.svg';
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
    <header className="h-[52px] bg-white border-b border-neutral-300 px-3 md:px-4 flex items-center justify-between z-30 select-none shadow-xs shrink-0">
      {/* 1. Lado Izquierdo: Marca + Pestañas de Módulos */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
        {/* Isotipo y Nombre */}
        <div className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="" aria-hidden="true" className="h-[30px] w-auto" />
          <span className="font-sans font-bold text-body-lg text-neutral-900 tracking-tight hidden sm:inline">
            PaqTracker
          </span>
        </div>

        {/* Separador vertical */}
        <div className="h-5 w-[1px] bg-neutral-200 shrink-0 mx-1" />

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
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-body tabular-nums font-medium transition cursor-pointer ${
                  esActivo
                    ? 'bg-primary-100 text-primary-600 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${esActivo ? 'text-primary-600' : 'text-neutral-500'}`}
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
            className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-[6px] px-2.5 py-1 shrink-0"
            title="Reloj de la operación día a día"
          >
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            <span className="tabular-nums font-semibold text-body sm:text-body-lg text-neutral-900">
              {relojSimulado}
            </span>
          </div>
        )}

        {/* Turno */}
        {turno && (
          <span className="bg-primary-100 text-primary-600 rounded-[4px] px-2 py-1 tabular-nums font-medium text-caption shrink-0 hidden md:inline">
            Turno {turno}
          </span>
        )}

        {/* Conexión con el servidor */}
        <span
          title={conectado ? 'Conectado: el estado llega en vivo desde el servidor' : 'Sin conexión con el servidor: reintentando'}
          className={`rounded-[4px] px-2.5 py-1 flex items-center gap-1.5 font-sans font-semibold text-caption tracking-wider shrink-0 ${
            conectado ? 'bg-primary-100 text-primary-600' : 'bg-critical-50 text-critical-600'
          }`}
        >
          <Radio className={`w-3 h-3 ${conectado ? 'text-primary-600 animate-pulse' : 'text-critical-600'}`} />
          <span className="hidden sm:inline">{conectado ? 'CONECTADO' : 'SIN CONEXIÓN'}</span>
        </span>
      </div>
    </header>
  );
};
