import { MALLA_ALTO_KM, MALLA_ANCHO_KM } from '../config/dominio';
import type { Coordenada } from '../types/domain';

// Proyección de la malla de la ciudad (km) a la pantalla (px), al estilo de un visor de mapas:
// la extensión completa se encuadra en el contenedor sin deformarse, no se puede alejar más allá
// de esa vista y el desplazamiento nunca deja ver espacio vacío fuera de la malla.

/** Vista de la malla: escala en px por km y posición en pantalla del nodo (0,0). */
export interface Vista {
  escala: number;
  x: number;
  y: number;
}

export interface Lienzo {
  ancho: number;
  alto: number;
  margen: number; // px reservados alrededor de la malla (rótulos de ejes, bordes)
  /** px reservados arriba, si los controles flotantes del mapa necesitan más que `margen`. */
  margenSuperior?: number;
  /** px reservados a la derecha, si un panel lateral está abierto. */
  margenDerecho?: number;
  /**
   * 'contener' (por defecto): la escala mínima muestra la malla completa, con franjas libres si sobra espacio.
   * 'cubrir': la escala mínima llena todo el lienzo; la malla sobresale en un eje y se recorre arrastrando.
   */
  ajuste?: 'contener' | 'cubrir';
}

/** Acercamiento máximo, en px por km. */
export const ESCALA_MAXIMA = 80;

const superior = (lienzo: Lienzo) => lienzo.margenSuperior ?? lienzo.margen;
const derecho = (lienzo: Lienzo) => lienzo.margenDerecho ?? lienzo.margen;

/** Escala mínima permitida para encuadrar la malla completa (70 × 50 km) dentro del área visible. */
export const escalaDeEncuadre = (lienzo: Lienzo) => {
  const d = derecho(lienzo);
  const porAncho = Math.max(10, lienzo.ancho - lienzo.margen - d) / MALLA_ANCHO_KM;
  const porAlto = Math.max(10, lienzo.alto - superior(lienzo) - lienzo.margen) / MALLA_ALTO_KM;
  return Math.max(0.01, lienzo.ajuste === 'cubrir' ? Math.max(porAncho, porAlto) : Math.min(porAncho, porAlto));
};

/** Escala mínima permitida para zoom out: permite alejarse hasta un 40% más para una vista panorámica amplia del plano extendido. */
export const escalaMinimaPermitida = (lienzo: Lienzo) => {
  return Math.max(0.01, escalaDeEncuadre(lienzo) * 0.6);
};

const limitarEje = (inicio: number, extension: number, disponible: number, margenInicio: number, margenFin: number) => {
  // Permite desplazar libremente el plano manteniendo visible al menos un margen del territorio operativo
  const minInicio = margenInicio + 60 - extension;
  const maxInicio = disponible - margenFin - 60;
  return Math.min(maxInicio, Math.max(minInicio, inicio));
};

/** Ajusta una vista para que respete la escala mínima, máxima y los bordes de la malla. */
export function limitarVista(vista: Vista, lienzo: Lienzo): Vista {
  const minima = escalaMinimaPermitida(lienzo);
  const escala = Math.min(Math.max(vista.escala, minima), Math.max(minima, ESCALA_MAXIMA));
  return {
    escala,
    x: limitarEje(vista.x, MALLA_ANCHO_KM * escala, lienzo.ancho, lienzo.margen, derecho(lienzo)),
    y: limitarEje(vista.y, MALLA_ALTO_KM * escala, lienzo.alto, superior(lienzo), lienzo.margen),
  };
}

/** Vista inicial que encuadra la malla completa (70 × 50 km) de forma centrada y sin recortes. */
export const vistaCompleta = (lienzo: Lienzo): Vista => {
  const d = derecho(lienzo);
  const escala = escalaDeEncuadre(lienzo);
  const anchoUtil = lienzo.ancho - lienzo.margen - d;
  const altoUtil = lienzo.alto - superior(lienzo) - lienzo.margen;
  return limitarVista(
    {
      escala,
      x: lienzo.margen + (anchoUtil - MALLA_ANCHO_KM * escala) / 2,
      y: superior(lienzo) + (altoUtil - MALLA_ALTO_KM * escala) / 2,
    },
    lienzo,
  );
};

