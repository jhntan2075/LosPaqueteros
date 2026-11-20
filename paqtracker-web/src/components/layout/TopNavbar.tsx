import React, { useState } from 'react';
import logo from '../../assets/marca/logo.svg';
import { LayoutGrid, Package, PlayCircle, BarChart3, Radio, Settings, LogOut, Menu, ChevronDown } from 'lucide-react';
import { MenuModulos } from './MenuModulos';
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
  /** Antigüedad del último dato del día a día; sin valor (Simulación, Configuración) no se muestra. */
  segundosDesdeActualizacion?: number;
}

/** Pasado este tiempo sin instantáneas (llegan cada 1 s), el dato ya no es "en vivo". */
const SEGUNDOS_SIN_ACTUALIZAR = 10;
/** Versión y commit del build; las constantes las inyecta Vite y no existen fuera del build (pruebas). */
const VERSION =
  typeof __APP_VERSION__ === 'undefined' ? 'PaqTracker' : `PaqTracker v${__APP_VERSION__} · ${typeof __APP_COMMIT__ === 'undefined' ? '' : __APP_COMMIT__}`;
const antiguedad = (segundos: number) => (segundos < 60 ? `${segundos} s` : `${Math.floor(segundos / 60)} min`);

export const TopNavbar: React.FC<TopNavbarProps> = ({
  tabActiva,
  onCambiarTab,
  relojSimulado,
  turno,
  conectado = true,
  segundosDesdeActualizacion,
}) => {
  const desfasado = segundosDesdeActualizacion !== undefined && segundosDesdeActualizacion >= SEGUNDOS_SIN_ACTUALIZAR;
  // Sin sesión (API sin login o pruebas que montan la barra sola) no hay botón Salir.
  const sesion = useSesion();
  // Celular: el menú de módulos reemplaza a las pestañas, que no caben en la barra.
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuItems = [
    { id: 'operacion' as TabModulo, label: 'Operación', icon: LayoutGrid },
    { id: 'pedidos' as TabModulo, label: 'Pedidos', icon: Package },
    { id: 'simulacion' as TabModulo, label: 'Simulación', icon: PlayCircle },
    { id: 'metricas' as TabModulo, label: 'Métricas', icon: BarChart3 },
    { id: 'configuracion' as TabModulo, label: 'Configuración', icon: Settings },
  ];
  const moduloActivo = menuItems.find((m) => m.id === tabActiva) ?? menuItems[0];

  return (
    <header className="h-[52px] bg-superficie border-b border-neutral-300 px-3 md:px-4 flex items-center justify-between z-30 select-none shadow-xs shrink-0">
      {/* 1. Celular: botón de menú + módulo actual (abre el menú de módulos) */}
      <div className="flex md:hidden items-center gap-1 min-w-0 -ml-1.5">
        <button
          type="button"
          onClick={() => setMenuAbierto(true)}
          aria-haspopup="dialog"
          aria-expanded={menuAbierto}
          aria-label="Abrir menú de módulos"
          className="size-11 shrink-0 flex items-center justify-center rounded-control text-neutral-900 hover:bg-neutral-100"
        >
          <Menu className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setMenuAbierto(true)}
          aria-haspopup="dialog"
          aria-expanded={menuAbierto}
          aria-label={`Módulo actual: ${moduloActivo.label}. Cambiar de módulo`}
          className="h-11 min-w-0 px-1.5 flex items-center gap-1 rounded-control font-sans font-semibold text-title-sm text-neutral-900 hover:bg-neutral-100"
        >
          <span className="truncate">{moduloActivo.label}</span>
          <ChevronDown className="size-4 shrink-0 text-neutral-600" aria-hidden="true" />
        </button>
      </div>
      {menuAbierto && (
        <MenuModulos
          modulos={menuItems}
          activo={tabActiva}
          onElegir={onCambiarTab}
          onCerrar={() => setMenuAbierto(false)}
          conectado={conectado}
          version={VERSION}
          sesion={sesion}
        />
      )}

      {/* 1. Escritorio: Marca + Pestañas de Módulos */}
      <div className="hidden md:flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
        {/* Isotipo y Nombre */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Versión y commit del build (A01) en el título del logo: se consulta sin ocupar una barra. */}
          <img src={logo} alt="" aria-hidden="true" className="h-[30px] w-auto" title={VERSION} />
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
        {/* Conexión y antigüedad del dato juntas: las dos responden "¿esto que veo está al día?". */}
        <Insignia
          tono={!conectado ? 'critical' : desfasado ? 'warn' : 'primary'}
          title={
            !conectado
              ? 'Sin conexión con el servidor: reintentando'
              : desfasado
                ? 'Conectado, pero sin actualizaciones recientes'
                : 'Conectado: el estado llega en vivo desde el servidor'
          }
          className="px-2.5 py-1 font-sans font-semibold shrink-0"
        >
          <Radio className={`size-3 ${!conectado ? 'text-critical-600' : desfasado ? 'text-warn-700' : 'text-primary-700 animate-pulse'}`} />
          <span className="hidden sm:inline">{conectado ? 'Conectado' : 'Sin conexión'}</span>
          {segundosDesdeActualizacion !== undefined && (
            <span className="font-normal tabular-nums" aria-label={`último dato hace ${antiguedad(segundosDesdeActualizacion)}`}>
              <span className="hidden sm:inline">· </span>
              {antiguedad(segundosDesdeActualizacion)}
            </span>
          )}
        </Insignia>

        {/* Tema: claro, oscuro o automático */}
        {/* En el celular el tema y la sesión van en el menú de módulos */}
        <div className="hidden md:flex">
          <SelectorTema />
        </div>

        {/* Cerrar sesión: en el celular solo el ícono */}
        {sesion && (
          <Boton
            tamano="sm"
            variante="secundario"
            icono={LogOut}
            onClick={sesion.cerrarSesion}
            title={`Cerrar la sesión de ${sesion.usuario}`}
            aria-label="Cerrar sesión"
            className="hidden md:inline-flex px-2.5"
          >
            <span>Salir</span>
          </Boton>
        )}
      </div>
    </header>
  );
};
