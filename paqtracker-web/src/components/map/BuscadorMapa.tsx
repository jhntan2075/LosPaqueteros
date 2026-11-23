import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { TARJETA_FLOTANTE } from './estilosMapa';
import { BUSCAR_EN_MAPA, BUSCAR_PLACEHOLDER, sinResultadosEnMapa } from '../../config/glosario';

// Buscador del mapa: una tarjeta de 44 px sobre el mapa. Encuentra un pedido, una unidad o un almacén y lo
// abre. En pantallas angostas se pliega a un botón de ícono que despliega la entrada al tocarlo.

export interface BusquedaMapa {
  termino: string;
  onCambiar: (termino: string) => void;
  sinResultados: boolean;
  onBuscar: (evento: React.FormEvent) => void;
  /** Pedidos con destino en el mapa, unidades y almacenes: sugerencias de la lista desplegable. */
  opciones: string[];
}

interface BuscadorMapaProps {
  busqueda: BusquedaMapa;
  /** Pantalla angosta: pliega el buscador a un botón de ícono. */
  plegable: boolean;
}

export const BuscadorMapa: React.FC<BuscadorMapaProps> = ({ busqueda, plegable }) => {
  const [desplegado, setDesplegado] = useState(false);
  const entradaRef = useRef<HTMLInputElement>(null);
  const visible = !plegable || desplegado;
  useEffect(() => {
    if (plegable && desplegado) entradaRef.current?.focus();
  }, [plegable, desplegado]);

  if (!visible) {
    return (
      <button type="button" onClick={() => setDesplegado(true)} aria-label={BUSCAR_EN_MAPA} className={`${TARJETA_FLOTANTE} size-11 flex items-center justify-center text-neutral-600 hover:text-neutral-900`}>
        <Search className="size-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <form onSubmit={busqueda.onBuscar} role="search" className={`${TARJETA_FLOTANTE} h-11 pl-3 pr-2 flex items-center gap-2`}>
        <Search className="size-4 text-neutral-600 shrink-0" aria-hidden="true" />
        <input
          ref={entradaRef}
          type="search"
          placeholder={BUSCAR_PLACEHOLDER}
          aria-label={BUSCAR_EN_MAPA}
          list="mapa-objetos"
          value={busqueda.termino}
          onChange={(e) => busqueda.onCambiar(e.target.value)}
          onBlur={() => {
            if (plegable && busqueda.termino.trim() === '') setDesplegado(false);
          }}
          className={`flex-1 min-w-0 h-9 text-body-sm font-sans bg-transparent focus:outline-none [&::-webkit-calendar-picker-indicator]:!hidden ${
            busqueda.sinResultados ? 'text-critical-600' : 'text-neutral-900'
          } placeholder-neutral-400`}
        />
        <datalist id="mapa-objetos">
          {busqueda.opciones.map((opcion) => (
            <option key={opcion} value={opcion} />
          ))}
        </datalist>
      </form>
      <span role="status" className="block">
        {busqueda.sinResultados && (
          <span className={`block px-3 py-1.5 rounded-card border border-critical-600/30 bg-critical-50 font-sans text-body-sm text-critical-600`}>
            {sinResultadosEnMapa(busqueda.termino.trim())}
          </span>
        )}
      </span>
    </div>
  );
};
