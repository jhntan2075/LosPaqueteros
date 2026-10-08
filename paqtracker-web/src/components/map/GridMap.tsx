import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Search, ZoomIn, ZoomOut, Maximize2, Layers } from 'lucide-react';
import { ALMACENES, MALLA_ALTO_KM, MALLA_ANCHO_KM, UNIDADES } from '../../config/dominio';
import { useTamanoElemento } from '../../hooks/useTamanoElemento';
import { capitalizar } from '../../lib/formato';
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
import { nivelDeOcupacion } from '../../lib/operacion';
import { iconoVehiculo } from './iconosVehiculo';
import haloSeleccion from '../../assets/figma/pedidos/halo.svg';
import type { Coordenada } from '../../types/domain';
import type { AlmacenOperacion, BloqueoOperacion, UnidadOperacion } from '../../types/operacion';
import type { NivelHolgura } from '../../types/pedidos';

/** Destino de un pedido a bordo, dibujado como pin con el color de su holgura. */
export interface DestinoMapa {
  pedido: string;
  destino: Coordenada;
  nivel: NivelHolgura;
  unidad: string;
}

export type ObjetoMapa = { tipo: 'pedido'; codigo: string } | { tipo: 'vehiculo'; codigo: string };

export interface GridMapHandle {
  /** Centra el mapa en un nodo, acercando si hace falta para que se distinga. */
  centrarEn: (punto: Coordenada) => void;
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
  riesgo: number;
  onSeleccionar: (objeto: ObjetoMapa) => void;
  onAbrirIncidencias: () => void;
  onHoverCoordenada?: (coord: Coordenada) => void;
  /**
   * 'simulacion': barra reducida (búsqueda y riesgo), botón de ayuda y vista rápida al tocar una
   * unidad; el detalle completo se abre desde la vista rápida.
   */
  variante?: 'operacion' | 'simulacion';
  onAyuda?: () => void;
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

const PIN_PATH = 'M -10 -26 C -10 -31 10 -31 10 -26 C 10 -19 0 -4 0 0 C 0 -4 -10 -19 -10 -26 Z';

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
    onHoverCoordenada,
    variante = 'operacion',
    onAyuda,
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
  const [almacenInspeccionado, setAlmacenInspeccionado] = useState<string | null>(null);
  const [capasAbiertas, setCapasAbiertas] = useState(false);
  const [vistaRapida, setVistaRapida] = useState<string | null>(null);
  const enSimulacion = variante === 'simulacion';
  const [capas, setCapas] = useState<Record<Capa, boolean>>({ rutas: true, unidades: true, destinos: true, bloqueos: true, almacenes: true });

