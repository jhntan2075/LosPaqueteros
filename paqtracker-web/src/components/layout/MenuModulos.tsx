import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, LogOut, Monitor, Moon, Radio, Sun, X, type LucideIcon } from 'lucide-react';
import logo from '../../assets/marca/logo.svg';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { useFocoAtrapado } from '../../hooks/useFocoAtrapado';
import { useTema, type PreferenciaTema } from '../../hooks/useTema';
import { cn } from '../../lib/clases';
import type { TabModulo } from './TopNavbar';

// Menú de módulos del celular (patrón "navigation drawer"): en pantallas angostas las pestañas de módulo
// no caben en la barra superior. El encabezado muestra el módulo actual ("Operación ▾") y este panel
// lista los cinco a la vez, con el activo marcado, más lo que sale de la barra para hacerle espacio:
// tema, estado de la conexión y cerrar sesión. Es un diálogo modal: atrapa el foco, Esc o tocar fuera
// lo cierran y el foco vuelve al botón que lo abrió.

export interface ModuloMenu {
  id: TabModulo;
  label: string;
  icon: LucideIcon;
}

const TEMAS: { valor: PreferenciaTema; etiqueta: string; icono: LucideIcon }[] = [
  { valor: 'claro', etiqueta: 'Claro', icono: Sun },
  { valor: 'oscuro', etiqueta: 'Oscuro', icono: Moon },
  { valor: 'automatico', etiqueta: 'Automático', icono: Monitor },
];

interface MenuModulosProps {
  modulos: ModuloMenu[];
  activo: TabModulo;
  onElegir: (tab: TabModulo) => void;
  onCerrar: () => void;
  conectado: boolean;
  version: string;
  sesion: { usuario: string; cerrarSesion: () => void } | null;
}

export const MenuModulos: React.FC<MenuModulosProps> = ({ modulos, activo, onElegir, onCerrar, conectado, version, sesion }) => {
  const panel = useRef<HTMLDivElement>(null);
  const [tema, setTema] = useTema();
  useFocoAtrapado(panel);
  useCerrarConEscape(true, onCerrar);

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Velo: tocar fuera cierra */}
      <div className="absolute inset-0 bg-neutral-900/40" onClick={onCerrar} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de módulos"
        className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-superficie shadow-overlay flex flex-col"
      >
        <div className="h-[52px] px-3 flex items-center gap-2 border-b border-neutral-200 shrink-0">
          <img src={logo} alt="" aria-hidden="true" className="h-[26px] w-auto" />
          <span className="font-sans font-semibold text-title-sm text-neutral-900">PaqTracker</span>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar menú"
            className="ml-auto size-11 -mr-1.5 flex items-center justify-center rounded-control text-neutral-600 hover:bg-neutral-100"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav aria-label="Módulos" className="py-2 flex flex-col overflow-y-auto">
          {modulos.map(({ id, label, icon: Icono }) => {
            const esActivo = id === activo;
            return (
              <button
                key={id}
                type="button"
                aria-current={esActivo ? 'page' : undefined}
                onClick={() => {
                  onElegir(id);
                  onCerrar();
                }}
                className={cn(
                  'h-12 mx-2 px-3 flex items-center gap-3 rounded-control text-body text-left border-l-[3px]',
                  esActivo
                    ? 'bg-primary-50 text-primary-600 font-semibold border-primary-600'
                    : 'text-neutral-900 border-transparent hover:bg-neutral-50',
                )}
              >
                <Icono className="size-5 shrink-0" strokeWidth={esActivo ? 2.2 : 1.8} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-neutral-200 px-4 py-3 flex flex-col gap-3">
          <div role="radiogroup" aria-label="Tema" className="flex flex-col gap-1.5">
            <span className="text-caption font-semibold uppercase tracking-wide text-neutral-600">Tema</span>
            <div className="grid grid-cols-3 gap-1 p-0.5 rounded-control bg-neutral-100">
              {TEMAS.map(({ valor, etiqueta, icono: Icono }) => {
                const elegido = tema === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    onClick={() => setTema(valor)}
                    className={cn(
                      'h-10 flex items-center justify-center gap-1 rounded-control text-body-sm',
                      elegido ? 'bg-superficie text-primary-600 font-medium shadow-xs' : 'text-neutral-600',
                    )}
                  >
                    {elegido ? <Check className="size-3.5" aria-hidden="true" /> : <Icono className="size-3.5" aria-hidden="true" />}
                    {etiqueta}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="flex items-center gap-2 text-body-sm text-neutral-600">
            <Radio className={cn('size-3.5', conectado ? 'text-primary-600' : 'text-critical-600')} aria-hidden="true" />
            {conectado ? 'Conectado al servidor' : 'Sin conexión: reintentando'}
          </p>

          {sesion && (
            <button
              type="button"
              onClick={sesion.cerrarSesion}
              className="h-11 px-3 -mx-1 flex items-center gap-3 rounded-control text-body text-neutral-900 hover:bg-neutral-50"
            >
              <LogOut className="size-5 text-neutral-600" aria-hidden="true" />
              <span className="flex flex-col items-start leading-tight">
                Cerrar sesión
                <span className="text-caption text-neutral-600">{sesion.usuario}</span>
              </span>
            </button>
          )}

          <p className="text-caption text-neutral-500">{version}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
};
