import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Search, ZoomIn, ZoomOut, Maximize2, Layers, MapIcon } from 'lucide-react';
import { ALMACENES, MALLA_ALTO_KM, MALLA_ANCHO_KM, UNIDADES } from '../../config/dominio';
import { NOMBRE_HOLGURA, NOMBRE_INVENTARIO } from '../../config/glosario';
import { useTamanoElemento } from '../../hooks/useTamanoElemento';
import { capitalizar, formatearMomento } from '../../lib/formato';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import {
  acercarEn,
  escalaDeEncuadre,
  escalaMinimaPermitida,
  limitarVista,
  nodoEn,
  pasoCuadricula,
  proyectar,
  trazado,
  vistaCompleta,
  type Lienzo,
  type Vista,
} from '../../lib/malla';
import { fueraDelAlmacen } from '../../lib/operacion';
import { colorDeUnidad, iconoVehiculo } from './iconosVehiculo';
import { LeyendaMapa } from './LeyendaMapa';
import { AlmacenCentral, AlmacenIntermedio, CENTRO_CABEZA_PIN, MarcaBloqueo, PinDestino } from './simbolos';
import haloSeleccion from '../../assets/figma/pedidos/halo.svg';
import type { Coordenada } from '../../types/domain';
import type { AlmacenOperacion, BloqueoOperacion, UnidadOperacion } from '../../types/operacion';
import type { NivelHolgura } from '../../types/pedidos';

/** Destino de un pedido a bordo, dibujado como pin con el color de su holgura. */
export interface DestinoMapa {
  pedido: string;
  destino: Coordenada;
  nivel: NivelHolgura;
  /** Holgura restante ya formateada, para el tooltip del pin. */
  holgura: string;
  unidad: string;
}

export type PestanaPanel = 'incidencias' | 'flota' | 'bitacora';

const ACCESOS_PANEL: { pestana: PestanaPanel; etiqueta: string }[] = [
  { pestana: 'incidencias', etiqueta: 'Incidencias' },
  { pestana: 'flota', etiqueta: 'Flota' },
  { pestana: 'bitacora', etiqueta: 'Bitácora' },
];

export type ObjetoMapa =
  | { tipo: 'pedido'; codigo: string }
  | { tipo: 'vehiculo'; codigo: string }
  | { tipo: 'almacen'; codigo: string };

/** Objeto bajo el cursor: muestra su tooltip. Los bloqueos tienen tooltip pero no se seleccionan. */
type ObjetoHover = { tipo: ObjetoMapa['tipo'] | 'bloqueo'; codigo: string };

export interface GridMapHandle {
  /**
   * Centra el mapa en un nodo, acercando si hace falta para que se distinga. Devuelve false si el
   * mapa aún no midió su contenedor y no pudo centrar.
   */
  centrarEn: (punto: Coordenada) => boolean;
}