  // Centra el nodo en el área libre (descontando el panel derecho).
  const centrarEn = (punto: Coordenada) => {
    if (!vista) return;
    const escala = Math.max(vista.escala, ESCALA_AL_CENTRAR);
    const centroX = (ancho - anchoPanelDerecho) / 2;
    setVistaUsuario(limitarVista({ escala, x: centroX - punto.x * escala, y: alto / 2 - punto.y * escala }, lienzo));
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
    if (tipo === 'almacen') setAlmacenInspeccionado(codigo);
    else if (tipo === 'vehiculo' && enSimulacion) setVistaRapida(codigo);
    else onSeleccionar({ tipo: tipo as ObjetoMapa['tipo'], codigo });
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
  const almacen = ALMACENES.find((a) => a.id === almacenInspeccionado);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative flex-1 w-full h-full bg-white overflow-hidden select-none touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      {/* 1. Barra flotante: búsqueda, riesgo, bloqueos y averías, capas */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        <form onSubmit={buscar} className={`${ESTILO_PILDORA} w-[206px] px-3 gap-2`} role="search">
          <Search className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
          <input
            type="search"
            placeholder="Buscar pedido o unidad"
            aria-label="Buscar pedido o unidad (p. ej. #1088 o A-04)"
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
          <datalist id="mapa-objetos">
            {destinos.map((d) => (
              <option key={d.pedido} value={d.pedido} />
            ))}
            {unidades.map((u) => (
              <option key={u.codigo} value={u.codigo} />
            ))}
          </datalist>
        </form>

        <button type="button" onClick={onAbrirIncidencias} className={`${ESTILO_PILDORA} px-3 gap-1.5 hover:bg-slate-50`}>
          <span className="w-2 h-2 bg-[#B91C1C] rounded-full"></span>
          <span className="text-[#B91C1C] font-mono font-medium text-[12px]">{riesgo}</span>
          <span className="text-[#64748B] font-sans text-[12px]">en riesgo</span>
        </button>

        {!enSimulacion && (
        <button type="button" onClick={onAbrirIncidencias} className={`${ESTILO_PILDORA} px-3.5 gap-1.5 hover:bg-slate-50`}>
          <span className="w-2 h-2 bg-[#B45309] rounded-full"></span>
          <span className="text-[#B45309] font-mono font-medium text-[12px]">{bloqueos.length}</span>
          <span className="text-[#64748B] font-sans text-[12px]">bloqueos</span>
          <span className="w-1.5"></span>
          <span className="w-2 h-2 bg-[#B91C1C] rounded-full"></span>
          <span className="text-[#B91C1C] font-mono font-medium text-[12px]">{averiadas}</span>
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

      {enSimulacion && onAyuda && anchoPanelDerecho === 0 && (
        <button
          type="button"
          onClick={onAyuda}
          title="Leyenda del lienzo"
          className="absolute right-4 top-3 z-10 size-[32px] bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.13)] rounded-full border-2 border-[#1E40AF] hover:bg-blue-50 flex items-center justify-center"
        >
          <span className="text-[#1E40AF] font-sans font-semibold text-[13px] leading-none">?</span>
        </button>
      )}

      {/* 2. Controles de zoom (a la izquierda del panel derecho si está abierto) */}
      <div
        className="absolute bottom-12 z-10 flex flex-col gap-1.5 bg-white p-1.5 rounded-xl shadow-[0px_2px_8px_rgba(0,0,0,0.15)] border border-[#E2E8F0]"
        style={{ right: derechaControles }}
      >
        <button
          onClick={() => acercarAlCentro(1.25)}
          className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
          title="Ampliar mapa (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => acercarAlCentro(0.8)}
          disabled={enEscalaMinima}
          className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-[#64748B] hover:text-[#0F172A] transition cursor-pointer disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent"
          title="Reducir mapa (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-full h-[1px] bg-[#E2E8F0] my-0.5"></div>
        <button
          onClick={() => setVistaUsuario(null)}
          className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
          title="Restablecer vista completa (100%)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <span className="text-[9px] font-mono text-center text-[#94A3B8] font-bold block">
          {vista ? Math.round((vista.escala / escalaBase) * 100) : 100}%
        </span>
      </div>

      {/* 3. Escala */}
      <div className="absolute left-4 bottom-12 z-10 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md border border-[#E2E8F0] text-[11px] font-mono text-[#64748B] shadow-xs pointer-events-none">
        1 km = {vista ? vista.escala.toFixed(1).replace('.', ',') : '—'} px
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

      {/* Inspección rápida de almacenes */}
      {almacen && (
        <div
          data-sin-zoom
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 bg-white border border-[#CBD5E1] shadow-lg rounded-lg p-3 text-xs flex items-center gap-4"
        >
          <span className="font-mono text-[#0F172A]">
            Almacén {almacen.nombre} ({almacen.ubicacion.x},{almacen.ubicacion.y})
            {stockDe(almacenes, almacen.id) !== undefined && ` · Stock: ${stockDe(almacenes, almacen.id)}%`}
          </span>
          <button onClick={() => setAlmacenInspeccionado(null)} aria-label="Cerrar" className="text-[#64748B] hover:text-[#0F172A] font-bold">
            ✕
          </button>
        </div>
      )}

      {vista && vistaRapida && (
        <VistaRapidaUnidad
          unidad={unidades.find((u) => u.codigo === vistaRapida)}
          punto={proyectar(vista, unidades.find((u) => u.codigo === vistaRapida)?.posicion ?? { x: 0, y: 0 })}
          lienzo={lienzo}
          onCerrar={() => setVistaRapida(null)}
          onVerDetalle={() => {
            onSeleccionar({ tipo: 'vehiculo', codigo: vistaRapida });
            setVistaRapida(null);
          }}
        />
      )}

      {children}
    </div>
  );
});

/** Tarjeta flotante con lo esencial de una unidad (corrida de simulación). */
const VistaRapidaUnidad: React.FC<{
  unidad?: UnidadOperacion;
  punto: { x: number; y: number };
  lienzo: Lienzo;
  onCerrar: () => void;
  onVerDetalle: () => void;
}> = ({ unidad, punto, lienzo, onCerrar, onVerDetalle }) => {
  if (!unidad) return null;
  const capacidad = UNIDADES[unidad.tipo].capacidad;
  const averiada = unidad.estado === 'AVERIADA';
  const nivelCarga = nivelDeOcupacion(unidad.carga, capacidad);
  const color = averiada ? '#B91C1C' : COLOR_NIVEL[nivelCarga];
  const icono = iconoVehiculo(unidad.tipo, color);
  const peor = [...unidad.paradas].sort((a, b) => a.holgura.localeCompare(b.holgura))[0];
  const ANCHO = 210;
  const ALTO = 160;
  const left = Math.min(Math.max(punto.x + 18, 8), lienzo.ancho - ANCHO - 8);
  const top = Math.min(Math.max(punto.y - ALTO + 10, 56), lienzo.alto - ALTO - 8);
  const nombre = `${capitalizar(UNIDADES[unidad.tipo].nombre)} ${unidad.codigo}`;
  return (
    <div
      data-sin-zoom
      role="dialog"
      aria-label={`Vista rápida de ${nombre}`}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute z-20 bg-white border border-[#E2E8F0] rounded-[10px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.16)] leading-[normal] text-[12px]"
      style={{ left, top, width: ANCHO }}
    >
      <div className="px-[14px] pt-[12px] pb-[10px] flex items-start gap-[8px] border-b border-[#E2E8F0]">
        <img src={icono.href} alt="" className="block -ml-[4px] -mt-[3px]" />
        <div className="flex flex-col">
          <span className="font-mono font-semibold text-[13px] text-[#0F172A]">{nombre}</span>
          <span className="font-sans text-[#64748B]">{averiada ? 'Averiada' : unidad.estado === 'EN_RUTA' ? 'En ruta' : 'Disponible'}</span>
        </div>
        <button type="button" onClick={onCerrar} aria-label="Cerrar vista rápida" className="ml-auto text-[#64748B] hover:text-[#0F172A]">
          ✕
        </button>
      </div>
      <div className="px-[14px] py-[8px] flex flex-col gap-[8px] border-b border-[#E2E8F0]">
        <div className="flex justify-between">
          <span className="font-sans text-[#64748B]">Ocupación</span>
          <span className="font-mono font-medium" style={{ color }}>
            {nivelCarga === 'AMBAR' ? '▲ ' : ''}
            {unidad.carga} / {capacidad}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-sans text-[#64748B]">Holgura mínima a bordo</span>
          <span className="font-mono font-medium" style={{ color: peor ? COLOR_NIVEL[peor.nivel] : '#94A3B8' }}>
            {peor ? `● ${peor.holgura}` : '—'}
          </span>
        </div>
      </div>
      <button type="button" onClick={onVerDetalle} className="px-[14px] py-[10px] font-sans font-medium text-[#1E40AF] hover:underline">
        Ver detalle completo ›
      </button>
    </div>
  );
};

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
          <text key={`rx${i}`} x={x} y={yRotulosX} fill="#94A3B8" fontSize="11" fontFamily="Fira Code" textAnchor="middle" {...halo}>
            {i * 10}k
          </text>
        );
      })}
      {Array.from({ length: Math.max(0, totalRotulosY) }, (_, i) => {
        const y = origen.y + i * 10 * vista.escala + 4;
        const topeSuperior = hayEspacioSuperior ? 14 : yRotulosX + 16;
        if (y < topeSuperior || y > lienzo.alto - 6) return null;
        return (
          <text key={`ry${i}`} x={xRotulosY} y={y} fill="#94A3B8" fontSize="11" fontFamily="Fira Code" textAnchor={anchorY} {...halo}>
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
              <g transform={`translate(${m.x}, ${m.y})`}>
                <title>{`Bloqueo (${b.desde.x},${b.desde.y})–(${b.hasta.x},${b.hasta.y}) hasta ${b.fin}`}</title>
                <circle r="10" fill="#FEE2E2" />
                <path d="M -6 -6 L 6 6 M -6 6 L 6 -6" stroke="#B91C1C" strokeWidth="2.5" />
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
          const color = stock === undefined || !nivel ? '#0F172A' : COLOR_NIVEL[nivel];
          return (
            <g key={almacen.id} transform={`translate(${x}, ${y})`} className="cursor-pointer" data-objeto={`almacen:${almacen.id}`}>
              {stock === undefined ? (
                <>
                  <rect x="-15" y="-14" width="30" height="28" rx="4" fill="#0F172A" stroke="#FFFFFF" strokeWidth="2" filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.3))" />
                  <rect x="-4" y="3" width="8" height="9" fill="#FFFFFF" rx="1" />
                </>
              ) : (
                <>
                  <rect x="-13" y="-12" width="26" height="24" rx="3" fill="#FFFFFF" stroke={color} strokeWidth="2" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.16))" />
                  <rect x="-11" y="-2" width="22" height="12" rx="1" fill="#E2E8F0" />
                  <rect x="-11" y={10 - 12 * (stock / 100)} width="22" height={12 * (stock / 100)} rx="1" fill={color} />
                </>
              )}
              <text x="24" y="5" fill="#64748B" fontSize="13" fontFamily="Fira Code" fontWeight="500" {...halo}>
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
              <title>{`Pedido ${d.pedido} · (${d.destino.x},${d.destino.y})`}</title>
              {seleccionado && <circle cx="0" cy="-18" r="16" fill="none" stroke="#1E40AF" strokeWidth="2" />}
              <path d={PIN_PATH} fill={COLOR_NIVEL[d.nivel]} stroke="#FFFFFF" strokeWidth="1.5" filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.25))" />
              {d.nivel === 'ROJO' ? (
                <>
                  <rect x="-1" y="-25" width="2" height="6" rx="1" fill="#FFFFFF" />
                  <circle cx="0" cy="-16" r="1.3" fill="#FFFFFF" />
                </>
              ) : (
                <circle cx="0" cy="-22" r="3" fill="#FFFFFF" />
              )}
            </g>
          );
        })}

      {/* --- UNIDADES en ruta (color por ocupación, CF-02) y averiadas --- */}
      {capas.unidades &&
        unidades
          .filter((u) => u.estado !== 'DISPONIBLE')
          .map((u) => {
            const { x, y } = proyectar(vista, u.posicion);
            const capacidad = UNIDADES[u.tipo].capacidad;
            const averiada = u.estado === 'AVERIADA';
            const color = averiada ? '#B91C1C' : COLOR_NIVEL[nivelDeOcupacion(u.carga, capacidad)];
            const seleccionada = seleccion?.tipo === 'vehiculo' && seleccion.codigo === u.codigo;
            const icono = iconoVehiculo(u.tipo, color);
            const rotuloX = icono.medioAnchoVisible + (seleccionada ? 6 : 4);
            return (
              <g key={u.codigo} transform={`translate(${x}, ${y})`} className="cursor-pointer" data-objeto={`vehiculo:${u.codigo}`}>
                <title>{`${u.codigo} · ${u.carga}/${capacidad}${averiada ? ' · averiada' : ''}`}</title>
                {seleccionada && <image href={haloSeleccion} x={-13} y={-13} width={26} height={26} />}
                <image href={icono.href} x={-icono.centroX} y={-icono.centroY} width={icono.ancho} height={icono.alto} />
                {averiada ? (
                  <text x={rotuloX} y="4" fill="#B91C1C" fontSize="12" fontFamily="Fira Code" fontWeight="600" {...halo}>
                    ✕ {u.codigo}
                  </text>
                ) : (
                  <>
                    <text x={rotuloX} y="-1" fill="#64748B" fontSize="12" fontFamily="Fira Code" fontWeight="500" {...halo}>
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
