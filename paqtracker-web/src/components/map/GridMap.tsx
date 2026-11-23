import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { ALMACENES, MALLA_ALTO_KM, MALLA_ANCHO_KM, TIPOS_UNIDAD, UNIDADES, type IdAlmacen } from '../../config/dominio';
import { alertaStockBajo, NOMBRE_CARGA, NOMBRE_HOLGURA, NOMBRE_STOCK, SITUACION_UNIDAD, nombreAveria } from '../../config/glosario';
import { useTamanoElemento } from '../../hooks/useTamanoElemento';
import { capitalizar, formatearMomento } from '../../lib/formato';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { useDeslizamientoUnidades } from '../../hooks/useDeslizamientoUnidades';
import {
  acercarEn,
  escalaDeEncuadre,
  escalaMinimaPermitida,
  flechasDeRecorrido,
  limitarVista,
  nodoEn,
  pasoCuadricula,
  proyectar,
  trazado,
  vistaCompleta,
  type Lienzo,
  type Vista,
} from '../../lib/malla';
import { agruparCercanas } from '../../lib/agrupacion';
import { prefiereMenosMovimiento } from '../../lib/movimiento';
import { fueraDelAlmacen, ocupacionAlmacenes, ocupacionFlota } from '../../lib/operacion';
import { almacenPasaFiltros, cantidadFiltros, guardarFiltros, leerFiltros, unidadPasaFiltros, type FiltrosMapa as Filtros } from '../../lib/filtrosMapa';
import { COLOR_HOLGURA_HEX, COLOR_SEMAFORO, NIVELES_CARGA, nivelDeOcupacion, type NivelCarga } from '../../lib/semaforo';
import { destinoResaltado, unidadesResaltadas, type SeleccionResaltable } from '../../lib/envios';
import { COLOR_SIN_DATO, colorDeUnidad, iconoVehiculo, unidadVacia } from './iconosVehiculo';
import type { ConteosFiltros } from './FiltrosMapa';
import type { Capa, ModoColor } from './capas';
import { ALTO_MAPA_REDUCIDO_PX, ANCHO_ANGOSTO_PX } from './estilosMapa';
import { crearLienzo, derechaDeControles, INFERIOR_CONTROLES_PX } from './lienzo';
import { ControlesZoom, BarraEscala } from './ControlesZoom';
import { HerramientasMapa } from './HerramientasMapa';
import { PilaSuperiorMapa } from './PilaSuperiorMapa';
import {
  AlmacenCentral,
  AlmacenIntermedio,
  COLOR_EN_ENTREGA,
  InsigniaAveria,
  InsigniaStockBajo,
  COLOR_BLOQUEO,
  MarcaBloqueo,
  MarcadorDestino,
  OPACIDAD_LINEA_BLOQUEO,
  RADIO_DESTINO,
  type VarianteDestino,
} from './simbolos';
import haloSeleccion from '../../assets/figma/pedidos/halo.svg';
import type { Coordenada } from '../../types/domain';
import type { AlmacenOperacion, BloqueoOperacion, SeccionIncidencias, UnidadOperacion } from '../../types/operacion';
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

/**
 * Lo que el mapa resalta: un pedido (todas sus rutas), una fracción (solo la ruta de su unidad), una unidad o
 * un almacén. Al tocar el mapa solo se eligen pedidos, unidades y almacenes; la fracción se elige en el panel.
 */
export type ObjetoMapa = SeleccionResaltable;

/**
 * Objeto bajo el cursor: muestra su tooltip. Los bloqueos tienen tooltip pero no se seleccionan; un grupo de
 * unidades (vista lejana) tampoco: tocarlo acerca la vista, y su código son los de sus miembros separados por coma.
 */
type ObjetoHover = { tipo: ObjetoMapa['tipo'] | 'bloqueo' | 'grupo'; codigo: string };

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
  /** Ancho ocupado por un panel flotante a la derecha; las herramientas y el zoom se corren a su izquierda. */
  anchoPanelDerecho?: number;
  /** Alto de una hoja inferior abierta (pantallas angostas): la malla se encuadra encima de ella. */
  altoPanelInferior?: number;
  /** Pedidos en riesgo por nivel del semáforo de holgura, y cuántos ya llegarán tarde. */
  riesgo: { rojo: number; ambar: number; tarde?: number };
  onSeleccionar: (objeto: ObjetoMapa) => void;
  /** Abre Incidencias, en la sección de la alerta tocada si se indica. */
  onAbrirIncidencias: (seccion?: SeccionIncidencias) => void;
  /** Indicador de carga de la flota. */
  onAbrirFlota?: () => void;
  /** Indicador de stock de los almacenes; sin valor, el indicador solo informa. */
  onAbrirAlmacenes?: () => void;
  onHoverCoordenada?: (coord: Coordenada) => void;
  /** Modo enfoque (solo el mapa y sus herramientas): lo lleva quien monta el mapa, con useModoEnfoque. */
  enfoque?: boolean;
  onModoEnfoque?: (activo: boolean) => void;
  /** 'simulacion': solo alerta del riesgo; tocar un objeto abre su detalle igual que en Operación. */
  variante?: 'operacion' | 'simulacion';
  /** Pantalla angosta: el buscador se pliega a un ícono y el zoom es con pellizco ("Ver todo" queda en las herramientas). */
  compacto?: boolean;
  children?: React.ReactNode;
}

/** Desplazamiento máximo (px) para considerar un toque como clic y no como arrastre. */
const TOLERANCIA_CLIC_PX = 4;
/** Escala mínima (px/km) al centrar en un objeto. */
const ESCALA_AL_CENTRAR = 26;
/** Zoom de los botones y de las teclas + y -. */
const FACTOR_BOTON = 1.25;
/** Zoom al tocar un grupo de unidades: lo bastante para que se separen sin perder el contexto. */
const FACTOR_GRUPO = 2;
/** Desplazamiento de las flechas del teclado. */
const PASO_TECLADO_PX = 80;
/** Duración de las transiciones de la vista: corta, para que se sienta inmediata pero continua. */
const DURACION_ANIMACION_MS = 200;
/** Sin animación si el usuario pidió menos movimiento o el entorno no puede animar. */
const sinAnimacion = () =>
  typeof requestAnimationFrame !== 'function' ||
  (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/**
 * Zoom de la rueda proporcional al desplazamiento: una muesca del mouse acerca ~15 %, el trackpad y el
 * pellizco (ctrlKey, deltas pequeños) acercan de forma continua. Se normalizan líneas y páginas a píxeles.
 */
const factorDeRueda = (evento: WheelEvent, altoPagina: number) => {
  const delta = evento.deltaY * (evento.deltaMode === 1 ? 16 : evento.deltaMode === 2 ? altoPagina : 1);
  const sensibilidad = evento.ctrlKey ? 0.01 : 0.0015;
  return Math.min(2, Math.max(0.5, Math.exp(-delta * sensibilidad)));
};

/** Preferencias por navegador; sin almacenamiento, rigen los valores por defecto. */
const leer = (clave: string) => {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
};
const guardar = (clave: string, valor: string | null) => {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento disponible: la preferencia dura solo esta sesión.
  }
};
const CLAVE_COLOR = 'paqtracker.colorUnidades';

const ORDEN_URGENCIA: NivelHolgura[] = ['ROJO', 'AMBAR', 'VERDE', 'CERRADO'];

/** Color de la unidad según la holgura del pedido más urgente que lleva; gris si no lleva ninguno. */
const colorHolguraDeUnidad = (u: UnidadOperacion) => {
  const nivel = ORDEN_URGENCIA.find((n) => u.paradas.some((p) => p.nivel === n));
  return nivel ? COLOR_HOLGURA_HEX[nivel] : COLOR_SIN_DATO;
};