interface GridMapProps {
  unidades: UnidadOperacion[];
  destinos: DestinoMapa[];
  bloqueos: BloqueoOperacion[];
  /** Stock de los almacenes con su semáforo de inventario; sin datos se dibujan sin stock. */
  almacenes?: AlmacenOperacion[];
  seleccion: ObjetoMapa | null;
  /** Ancho ocupado por un panel flotante a la derecha; los controles de zoom se corren a su izquierda. */
  anchoPanelDerecho?: number;
  /** Pedidos en riesgo por nivel del semáforo de holgura. */
  riesgo: { rojo: number; ambar: number };
  onSeleccionar: (objeto: ObjetoMapa) => void;
  onAbrirIncidencias: () => void;
  /** Abre el panel lateral en una de sus pestañas; sin valor no se muestran los accesos. */
  onAbrirPanel?: (pestana: PestanaPanel) => void;
  onHoverCoordenada?: (coord: Coordenada) => void;
  /** 'simulacion': barra reducida (búsqueda y riesgo); tocar un objeto abre su detalle igual que en Operación. */
  variante?: 'operacion' | 'simulacion';
  /** Componente de KPIs flotantes para renderizar en la barra de controles del mapa */
  slotKpis?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * La malla de 70 × 50 km se encuadra completa ('contener') con márgenes para que todos los
 * vehículos, almacenes y destinos se vean a la primera sin recortes. Los controles flotan sobre el mapa.
 */
const LIENZO_BASE = { margen: 32, margenSuperior: 56, ajuste: 'contener' } as const;
/** Franja superior ocupada por los controles flotantes: los rótulos del eje x se dibujan debajo. */
const FRANJA_CONTROLES_PX = 52;
/** Desplazamiento máximo (px) para considerar un toque como clic y no como arrastre. */
const TOLERANCIA_CLIC_PX = 4;
/** Escala mínima (px/km) al centrar en un objeto. */
const ESCALA_AL_CENTRAR = 26;

/** Longitudes "redondas" para la barra de escala; se elige la que mide entre 40 y 120 px. */
const LARGOS_ESCALA_KM = [1, 2, 5, 10, 20, 50];
const barraEscala = (pxPorKm: number) => {
  const km = LARGOS_ESCALA_KM.find((largo) => largo * pxPorKm >= 40) ?? LARGOS_ESCALA_KM[LARGOS_ESCALA_KM.length - 1];
  return { km, px: Math.round(km * pxPorKm) };
};

/** La leyenda abierta o cerrada se recuerda por navegador; sin almacenamiento, arranca cerrada. */
const CLAVE_LEYENDA = 'paqtracker.leyendaAbierta';
const leerLeyendaAbierta = () => {
  try {
    return localStorage.getItem(CLAVE_LEYENDA) === '1';
  } catch {
    return false;
  }
};
const guardarLeyendaAbierta = (abierta: boolean) => {
  try {
    localStorage.setItem(CLAVE_LEYENDA, abierta ? '1' : '0');
  } catch {
    // Sin almacenamiento disponible: la preferencia dura solo esta sesión.
  }
};

const COLOR_NIVEL: Record<NivelHolgura, string> = { ROJO: '#B91C1C', AMBAR: '#B45309', VERDE: '#15803D', CERRADO: '#94A3B8' };

type Capa = 'rutas' | 'unidades' | 'destinos' | 'bloqueos' | 'almacenes';
const CAPAS: { clave: Capa; etiqueta: string }[] = [
  { clave: 'rutas', etiqueta: 'Rutas' },
  { clave: 'unidades', etiqueta: 'Unidades' },
  { clave: 'destinos', etiqueta: 'Destinos' },
  { clave: 'bloqueos', etiqueta: 'Bloqueos' },
  { clave: 'almacenes', etiqueta: 'Almacenes' },
];

const ESTILO_PILDORA = 'h-[32px] bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.13)] rounded-full border border-[#E2E8F0] flex items-center';

export const GridMap = forwardRef<GridMapHandle, GridMapProps>(function GridMap(
  {
    unidades,
    destinos,
    bloqueos,
    almacenes = [],
    seleccion,
    anchoPanelDerecho = 0,
    riesgo,
    onSeleccionar,
    onAbrirIncidencias,
    onAbrirPanel,
    onHoverCoordenada,
    variante = 'operacion',
    slotKpis,
    children,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ancho, alto } = useTamanoElemento(containerRef);
  const lienzo: Lienzo = {
    ancho,
    alto,
    ...LIENZO_BASE,
    margenDerecho: anchoPanelDerecho > 0 ? anchoPanelDerecho + 24 : LIENZO_BASE.margen,
  };

  // Vista elegida por el usuario (zoom / desplazamiento). null = vista inicial centrada, que se recalcula
  // sola con el tamaño del contenedor; una vista elegida se reajusta con limitarVista si el contenedor cambia.
  const [vistaUsuario, setVistaUsuario] = useState<Vista | null>(null);
  const vista = ancho > 0 && alto > 0 ? (vistaUsuario ? limitarVista(vistaUsuario, lienzo) : vistaCompleta(lienzo)) : null;
  const [isDragging, setIsDragging] = useState(false);
  const arrastreRef = useRef({ x: 0, y: 0, inicioX: 0, inicioY: 0, objeto: null as string | null, activo: false });

  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [sinResultados, setSinResultados] = useState(false);
  const [nodoActivo, setNodoActivo] = useState<Coordenada>({ x: 19, y: 9 });
  // Hover: se guarda el objeto, no la posición del cursor, así el mapa no se redibuja con cada movimiento.
  const [hover, setHover] = useState<ObjetoHover | null>(null);
  const [capasAbiertas, setCapasAbiertas] = useState(false);
  const [leyendaAbierta, setLeyendaAbierta] = useState(leerLeyendaAbierta);
  const alternarLeyenda = (abierta: boolean) => {
    setLeyendaAbierta(abierta);
    guardarLeyendaAbierta(abierta);
  };
  const enSimulacion = variante === 'simulacion';
  const [capas, setCapas] = useState<Record<Capa, boolean>>({ rutas: true, unidades: true, destinos: true, bloqueos: true, almacenes: true });

  // Centra el nodo en el área libre (descontando el panel derecho).
  const centrarEn = (punto: Coordenada) => {
    if (!vista) return false;
    const escala = Math.max(vista.escala, ESCALA_AL_CENTRAR);
    const centroX = (ancho - anchoPanelDerecho) / 2;
    setVistaUsuario(limitarVista({ escala, x: centroX - punto.x * escala, y: alto / 2 - punto.y * escala }, lienzo));
    return true;
  };
  useImperativeHandle(ref, () => ({ centrarEn }));

  // La rueda se registra como listener no pasivo: React la marca pasiva y preventDefault no detendría el scroll.
  // Sobre paneles flotantes ([data-sin-zoom]) la rueda desplaza el panel en lugar de acercar el mapa.
  useEffect(() => {
    const elemento = containerRef.current;
    if (!elemento) return;
    const alGirar = (evento: WheelEvent) => {
      if ((evento.target as HTMLElement).closest('[data-sin-zoom]')) return;
      evento.preventDefault();
      const rect = elemento.getBoundingClientRect();
      const l: Lienzo = {
        ancho: rect.width,
        alto: rect.height,
        ...LIENZO_BASE,
        margenDerecho: anchoPanelDerecho > 0 ? anchoPanelDerecho + 24 : LIENZO_BASE.margen,
      };
      const factor = evento.deltaY < 0 ? 1.15 : 1 / 1.15;
      setVistaUsuario((actual) =>
        acercarEn(actual ? limitarVista(actual, l) : vistaCompleta(l), factor, evento.clientX - rect.left, evento.clientY - rect.top, l),
      );
    };
    elemento.addEventListener('wheel', alGirar, { passive: false });
    return () => elemento.removeEventListener('wheel', alGirar);
  }, [anchoPanelDerecho]);

  // Arrastre con captura de puntero: sigue aunque el cursor salga del mapa, como en un visor de mapas.
  // Con la captura activa el click llega al contenedor, así que un toque sin desplazamiento sobre un
  // elemento [data-objeto] (unidad, pin, almacén) se interpreta como selección.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const destino = e.target as HTMLElement;
    if (e.button !== 0 || !vista || destino.closest('button, input, a, [data-sin-zoom]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setHover(null);
    arrastreRef.current = {
      x: e.clientX - vista.x,
      y: e.clientY - vista.y,
      inicioX: e.clientX,
      inicioY: e.clientY,
      objeto: destino.closest('[data-objeto]')?.getAttribute('data-objeto') ?? null,
      activo: true,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!vista || !containerRef.current) return;
    if (isDragging) {
      setVistaUsuario(limitarVista({ ...vista, x: e.clientX - arrastreRef.current.x, y: e.clientY - arrastreRef.current.y }, lienzo));
    }
    if (!isDragging) {
      const objeto = (e.target as Element).closest('[data-objeto]')?.getAttribute('data-objeto') ?? null;
      const actual = hover ? `${hover.tipo}:${hover.codigo}` : null;
      if (objeto !== actual) {
        const [tipo, codigo] = objeto ? objeto.split(':') : [];
        setHover(objeto ? { tipo: tipo as ObjetoHover['tipo'], codigo } : null);
      }
    }
    const rect = containerRef.current.getBoundingClientRect();
    const nodo = nodoEn(vista, e.clientX - rect.left, e.clientY - rect.top);
    if (nodo && (nodo.x !== nodoActivo.x || nodo.y !== nodoActivo.y)) {
      setNodoActivo(nodo);
      onHoverCoordenada?.(nodo);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    const a = arrastreRef.current;
    if (!a.activo) return;
    a.activo = false;
    const fueClic = Math.hypot(e.clientX - a.inicioX, e.clientY - a.inicioY) <= TOLERANCIA_CLIC_PX;
    if (!fueClic || !a.objeto) return;
    const [tipo, codigo] = a.objeto.split(':');
    if (tipo !== 'bloqueo') onSeleccionar({ tipo: tipo as ObjetoMapa['tipo'], codigo });
  };

  const buscar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const termino = terminoBusqueda.trim().toUpperCase().replace(/^#?(\d+)$/, '#$1');
    const destino = destinos.find((d) => d.pedido === termino);
    const unidad = unidades.find((u) => u.codigo === termino);
    setSinResultados(!destino && !unidad);
    if (destino) {
      onSeleccionar({ tipo: 'pedido', codigo: destino.pedido });
      centrarEn(destino.destino);
    } else if (unidad) {
      onSeleccionar({ tipo: 'vehiculo', codigo: unidad.codigo });
      centrarEn(unidad.posicion);
    }
  };

  const acercarAlCentro = (factor: number) => {
    if (vista) setVistaUsuario(acercarEn(vista, factor, ancho / 2, alto / 2, lienzo));
  };

  const escalaBase = ancho > 0 ? escalaDeEncuadre(lienzo) : 1;
  const escalaMinima = ancho > 0 ? escalaMinimaPermitida(lienzo) : 1;
  const enEscalaMinima = !vista || vista.escala <= escalaMinima * 1.001;
  const averiadas = unidades.filter((u) => u.estado === 'AVERIADA').length;
  const derechaControles = anchoPanelDerecho > 0 ? anchoPanelDerecho + 24 : 16;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => setHover(null)}
      className={`relative flex-1 w-full h-full bg-white overflow-hidden select-none touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      {/* 1. Barra flotante: búsqueda, riesgo, bloqueos y averías, capas */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        <form onSubmit={buscar} className={`${ESTILO_PILDORA} relative w-[206px] px-3 gap-2`} role="search">
          <Search className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
          <input
            type="search"
            placeholder="Pedido o unidad (#1088, A-04)"
            aria-label="Buscar pedido o unidad en el mapa"
            list="mapa-objetos"
            value={terminoBusqueda}
            onChange={(e) => {
              setTerminoBusqueda(e.target.value);
              setSinResultados(false);
            }}
            className={`w-full text-[12px] font-sans bg-transparent focus:outline-none [&::-webkit-calendar-picker-indicator]:!hidden ${
              sinResultados ? 'text-[#B91C1C]' : 'text-[#0F172A]'
            } placeholder-[#94A3B8]`}
          />
          <span role="status" className="absolute left-0 top-[36px] whitespace-nowrap">
            {sinResultados && (
              <span className="block bg-white border border-[#FECACA] rounded-[6px] px-2 py-1 font-sans text-[12px] text-[#B91C1C] shadow-xs">
                No hay pedidos ni unidades en el mapa con «{terminoBusqueda.trim()}»
              </span>
            )}
          </span>
          <datalist id="mapa-objetos">
            {destinos.map((d) => (
              <option key={d.pedido} value={d.pedido} />
            ))}
            {unidades.map((u) => (
              <option key={u.codigo} value={u.codigo} />
            ))}
          </datalist>
        </form>

        <button
          type="button"
          onClick={onAbrirIncidencias}
          aria-label={`${riesgo.rojo} pedidos críticos y ${riesgo.ambar} ajustados. Ver incidencias`}
          className={`${ESTILO_PILDORA} px-3 gap-1.5 hover:bg-slate-50`}
        >
          <span className="w-2 h-2 bg-[#B91C1C] rounded-full"></span>
          <span className="text-[#B91C1C] tabular-nums font-medium text-[12px]">{riesgo.rojo}</span>
          <span className="text-[#B45309] text-[11px] leading-none" aria-hidden="true">▲</span>
          <span className="text-[#B45309] tabular-nums font-medium text-[12px]">{riesgo.ambar}</span>
          <span className="text-[#64748B] font-sans text-[12px]">en riesgo</span>
        </button>

        {!enSimulacion && (
        <button type="button" onClick={onAbrirIncidencias} className={`${ESTILO_PILDORA} px-3.5 gap-1.5 hover:bg-slate-50`}>
          <span className="w-2 h-2 bg-[#B45309] rounded-full"></span>
          <span className="text-[#B45309] tabular-nums font-medium text-[12px]">{bloqueos.length}</span>
          <span className="text-[#64748B] font-sans text-[12px]">bloqueos</span>
          <span className="w-1.5"></span>
          <span className="w-2 h-2 bg-[#B91C1C] rounded-full"></span>
          <span className="text-[#B91C1C] tabular-nums font-medium text-[12px]">{averiadas}</span>
          <span className="text-[#64748B] font-sans text-[12px]">averías</span>
        </button>
        )}

        {!enSimulacion && (
        <div className="relative">
          <button
            type="button"
            aria-expanded={capasAbiertas}
            onClick={() => setCapasAbiertas(!capasAbiertas)}
            className={`${ESTILO_PILDORA} px-3.5 gap-1.5 hover:bg-slate-50 ${capasAbiertas ? 'border-[#1E40AF]' : ''}`}
          >
            <Layers className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="text-[#64748B] font-sans text-[12px]">Capas</span>
          </button>
          {capasAbiertas && (
            <fieldset
              data-sin-zoom
              className="absolute left-0 top-[38px] w-[170px] bg-white border border-[#E2E8F0] rounded-[8px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.16)] p-[8px] flex flex-col gap-[2px]"
            >
              <legend className="sr-only">Capas visibles</legend>
              {CAPAS.map(({ clave, etiqueta }) => (
                <label key={clave} className="flex items-center gap-[8px] px-[6px] py-[4px] rounded hover:bg-[#F8FAFC] text-[12px] font-sans text-[#0F172A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={capas[clave]}
                    onChange={() => setCapas({ ...capas, [clave]: !capas[clave] })}
                    className="accent-[#1E40AF]"
                  />
                  {etiqueta}
                </label>
              ))}
            </fieldset>
          )}
        </div>
        )}

        {/* Slot para KPIs flotantes (Opción A: HUD Popover) */}
        {slotKpis}
      </div>

      {/* Accesos al panel lateral: aparecen donde se abre y se ocultan mientras está abierto */}
      {onAbrirPanel && anchoPanelDerecho === 0 && (
        <nav
          aria-label="Paneles del mapa"
          className="absolute right-4 top-3 z-10 h-[32px] bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.13)] rounded-full border border-[#E2E8F0] flex items-center px-1 gap-0.5"
        >
          {ACCESOS_PANEL.map(({ pestana, etiqueta }) => (
            <button
              key={pestana}
              type="button"
              onClick={() => onAbrirPanel(pestana)}
              className="h-[26px] px-3 rounded-full font-sans text-[12px] text-[#0F172A] hover:bg-slate-100"
            >
              {etiqueta}
            </button>
          ))}
        </nav>
      )}

      {/* 2. Controles de zoom (a la izquierda del panel derecho si está abierto) */}
      <div
        className="absolute bottom-12 z-10 flex flex-col gap-1.5 bg-white p-1.5 rounded-xl shadow-[0px_2px_8px_rgba(0,0,0,0.15)] border border-[#E2E8F0]"
        style={{ right: derechaControles }}
      >
        <button
          onClick={() => acercarAlCentro(1.25)}
          className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
          title="Acercar"
          aria-label="Acercar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => acercarAlCentro(0.8)}
          disabled={enEscalaMinima}
          className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-[#64748B] hover:text-[#0F172A] transition cursor-pointer disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent"
          title="Alejar"
          aria-label="Alejar"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-full h-[1px] bg-[#E2E8F0] my-0.5"></div>
        <button
          onClick={() => setVistaUsuario(null)}
          className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
          title="Ver la malla completa"
          aria-label="Ver la malla completa"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] tabular-nums text-center text-[#64748B] font-bold block">
          {vista ? Math.round((vista.escala / escalaBase) * 100) : 100}%
        </span>
      </div>

      {/* 3. Leyenda (panel flotante, no modal) y barra de escala */}
      <div className="absolute left-4 bottom-4 z-20 flex flex-col items-start gap-2">
        {leyendaAbierta && <LeyendaMapa onCerrar={() => alternarLeyenda(false)} />}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => alternarLeyenda(!leyendaAbierta)}
            aria-expanded={leyendaAbierta}
            className={`${ESTILO_PILDORA} px-3 gap-1.5 hover:bg-slate-50 ${leyendaAbierta ? 'border-[#1E40AF]' : ''}`}
          >
            <MapIcon className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="text-[#0F172A] font-sans text-[12px]">Leyenda</span>
          </button>
          {vista && (
            <div className="bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md border border-[#E2E8F0] shadow-xs pointer-events-none flex flex-col gap-[3px]">
              <span className="tabular-nums text-[11px] text-[#475569]">{barraEscala(vista.escala).km} km</span>
              <span className="block h-[5px] border-x-2 border-b-2 border-[#475569]" style={{ width: barraEscala(vista.escala).px }} />
            </div>
          )}
        </div>
      </div>

      {/* 4. Lienzo: la geometría se proyecta con la vista; los marcadores conservan su tamaño en pantalla */}
      {vista && (
        <CapasMapa
          vista={vista}
          lienzo={lienzo}
          capas={capas}
          unidades={unidades}
          destinos={destinos}
          bloqueos={bloqueos}
          almacenes={almacenes}
          seleccion={seleccion}
          nodoActivo={nodoActivo}
        />
      )}

      {/* Tooltip del objeto bajo el cursor (identifica; el detalle se abre con clic) */}
      {vista && hover && !isDragging && (
        <TooltipObjeto objeto={hover} vista={vista} lienzo={lienzo} unidades={unidades} destinos={destinos} bloqueos={bloqueos} almacenes={almacenes} />
      )}

      {children}
    </div>
  );
});

interface CapasMapaProps {
  vista: Vista;
  lienzo: Lienzo;
  capas: Record<Capa, boolean>;
  unidades: UnidadOperacion[];
  destinos: DestinoMapa[];
  bloqueos: BloqueoOperacion[];
  almacenes: AlmacenOperacion[];
  seleccion: ObjetoMapa | null;
  nodoActivo: Coordenada;
}

/** Contenido del tooltip y punto del mapa sobre el que se ancla (encima del símbolo). */
function contenidoTooltip(
  objeto: ObjetoHover,
  datos: Pick<GridMapProps, 'unidades' | 'destinos' | 'bloqueos'> & { almacenes: AlmacenOperacion[] },
  reloj: Date,
): { titulo: string; detalle: string; color?: string; punto: Coordenada; alzaPx: number } | null {
  if (objeto.tipo === 'pedido') {
    const d = datos.destinos.find((x) => x.pedido === objeto.codigo);
    if (!d) return null;
    return { titulo: `Pedido ${d.pedido}`, detalle: `Holgura ${d.holgura} · ${NOMBRE_HOLGURA[d.nivel].toLowerCase()}`, color: COLOR_NIVEL[d.nivel], punto: d.destino, alzaPx: 30 };
  }
  if (objeto.tipo === 'vehiculo') {
    const u = datos.unidades.find((x) => x.codigo === objeto.codigo);
    if (!u) return null;
    const capacidad = u.capacidad;
    const averiada = u.estado === 'AVERIADA';
    return {
      titulo: `${capitalizar(UNIDADES[u.tipo].nombre)} ${u.codigo}`,
      detalle: averiada
        ? u.averia
          ? `Averiada · tipo ${u.averia.tipo} · vuelve ${formatearMomento(u.averia.vuelve, reloj)}`
          : 'Averiada'
        : `Carga ${u.carga}/${capacidad} · ${capacidad === 0 ? 0 : Math.round((u.carga / capacidad) * 100)} %${u.estado === 'EN_REFRIGERIO' ? ' · en refrigerio' : ''}`,
      color: colorDeUnidad(u),
      punto: u.posicion,
      alzaPx: 16,
    };
  }
  if (objeto.tipo === 'almacen') {
    const a = ALMACENES.find((x) => x.id === objeto.codigo);
    if (!a) return null;
    const estado = datos.almacenes.find((x) => x.id === a.id);
    const conStock = estado?.porcentajeStock != null && estado.nivel && estado.nivel !== 'CERRADO';
    return {
      titulo: `Almacén ${a.nombre}`,
      detalle: conStock ? `Stock ${estado.porcentajeStock} % · ${NOMBRE_INVENTARIO[estado.nivel as 'ROJO'].toLowerCase()}` : 'Stock ilimitado',
      color: conStock ? COLOR_NIVEL[estado.nivel as 'ROJO'] : undefined,
      punto: a.ubicacion,
      alzaPx: 20,
    };
  }
  const b = datos.bloqueos.find((x) => x.id === objeto.codigo);
  if (!b) return null;
  return {
    titulo: 'Tramo bloqueado',
    detalle: `Hasta ${b.fin}`,
    color: COLOR_NIVEL.ROJO,
    punto: { x: (b.desde.x + b.hasta.x) / 2, y: (b.desde.y + b.hasta.y) / 2 },
    alzaPx: 14,
  };
}

const TooltipObjeto: React.FC<
  { objeto: ObjetoHover; vista: Vista; lienzo: Lienzo } & Pick<GridMapProps, 'unidades' | 'destinos' | 'bloqueos'> & { almacenes: AlmacenOperacion[] }
> = ({ objeto, vista, lienzo, ...datos }) => {
  // El mapa siempre se dibuja dentro del contexto de una ejecución: su reloj fecha la reincorporación.
  const { reloj } = useDatosOperacion();
  const contenido = contenidoTooltip(objeto, datos, reloj);
  if (!contenido) return null;
  const p = proyectar(vista, contenido.punto);
  const MEDIO_ANCHO = 90;
  const left = Math.min(Math.max(p.x, MEDIO_ANCHO + 8), lienzo.ancho - MEDIO_ANCHO - 8);
  return (
    <div
      role="tooltip"
      className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full bg-[#0F172A] text-white rounded-[6px] px-[10px] py-[6px] shadow-lg leading-[normal] whitespace-nowrap"
      style={{ left, top: p.y - contenido.alzaPx }}
    >
      <p className="font-semibold text-[12px] tabular-nums">{contenido.titulo}</p>
      <p className="flex items-center gap-[6px] text-[12px] text-[#CBD5E1] tabular-nums">
        {contenido.color && <span className="size-[7px] rounded-full shrink-0" style={{ background: contenido.color }} />}
        {contenido.detalle}
      </p>
    </div>
  );
};

/** Porcentaje de stock de un almacén intermedio; undefined en el central o sin datos. */
const stockDe = (almacenes: AlmacenOperacion[], id: AlmacenOperacion['id']) =>
  almacenes.find((a) => a.id === id)?.porcentajeStock ?? undefined;

/** Divide la ruta de una unidad en el tramo ya recorrido y el pendiente, cortando en su posición. */
function dividirRuta(unidad: UnidadOperacion): { recorrido: Coordenada[]; pendiente: Coordenada[] } {
  const { ruta, posicion: p } = unidad;
  for (let i = 0; i < ruta.length - 1; i++) {
    const a = ruta[i];
    const b = ruta[i + 1];
    const enX = a.y === b.y && p.y === a.y && p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x);
    const enY = a.x === b.x && p.x === a.x && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y);
    if (enX || enY) return { recorrido: [...ruta.slice(0, i + 1), p], pendiente: [p, ...ruta.slice(i + 1)] };
  }
  return { recorrido: [], pendiente: ruta };
}

const CapasMapa: React.FC<CapasMapaProps> = ({ vista, lienzo, capas, unidades, destinos, bloqueos, almacenes, seleccion, nodoActivo }) => {
  const origen = proyectar(vista, { x: 0, y: 0 });
  const paso = pasoCuadricula(vista.escala);
  const pasoPx = paso * vista.escala;

  // Cuadrícula continua y uniforme en todo el lienzo
  const iMin = Math.floor((0 - origen.x) / pasoPx) - 1;
  const iMax = Math.ceil((lienzo.ancho - origen.x) / pasoPx) + 1;
  const jMin = Math.floor((0 - origen.y) / pasoPx) - 1;
  const jMax = Math.ceil((lienzo.alto - origen.y) / pasoPx) + 1;

  // Rótulos de los ejes: marcas cada 10 km a lo largo del plano
  const hayEspacioSuperior = origen.y >= FRANJA_CONTROLES_PX + 14;
  const yRotulosX = hayEspacioSuperior ? origen.y - 6 : Math.max(origen.y + 14, FRANJA_CONTROLES_PX + 4);

  const hayEspacioIzquierdo = origen.x >= 28;
  const xRotulosY = hayEspacioIzquierdo ? origen.x - 6 : Math.max(origen.x + 6, 8);
  const anchorY = hayEspacioIzquierdo ? 'end' : 'start';

  const paso10Px = 10 * vista.escala;
  const k10MaxX = Math.ceil((lienzo.ancho - origen.x) / paso10Px);
  const k10MaxY = Math.ceil((lienzo.alto - origen.y) / paso10Px);
  const totalRotulosX = Math.max(Math.floor(MALLA_ANCHO_KM / 10) + 1, k10MaxX + 1);
  const totalRotulosY = Math.max(Math.floor(MALLA_ALTO_KM / 10) + 1, k10MaxY + 1);

  const halo = { stroke: '#FFFFFF', strokeWidth: 3, paintOrder: 'stroke' } as const;

  // Unidad destacada: la seleccionada o la que lleva el pedido seleccionado.
  const unidadDestacada =
    seleccion?.tipo === 'vehiculo' ? seleccion.codigo : seleccion?.tipo === 'pedido' ? destinos.find((d) => d.pedido === seleccion.codigo)?.unidad : undefined;
  const enRuta = unidades.filter((u) => u.estado === 'EN_RUTA');
  // La ruta destacada se dibuja al final para quedar encima de las demás.
  const ordenRutas = [...enRuta].sort((a, b) => Number(a.codigo === unidadDestacada) - Number(b.codigo === unidadDestacada));

  const activo = proyectar(vista, nodoActivo);

  return (
    <svg className="absolute inset-0 w-full h-full">
      {/* Cuadrícula continua y uniforme en todo el lienzo */}
      {Array.from({ length: Math.max(0, iMax - iMin + 1) }, (_, idx) => {
        const i = iMin + idx;
        const x = origen.x + i * pasoPx;
        return (
          <line
            key={`gv${i}`}
            x1={x}
            y1={0}
            x2={x}
            y2={lienzo.alto}
            stroke="#E2E8F0"
            strokeWidth="1"
          />
        );
      })}
      {Array.from({ length: Math.max(0, jMax - jMin + 1) }, (_, idx) => {
        const j = jMin + idx;
        const y = origen.y + j * pasoPx;
        return (
          <line
            key={`gh${j}`}
            x1={0}
            y1={y}
            x2={lienzo.ancho}
            y2={y}
            stroke="#E2E8F0"
            strokeWidth="1"
          />
        );
      })}

      {/* Rótulos cada 10 km */}
      {Array.from({ length: Math.max(0, totalRotulosX) }, (_, i) => {
        const x = origen.x + i * 10 * vista.escala;
        if (x < 14 || x > lienzo.ancho - 16) return null;
        return (
          <text key={`rx${i}`} x={x} y={yRotulosX} fill="#94A3B8" fontSize="11" textAnchor="middle" {...halo}>
            {i * 10}k
          </text>
        );
      })}
      {Array.from({ length: Math.max(0, totalRotulosY) }, (_, i) => {
        const y = origen.y + i * 10 * vista.escala + 4;
        const topeSuperior = hayEspacioSuperior ? 14 : yRotulosX + 16;
        if (y < topeSuperior || y > lienzo.alto - 6) return null;
        return (
          <text key={`ry${i}`} x={xRotulosY} y={y} fill="#94A3B8" fontSize="11" textAnchor={anchorY} {...halo}>
            {i * 10}k
          </text>
        );
      })}

      {/* --- RUTAS: tramo recorrido (gris sólido) y pendiente (punteado; azul si está destacada) --- */}
      {capas.rutas &&
        ordenRutas.map((unidad) => {
          const { recorrido, pendiente } = dividirRuta(unidad);
          const destacada = unidad.codigo === unidadDestacada;
          return (
            <g key={`ruta-${unidad.codigo}`}>
              {recorrido.length > 1 && <path d={trazado(vista, recorrido)} fill="none" stroke="#9EABBA" strokeWidth="2" />}
              <path
                d={trazado(vista, pendiente)}
                fill="none"
                stroke={destacada ? '#1E40AF' : '#94A3B8'}
                strokeWidth={destacada ? 3 : 2.5}
                strokeDasharray={destacada ? '7 5' : '6 4'}
              />
            </g>
          );
        })}

      {/* --- BLOQUEOS (LE-037): tramo de calle cortado --- */}
      {capas.bloqueos &&
        bloqueos.map((b) => {
          const a = proyectar(vista, b.desde);
          const z = proyectar(vista, b.hasta);
          const m = { x: (a.x + z.x) / 2, y: (a.y + z.y) / 2 };
          return (
            <g key={b.id}>
              <line x1={a.x} y1={a.y} x2={z.x} y2={z.y} stroke="#B91C1C" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
              <g transform={`translate(${m.x}, ${m.y})`} data-objeto={`bloqueo:${b.id}`}>
                <MarcaBloqueo />
              </g>
            </g>
          );
        })}

      {/* --- ALMACENES (posiciones de ConfiguracionDominio) --- */}
      {capas.almacenes &&
        ALMACENES.map((almacen) => {
          const { x, y } = proyectar(vista, almacen.ubicacion);
          const stock = stockDe(almacenes, almacen.id);
          const nivel = almacenes.find((a) => a.id === almacen.id)?.nivel;
          const etiqueta = stock === undefined ? almacen.nombre : `${almacen.nombreCorto.replace('Int.', 'Interm.')} / ${stock} %`;
          // Semáforo de inventario calculado por la API (LE-078).
          const color = stock === undefined || !nivel ? '#64748B' : COLOR_NIVEL[nivel];
          const central = almacen.id === 'CENTRAL';
          return (
            <g key={almacen.id} transform={`translate(${x}, ${y})`} className="cursor-pointer" data-objeto={`almacen:${almacen.id}`}>
              {seleccion?.tipo === 'almacen' && seleccion.codigo === almacen.id && (
                <circle r="21" fill="none" stroke="#1E40AF" strokeWidth="2" />
              )}
              {central ? <AlmacenCentral /> : <AlmacenIntermedio color={color} fraccionStock={stock === undefined ? undefined : stock / 100} />}
              <text x="24" y="5" fill="#64748B" fontSize="13" fontWeight="500" {...halo}>
                {etiqueta}
              </text>
            </g>
          );
        })}

      {/* --- DESTINOS: pin con el color de la holgura del pedido --- */}
      {capas.destinos &&
        destinos.map((d) => {
          const { x, y } = proyectar(vista, d.destino);
          const seleccionado = seleccion?.tipo === 'pedido' && seleccion.codigo === d.pedido;
          return (
            <g key={d.pedido} transform={`translate(${x}, ${y})`} className="cursor-pointer" data-objeto={`pedido:${d.pedido}`}>
              {seleccionado && <circle cx="0" cy={CENTRO_CABEZA_PIN} r="13" fill="none" stroke="#1E40AF" strokeWidth="2" />}
              <PinDestino color={COLOR_NIVEL[d.nivel]} critico={d.nivel === 'ROJO'} />
            </g>
          );
        })}

      {/* --- UNIDADES en ruta (color por ocupación, CF-02) y averiadas --- */}
      {capas.unidades &&
        unidades
          .filter(fueraDelAlmacen)
          .map((u) => {
            const { x, y } = proyectar(vista, u.posicion);
            const capacidad = u.capacidad;
            const averiada = u.estado === 'AVERIADA';
            const color = colorDeUnidad(u);
            const seleccionada = seleccion?.tipo === 'vehiculo' && seleccion.codigo === u.codigo;
            const icono = iconoVehiculo(u.tipo, color);
            const rotuloX = icono.medioAnchoVisible + (seleccionada ? 6 : 4);
            return (
              <g key={u.codigo} transform={`translate(${x}, ${y})`} className="cursor-pointer" data-objeto={`vehiculo:${u.codigo}`}>
                {seleccionada && <image href={haloSeleccion} x={-13} y={-13} width={26} height={26} />}
                <image href={icono.href} x={-icono.centroX} y={-icono.centroY} width={icono.ancho} height={icono.alto} />
                {averiada ? (
                  <text x={rotuloX} y="4" fill="#B91C1C" fontSize="12" fontWeight="600" {...halo}>
                    ✕ {u.codigo}
                  </text>
                ) : (
                  <>
                    <text x={rotuloX} y="-1" fill="#64748B" fontSize="12" fontWeight="500" {...halo}>
                      {u.carga}/{capacidad}
                    </text>
                    <rect x={rotuloX} y="4" width="24" height="3" rx="1.5" fill="#CBD5E1" />
                    <rect x={rotuloX} y="4" width={24 * (u.carga / capacidad)} height="3" rx="1.5" fill={color} />
                  </>
                )}
              </g>
            );
          })}

      {/* Retícula del nodo bajo el cursor */}
      <g transform={`translate(${activo.x}, ${activo.y})`} pointerEvents="none">
        <circle r="6" fill="none" stroke="#1E40AF" strokeWidth="1.5" strokeDasharray="2 2" />
        <circle r="2.5" fill="#1E40AF" />
      </g>
    </svg>
  );
};
