import React, { useEffect, useRef } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ListFilter, MapIcon, Search, X } from 'lucide-react';
import type { FiltrosMapa as Filtros } from '../../lib/filtrosMapa';
import type { OcupacionGlobal } from '../../lib/operacion';
import type { SeccionIncidencias } from '../../types/operacion';
import type { Capa, ModoColor } from './capas';
import { FiltrosMapa, type ConteosFiltros } from './FiltrosMapa';
import { IndicadoresGlobales } from './IndicadoresGlobales';
import { LeyendaMapa } from './LeyendaMapa';
import { SelectorCapas, SelectorColorUnidades } from './ControlesCapas';
import { COLOR_SEMAFORO, type NivelCarga } from '../../lib/semaforo';
import { COLOR_BLOQUEO, MarcaSemaforo } from './simbolos';

// Columna de controles del mapa (a su izquierda, fuera de la malla). Ordenada por urgencia: buscar, alertas
// (lo que exige actuar), qué codifica el color con la ocupación global, y luego filtros y capas, que se usan
// menos y van plegados. Tres formas, siempre con el mismo contenido y orden:
//  - 'columna': la columna completa (escritorio).
//  - 'riel': plegada a una tira de íconos cuando no cabe junto al panel; las alertas siguen visibles.
//  - 'cajon': en pantallas angostas se abre sobre el mapa desde la izquierda y se cierra al terminar.

/** Ancho de la columna completa y del riel, en px: el mapa los descuenta de su espacio. */
export const ANCHO_COLUMNA_PX = 248;
export const ANCHO_RIEL_PX = 52;

export type { ModoColor };

export interface AlertasMapa {
  riesgo: { rojo: number; ambar: number };
  bloqueos: number;
  averias: number;
}

export interface ColumnaMapaProps {
  forma: 'columna' | 'riel' | 'cajon';
  /** Alterna columna ↔ riel (escritorio) o cierra el cajón (celular). */
  onPlegar: () => void;
  /** Despliega la columna (desde el riel) y abre una de sus secciones. */
  onDesplegar?: (seccion?: 'buscar' | 'filtros' | 'leyenda') => void;
  /** En Simulación solo se alerta del riesgo. */
  soloRiesgo: boolean;
  alertas: AlertasMapa;
  onAbrirAlerta: (seccion: SeccionIncidencias) => void;
  busqueda: {
    termino: string;
    onCambiar: (termino: string) => void;
    sinResultados: boolean;
    onBuscar: (evento: React.FormEvent) => void;
    opciones: string[];
    /** Pide el foco al montar (al abrirla desde el ícono de búsqueda). */
    enfocar?: boolean;
  };
  ocupacion: { flota: OcupacionGlobal; almacenes: OcupacionGlobal; onAbrirFlota?: () => void; onAbrirAlmacenes?: () => void };
  modoColor: ModoColor;
  onCambiarModoColor: (modo: ModoColor) => void;
  filtros: { valor: Filtros; conteos: ConteosFiltros; activos: number; abiertos: boolean; onAlternar: () => void; onCambiar: (f: Filtros) => void; onLimpiar: () => void };
  leyenda: { abierta: boolean; onAlternar: () => void; capas: Record<Capa, boolean>; onCambiarCapa: (capa: Capa) => void };
}

const Seccion: React.FC<{ titulo: string; children: React.ReactNode; derecha?: React.ReactNode }> = ({ titulo, children, derecha }) => (
  <section className="px-3 py-2.5 border-b border-neutral-200">
    <h2 className="flex items-center text-overline uppercase text-neutral-600 mb-1.5">
      {titulo}
      {derecha && <span className="ml-auto normal-case tracking-normal font-normal">{derecha}</span>}
    </h2>
    {children}
  </section>
);

