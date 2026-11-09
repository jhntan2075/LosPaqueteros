import React, { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { UNIDADES } from '../../config/dominio';
import { ESTADO_UNIDAD } from '../../config/glosario';
import { capitalizar, formatearMomento } from '../../lib/formato';
import type { UnidadOperacion } from '../../types/operacion';
import { iconoDeUnidad } from '../map/iconosVehiculo';

// Combobox para elegir una unidad de una flota larga (hasta 150 en una simulación). Patrón ARIA 1.2
// "combobox con lista": se escribe para filtrar, flechas para moverse, Enter para elegir y Esc para cerrar.
// La lista tiene altura acotada y ordena primero las unidades fuera del almacén, que son las que llevan
// pedidos; las ya averiadas se ven al final pero no se pueden elegir.

interface SelectorUnidadProps {
  unidades: UnidadOperacion[];
  valor: string;
  onCambiar: (codigo: string) => void;
  /** Unidades que no se pueden elegir (ya averiadas o con una avería por aplicarse). */
  esBloqueada: (unidad: UnidadOperacion) => boolean;
  reloj: Date;
}

interface Grupo {
  titulo: string;
  unidades: UnidadOperacion[];
  bloqueado: boolean;
}

/** "A-04", "a04", "4", "moto" o "en ruta" encuentran la unidad: se compara sin guiones, espacios ni mayúsculas. */
const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

const coincide = (u: UnidadOperacion, consulta: string) => {
  if (consulta === '') return true;
  const campos = [u.codigo, UNIDADES[u.tipo].nombre, u.tipo === 'BICICLETA' ? 'bici' : '', ESTADO_UNIDAD[u.estado]];
  return campos.some((campo) => normalizar(campo).includes(consulta));
};

const porCodigo = (a: UnidadOperacion, b: UnidadOperacion) => a.codigo.localeCompare(b.codigo);

export const SelectorUnidad = forwardRef<HTMLInputElement, SelectorUnidadProps>(function SelectorUnidad(
  { unidades, valor, onCambiar, esBloqueada, reloj },
  ref,
) {
  const id = useId();
  const listaId = `${id}-lista`;
  const [texto, setTexto] = useState('');
  const [abierta, setAbierta] = useState(false);
  const [activa, setActiva] = useState(0);
  const listaRef = useRef<HTMLUListElement>(null);
  const entradaRef = useRef<HTMLInputElement | null>(null);
  const elegida = unidades.find((u) => u.codigo === valor);

  const grupos: Grupo[] = useMemo(() => {
    const consulta = normalizar(texto);
    const visibles = unidades.filter((u) => coincide(u, consulta));
    const bloqueadas = visibles.filter(esBloqueada).sort(porCodigo);
    const libres = visibles.filter((u) => !esBloqueada(u));
    return [
      {
        titulo: 'Fuera del almacén',
        unidades: libres.filter((u) => u.estado === 'EN_RUTA' || u.estado === 'EN_REFRIGERIO').sort(porCodigo),
        bloqueado: false,
      },
      { titulo: 'En el almacén', unidades: libres.filter((u) => u.estado === 'DISPONIBLE' || u.estado === 'FUERA_DE_TURNO').sort(porCodigo), bloqueado: false },
      { titulo: 'No disponibles', unidades: bloqueadas, bloqueado: true },
    ].filter((g) => g.unidades.length > 0);
  }, [unidades, texto, esBloqueada]);

  // Solo las opciones elegibles reciben el foco del teclado.
  const elegibles = grupos.filter((g) => !g.bloqueado).flatMap((g) => g.unidades);
  const indiceActivo = Math.min(activa, Math.max(0, elegibles.length - 1));
  const opcionActiva = abierta ? elegibles[indiceActivo] : undefined;

  useEffect(() => {
    if (!opcionActiva) return;
    listaRef.current?.querySelector(`[data-codigo="${opcionActiva.codigo}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [opcionActiva]);

  const elegir = (u: UnidadOperacion) => {
    onCambiar(u.codigo);
    setTexto('');
    setAbierta(false);
  };

  const alPresionar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!abierta) {
        setAbierta(true);
        return;
      }
      const paso = e.key === 'ArrowDown' ? 1 : -1;
      setActiva((indiceActivo + paso + elegibles.length) % Math.max(1, elegibles.length));
    } else if (e.key === 'Enter' && abierta && opcionActiva) {
      e.preventDefault();
      elegir(opcionActiva);
    } else if (e.key === 'Escape' && abierta) {
      // Esc cierra la lista sin cerrar el diálogo que la contiene.
      e.stopPropagation();
      setAbierta(false);
    }
  };

  const nombre = (u: UnidadOperacion) => `${u.codigo} · ${capitalizar(UNIDADES[u.tipo].nombre)}`;
  const detalle = (u: UnidadOperacion) => {
    if (u.estado === 'AVERIADA') return u.averia ? `Averiada · vuelve ${formatearMomento(u.averia.vuelve, reloj)}` : 'Averiada';
    if (esBloqueada(u)) return 'Avería registrada, por aplicarse';
    if (u.estado === 'DISPONIBLE' || u.estado === 'FUERA_DE_TURNO') return ESTADO_UNIDAD[u.estado];
    const pedidos = u.paradas.length;
    return `${ESTADO_UNIDAD[u.estado]} · ${u.carga}/${u.capacidad} · ${pedidos} ${pedidos === 1 ? 'pedido' : 'pedidos'}`;
  };

  return (
    <div className="relative">
      {/* Todo el campo abre y cierra la lista, no solo el texto: el ícono y el chevrón también responden. */}
      <div
        onMouseDown={(e) => {
          if (e.target === entradaRef.current) return;
          e.preventDefault();
          entradaRef.current?.focus();
          setAbierta((actual) => !actual);
        }}
        className="h-9 px-2.5 flex items-center gap-2 border border-neutral-300 rounded-control bg-superficie cursor-text focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600/30"
      >
        {elegida && !abierta ? (
          <img src={iconoDeUnidad(elegida).href} alt="" className="block -my-1 -ml-1" />
        ) : (
          <Search className="size-3.5 text-neutral-600 shrink-0" aria-hidden="true" />
        )}
        <input
          ref={(el) => {
            entradaRef.current = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) ref.current = el;
          }}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={abierta}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={opcionActiva ? `${id}-${opcionActiva.codigo}` : undefined}
          aria-label="Unidad"
          autoComplete="off"
          // Mientras se busca, la unidad elegida queda a la vista como sugerencia del campo.
          placeholder={abierta && elegida ? nombre(elegida) : 'Busca por código o tipo (A-04, moto…)'}
          value={abierta ? texto : elegida ? nombre(elegida) : texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setActiva(0);
            setAbierta(true);
            if (valor) onCambiar('');
          }}
          onClick={() => setAbierta(true)}
          onBlur={() => setAbierta(false)}
          onKeyDown={alPresionar}
          className="flex-1 min-w-0 bg-transparent outline-none text-body text-neutral-900 tabular-nums placeholder:text-neutral-400"
        />
        <ChevronDown className={`size-4 text-neutral-600 shrink-0 transition-transform ${abierta ? 'rotate-180' : ''}`} aria-hidden="true" />
      </div>

      {abierta && (
        <ul
          ref={listaRef}
          id={listaId}
          role="listbox"
          aria-label="Unidades"
          // mousedown sin preventDefault quitaría el foco del campo y cerraría la lista antes del clic.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-10 z-10 max-h-64 overflow-y-auto bg-superficie border border-neutral-200 rounded-card shadow-overlay py-1"
        >
          {grupos.length === 0 && (
            <li className="px-3 py-2.5 text-body-sm text-neutral-600" role="presentation">
              Ninguna unidad coincide con «{texto.trim()}».
            </li>
          )}
          {grupos.map((grupo) => (
            <li key={grupo.titulo} role="presentation">
              <p className="px-3 pt-2 pb-1 text-overline uppercase text-neutral-600">{grupo.titulo}</p>
              <ul role="group" aria-label={grupo.titulo}>
                {grupo.unidades.map((u) => {
                  const esActiva = opcionActiva?.codigo === u.codigo;
                  return (
                    <li
                      key={u.codigo}
                      id={`${id}-${u.codigo}`}
                      data-codigo={u.codigo}
                      role="option"
                      aria-selected={u.codigo === valor}
                      aria-disabled={grupo.bloqueado || undefined}
                      onClick={() => !grupo.bloqueado && elegir(u)}
                      onMouseEnter={() => !grupo.bloqueado && setActiva(elegibles.indexOf(u))}
                      className={`h-8 px-3 flex items-center gap-2.5 text-body ${
                        grupo.bloqueado ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'
                      } ${esActiva ? 'bg-primary-50' : ''}`}
                    >
                      <img src={iconoDeUnidad(u).href} alt="" className="block -my-1 shrink-0" />
                      <span className="font-semibold text-neutral-900 tabular-nums w-11 shrink-0">{u.codigo}</span>
                      {/* Espacio para el nombre accesible: sin él, el lector anuncia "A-01En ruta". */}{' '}
                      <span className="text-body-sm text-neutral-600 tabular-nums truncate">{detalle(u)}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
