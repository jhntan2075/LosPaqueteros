import React from 'react';
import { Check, X } from 'lucide-react';
import { TIPOS_UNIDAD, UNIDADES, type TipoUnidad } from '../../config/dominio';
import { NOMBRE_CARGA } from '../../config/glosario';
import { SIN_FILTROS, alternar, cantidadFiltros, type FiltrosMapa as Filtros } from '../../lib/filtrosMapa';
import { capitalizar } from '../../lib/formato';
import { NIVELES_CARGA, type NivelCarga } from '../../lib/semaforo';
import { iconoVehiculo } from './iconosVehiculo';
import { MarcaSemaforo } from './simbolos';

// Panel flotante de filtros globales del mapa (D05–D07), con el mismo formato que "Capas y leyenda": no
// modal, para ver el efecto en el mapa mientras se filtra. Chips de selección múltiple con su conteo; el
// chip marcado lleva un check además del color, para no depender solo del color.

export interface ConteosFiltros {
  tipos: Record<TipoUnidad, number>;
  carga: Record<NivelCarga, number>;
  stock: Record<NivelCarga, number>;
  unidades: { visibles: number; total: number };
  almacenes: { visibles: number; total: number };
}

const Chip: React.FC<{ activo: boolean; conteo: number; onClick: () => void; children: React.ReactNode }> = ({
  activo,
  conteo,
  onClick,
  children,
}) => (
  <button
    type="button"
    aria-pressed={activo}
    onClick={onClick}
    className={`h-7 pl-2 pr-2.5 rounded-full border flex items-center gap-1.5 text-body-sm font-sans transition-colors ${
      activo ? 'bg-primary-50 border-primary-600 text-primary-600' : 'bg-superficie border-neutral-300 text-neutral-900 hover:bg-neutral-50'
    }`}
  >
    {activo && <Check className="size-3 shrink-0" aria-hidden="true" />}
    {children}
    <span className={`tabular-nums ${activo ? 'text-primary-600' : 'text-neutral-600'}`}>{conteo}</span>
  </button>
);

const Grupo: React.FC<{ titulo: string; nota?: string; children: React.ReactNode }> = ({ titulo, nota, children }) => (
  <fieldset className="px-3 py-2.5 border-b border-neutral-200">
    <legend className="contents">
      <span className="block font-semibold text-body-sm text-neutral-900 mb-1.5">{titulo}</span>
    </legend>
    <div className="flex flex-wrap gap-1.5">{children}</div>
    {nota && <p className="mt-1.5 text-caption text-neutral-600">{nota}</p>}
  </fieldset>
);

const ChipsNivel: React.FC<{ marcados: NivelCarga[]; conteos: Record<NivelCarga, number>; onCambiar: (n: NivelCarga[]) => void }> = ({
  marcados,
  conteos,
  onCambiar,
}) => (
  <>
    {NIVELES_CARGA.map((nivel) => (
      <Chip key={nivel} activo={marcados.includes(nivel)} conteo={conteos[nivel]} onClick={() => onCambiar(alternar(marcados, nivel))}>
        <MarcaSemaforo nivel={nivel} />
        {NOMBRE_CARGA[nivel]}
      </Chip>
    ))}
  </>
);

interface FiltrosMapaProps {
  filtros: Filtros;
  conteos: ConteosFiltros;
  onCambiar: (filtros: Filtros) => void;
  onCerrar: () => void;
}

export const FiltrosMapa: React.FC<FiltrosMapaProps> = ({ filtros, conteos, onCambiar, onCerrar }) => {
  const activos = cantidadFiltros(filtros);
  return (
    <section
      aria-label="Filtros del mapa"
      data-sin-zoom
      onPointerDown={(e) => e.stopPropagation()}
      className="w-[300px] max-h-[calc(100vh-260px)] overflow-y-auto bg-superficie border border-neutral-200 rounded-card shadow-overlay cursor-default"
    >
      <header className="h-9 pl-3 pr-2 flex items-center border-b border-neutral-200">
        <h2 className="font-semibold text-body text-neutral-900">Filtros</h2>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar filtros"
          className="ml-auto size-6 flex items-center justify-center rounded-control text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
        >
          <X className="size-3.5" />
        </button>
      </header>

      <Grupo titulo="Tipo de unidad">
        {TIPOS_UNIDAD.map((tipo) => (
          <Chip
            key={tipo}
            activo={filtros.tipos.includes(tipo)}
            conteo={conteos.tipos[tipo]}
            onClick={() => onCambiar({ ...filtros, tipos: alternar(filtros.tipos, tipo) })}
          >
            <img src={iconoVehiculo(tipo, '#64748B').href} alt="" className="block -my-1.5 -mx-0.5 max-w-none" />
            {capitalizar(UNIDADES[tipo].nombre)}
          </Chip>
        ))}
      </Grupo>

      <Grupo titulo="Carga de unidades">
        <ChipsNivel marcados={filtros.carga} conteos={conteos.carga} onCambiar={(carga) => onCambiar({ ...filtros, carga })} />
      </Grupo>

      <Grupo titulo="Stock de almacenes" nota="El almacén central no tiene tope: siempre se muestra.">
        <ChipsNivel marcados={filtros.stock} conteos={conteos.stock} onCambiar={(stock) => onCambiar({ ...filtros, stock })} />
      </Grupo>

      <footer className="px-3 py-2.5 flex items-center gap-2">
        <p role="status" className="text-caption text-neutral-600 tabular-nums">
          {conteos.unidades.visibles} de {conteos.unidades.total} unidades · {conteos.almacenes.visibles} de {conteos.almacenes.total}{' '}
          almacenes
        </p>
        <button
          type="button"
          onClick={() => onCambiar(SIN_FILTROS)}
          disabled={activos === 0}
          className="ml-auto text-body-sm font-medium text-primary-600 hover:underline disabled:text-neutral-400 disabled:no-underline disabled:cursor-default"
        >
          Limpiar filtros
        </button>
      </footer>
    </section>
  );
};