/** Fila de alerta: punto de color, número y qué es. Lleva a su sección de Incidencias. */
const FilaAlerta: React.FC<{ color: string; nivel?: NivelCarga; numero: number; texto: string; detalle?: string; etiqueta: string; onClick: () => void }> = ({
  color,
  nivel,
  numero,
  texto,
  detalle,
  etiqueta,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={etiqueta}
    className="w-full min-h-9 px-1.5 rounded-control flex items-center gap-2 text-left hover:bg-neutral-50"
  >
    {nivel && numero > 0 ? (
      <MarcaSemaforo nivel={nivel} />
    ) : (
      <span className="size-2 rounded-full shrink-0" style={{ background: numero > 0 ? color : 'rgb(var(--color-neutral-300))' }} />
    )}
    <span className={`tabular-nums font-semibold text-body ${numero > 0 ? '' : 'text-neutral-600'}`} style={numero > 0 ? { color } : undefined}>
      {numero}
    </span>
    <span className="text-body-sm text-neutral-900">{texto}</span>
    {detalle && <span className="ml-auto text-caption text-neutral-600 tabular-nums whitespace-nowrap">{detalle}</span>}
  </button>
);

/** Encabezado plegable (acordeón): conserva el nombre accesible que usan las pruebas ("Filtros, 1 activo"). */
const Desplegable: React.FC<{
  abierto: boolean;
  onAlternar: () => void;
  icono: React.ReactNode;
  titulo: string;
  nombre?: string;
  extra?: React.ReactNode;
  accion?: React.ReactNode;
  children: React.ReactNode;
}> = ({ abierto, onAlternar, icono, titulo, nombre, extra, accion, children }) => (
  <div className="border-b border-neutral-200">
    <div className="flex items-center pr-2">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierto}
        aria-label={nombre}
        className="flex-1 min-w-0 h-10 pl-3 flex items-center gap-2 text-left hover:bg-neutral-50"
      >
        {icono}
        <span className="text-body-sm font-medium text-neutral-900">{titulo}</span>
        {extra}
        <ChevronDown className={`ml-auto size-3.5 text-neutral-600 transition-transform ${abierto ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {accion}
    </div>
    {abierto && <div className="px-3 pb-2.5">{children}</div>}
  </div>
);

const BotonRiel: React.FC<{ etiqueta: string; onClick: () => void; children: React.ReactNode }> = ({ etiqueta, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={etiqueta}
    title={etiqueta}
    className="relative size-10 mx-auto flex items-center justify-center rounded-control text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
  >
    {children}
  </button>
);

export const ColumnaMapa: React.FC<ColumnaMapaProps> = (props) => {
  const { forma, onPlegar, onDesplegar, soloRiesgo, alertas, onAbrirAlerta, busqueda, ocupacion, modoColor, onCambiarModoColor, filtros, leyenda } = props;
  const enRiesgo = alertas.riesgo.rojo + alertas.riesgo.ambar;
  const entradaRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (busqueda.enfocar) entradaRef.current?.focus();
  }, [busqueda.enfocar]);

  const alertasLista: { seccion: SeccionIncidencias; color: string; nivel?: NivelCarga; numero: number; texto: string; detalle?: string; etiqueta: string }[] = [
    {
      seccion: 'riesgo',
      color: COLOR_SEMAFORO.ROJO,
      nivel: 'ROJO' as const,
      numero: enRiesgo,
      texto: 'en riesgo',
      detalle: `${alertas.riesgo.rojo} crít. · ${alertas.riesgo.ambar} ajust.`,
      etiqueta: `${enRiesgo} pedidos en riesgo: ${alertas.riesgo.rojo} críticos y ${alertas.riesgo.ambar} ajustados. Ver en Incidencias`,
    },
    ...(soloRiesgo
      ? []
      : [
          {
            seccion: 'averias' as const,
            color: COLOR_SEMAFORO.ROJO,
            numero: alertas.averias,
            texto: alertas.averias === 1 ? 'avería' : 'averías',
            etiqueta: `${alertas.averias} ${alertas.averias === 1 ? 'avería' : 'averías'}. Ver en Incidencias`,
          },
          {
            seccion: 'bloqueos' as const,
            color: COLOR_BLOQUEO,
            numero: alertas.bloqueos,
            texto: alertas.bloqueos === 1 ? 'bloqueo' : 'bloqueos',
            etiqueta: `${alertas.bloqueos} ${alertas.bloqueos === 1 ? 'bloqueo' : 'bloqueos'}. Ver en Incidencias`,
          },
        ]),
  ];

  if (forma === 'riel') {
    return (
      <aside aria-label="Controles del mapa" className="shrink-0 bg-superficie border-r border-neutral-200 flex flex-col gap-1 py-2" style={{ width: ANCHO_RIEL_PX }}>
        <BotonRiel etiqueta="Mostrar los controles del mapa" onClick={onPlegar}>
          <ChevronRight className="size-4" />
        </BotonRiel>
        <BotonRiel etiqueta="Buscar en el mapa" onClick={() => onDesplegar?.('buscar')}>
          <Search className="size-4" />
        </BotonRiel>
        <div className="h-px mx-2 my-1 bg-neutral-200" />
        {alertasLista.map((a) => (
          <BotonRiel key={a.seccion} etiqueta={a.etiqueta} onClick={() => onAbrirAlerta(a.seccion)}>
            <span className="tabular-nums font-semibold text-body" style={{ color: a.numero > 0 ? a.color : undefined }}>
              {a.numero}
            </span>
            {a.nivel && a.numero > 0 ? (
              <span className="absolute bottom-0.5">
                <MarcaSemaforo nivel={a.nivel} />
              </span>
            ) : (
              <span className="absolute bottom-1 size-1.5 rounded-full" style={{ background: a.numero > 0 ? a.color : 'rgb(var(--color-neutral-300))' }} />
            )}
          </BotonRiel>
        ))}
        <div className="h-px mx-2 my-1 bg-neutral-200" />
        <BotonRiel etiqueta={filtros.activos > 0 ? `Filtros, ${filtros.activos} ${filtros.activos === 1 ? 'activo' : 'activos'}` : 'Filtros'} onClick={() => onDesplegar?.('filtros')}>
          <ListFilter className={`size-4 ${filtros.activos > 0 ? 'text-primary-600' : ''}`} />
          {filtros.activos > 0 && <span className="absolute top-1 right-1 size-2 rounded-full bg-primary-600" />}
        </BotonRiel>
        <BotonRiel etiqueta="Capas y leyenda" onClick={() => onDesplegar?.('leyenda')}>
          <MapIcon className="size-4" />
        </BotonRiel>
      </aside>
    );
  }

  const cajon = forma === 'cajon';
  return (
    <aside
      aria-label="Controles del mapa"
      data-sin-zoom
      onPointerDown={(e) => e.stopPropagation()}
      className={
        cajon
          ? 'absolute inset-y-0 left-0 z-40 w-[min(320px,88%)] bg-superficie border-r border-neutral-200 shadow-overlay flex flex-col cursor-default'
          : 'shrink-0 bg-superficie border-r border-neutral-200 flex flex-col cursor-default'
      }
      style={cajon ? undefined : { width: ANCHO_COLUMNA_PX }}
    >
      <div className="h-11 pl-3 pr-1.5 flex items-center gap-2 border-b border-neutral-200 shrink-0">
        <form onSubmit={busqueda.onBuscar} className="relative flex-1 min-w-0 flex items-center gap-2" role="search">
          <Search className="size-3.5 text-neutral-600 shrink-0" />
          <input
            ref={entradaRef}
            type="search"
            placeholder="Pedido, unidad o almacén"
            aria-label="Buscar pedido o unidad en el mapa"
            list="mapa-objetos"
            value={busqueda.termino}
            onChange={(e) => busqueda.onCambiar(e.target.value)}
            className={`w-full h-8 text-body-sm font-sans bg-transparent focus:outline-none [&::-webkit-calendar-picker-indicator]:!hidden ${
              busqueda.sinResultados ? 'text-critical-600' : 'text-neutral-900'
            } placeholder-neutral-400`}
          />
          <datalist id="mapa-objetos">
            {busqueda.opciones.map((opcion) => (
              <option key={opcion} value={opcion} />
            ))}
          </datalist>
        </form>
        <button
          type="button"
          onClick={onPlegar}
          aria-label={cajon ? 'Cerrar los controles del mapa' : 'Plegar los controles del mapa'}
          title={cajon ? 'Cerrar' : 'Plegar'}
          className="size-8 shrink-0 flex items-center justify-center rounded-control text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
        >
          {cajon ? <X className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>
      <span role="status" className="block">
        {busqueda.sinResultados && (
          <span className="block px-3 py-1.5 bg-critical-50 font-sans text-body-sm text-critical-600">
            No hay pedidos, unidades ni almacenes en el mapa con «{busqueda.termino.trim()}»
          </span>
        )}
      </span>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <Seccion titulo="Alertas">
          <div className="flex flex-col">
            {alertasLista.map((a) => (
              <FilaAlerta key={a.seccion} {...a} onClick={() => onAbrirAlerta(a.seccion)} />
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Color de las unidades">
          <SelectorColorUnidades modoColor={modoColor} onCambiarModoColor={onCambiarModoColor} />
          <div className="mb-1.5" />
          <IndicadoresGlobales
            flota={ocupacion.flota}
            almacenes={ocupacion.almacenes}
            onAbrirFlota={ocupacion.onAbrirFlota}
            onAbrirAlmacenes={ocupacion.onAbrirAlmacenes}
          />
        </Seccion>

        <Desplegable
          abierto={filtros.abiertos}
          onAlternar={filtros.onAlternar}
          icono={<ListFilter className={`size-3.5 ${filtros.activos > 0 ? 'text-primary-600' : 'text-neutral-600'}`} />}
          titulo="Filtros"
          nombre={filtros.activos > 0 ? `Filtros, ${filtros.activos} ${filtros.activos === 1 ? 'activo' : 'activos'}` : 'Filtros'}
          extra={
            filtros.activos > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-primary-600 text-sobre-color text-caption font-semibold tabular-nums flex items-center justify-center">
                {filtros.activos}
              </span>
            )
          }
          accion={
            filtros.activos > 0 && (
              <button
                type="button"
                onClick={filtros.onLimpiar}
                aria-label="Quitar los filtros"
                title="Quitar los filtros"
                className="size-7 flex items-center justify-center rounded-control text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              >
                <X className="size-3.5" />
              </button>
            )
          }
        >
          <FiltrosMapa filtros={filtros.valor} conteos={filtros.conteos} onCambiar={filtros.onCambiar} />
        </Desplegable>

        <Desplegable abierto={leyenda.abierta} onAlternar={leyenda.onAlternar} icono={<MapIcon className="size-3.5 text-neutral-600" />} titulo="Capas y leyenda">
          <SelectorCapas capas={leyenda.capas} onCambiarCapa={leyenda.onCambiarCapa} />
          <div className="my-2 border-t border-neutral-200" />
          <LeyendaMapa />
        </Desplegable>
      </div>
    </aside>
  );
};
