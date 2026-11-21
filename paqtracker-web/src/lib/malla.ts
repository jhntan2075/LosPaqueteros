import { ALMACENES, MALLA_ALTO_KM, MALLA_ANCHO_KM } from '../config/dominio';
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
  /** px reservados abajo, si hay controles flotantes al pie del mapa. */
  margenInferior?: number;
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
const inferior = (lienzo: Lienzo) => lienzo.margenInferior ?? lienzo.margen;

/** Escala que encuadra la malla completa (70 × 50 km) dentro del área visible. */
export const escalaDeEncuadre = (lienzo: Lienzo) => {
  const d = derecho(lienzo);
  const porAncho = Math.max(10, lienzo.ancho - lienzo.margen - d) / MALLA_ANCHO_KM;
  const porAlto = Math.max(10, lienzo.alto - superior(lienzo) - inferior(lienzo)) / MALLA_ALTO_KM;
  return Math.max(0.01, lienzo.ajuste === 'cubrir' ? Math.max(porAncho, porAlto) : Math.min(porAncho, porAlto));
};

/**
 * Escala mínima del zoom: la del encuadre. Alejar más solo agregaría espacio vacío alrededor de la malla y
 * sugeriría que la ciudad sigue más allá de sus 70 × 50 km.
 */
export const escalaMinimaPermitida = (lienzo: Lienzo) => escalaDeEncuadre(lienzo);

/**
 * Posición de la malla en un eje. Si cabe en el área útil, queda centrada y fija. Si no, se recorre
 * arrastrando y su borde puede pasar el margen solo lo justo para centrar cualquier nodo (también los
 * del borde): ese exceso es 0 al encuadrar y crece con el zoom hasta medio área útil, así la transición es
 * continua y alejarse nunca deja la malla corrida hacia un lado.
 */
const limitarEje = (
  inicio: number,
  extension: number,
  disponible: number,
  margenInicio: number,
  margenFin: number,
  cubrir = false,
) => {
  const libre = disponible - margenInicio - margenFin;
  if (extension <= libre) return margenInicio + (libre - extension) / 2;
  // `cubrir`: la malla siempre llena el área útil, sin franja vacía más allá de sus bordes.
  const exceso = cubrir ? 0 : Math.min(libre / 2, extension - libre);
  return Math.min(margenInicio + exceso, Math.max(disponible - margenFin - extension - exceso, inicio));
};

/** Ajusta una vista para que respete la escala mínima, máxima y los bordes de la malla. */
export function limitarVista(vista: Vista, lienzo: Lienzo): Vista {
  const minima = escalaMinimaPermitida(lienzo);
  const escala = Math.min(Math.max(vista.escala, minima), Math.max(minima, ESCALA_MAXIMA));
  return {
    escala,
    // En lienzos verticales (celular) la malla se recorre en X cubriendo siempre el ancho.
    x: limitarEje(vista.x, MALLA_ANCHO_KM * escala, lienzo.ancho, lienzo.margen, derecho(lienzo), lienzo.alto > lienzo.ancho),
    y: limitarEje(vista.y, MALLA_ALTO_KM * escala, lienzo.alto, superior(lienzo), inferior(lienzo)),
  };
}

/**
 * Vista inicial que encuadra la malla completa (70 × 50 km) de forma centrada y sin recortes.
 * Con `llenarAlto` y un lienzo vertical (celular), la malla llena el alto útil, sobresale en X y se centra
 * en el almacén central; el resto se recorre arrastrando.
 */
export const vistaCompleta = (lienzo: Lienzo, opciones: { llenarAlto?: boolean } = {}): Vista => {
  const d = derecho(lienzo);
  const anchoUtil = lienzo.ancho - lienzo.margen - d;
  const altoUtil = lienzo.alto - superior(lienzo) - inferior(lienzo);
  if (opciones.llenarAlto && lienzo.alto > lienzo.ancho) {
    const escala = Math.max(10, altoUtil) / MALLA_ALTO_KM;
    const central = ALMACENES.find((a) => a.id === 'CENTRAL')!.ubicacion;
    return limitarVista(
      { escala, x: lienzo.margen + anchoUtil / 2 - central.x * escala, y: superior(lienzo) },
      lienzo,
    );
  }
  const escala = escalaDeEncuadre(lienzo);
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
  const altoUtil = lienzo.alto - superior(lienzo) - inferior(lienzo);
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
/** Longitud en km de una polilínea de la malla (Manhattan: cada segmento suma |dx| + |dy|). */
export function longitudRecorrido(puntos: Coordenada[]): number {
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    total += Math.abs(puntos[i].x - puntos[i - 1].x) + Math.abs(puntos[i].y - puntos[i - 1].y);
  }
  return total;
}

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

/**
 * Puntos de pantalla para dibujar flechas de sentido a lo largo de una ruta: uno cada `separacionPx` de
 * longitud proyectada, sin llegar al final (el destino ya tiene su marcador). `angulo` va en grados
 * (0 = hacia +x, 90 = hacia +y) y sigue el tramo donde cae la flecha; en un vértice manda el tramo que sale.
 */
export function flechasDeRecorrido(
  puntos: Coordenada[],
  vista: Vista,
  separacionPx: number,
): { x: number; y: number; angulo: number }[] {
  if (separacionPx <= 0) return [];
  const proyectados = puntos.map((p) => proyectar(vista, p));
  const tramos: { desde: { x: number; y: number }; dx: number; dy: number; inicio: number; largo: number }[] = [];
  let total = 0;
  for (let i = 1; i < proyectados.length; i++) {
    const desde = proyectados[i - 1];
    const dx = proyectados[i].x - desde.x;
    const dy = proyectados[i].y - desde.y;
    const largo = Math.hypot(dx, dy);
    if (largo === 0) continue; // puntos repetidos: no hay sentido que dibujar
    tramos.push({ desde, dx, dy, inicio: total, largo });
    total += largo;
  }

  const flechas: { x: number; y: number; angulo: number }[] = [];
  let tramo = 0;
  for (let d = separacionPx; d < total; d += separacionPx) {
    while (tramo < tramos.length - 1 && d >= tramos[tramo].inicio + tramos[tramo].largo) tramo++;
    const { desde, dx, dy, inicio, largo } = tramos[tramo];
    const t = (d - inicio) / largo;
    flechas.push({ x: desde.x + dx * t, y: desde.y + dy * t, angulo: (Math.atan2(dy, dx) * 180) / Math.PI });
  }
  return flechas;
}
