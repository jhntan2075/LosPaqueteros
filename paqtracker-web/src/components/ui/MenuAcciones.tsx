import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { cn } from '../../lib/clases';
import { Boton } from './Boton';

// Menú de acciones secundarias ("Más acciones") con el contrato ARIA de menú (WAI-ARIA "menu button"):
// al abrir el foco va al primer elemento habilitado; las flechas, Inicio y Fin lo mueven entre los
// habilitados; Escape cierra y devuelve el foco al botón; Tab, un clic fuera o sacar el foco lo cierran.

export interface ItemMenuAcciones {
  clave: string;
  etiqueta: string;
  onSelect: () => void;
  disabled?: boolean;
  icono?: LucideIcon;
}

interface MenuAccionesProps {
  /** Nombre accesible del botón que abre el menú (el botón solo lleva el ícono). */
  etiqueta: string;
  items: ItemMenuAcciones[];
  /** Hacia dónde se despliega el menú; `arriba` para botones al pie de la pantalla. */
  direccion?: 'abajo' | 'arriba';
  className?: string;
}

const ITEMS_HABILITADOS = '[role="menuitem"]:not([disabled])';

export const MenuAcciones: React.FC<MenuAccionesProps> = ({ etiqueta, items, direccion = 'abajo', className }) => {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const idMenu = useId();

  const habilitados = () => Array.from(menu.current?.querySelectorAll<HTMLElement>(ITEMS_HABILITADOS) ?? []);

  const cerrarYEnfocarBoton = useCallback(() => {
    setAbierto(false);
    boton.current?.focus();
  }, []);

  useCerrarConEscape(abierto, cerrarYEnfocarBoton);

  // Al abrir, el foco entra al menú.
  useEffect(() => {
    if (abierto) habilitados()[0]?.focus();
  }, [abierto]);

  // Un clic o toque fuera del menú lo cierra.
  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (evento: PointerEvent) => {
      if (!raiz.current?.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener('pointerdown', alPulsar);
    return () => document.removeEventListener('pointerdown', alPulsar);
  }, [abierto]);

  const alPresionar = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    if (evento.key === 'Tab') {
      // El foco sale del menú hacia el botón: el Tab siguiente continúa desde ahí.
      cerrarYEnfocarBoton();
      return;
    }
    const lista = habilitados();
    if (lista.length === 0) return;
    const actual = lista.indexOf(document.activeElement as HTMLElement);
    let destino: number;
    if (evento.key === 'ArrowDown') destino = (actual + 1) % lista.length;
    else if (evento.key === 'ArrowUp') destino = actual <= 0 ? lista.length - 1 : actual - 1;
    else if (evento.key === 'Home') destino = 0;
    else if (evento.key === 'End') destino = lista.length - 1;
    else return;
    evento.preventDefault();
    lista[destino].focus();
  };

  const alSalirElFoco = (evento: React.FocusEvent<HTMLDivElement>) => {
    const destino = evento.relatedTarget as Node | null;
    if (destino && !raiz.current?.contains(destino)) setAbierto(false);
  };

  const elegir = (item: ItemMenuAcciones) => {
    cerrarYEnfocarBoton();
    item.onSelect();
  };

  return (
    <div ref={raiz} className={cn('relative !flex-none', className)} onBlur={alSalirElFoco}>
      <Boton
        ref={boton}
        icono={MoreHorizontal}
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        onClick={() => setAbierto(!abierto)}
        className="size-11"
      />
      {abierto && (
        <div
          ref={menu}
          id={idMenu}
          role="menu"
          aria-label={etiqueta}
          onKeyDown={alPresionar}
          className={cn(
            'absolute right-0 z-30 w-max min-w-48 rounded-card border border-neutral-200 bg-superficie py-1 shadow-overlay',
            direccion === 'arriba' ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {items.map(({ clave, etiqueta: texto, onSelect, disabled, icono: Icono }) => (
            <button
              key={clave}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => elegir({ clave, etiqueta: texto, onSelect })}
              className="flex h-11 w-full cursor-pointer items-center gap-2.5 whitespace-nowrap px-3 text-left text-body text-neutral-900 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-400 disabled:hover:bg-transparent"
            >
              {Icono && <Icono className="size-4" aria-hidden="true" />}
              {texto}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
