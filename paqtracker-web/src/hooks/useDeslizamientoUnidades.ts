import { useLayoutEffect, useRef, type RefObject } from 'react';
import { proyectar, type Vista } from '../lib/malla';
import type { Coordenada } from '../types/domain';

// Movimiento fluido de las unidades (C29). React recalcula las posiciones con cada tic del reloj
// interpolado (~10 por segundo); entre un tic y el siguiente, este hook desliza cada unidad con
// requestAnimationFrame desde donde se ve hasta su nueva posición, a la frecuencia de la pantalla y sin
// volver a renderizar React. Se interpola en km de la malla, no en píxeles, para que el zoom y el
// arrastre sigan siendo inmediatos. Las unidades se marcan con data-mover="código" y data-kx / data-ky.

/** Duración del deslizamiento entre dos tics normales (un poco más que el tic, para no detenerse). */
const DURACION_MINIMA_MS = 60;
const DURACION_MAXIMA_MS = 400;
/** Un salto mayor (p. ej. un plan nuevo) se suaviza con una transición algo más larga. */
const SALTO_PLAN_KM = 0.5;
const DURACION_SALTO_MS = 300;
/** Más lejos que esto no es movimiento sino reubicación: se coloca directamente. */
const REUBICACION_KM = 5;

interface Deslizamiento {
  desde: Coordenada;
  hasta: Coordenada;
  t0: number;
  duracion: number;
  /** Salto por un plan nuevo: ease-out; entre tics, lineal (velocidad constante). */
  suave: boolean;
}

const interpolar = (d: Deslizamiento, ahora: number): Coordenada => {
  const avance = Math.min(1, Math.max(0, (ahora - d.t0) / d.duracion));
  const e = d.suave ? 1 - (1 - avance) ** 3 : avance;
  return { x: d.desde.x + (d.hasta.x - d.desde.x) * e, y: d.desde.y + (d.hasta.y - d.desde.y) * e };
};

/** Unidad que aparece o se reubica: se coloca directamente. */
const quieto = (punto: Coordenada, ahora: number): Deslizamiento => ({ desde: punto, hasta: punto, t0: ahora, duracion: DURACION_MINIMA_MS, suave: false });

const sinAnimacion = () =>
  typeof requestAnimationFrame !== 'function' ||
  (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

export function useDeslizamientoUnidades(svgRef: RefObject<SVGSVGElement | null>, vista: Vista) {
  const deslizamientos = useRef(new Map<string, Deslizamiento>());
  /** Último tic en que llegó una posición nueva de cada unidad, para medir el intervalo entre tics. */
  const ultimoTic = useRef(new Map<string, number>());
  const vistaRef = useRef(vista);
  const raf = useRef<number | null>(null);

  // Tras cada render (antes de pintar): React ya escribió la posición nueva; se vuelve a la que se veía y
  // se programa el deslizamiento hacia la nueva.
  useLayoutEffect(() => {
    vistaRef.current = vista;
    const svg = svgRef.current;
    if (!svg) return;
    const ahora = performance.now();
    const grupos = svg.querySelectorAll<SVGGElement>('[data-mover]');
    if (sinAnimacion()) {
      deslizamientos.current.clear();
      return;
    }
    const presentes = new Set<string>();
    grupos.forEach((g) => {
      const id = g.dataset.mover!;
      presentes.add(id);
      const hasta = { x: Number(g.dataset.kx), y: Number(g.dataset.ky) };
      const previo = deslizamientos.current.get(id);
      const visible = previo ? interpolar(previo, ahora) : null;
      if (!visible || (previo && previo.hasta.x === hasta.x && previo.hasta.y === hasta.y)) {
        if (!visible) deslizamientos.current.set(id, quieto(hasta, ahora));
        else ubicar(g, visible, vistaRef.current);
        return;
      }
      const distancia = Math.hypot(hasta.x - visible.x, hasta.y - visible.y);
      if (distancia > REUBICACION_KM) {
        deslizamientos.current.set(id, quieto(hasta, ahora));
        return;
      }
      const intervalo = ahora - (ultimoTic.current.get(id) ?? ahora - 100);
      const suave = distancia > SALTO_PLAN_KM;
      const duracion = suave ? DURACION_SALTO_MS : Math.min(DURACION_MAXIMA_MS, Math.max(DURACION_MINIMA_MS, intervalo));
      deslizamientos.current.set(id, { desde: visible, hasta, t0: ahora, duracion, suave });
      ultimoTic.current.set(id, ahora);
      ubicar(g, visible, vistaRef.current);
    });
    // Las unidades que dejaron el mapa se olvidan.
    deslizamientos.current.forEach((_, id) => {
      if (!presentes.has(id)) {
        deslizamientos.current.delete(id);
        ultimoTic.current.delete(id);
      }
    });
    if (raf.current === null) raf.current = requestAnimationFrame(cuadro);

    function cuadro() {
      const svgActual = svgRef.current;
      const t = performance.now();
      let pendientes = false;
      svgActual?.querySelectorAll<SVGGElement>('[data-mover]').forEach((g) => {
        const d = deslizamientos.current.get(g.dataset.mover!);
        if (!d) return;
        ubicar(g, interpolar(d, t), vistaRef.current);
        if (t - d.t0 < d.duracion) pendientes = true;
      });
      raf.current = pendientes ? requestAnimationFrame(cuadro) : null;
    }
  });

  useLayoutEffect(
    () => () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    },
    [],
  );
}

function ubicar(g: SVGGElement, punto: Coordenada, vista: Vista) {
  const { x, y } = proyectar(vista, punto);
  g.setAttribute('transform', `translate(${x}, ${y})`);
}