export const GridMap = forwardRef<GridMapHandle, GridMapProps>(function GridMap(
  {
    unidades,
    destinos,
    bloqueos,
    almacenes = [],
    seleccion,
    anchoPanelDerecho = 0,
    altoPanelInferior = 0,
    riesgo,
    onSeleccionar,
    onAbrirIncidencias,
    onAbrirFlota,
    onAbrirAlmacenes,
    onHoverCoordenada,
    enfoque = false,
    onModoEnfoque,
    variante = 'operacion',
    compacto = false,
    children,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ancho, alto } = useTamanoElemento(containerRef);
  const lienzo = crearLienzo(ancho, alto, anchoPanelDerecho, altoPanelInferior, compacto);

  // Vista elegida por el usuario (zoom / desplazamiento). null = vista inicial centrada, que se recalcula
  // sola con el tamaño del contenedor; una vista elegida se reajusta con limitarVista si el contenedor cambia.
  const [vistaUsuario, setVistaUsuario] = useState<Vista | null>(null);
  const vista = ancho > 0 && alto > 0 ? (vistaUsuario ? limitarVista(vistaUsuario, lienzo) : vistaCompleta(lienzo, opcionesVista(lienzo))) : null;
  const [isDragging, setIsDragging] = useState(false);
  const arrastreRef = useRef({ x: 0, y: 0, inicioX: 0, inicioY: 0, objeto: null as string | null, activo: false });
  // Punteros activos sobre el mapa: con dos, el gesto es un pellizco (zoom táctil).
  const punterosRef = useRef(new Map<number, { x: number; y: number }>());
  const pellizcoRef = useRef<{ distancia: number; vista: Vista; medio: { x: number; y: number } } | null>(null);

  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [sinResultados, setSinResultados] = useState(false);
  const [nodoActivo, setNodoActivo] = useState<Coordenada>({ x: 19, y: 9 });
  // Hover: se guarda el objeto, no la posición del cursor, así el mapa no se redibuja con cada movimiento.
  const [hover, setHover] = useState<ObjetoHover | null>(null);
  // La retícula y la coordenada del nodo bajo el cursor solo se muestran mientras el cursor está sobre el mapa.
  const [cursorEnMapa, setCursorEnMapa] = useState(false);
  const [modoColor, setModoColor] = useState<ModoColor>(() => (leer(CLAVE_COLOR) === 'holgura' ? 'holgura' : 'carga'));
  const cambiarModoColor = (modo: ModoColor) => {
    setModoColor(modo);
    guardar(CLAVE_COLOR, modo);
  };
  const [filtros, setFiltros] = useState<Filtros>(leerFiltros);
  const cambiarFiltros = (nuevos: Filtros) => {
    setFiltros(nuevos);
    guardarFiltros(nuevos);
  };
  const filtrosActivos = cantidadFiltros(filtros);
  const enSimulacion = variante === 'simulacion';
  const [capas, setCapas] = useState<Record<Capa, boolean>>({ rutas: true, unidades: true, destinos: true, bloqueos: true, almacenes: true });

  // Zoom continuo (C08): botones, "ver todo" y centrar animan la vista; rueda y arrastre la cancelan.
  const animacionRef = useRef<number | null>(null);
  const cancelarAnimacion = () => {
    if (animacionRef.current !== null) cancelAnimationFrame(animacionRef.current);
    animacionRef.current = null;
  };
  useEffect(() => cancelarAnimacion, []);
  const animarA = (destino: Vista, alTerminar?: () => void) => {
    cancelarAnimacion();
    if (!vista || sinAnimacion()) {
      setVistaUsuario(destino);
      alTerminar?.();
      return;
    }
    const inicio = vista;
    const t0 = performance.now();
    // El avance se mide con performance.now(): el sello que entrega requestAnimationFrame puede venir de
    // otro origen de tiempo según el entorno.
    const paso = () => {
      const avance = Math.min(1, Math.max(0, (performance.now() - t0) / DURACION_ANIMACION_MS));
      const e = 1 - (1 - avance) ** 3; // ease-out cúbico
      setVistaUsuario({
        escala: inicio.escala + (destino.escala - inicio.escala) * e,
        x: inicio.x + (destino.x - inicio.x) * e,
        y: inicio.y + (destino.y - inicio.y) * e,
      });
      if (avance < 1) {
        animacionRef.current = requestAnimationFrame(paso);
      } else {
        animacionRef.current = null;
        alTerminar?.();
      }
    };
    animacionRef.current = requestAnimationFrame(paso);
  };

  // Centra el nodo en el área libre (descontando el panel derecho o la hoja inferior).
  const centrarEn = (punto: Coordenada) => {
    if (!vista) return false;
    const escala = Math.max(vista.escala, ESCALA_AL_CENTRAR);
    const centroX = (ancho - anchoPanelDerecho) / 2;
    const centroY = (alto - altoPanelInferior) / 2;
    animarA(limitarVista({ escala, x: centroX - punto.x * escala, y: centroY - punto.y * escala }, lienzo));
    return true;
  };
  useImperativeHandle(ref, () => ({ centrarEn }));

  // La rueda se registra como listener no pasivo: React la marca pasiva y preventDefault no detendría el scroll.
  // Sobre paneles flotantes ([data-sin-zoom]) la rueda desplaza el panel en lugar de acercar el mapa.
  useEffect(() => {
    const elemento = containerRef.current;
    if (!elemento) return;
    const alGirar = (evento: WheelEvent) => {
      if (!elemento.contains(evento.target as Node) || (evento.target as HTMLElement).closest('[data-sin-zoom]')) return;
      evento.preventDefault();
      const rect = elemento.getBoundingClientRect();
      const l = crearLienzo(rect.width, rect.height, anchoPanelDerecho, altoPanelInferior, compacto);
      if (animacionRef.current !== null) cancelAnimationFrame(animacionRef.current);
      animacionRef.current = null;
      const factor = factorDeRueda(evento, rect.height);
      setVistaUsuario((actual) =>
        acercarEn(actual ? limitarVista(actual, l) : vistaCompleta(l, opcionesVista(l)), factor, evento.clientX - rect.left, evento.clientY - rect.top, l),
      );
    };
    elemento.addEventListener('wheel', alGirar, { passive: false });
    return () => elemento.removeEventListener('wheel', alGirar);
  }, [anchoPanelDerecho, altoPanelInferior, compacto]);

  const posicionLocal = (e: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const iniciarPellizco = () => {
    const [a, b] = [...punterosRef.current.values()];
    if (!a || !b || !vista) return;
    pellizcoRef.current = { distancia: Math.hypot(a.x - b.x, a.y - b.y) || 1, vista, medio: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    arrastreRef.current.activo = false; // un pellizco nunca es un toque
    setIsDragging(false);
  };

  // Arrastre con captura de puntero: sigue aunque el cursor salga del mapa, como en un visor de mapas.
  // Con la captura activa el click llega al contenedor, así que un toque sin desplazamiento sobre un
  // elemento [data-objeto] (unidad, pin, almacén) se interpreta como selección.
  // Los eventos de React burbujean por el árbol de React, no por el del DOM: lo que se monta en un portal
  // (el diálogo de rangos del semáforo) llegaría aquí aunque esté fuera del mapa. Esos no son del mapa.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const destino = e.target as HTMLElement;
    if (!e.currentTarget.contains(destino) || e.button !== 0 || !vista || destino.closest('button, input, a, [data-sin-zoom]')) return;
    cancelarAnimacion();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (containerRef.current) punterosRef.current.set(e.pointerId, posicionLocal(e));
    if (punterosRef.current.size === 2) {
      iniciarPellizco();
      return;
    }
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
    if (!vista || !containerRef.current || !e.currentTarget.contains(e.target as Node)) return;
    if (punterosRef.current.has(e.pointerId)) punterosRef.current.set(e.pointerId, posicionLocal(e));
    const pellizco = pellizcoRef.current;
    if (pellizco && punterosRef.current.size === 2) {
      const [a, b] = [...punterosRef.current.values()];
      const medio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const factor = Math.hypot(a.x - b.x, a.y - b.y) / pellizco.distancia;
      const base = { ...pellizco.vista, x: pellizco.vista.x + medio.x - pellizco.medio.x, y: pellizco.vista.y + medio.y - pellizco.medio.y };
      setVistaUsuario(acercarEn(base, factor, medio.x, medio.y, lienzo));
      return;
    }
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
    if (!e.currentTarget.contains(e.target as Node)) return;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    punterosRef.current.delete(e.pointerId);
    if (pellizcoRef.current) {
      if (punterosRef.current.size < 2) pellizcoRef.current = null;
      return;
    }
    setIsDragging(false);
    const a = arrastreRef.current;
    if (!a.activo) return;
    a.activo = false;
    const fueClic = Math.hypot(e.clientX - a.inicioX, e.clientY - a.inicioY) <= TOLERANCIA_CLIC_PX;
    if (!fueClic || !a.objeto) return;
    const [tipo, codigo] = a.objeto.split(':');
    if (tipo === 'grupo') {
      // Un grupo no se selecciona: se acerca la vista al doble, centrada en él.
      const primera = unidades.find((u) => u.codigo === codigo.split(',')[0]);
      if (primera && vista) {
        const { x, y } = proyectar(vista, primera.posicion);
        animarA(acercarEn(vista, FACTOR_GRUPO, x, y, lienzo));
      }
    } else if (tipo !== 'bloqueo') onSeleccionar({ tipo: tipo as 'pedido' | 'vehiculo' | 'almacen', codigo });
  };

  const buscar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const termino = terminoBusqueda.trim().toUpperCase().replace(/^#?(\d+)$/, '#$1');
    const destino = destinos.find((d) => d.pedido === termino);
    const unidad = unidades.find((u) => u.codigo === termino);
    const nombre = terminoBusqueda.trim().toLowerCase();
    const almacen = ALMACENES.find((a) => [a.id, a.nombre, a.nombreCorto].some((n) => n.toLowerCase() === nombre));
    setSinResultados(!destino && !unidad && !almacen);
    if (destino) {
      onSeleccionar({ tipo: 'pedido', codigo: destino.pedido });
      centrarEn(destino.destino);
    } else if (unidad) {
      onSeleccionar({ tipo: 'vehiculo', codigo: unidad.codigo });
      centrarEn(unidad.posicion);
    } else if (almacen) {
      onSeleccionar({ tipo: 'almacen', codigo: almacen.id });
      centrarEn(almacen.ubicacion);
    }
  };

  const acercarAlCentro = (factor: number) => {
    if (vista) animarA(acercarEn(vista, factor, ancho / 2, alto / 2, lienzo));
  };
  const verTodo = () => animarA(vistaCompleta(lienzo, opcionesVista(lienzo)), () => setVistaUsuario(null));

  // Teclado con el mapa enfocado: + y - acercan y alejan, 0 encuadra la malla, las flechas desplazan.
  const alPresionarTecla = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!vista || e.target !== e.currentTarget || e.ctrlKey || e.metaKey || e.altKey) return;
    const desplazamientos: Record<string, [number, number]> = {
      ArrowLeft: [PASO_TECLADO_PX, 0],
      ArrowRight: [-PASO_TECLADO_PX, 0],
      ArrowUp: [0, PASO_TECLADO_PX],
      ArrowDown: [0, -PASO_TECLADO_PX],
    };
    if (e.key === '+' || e.key === '=') acercarAlCentro(FACTOR_BOTON);
    else if (e.key === '-' || e.key === '_') acercarAlCentro(1 / FACTOR_BOTON);
    else if (e.key === '0') verTodo();
    else if (desplazamientos[e.key]) {
      const [dx, dy] = desplazamientos[e.key];
      animarA(limitarVista({ ...vista, x: vista.x + dx, y: vista.y + dy }, lienzo));
    } else return;
    e.preventDefault();
  };

  const escalaBase = ancho > 0 ? escalaDeEncuadre(lienzo) : 1;
  const escalaMinima = ancho > 0 ? escalaMinimaPermitida(lienzo) : 1;
  const enEscalaMinima = !vista || vista.escala <= escalaMinima * 1.001;
  const averiadas = unidades.filter((u) => u.estado === 'AVERIADA').length;
  // Un bloqueo con una polilínea de varios puntos se parte en varios tramos; se cuenta una sola vez.
  const cantidadBloqueos = new Set(bloqueos.map((b) => b.idOriginal)).size;
  const angosto = ancho > 0 && ancho < ANCHO_ANGOSTO_PX;
  const derechaControles = derechaDeControles(anchoPanelDerecho);
  // Con una hoja inferior abierta, los controles de abajo se apoyan sobre ella.
  const inferiorControles = altoPanelInferior > 0 ? altoPanelInferior + INFERIOR_CONTROLES_PX : INFERIOR_CONTROLES_PX;

  // Filtros globales: lo seleccionado nunca se oculta, para no perder el contexto de lo que se mira.
  const enMapa = unidades.filter(fueraDelAlmacen);
  const codigosSeleccionados = unidadesResaltadas(seleccion, destinos);
  const unidadesVisibles =
    filtrosActivos === 0 ? unidades : unidades.filter((u) => codigosSeleccionados.has(u.codigo) || unidadPasaFiltros(filtros, u));
  const codigosVisibles = new Set(unidadesVisibles.map((u) => u.codigo));
  const destinosVisibles = filtrosActivos === 0 ? destinos : destinos.filter((d) => codigosVisibles.has(d.unidad));
  const almacenesOcultos = new Set<IdAlmacen>(
    ALMACENES.filter(
      (a) =>
        !(seleccion?.tipo === 'almacen' && seleccion.codigo === a.id) &&
        !almacenPasaFiltros(filtros, a.id, almacenes.find((x) => x.id === a.id)),
    ).map((a) => a.id),
  );
  const contarNiveles = (niveles: NivelCarga[]) =>
    Object.fromEntries(NIVELES_CARGA.map((n) => [n, niveles.filter((x) => x === n).length])) as Record<NivelCarga, number>;
  const conteosFiltros: ConteosFiltros = {
    tipos: Object.fromEntries(TIPOS_UNIDAD.map((t) => [t, enMapa.filter((u) => u.tipo === t).length])) as ConteosFiltros['tipos'],
    carga: contarNiveles(enMapa.map((u) => nivelDeOcupacion(u.carga, u.capacidad))),
    stock: contarNiveles(almacenes.flatMap((a) => (a.nivelStock ? [a.nivelStock] : []))),
    unidades: { visibles: unidadesVisibles.filter(fueraDelAlmacen).length, total: enMapa.length },
    almacenes: { visibles: ALMACENES.length - almacenesOcultos.size, total: ALMACENES.length },
  };

  return (
    <div className="relative flex-1 flex w-full h-full min-w-0 min-h-0">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={alPresionarTecla}
        tabIndex={0}
        role="region"
        aria-roledescription="mapa"
        aria-label="Mapa de la malla. Con el mapa enfocado: + y - acercan y alejan, 0 muestra la malla completa y las flechas desplazan."
        onPointerEnter={() => setCursorEnMapa(true)}
        onPointerLeave={() => {
          setHover(null);
          setCursorEnMapa(false);
        }}
        className={`relative flex-1 min-w-0 w-full h-full bg-neutral-100 dark:bg-fondo overflow-hidden select-none touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* 1. Arriba a la izquierda: buscar, alertas y ocupación global (se ocultan en modo enfoque) */}
        {!enfoque && (
          <PilaSuperiorMapa
            busqueda={{
              termino: terminoBusqueda,
              onCambiar: (termino) => {
                setTerminoBusqueda(termino);
                setSinResultados(false);
              },
              sinResultados,
              onBuscar: buscar,
              opciones: [...new Set(destinos.map((d) => d.pedido)), ...unidades.map((u) => u.codigo), ...ALMACENES.map((a) => a.nombre)],
            }}
            alertas={{ riesgo, bloqueos: cantidadBloqueos, averias: averiadas }}
            soloRiesgo={enSimulacion}
            onAbrirIncidencias={onAbrirIncidencias}
            ocupacion={{ flota: ocupacionFlota(unidades), almacenes: ocupacionAlmacenes(almacenes), onAbrirFlota, onAbrirAlmacenes }}
            compacto={compacto}
            reducida={compacto || (alto > 0 && alto < ALTO_MAPA_REDUCIDO_PX)}
          />
        )}

        {/* 2. Arriba a la derecha: herramientas que cambian la vista del mapa (capas, filtros, leyenda, ver todo, enfoque) */}
        <HerramientasMapa
          capas={capas}
          onCambiarCapa={(clave) => setCapas({ ...capas, [clave]: !capas[clave] })}
          modoColor={modoColor}
          onCambiarModoColor={cambiarModoColor}
          filtros={{ valor: filtros, conteos: conteosFiltros, activos: filtrosActivos, onCambiar: cambiarFiltros }}
          onVerTodo={verTodo}
          enfoque={enfoque}
          onAlternarEnfoque={() => onModoEnfoque?.(!enfoque)}
          derechaPx={derechaControles}
          altoHojaPx={altoPanelInferior}
          angosto={angosto}
        />

        {/* 3. Abajo a la derecha: zoom (en pantallas angostas se acerca con pellizco) */}
        {!enfoque && !angosto && (
          <ControlesZoom
            porcentaje={vista ? Math.round((vista.escala / escalaBase) * 100) : 100}
            alejarDeshabilitado={enEscalaMinima}
            onAcercar={() => acercarAlCentro(FACTOR_BOTON)}
            onAlejar={() => acercarAlCentro(1 / FACTOR_BOTON)}
            derechaPx={derechaControles}
            inferiorPx={inferiorControles}
          />
        )}

        {/* 4. Abajo a la izquierda: barra de escala y, con el cursor sobre el mapa, la coordenada del nodo */}
        {vista && !enfoque && <BarraEscala pxPorKm={vista.escala} nodo={cursorEnMapa && !compacto ? nodoActivo : null} inferiorPx={inferiorControles} />}

        {/* 5. Lienzo: la geometría se proyecta con la vista; los marcadores conservan su tamaño en pantalla */}
        {vista && (
          <CapasMapa
            vista={vista}
            lienzo={lienzo}
            capas={capas}
            unidades={unidadesVisibles}
            destinos={destinosVisibles}
            bloqueos={bloqueos}
            almacenes={almacenes}
            almacenesOcultos={almacenesOcultos}
            seleccion={seleccion}
            nodoActivo={nodoActivo}
            mostrarReticula={cursorEnMapa}
            modoColor={modoColor}
            unidadBajoCursor={hover?.tipo === 'vehiculo' ? hover.codigo : null}
          />
        )}

        {/* Tooltip del objeto bajo el cursor (identifica; el detalle se abre con clic) */}
        {vista && hover && !isDragging && (
          <TooltipObjeto objeto={hover} vista={vista} lienzo={lienzo} unidades={unidades} destinos={destinos} bloqueos={bloqueos} almacenes={almacenes} />
        )}

        {children}
      </div>
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
  /** Almacenes ocultos por el filtro de stock. */
  almacenesOcultos: Set<IdAlmacen>;
  seleccion: ObjetoMapa | null;
  nodoActivo: Coordenada;
  mostrarReticula: boolean;
  /** Qué codifica el color de las unidades: su carga (por defecto) o la holgura de su pedido más urgente. */
  modoColor: ModoColor;
  /** Unidad bajo el cursor: muestra su detalle aunque la escala no alcance. */
  unidadBajoCursor: string | null;
}

/**
 * Detalle según el zoom: por debajo de esta escala (la vista completa en la mayoría de las pantallas) la
 * unidad muestra solo su carga en números (C28) y se omite la barrita, que repite número y color.
 */
const ESCALA_DETALLE_PX_KM = 20;
/** Área tocable mínima de una unidad (WCAG 2.5.8), aunque la silueta sea más chica. */
const AREA_TOQUE_PX = 28;
/** Distancia (px de pantalla) a la que dos unidades se agrupan en la vista lejana. */
const RADIO_AGRUPACION_PX = 10;
/** Área tocable de un destino: el marcador mide 8–14 px, pero se toca como uno de 24. */
const AREA_TOQUE_DESTINO_PX = 24;
/** Opacidad de las rutas no destacadas: siguen a la vista, pero quedan como contexto. */
const OPACIDAD_PENDIENTE = 0.55;
const OPACIDAD_RECORRIDO = 0.4;
/** Sentido de la ruta pendiente: una punta de flecha cada tanto, solo con el mapa lo bastante acercado. */
const SEPARACION_FLECHA_PX = 80;
const TRAZO_FLECHA = 'M-3 -3 L1 0 L-3 3';
/** Orden de dibujo de los destinos: lo urgente al final, para que nunca quede tapado. */
const ORDEN_DIBUJO_DESTINO: Record<VarianteDestino, number> = { CERRADO: 0, VERDE: 1, AMBAR: 2, ROJO: 3, ENTREGA: 4 };
/** Ancho aproximado (px) de un carácter de los rótulos de 11–13 px, para detectar rótulos que se pisan. */
const ANCHO_CARACTER_PX = 6.6;

/** Fracción de la avería que falta cumplir (1 al empezar, 0 al reincorporarse). */
/**
 * Mapa angosto (celular): los símbolos se dibujan a ESCALA_COMPACTA para que la malla se lea. Las áreas
 * tocables no se achican (WCAG 2.5.8) y los rótulos bajan a un mínimo legible.
 */
const ANCHO_COMPACTO_PX = 640;

/** Corte celular/escritorio (`md`): por debajo, la vista inicial llena el alto del mapa. */
const ANCHO_CELULAR_PX = 768;
const opcionesVista = (lienzo: Lienzo) => ({ llenarAlto: lienzo.ancho < ANCHO_CELULAR_PX });
const ESCALA_COMPACTA = 0.6;
/** Escala del símbolo de almacén en el mapa (el de la leyenda y los paneles queda a tamaño completo). */
const ESCALA_ALMACEN = 0.75;
/** Medio tamaño (px) del almacén ya escalado: el central mide 28 × 26 a escala 1. */
const MEDIO_ALMACEN_PX = 14 * ESCALA_ALMACEN;
/** Radio del halo de selección del almacén. */
const RADIO_HALO_ALMACEN = 16;
/** Inicio del rótulo del almacén, a la derecha del símbolo. */
const ROTULO_ALMACEN_X = 18;
/** Separación vertical (px) entre el símbolo de un almacén y cada averiada que está en él. */
const DESPLAZAMIENTO_EN_ALMACEN_PX = 24;
/** Tolerancia (km) para decir que una posición, que puede venir fraccionaria, está sobre un almacén. */
const TOLERANCIA_NODO_KM = 0.01;

/** Almacén sobre cuyo nodo está la posición, si lo hay. */
const almacenEn = (posicion: { x: number; y: number }) =>
  ALMACENES.find(
    (a) => Math.abs(a.ubicacion.x - posicion.x) < TOLERANCIA_NODO_KM && Math.abs(a.ubicacion.y - posicion.y) < TOLERANCIA_NODO_KM,
  );

const fraccionRestante = (desde: Date, vuelve: Date, ahora: Date) => {
  const total = vuelve.getTime() - desde.getTime();
  return total <= 0 ? 0 : Math.min(1, Math.max(0, (vuelve.getTime() - ahora.getTime()) / total));
};

/** Pedidos que se nombran en el tooltip de un almacén; el resto se resume como "+N". */
const MAX_PEDIDOS_TOOLTIP = 3;
/** Unidades que se nombran en el tooltip de un grupo; el resto se resume como "+N". */
const MAX_UNIDADES_TOOLTIP = 4;

/** Pedidos a bordo de las unidades que salieron del almacén, p. ej. "Salen: #1001, #1002 +3". */
function pedidosQueSalen(unidades: UnidadOperacion[], almacen: AlmacenOperacion['id']): string | undefined {
  const codigos = [...new Set(unidades.filter((u) => u.origen === almacen).flatMap((u) => u.paradas.map((p) => p.pedido)))];
  if (codigos.length === 0) return undefined;
  const resto = codigos.length - MAX_PEDIDOS_TOOLTIP;
  return `Salen: ${codigos.slice(0, MAX_PEDIDOS_TOOLTIP).join(', ')}${resto > 0 ? ` +${resto}` : ''}`;
}

/** Contenido del tooltip y punto del mapa sobre el que se ancla (encima del símbolo). */
function contenidoTooltip(
  objeto: ObjetoHover,
  datos: Pick<GridMapProps, 'unidades' | 'destinos' | 'bloqueos'> & { almacenes: AlmacenOperacion[] },
  reloj: Date,
): { titulo: string; detalle: string; extra?: string; color?: string; punto: Coordenada; alzaPx: number } | null {
  if (objeto.tipo === 'pedido') {
    const d = datos.destinos.find((x) => x.pedido === objeto.codigo);
    if (!d) return null;
    const entregando = datos.unidades.filter((u) => u.pedidoEnEntrega === d.pedido).map((u) => u.codigo);
    return {
      titulo: `Pedido ${d.pedido}`,
      detalle: `Holgura ${d.holgura} · ${NOMBRE_HOLGURA[d.nivel].toLowerCase()}`,
      extra: entregando.length > 0 ? `Entregando ahora · ${entregando.join(', ')}` : undefined,
      color: COLOR_HOLGURA_HEX[d.nivel],
      punto: d.destino,
      alzaPx: 12,
    };
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
          ? `Averiada · ${nombreAveria(u.averia.tipo).toLowerCase()} · vuelve ${formatearMomento(u.averia.vuelve, reloj)}`
          : 'Averiada'
        : `Carga ${u.carga}/${capacidad} · ${capacidad === 0 ? 0 : Math.round((u.carga / capacidad) * 100)} % · ${NOMBRE_CARGA[nivelDeOcupacion(u.carga, capacidad)].toLowerCase()}`,
      extra: averiada
        ? undefined
        : u.pedidoEnEntrega
          ? `Entregando ${u.pedidoEnEntrega}`
          : SITUACION_UNIDAD[u.situacion],
      color: colorDeUnidad(u),
      punto: u.posicion,
      alzaPx: 16,
    };
  }
  if (objeto.tipo === 'grupo') {
    const codigos = objeto.codigo.split(',');
    const primera = datos.unidades.find((x) => x.codigo === codigos[0]);
    if (!primera) return null;
    const resto = codigos.length - MAX_UNIDADES_TOOLTIP;
    return {
      titulo: `${codigos.length} unidades`,
      detalle: `${codigos.slice(0, MAX_UNIDADES_TOOLTIP).join(', ')}${resto > 0 ? ` +${resto}` : ''}`,
      punto: primera.posicion,
      alzaPx: 16,
    };
  }
  if (objeto.tipo === 'almacen') {
    const a = ALMACENES.find((x) => x.id === objeto.codigo);
    if (!a) return null;
    const estado = datos.almacenes.find((x) => x.id === a.id);
    const nivel = estado?.porcentajeStock != null ? estado.nivelStock : null;
    const alerta = estado?.stockBajo ? ` · ${alertaStockBajo().toLowerCase()}` : '';
    return {
      titulo: `Almacén ${a.nombre}`,
      detalle: nivel ? `Stock ${estado?.porcentajeStock} % · ${NOMBRE_STOCK[nivel].toLowerCase()}${alerta}` : 'Stock ilimitado',
      extra: pedidosQueSalen(datos.unidades, a.id),
      color: nivel ? COLOR_SEMAFORO[nivel] : undefined,
      punto: a.ubicacion,
      alzaPx: 20,
    };
  }
  const b = datos.bloqueos.find((x) => x.id === objeto.codigo);
  if (!b) return null;
  return {
    titulo: 'Tramo bloqueado',
    detalle: `Hasta ${b.fin}`,
    color: COLOR_BLOQUEO,
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
      className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full bg-inverso text-sobre-inverso rounded-control px-2.5 py-1.5 shadow-overlay whitespace-nowrap"
      style={{ left, top: p.y - contenido.alzaPx }}
    >
      <p className="font-semibold text-body-sm tabular-nums">{contenido.titulo}</p>
      <p className="flex items-center gap-1.5 text-body-sm text-neutral-300 tabular-nums">
        {contenido.color && <span className="size-2 rounded-full shrink-0" style={{ background: contenido.color }} />}
        {contenido.detalle}
      </p>
      {contenido.extra && <p className="text-body-sm text-neutral-300 tabular-nums">{contenido.extra}</p>}
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

/**
 * Transform del ícono según el sentido del tramo que recorre, con centro en su anclaje. Las siluetas
 * miran al este: al oeste se espejan y al norte o al sur se giran 90°. Detenida, queda como está.
 */
function orientacionIcono(unidad: UnidadOperacion): string | undefined {
  const { pendiente } = dividirRuta(unidad);
  const p = pendiente[0];
  const siguiente = pendiente.find((q) => q.x !== p?.x || q.y !== p?.y);
  if (!p || !siguiente) return undefined;
  const dx = siguiente.x - p.x;
  const dy = siguiente.y - p.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'scale(-1, 1)' : undefined;
  // En pantalla la y crece hacia abajo (sur).
  return dy > 0 ? 'rotate(90)' : 'rotate(-90)';
}

const CapasMapa: React.FC<CapasMapaProps> = ({
  vista,
  lienzo,
  capas,
  unidades,
  destinos,
  bloqueos,
  almacenes,
  almacenesOcultos,
  seleccion,
  nodoActivo,
  mostrarReticula,
  modoColor,
  unidadBajoCursor,
}) => {
  // Reloj simulado de la ejecución: mide cuánto le falta a cada avería.
  const { reloj } = useDatosOperacion();
  // Movimiento fluido (C29): las unidades se deslizan entre dos tics del reloj.
  const svgRef = useRef<SVGSVGElement>(null);
  useDeslizamientoUnidades(svgRef, vista);
  const origen = proyectar(vista, { x: 0, y: 0 });
  const paso = pasoCuadricula(vista.escala);
  const pasoPx = paso * vista.escala;

  // La cuadrícula cubre solo la malla (70 × 50 km); fuera de ella no hay calles. Se dibujan solo las
  // líneas que caen en pantalla.
  const anchoMallaPx = MALLA_ANCHO_KM * vista.escala;
  const altoMallaPx = MALLA_ALTO_KM * vista.escala;
  const iMin = Math.max(0, Math.floor(-origen.x / pasoPx));
  const iMax = Math.min(Math.floor(MALLA_ANCHO_KM / paso), Math.ceil((lienzo.ancho - origen.x) / pasoPx));
  const jMin = Math.max(0, Math.floor(-origen.y / pasoPx));
  const jMax = Math.min(Math.floor(MALLA_ALTO_KM / paso), Math.ceil((lienzo.alto - origen.y) / pasoPx));
  // Las líneas verticales y horizontales se recortan al tramo visible de la malla.
  const yIni = Math.max(0, origen.y);
  const yFin = Math.min(lienzo.alto, origen.y + altoMallaPx);
  const xIni = Math.max(0, origen.x);
  const xFin = Math.min(lienzo.ancho, origen.x + anchoMallaPx);

  // Rótulos de los ejes: marcas cada 10 km a lo largo del plano
  const hayEspacioSuperior = origen.y >= 14;
  const yRotulosX = hayEspacioSuperior ? origen.y - 6 : Math.max(origen.y + 14, 14);

  const hayEspacioIzquierdo = origen.x >= 28;
  const xRotulosY = hayEspacioIzquierdo ? origen.x - 6 : Math.max(origen.x + 6, 8);
  const anchorY = hayEspacioIzquierdo ? 'end' : 'start';

  // Los rótulos no pasan del borde real de la malla (70 × 50 km): antes, al alejar o desplazar la
  // vista, seguían contando más allá (90k, 100k…) aunque ahí ya no hay ciudad.
  const totalRotulosX = Math.floor(MALLA_ANCHO_KM / 10) + 1;
  const totalRotulosY = Math.floor(MALLA_ALTO_KM / 10) + 1;

  const halo = { stroke: 'var(--mapa-halo)', strokeWidth: 3, paintOrder: 'stroke' } as const;
  // Factor de tamaño de los símbolos: 1 en escritorio, menor en un mapa angosto.
  const f = lienzo.ancho > 0 && lienzo.ancho < ANCHO_COMPACTO_PX ? ESCALA_COMPACTA : 1;
  const compacto = f < 1;
  const escalar = f === 1 ? undefined : `scale(${f})`;
  const tamRotulo = (px: number) => (compacto ? Math.max(9, px - 2) : px);
  const almacenEscala = ESCALA_ALMACEN * f;
  const medioAlmacen = MEDIO_ALMACEN_PX * f;
  const rotuloAlmacenX = medioAlmacen + 6 + (compacto ? 0 : ROTULO_ALMACEN_X - MEDIO_ALMACEN_PX - 6);

  // Unidades destacadas: la seleccionada, todas las que llevan el pedido seleccionado (F03, puede ir
  // fraccionado) o solo la que lleva la fracción seleccionada (F02).
  const unidadesDestacadas = unidadesResaltadas(seleccion, destinos);
  const enRuta = unidades.filter((u) => u.estado === 'EN_RUTA');
  // Las rutas destacadas se dibujan al final para quedar encima de las demás.
  const ordenRutas = [...enRuta].sort((a, b) => Number(unidadesDestacadas.has(a.codigo)) - Number(unidadesDestacadas.has(b.codigo)));

  const activo = proyectar(vista, nodoActivo);

  // Una averiada tipo 2 o 3 pasa al central a las 4 h y sigue averiada ahí. Sobre el nodo del almacén la
  // taparían su símbolo y su rótulo, así que se dibuja aparte, encima de los almacenes y bajo su símbolo.
  const visibles = unidades.filter(fueraDelAlmacen);
  const filasPorAlmacen = new Map<string, number>();
  const enAlmacen: { unidad: UnidadOperacion; fila: number }[] = [];
  const enCalle: UnidadOperacion[] = [];
  for (const u of visibles) {
    const almacen = u.estado === 'AVERIADA' ? almacenEn(u.posicion) : undefined;
    if (!almacen) {
      enCalle.push(u);
      continue;
    }
    const fila = filasPorAlmacen.get(almacen.id) ?? 0;
    filasPorAlmacen.set(almacen.id, fila + 1);
    enAlmacen.push({ unidad: u, fila });
  }

  // Destinos de menor a mayor urgencia: los críticos se dibujan encima.
  const destinosOrdenados = destinos
    .map((d) => ({ d, entregando: unidades.some((u) => u.codigo === d.unidad && u.pedidoEnEntrega === d.pedido) }))
    .sort((a, b) => ORDEN_DIBUJO_DESTINO[a.entregando ? 'ENTREGA' : a.d.nivel] - ORDEN_DIBUJO_DESTINO[b.entregando ? 'ENTREGA' : b.d.nivel]);

  const esSeleccionada = (u: UnidadOperacion) =>
    (seleccion?.tipo === 'vehiculo' && seleccion.codigo === u.codigo) || (seleccion?.tipo === 'fraccion' && seleccion.unidad === u.codigo);

  // Vista lejana: las unidades que quedarían a 10 px o menos se dibujan como un grupo con su número. Siguen
  // sueltas las seleccionadas o destacadas, las averiadas y la que está bajo el cursor.
  const agrupando = capas.unidades && vista.escala < ESCALA_DETALLE_PX_KM;
  const gruposEnCalle: UnidadOperacion[][] = agrupando
    ? agruparCercanas(
        enCalle,
        (u) => proyectar(vista, u.posicion),
        RADIO_AGRUPACION_PX,
        (u) => esSeleccionada(u) || unidadesDestacadas.has(u.codigo) || u.estado === 'AVERIADA' || unidadBajoCursor === u.codigo,
      ).map((g) => g.miembros)
    : enCalle.map((u) => [u]);
  const unidadesSueltas = gruposEnCalle.filter((g) => g.length === 1).map((g) => g[0]);

  // Rótulos que se pisan (p. ej. varias unidades saliendo del central): en la vista lejana se omite el
  // rótulo de carga de la unidad que chocaría con otro ya puesto. La carga sigue en el color del ícono,
  // en el tooltip y en el panel, y vuelve al acercar, pasar el mouse o seleccionar la unidad.
  const rotulosOmitidos = new Set<string>();
  if (vista.escala < ESCALA_DETALLE_PX_KM) {
    const ocupados: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const choca = (c: (typeof ocupados)[number]) => ocupados.some((o) => c.x1 < o.x2 && c.x2 > o.x1 && c.y1 < o.y2 && c.y2 > o.y1);
    // Primero lo que siempre lleva rótulo: los almacenes (símbolo y nombre) y las averiadas.
    for (const almacen of ALMACENES) {
      if (!capas.almacenes || almacenesOcultos.has(almacen.id)) continue;
      const { x, y } = proyectar(vista, almacen.ubicacion);
      ocupados.push({ x1: x - medioAlmacen, y1: y - medioAlmacen, x2: x + rotuloAlmacenX + 16 * ANCHO_CARACTER_PX * (compacto ? 0.85 : 1), y2: y + medioAlmacen });
    }
    const prioridad = (u: UnidadOperacion) =>
      esSeleccionada(u) || unidadBajoCursor === u.codigo ? 2 : u.estado === 'AVERIADA' ? 1.5 : u.carga / Math.max(1, u.capacidad);
    // El ícono y la insignia de un grupo (que no lleva rótulo) también ocupan su lugar.
    for (const grupo of gruposEnCalle.filter((g) => g.length > 1)) {
      const { x, y } = proyectar(vista, grupo[0].posicion);
      ocupados.push({ x1: x - AREA_TOQUE_PX / 2, y1: y - AREA_TOQUE_PX / 2, x2: x + AREA_TOQUE_PX / 2, y2: y + AREA_TOQUE_PX / 2 });
    }
    for (const u of [...unidadesSueltas].sort((a, b) => prioridad(b) - prioridad(a))) {
      const { x, y } = proyectar(vista, u.posicion);
      const inicio = x + iconoVehiculo(u.tipo, '#000').medioAnchoVisible * f + 4;
      const anchoCaracter = ANCHO_CARACTER_PX * (compacto ? 0.85 : 1);
      const caja = { x1: inicio, y1: y - 7, x2: inicio + `${u.carga}/${u.capacidad}`.length * anchoCaracter, y2: y + 5 };
      if (u.estado !== 'AVERIADA' && prioridad(u) < 2 && choca(caja)) rotulosOmitidos.add(u.codigo);
      else ocupados.push(caja);
    }
  }

  const dibujarUnidad = (u: UnidadOperacion, desplazamientoY: number) => {
    const { x, y } = proyectar(vista, u.posicion);
    const capacidad = u.capacidad;
    const averiada = u.estado === 'AVERIADA';
    // La barrita y el rótulo siempre muestran la carga; el modo de color solo cambia el color del ícono.
    const color = colorDeUnidad(u);
    const porHolgura = modoColor === 'holgura' && !averiada;
    const seleccionada = esSeleccionada(u);
    const icono = porHolgura ? iconoVehiculo(u.tipo, colorHolguraDeUnidad(u)) : iconoVehiculo(u.tipo, color, unidadVacia(u));
    const rotuloX = icono.medioAnchoVisible * f + (seleccionada ? 6 : 4);
    const conDetalle = vista.escala >= ESCALA_DETALLE_PX_KM || seleccionada || unidadBajoCursor === u.codigo;
    return (
      // El grupo exterior lo mueve useDeslizamientoUnidades (reescribe su transform); el desplazamiento
      // bajo un almacén va en el grupo interior para no perderse.
      <g
        key={u.codigo}
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer"
        data-objeto={`vehiculo:${u.codigo}`}
        data-mover={u.codigo}
        data-kx={u.posicion.x}
        data-ky={u.posicion.y}
      >
        <g transform={desplazamientoY === 0 ? undefined : `translate(0, ${desplazamientoY})`} data-en-almacen={desplazamientoY === 0 ? undefined : true}>
          {/* Área tocable: transparente pero "pintada", así cuenta para el puntero aunque la silueta sea angosta. */}
          <rect x={-AREA_TOQUE_PX / 2} y={-AREA_TOQUE_PX / 2} width={AREA_TOQUE_PX} height={AREA_TOQUE_PX} fill="transparent" />
          <g transform={escalar}>
            {seleccionada && <image href={haloSeleccion} x={-13} y={-13} width={26} height={26} />}
            <image
              href={icono.href}
              x={-icono.centroX}
              y={-icono.centroY}
              width={icono.ancho}
              height={icono.alto}
              transform={averiada ? undefined : orientacionIcono(u)}
            />
          </g>
          {averiada ? (
            u.averia ? (
              // Ícono · insignia del tipo con el anillo de lo que falta · código y hora de regreso.
              <>
                <g transform={`translate(${rotuloX + 9 * f}, 0)`} data-averia={u.averia.tipo}>
                  <g transform={escalar}>
                    <InsigniaAveria tipo={u.averia.tipo} restante={fraccionRestante(u.averia.desde, u.averia.vuelve, reloj)} />
                  </g>
                </g>
                <text x={rotuloX + 18 * f + 5} y="-1" fill={color} fontSize={tamRotulo(12)} fontWeight="600" {...halo}>
                  {u.codigo}
                </text>
                <text x={rotuloX + 18 * f + 5} y={compacto ? 9 : 11} fill="var(--mapa-rotulo-fuerte)" fontSize={tamRotulo(11)} {...halo}>
                  vuelve {formatearMomento(u.averia.vuelve, reloj)}
                </text>
              </>
            ) : (
              <text x={rotuloX} y="4" fill={color} fontSize={tamRotulo(12)} fontWeight="600" {...halo}>
                {u.codigo} · averiada
              </text>
            )
          ) : (
            <>
              {!rotulosOmitidos.has(u.codigo) && (
                <text x={rotuloX} y={conDetalle ? -1 : 4} fill="var(--mapa-rotulo)" fontSize={tamRotulo(conDetalle ? 12 : 11)} fontWeight="500" {...halo}>
                  {u.carga}/{capacidad}
                </text>
              )}
              {conDetalle && (
                <>
                  <rect x={rotuloX} y="4" width="24" height="3" rx="1.5" fill="var(--mapa-borde)" />
                  <rect x={rotuloX} y="4" width={24 * (u.carga / capacidad)} height="3" rx="1.5" fill={color} data-barra-carga />
                </>
              )}
            </>
          )}
        </g>
      </g>
    );
  };

  // Un grupo de unidades cercanas: el ícono de la más cargada y la cantidad en una insignia. Lo desliza
  // useDeslizamientoUnidades como a su primer miembro (los demás no se dibujan, así que hay un solo
  // [data-mover] por unidad). Tocarlo acerca la vista; no lleva rótulo de carga.
  const dibujarGrupo = (miembros: UnidadOperacion[]) => {
    const [primera] = miembros;
    const masCargada = miembros.reduce((a, u) => (u.carga / Math.max(1, u.capacidad) > a.carga / Math.max(1, a.capacidad) ? u : a));
    const icono =
      modoColor === 'holgura' ? iconoVehiculo(masCargada.tipo, colorHolguraDeUnidad(masCargada)) : iconoVehiculo(masCargada.tipo, colorDeUnidad(masCargada), unidadVacia(masCargada));
    const { x, y } = proyectar(vista, primera.posicion);
    const codigos = miembros.map((u) => u.codigo).join(',');
    return (
      <g
        key={`grupo:${codigos}`}
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer"
        data-objeto={`grupo:${codigos}`}
        data-mover={primera.codigo}
        data-kx={primera.posicion.x}
        data-ky={primera.posicion.y}
      >
        <rect x={-AREA_TOQUE_PX / 2} y={-AREA_TOQUE_PX / 2} width={AREA_TOQUE_PX} height={AREA_TOQUE_PX} fill="transparent" />
        <g transform={escalar}>
          <image href={icono.href} x={-icono.centroX} y={-icono.centroY} width={icono.ancho} height={icono.alto} />
        </g>
        <g transform={`translate(${9 * f}, ${-9 * f})`}>
          <circle r={7 * f} fill="#0F172A" stroke="#FFFFFF" strokeWidth="1.5" />
          <text fill="#FFFFFF" fontSize={tamRotulo(10)} fontWeight="700" textAnchor="middle" dominantBaseline="central">
            {miembros.length}
          </text>
        </g>
      </g>
    );
  };

  return (
    <svg ref={svgRef} className="lienzo-mapa absolute inset-0 w-full h-full">
      {/* La malla como una hoja sobre el fondo neutro: relleno de superficie, cuadrícula y borde. */}
      <rect
        x={origen.x}
        y={origen.y}
        width={anchoMallaPx}
        height={altoMallaPx}
        className="fill-superficie"
        style={{ filter: 'drop-shadow(0 1px 3px rgb(var(--color-sombra) / 0.08))' }}
      />
      {Array.from({ length: Math.max(0, iMax - iMin + 1) }, (_, idx) => {
        const i = iMin + idx;
        const x = origen.x + i * pasoPx;
        return <line key={`gv${i}`} x1={x} y1={yIni} x2={x} y2={yFin} stroke="var(--mapa-cuadricula)" strokeWidth="1" />;
      })}
      {Array.from({ length: Math.max(0, jMax - jMin + 1) }, (_, idx) => {
        const j = jMin + idx;
        const y = origen.y + j * pasoPx;
        return <line key={`gh${j}`} x1={xIni} y1={y} x2={xFin} y2={y} stroke="var(--mapa-cuadricula)" strokeWidth="1" />;
      })}
      <rect x={origen.x} y={origen.y} width={anchoMallaPx} height={altoMallaPx} fill="none" stroke="var(--mapa-borde)" strokeWidth="1" />

      {/* Rótulos cada 10 km */}
      {Array.from({ length: Math.max(0, totalRotulosX) }, (_, i) => {
        const x = origen.x + i * 10 * vista.escala;
        if (x < 14 || x > lienzo.ancho - 16) return null;
        return (
          <text key={`rx${i}`} x={x} y={yRotulosX} fill="var(--mapa-eje)" fontSize="11" textAnchor="middle" {...halo}>
            {i * 10}k
          </text>
        );
      })}
      {Array.from({ length: Math.max(0, totalRotulosY) }, (_, i) => {
        const y = origen.y + i * 10 * vista.escala + 4;
        const topeSuperior = hayEspacioSuperior ? 14 : yRotulosX + 16;
        if (y < topeSuperior || y > lienzo.alto - 6) return null;
        return (
          <text key={`ry${i}`} x={xRotulosY} y={y} fill="var(--mapa-eje)" fontSize="11" textAnchor={anchorY} {...halo}>
            {i * 10}k
          </text>
        );
      })}

      {/* --- RUTAS: tramo recorrido (gris sólido) y pendiente (punteado; azul si está destacada).
          Con algo seleccionado, las demás rutas se atenúan para que la destacada resalte más. --- */}
      {capas.rutas &&
        ordenRutas.map((unidad) => {
          const { recorrido, pendiente } = dividirRuta(unidad);
          const destacada = unidadesDestacadas.has(unidad.codigo);
          const atenuada = unidadesDestacadas.size > 0 && !destacada;
          // En modo Holgura, la ruta de una unidad con algún pedido que llegará tarde va en rojo; sigue siendo
          // contextual (mismo punteado y opacidad) para no competir con la ruta seleccionada.
          const tardia = modoColor === 'holgura' && !destacada && unidad.paradas.some((p) => p.holguraMinutos < 0);
          const colorPendiente = destacada ? '#1E40AF' : tardia ? COLOR_SEMAFORO.ROJO : 'var(--mapa-ruta)';
          const opacidadPendiente = destacada ? 1 : OPACIDAD_PENDIENTE;
          // La destacada ya indica su sentido con el flujo animado; solo con menos movimiento pedido lleva flechas.
          const flujo = destacada && !prefiereMenosMovimiento();
          const flechas = !flujo && vista.escala >= ESCALA_DETALLE_PX_KM ? flechasDeRecorrido(pendiente, vista, SEPARACION_FLECHA_PX) : [];
          return (
            <g key={`ruta-${unidad.codigo}`} opacity={atenuada ? 0.35 : 1}>
              {recorrido.length > 1 && (
                <path d={trazado(vista, recorrido)} fill="none" stroke="var(--mapa-recorrido)" strokeWidth="1.5" strokeOpacity={destacada ? 1 : OPACIDAD_RECORRIDO} />
              )}
              {/* Todas las rutas siguen a la vista, pero translúcidas: donde se superponen, la calle se ve más
                  oscura (marca los corredores con más tráfico) y la destacada resalta sin competir. */}
              <path
                d={trazado(vista, pendiente)}
                fill="none"
                stroke={colorPendiente}
                strokeWidth={destacada ? 3 : 2}
                strokeOpacity={opacidadPendiente}
                strokeDasharray={destacada ? '7 5' : '6 4'}
                // La destacada fluye hacia su destino (sin animar si se pidió menos movimiento).
                className={flujo ? 'ruta-fluye' : undefined}
                data-ruta-tardia={tardia ? true : undefined}
              />
              {flechas.map((f, i) => (
                <path
                  key={i}
                  d={TRAZO_FLECHA}
                  fill="none"
                  stroke={colorPendiente}
                  strokeWidth="1.5"
                  strokeOpacity={opacidadPendiente}
                  transform={`translate(${f.x} ${f.y}) rotate(${f.angulo})`}
                  pointerEvents="none"
                  data-flecha
                />
              ))}
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
              <line x1={a.x} y1={a.y} x2={z.x} y2={z.y} stroke={COLOR_BLOQUEO} strokeWidth={compacto ? 2.5 : 3} strokeLinecap="round" opacity={OPACIDAD_LINEA_BLOQUEO} />
              <g transform={`translate(${m.x}, ${m.y})`} data-objeto={`bloqueo:${b.id}`}>
                <g transform={escalar}>
                  <MarcaBloqueo />
                </g>
              </g>
            </g>
          );
        })}

      {/* --- DESTINOS: pin con el color de la holgura del pedido --- */}
      {capas.destinos &&
        destinosOrdenados.map(({ d, entregando }) => {
          const { x, y } = proyectar(vista, d.destino);
          const seleccionado = destinoResaltado(seleccion, d);
          // Mientras su unidad lo entrega, el marcador cambia de color para distinguirlo de los que esperan.
          const variante: VarianteDestino = entregando ? 'ENTREGA' : d.nivel;
          return (
            <g key={`${d.pedido}-${d.unidad}`} transform={`translate(${x}, ${y})`} className="cursor-pointer" data-objeto={`pedido:${d.pedido}`}>
              {/* Área tocable mayor que el marcador (WCAG 2.5.8): el símbolo es chico, pero se toca fácil. */}
              <circle r={AREA_TOQUE_DESTINO_PX / 2} fill="transparent" />
              {seleccionado && <circle r={RADIO_DESTINO[variante] * f + 4} fill="none" stroke="#1E40AF" strokeWidth="2" />}
              <g transform={escalar}>
                <MarcadorDestino variante={variante} color={entregando ? COLOR_EN_ENTREGA : COLOR_HOLGURA_HEX[d.nivel]} />
              </g>
            </g>
          );
        })}
      {/* El servidor da el pedido por entregado al llegar: durante el servicio ya no está entre las paradas,
          así que su pin se dibuja en la unidad que lo entrega y, al tocarlo, abre esa unidad. */}
      {capas.destinos &&
        unidades
          .filter((u) => u.pedidoEnEntrega && !destinos.some((d) => d.pedido === u.pedidoEnEntrega))
          .map((u) => {
            const { x, y } = proyectar(vista, u.posicion);
            return (
              <g key={`entrega-${u.codigo}`} transform={`translate(${x}, ${y})`} className="cursor-pointer" data-objeto={`vehiculo:${u.codigo}`}>
                <g transform={escalar}>
                  <MarcadorDestino variante="ENTREGA" color={COLOR_EN_ENTREGA} />
                </g>
              </g>
            );
          })}

      {/* --- PARADAS NUMERADAS de la ruta destacada: orden de entrega y hora estimada. Van después de los
          destinos para no quedar bajo sus marcadores, y sobre el destino (no encima) para no tapar su pin;
          sin captar el puntero, tocar el destino de abajo sigue funcionando. --- */}
      {capas.destinos &&
        unidades
          .filter((u) => unidadesDestacadas.has(u.codigo))
          .flatMap((u) =>
            u.paradas.map((parada, i) => {
              const { x, y } = proyectar(vista, parada.destino);
              const hora = parada.eta.match(/(\d{2}:\d{2})\s*$/)?.[1];
              return (
                <g key={`parada-${u.codigo}-${i}`} data-parada={i + 1} data-unidad={u.codigo} transform={`translate(${x}, ${y})`} pointerEvents="none">
                  <circle cy={-16 * f} r={8 * f} fill="#1E40AF" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text y={-16 * f} fill="var(--mapa-sobre-acento)" fontSize={tamRotulo(11)} fontWeight="700" textAnchor="middle" dominantBaseline="central">
                    {i + 1}
                  </text>
                  {hora && (
                    <text x={8 * f + 4} y={-16 * f} fill="var(--mapa-rotulo-fuerte)" fontSize={tamRotulo(11)} dominantBaseline="central" {...halo}>
                      {hora}
                    </text>
                  )}
                </g>
              );
            }),
          )}

      {/* --- UNIDADES en ruta (color por ocupación, CF-02) y averiadas en el punto de la avería --- */}
      {capas.unidades && gruposEnCalle.map((g) => (g.length > 1 ? dibujarGrupo(g) : dibujarUnidad(g[0], 0)))}

      {/* --- ALMACENES (posiciones de ConfiguracionDominio): al final, para que su símbolo y su rótulo
          nunca queden tapados por una ruta o una unidad que pase cerca. --- */}
      {capas.almacenes &&
        ALMACENES.filter((almacen) => !almacenesOcultos.has(almacen.id)).map((almacen) => {
          const { x, y } = proyectar(vista, almacen.ubicacion);
          const stock = stockDe(almacenes, almacen.id);
          const estado = almacenes.find((a) => a.id === almacen.id);
          const nivel = estado?.nivelStock;
          const etiqueta = stock === undefined ? almacen.nombre : `${almacen.nombreCorto.replace('Int.', 'Interm.')} / ${stock} %`;
          // Semáforo de stock (verde = lleno, rojo = bajo); sin stock deja el depósito hueco y gris.
          const color = stock === undefined || !nivel ? '#64748B' : COLOR_SEMAFORO[nivel];
          const central = almacen.id === 'CENTRAL';
          return (
            <g key={almacen.id} transform={`translate(${x}, ${y})`} className="cursor-pointer" data-objeto={`almacen:${almacen.id}`}>
              {seleccion?.tipo === 'almacen' && seleccion.codigo === almacen.id && (
                <circle r={compacto ? medioAlmacen + 5 : RADIO_HALO_ALMACEN} fill="none" stroke="#1E40AF" strokeWidth="2" />
              )}
              <g transform={`scale(${almacenEscala})`}>
                {central ? <AlmacenCentral /> : <AlmacenIntermedio color={color} fraccionStock={stock === undefined ? undefined : stock / 100} />}
              </g>
              {estado?.stockBajo && (
                <g transform={`translate(${8 * f}, ${-8 * f})${compacto ? ` scale(${Math.max(0.75, f)})` : ''}`}>
                  <InsigniaStockBajo />
                </g>
              )}
              <text x={rotuloAlmacenX} y="4" fill="var(--mapa-rotulo)" fontSize={tamRotulo(12)} fontWeight="500" {...halo}>
                {etiqueta}
              </text>
            </g>
          );
        })}

      {/* --- AVERIADAS EN UN ALMACÉN (tipo 2 y 3 tras pasar al central): encima de los almacenes y debajo
          de su símbolo, una por fila, para que el rótulo del almacén no tape la insignia de la avería. --- */}
      {capas.unidades && enAlmacen.map(({ unidad, fila }) => dibujarUnidad(unidad, DESPLAZAMIENTO_EN_ALMACEN_PX * f * (fila + 1)))}

      {/* Retícula del nodo bajo el cursor: solo mientras el cursor está sobre el mapa. */}
      {mostrarReticula && (
        <g transform={`translate(${activo.x}, ${activo.y})`} pointerEvents="none">
          <circle r="6" fill="none" stroke="#1E40AF" strokeWidth="1.5" strokeDasharray="2 2" />
          <circle r="2.5" fill="#1E40AF" />
        </g>
      )}
    </svg>
  );
};
