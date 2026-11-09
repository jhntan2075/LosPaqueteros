import React from 'react';
import logo from '../../assets/marca/logo.svg';
import { LayoutGrid, Package, PlayCircle, BarChart3, Radio, Settings, LogOut } from 'lucide-react';
import { RelojesBarra } from './RelojesBarra';
import { SelectorTema } from './SelectorTema';
import { useSesion } from '../sesion/contextoSesion';
import { Boton, Insignia } from '../ui';

export type TabModulo = 'operacion' | 'pedidos' | 'simulacion' | 'metricas' | 'configuracion';

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
  // Sin sesión (API sin login o pruebas que montan la barra sola) no hay botón Salir.
  const sesion = useSesion();
  const menuItems = [
    { id: 'operacion' as TabModulo, label: 'Operación', icon: LayoutGrid },
    { id: 'pedidos' as TabModulo, label: 'Pedidos', icon: Package },
    { id: 'simulacion' as TabModulo, label: 'Simulación', icon: PlayCircle },
    { id: 'metricas' as TabModulo, label: 'Métricas', icon: BarChart3 },
    { id: 'configuracion' as TabModulo, label: 'Configuración', icon: Settings },
  ];

  return (
    <header className="h-[52px] bg-superficie border-b border-neutral-300 px-3 md:px-4 flex items-center justify-between z-30 select-none shadow-xs shrink-0">
      {/* 1. Lado Izquierdo: Marca + Pestañas de Módulos */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
        {/* Isotipo y Nombre */}
        <div className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="" aria-hidden="true" className="h-[30px] w-auto" />
          <span className="font-sans font-semibold text-title-sm text-neutral-900 tracking-tight hidden sm:inline">
            PaqTracker
          </span>
        </div>

        {/* Separador vertical */}
        <div className="h-5 w-px bg-neutral-200 shrink-0 mx-1" />

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
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-body-sm tabular-nums font-medium transition cursor-pointer ${
                  esActivo
                    ? 'bg-primary-100 text-primary-600 shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <Icon
                  className={`size-4 shrink-0 ${esActivo ? 'text-primary-600' : 'text-neutral-600'}`}
                  strokeWidth={esActivo ? 2.2 : 1.8}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 2. Lado Derecho: Reloj, Turno, Estado de Conexión, Tema y Salir */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
        {/* Relojes de la operación día a día y real (en Simulación van en el encabezado de la corrida) */}
        {relojSimulado && <RelojesBarra operacion={relojSimulado} />}

        {/* Turno */}
        {turno && (
          <Insignia tono="primary" className="py-1 tabular-nums shrink-0 hidden md:inline-flex">
            Turno {turno}
          </Insignia>
        )}

        {/* Conexión con el servidor */}
        <Insignia
          tono={conectado ? 'primary' : 'critical'}
          title={conectado ? 'Conectado: el estado llega en vivo desde el servidor' : 'Sin conexión con el servidor: reintentando'}
          className="px-2.5 py-1 font-sans font-semibold shrink-0"
        >
          <Radio className={`size-3 ${conectado ? 'text-primary-700 animate-pulse' : 'text-critical-600'}`} />
          <span className="hidden sm:inline">{conectado ? 'Conectado' : 'Sin conexión'}</span>
        </Insignia>

        {/* Tema: claro, oscuro o automático */}
        <SelectorTema />

        {/* Cerrar sesión: en el celular solo el ícono */}
        {sesion && (
          <Boton
            tamano="sm"
            variante="secundario"
            icono={LogOut}
            onClick={sesion.cerrarSesion}
            title={`Cerrar la sesión de ${sesion.usuario}`}
            aria-label="Cerrar sesión"
            className="px-2 sm:px-2.5"
          >
            <span className="hidden sm:inline">Salir</span>
          </Boton>
        )}
      </div>
    </header>
  );
};
