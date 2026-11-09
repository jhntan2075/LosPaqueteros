import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useTema, type PreferenciaTema } from '../../hooks/useTema';
import { cn } from '../../lib/clases';
import { Boton } from '../ui';

// Selector de tema de la barra superior: un botón con el ícono del tema vigente que abre un menú con las
// tres opciones (patrón menú con opciones de radio: flechas para moverse, Enter para elegir, Esc o un clic
// afuera para cerrar).

const OPCIONES: { valor: PreferenciaTema; etiqueta: string; detalle?: string; icono: LucideIcon }[] = [
  { valor: 'claro', etiqueta: 'Claro', icono: Sun },
  { valor: 'oscuro', etiqueta: 'Oscuro', icono: Moon },
  { valor: 'automatico', etiqueta: 'Automático', detalle: 'Igual que el sistema', icono: Monitor },
];

export const SelectorTema: React.FC = () => {
  const [preferencia, setPreferencia] = useTema();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const opciones = useRef<(HTMLButtonElement | null)[]>([]);
  const idMenu = useId();
  const vigente = OPCIONES.find((o) => o.valor === preferencia) ?? OPCIONES[2];

  // Al abrir, el foco va a la opción elegida; un clic fuera del selector lo cierra.
  useEffect(() => {
    if (!abierto) return;
    opciones.current[OPCIONES.indexOf(vigente)]?.focus();
    const alTocar = (e: PointerEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('pointerdown', alTocar);
    return () => document.removeEventListener('pointerdown', alTocar);
  }, [abierto, vigente]);

  const cerrar = () => {
    setAbierto(false);
    boton.current?.focus();
  };

  const alTeclear = (e: React.KeyboardEvent) => {
    const actual = opciones.current.indexOf(document.activeElement as HTMLButtonElement);
    const mover = (destino: number) => {
      e.preventDefault();
      opciones.current[(destino + OPCIONES.length) % OPCIONES.length]?.focus();
    };
    if (e.key === 'ArrowDown') mover(actual + 1);
    else if (e.key === 'ArrowUp') mover(actual - 1);
    else if (e.key === 'Home') mover(0);
    else if (e.key === 'End') mover(OPCIONES.length - 1);
    else if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') e.preventDefault();
      cerrar();
    }
  };

  return (
    <div ref={contenedor} className="relative shrink-0">
      <Boton
        ref={boton}
        variante="fantasma"
        icono={vigente.icono}
        onClick={() => setAbierto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        aria-label={`Tema: ${vigente.etiqueta.toLowerCase()}. Cambiar tema`}
        title={`Tema: ${vigente.etiqueta.toLowerCase()}`}
      />
      {abierto && (
        <div
          id={idMenu}
          role="menu"
          aria-label="Tema de la interfaz"
          onKeyDown={alTeclear}
          className="absolute right-0 top-full z-50 mt-1.5 flex w-52 flex-col rounded-card border border-neutral-200 bg-superficie p-1 shadow-overlay"
        >
          {OPCIONES.map((opcion, i) => {
            const elegida = opcion.valor === preferencia;
            const Icono = opcion.icono;
            return (
              <button
                key={opcion.valor}
                ref={(el) => {
                  opciones.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={elegida}
                tabIndex={-1}
                onClick={() => {
                  setPreferencia(opcion.valor);
                  cerrar();
                }}
                className={cn(
                  'flex items-center gap-2.5 rounded-control px-2.5 py-1.5 text-left text-body outline-none hover:bg-neutral-100 focus-visible:bg-neutral-100',
                  elegida ? 'font-medium text-neutral-900' : 'text-neutral-700',
                )}
              >
                <Icono className="size-4 shrink-0 text-neutral-500" aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  {opcion.etiqueta}
                  {opcion.detalle && <span className="text-caption font-normal text-neutral-600">{opcion.detalle}</span>}
                </span>
                {elegida && <Check className="size-4 shrink-0 text-primary-600" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