/**
 * Vista que encuadra un conjunto de nodos (como "fit bounds" en un visor de mapas). La extensión
 * mínima evita acercarse demasiado cuando los puntos están juntos; nunca muestra espacio fuera de la malla.
 */
export function vistaDeLimites(puntos: Coordenada[], lienzo: Lienzo, extensionMinimaKm = 16): Vista {
  const d = derecho(lienzo);
  const anchoUtil = lienzo.ancho - lienzo.margen - d;
  const altoUtil = lienzo.alto - superior(lienzo) - lienzo.margen;
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const anchoKm = Math.max(Math.max(...xs) - Math.min(...xs), extensionMinimaKm);
  const altoKm = Math.max(Math.max(...ys) - Math.min(...ys), extensionMinimaKm * (MALLA_ALTO_KM / MALLA_ANCHO_KM));
  const escala = Math.min(anchoUtil / anchoKm, altoUtil / altoKm);
  const centroX = (Math.max(...xs) + Math.min(...xs)) / 2;
  const centroY = (Math.max(...ys) + Math.min(...ys)) / 2;
  return limitarVista(
    {
      escala,
      x: lienzo.margen + anchoUtil / 2 - centroX * escala,
      y: superior(lienzo) + altoUtil / 2 - centroY * escala,
    },
    lienzo,
  );
}

/** Cambia la escala manteniendo fijo el punto de pantalla (px, py), como la rueda del mouse en un mapa. */
export function acercarEn(vista: Vista, factor: number, px: number, py: number, lienzo: Lienzo): Vista {
  const escala = vista.escala * factor;
  return limitarVista(
    { escala, x: px - (px - vista.x) * (escala / vista.escala), y: py - (py - vista.y) * (escala / vista.escala) },
    lienzo,
  );
}

export const proyectar = (vista: Vista, { x, y }: Coordenada) => ({ x: vista.x + x * vista.escala, y: vista.y + y * vista.escala });

/** Nodo de la malla más cercano a un punto de pantalla, o null si cae fuera de la malla. */
export function nodoEn(vista: Vista, px: number, py: number): Coordenada | null {
  const x = Math.round((px - vista.x) / vista.escala);
  const y = Math.round((py - vista.y) / vista.escala);
  return x >= 0 && x <= MALLA_ANCHO_KM && y >= 0 && y <= MALLA_ALTO_KM ? { x, y } : null;
}

/** Paso de la cuadrícula en km según la escala, para que las líneas no se amontonen. */
export const pasoCuadricula = (escala: number) => (escala >= 8 ? 1 : escala >= 2.5 ? 5 : 10);

/** Recorrido ortogonal entre dos nodos: primero en x, luego en y (calles de la malla). */
export const tramoOrtogonal = (desde: Coordenada, hasta: Coordenada): Coordenada[] => [desde, { x: hasta.x, y: desde.y }, hasta];

/** Punto a una fracción [0, 1] de la longitud de un recorrido ortogonal. */
export function puntoEnRecorrido(puntos: Coordenada[], fraccion: number): { punto: Coordenada; tramo: number } {
  const largos = puntos.slice(1).map((p, i) => Math.abs(p.x - puntos[i].x) + Math.abs(p.y - puntos[i].y));
  let restante = largos.reduce((a, b) => a + b, 0) * Math.min(1, Math.max(0, fraccion));
  for (let i = 0; i < largos.length; i++) {
    if (restante <= largos[i] || i === largos.length - 1) {
      const t = largos[i] === 0 ? 0 : restante / largos[i];
      const a = puntos[i];
      const b = puntos[i + 1];
      return { punto: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, tramo: i };
    }
    restante -= largos[i];
  }
  return { punto: puntos[0], tramo: 0 };
}

/** "d" de un trazado SVG que une nodos de la malla, en px de pantalla. */
export const trazado = (vista: Vista, puntos: Coordenada[]) =>
  puntos
    .map((punto, i) => {
      const { x, y } = proyectar(vista, punto);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
