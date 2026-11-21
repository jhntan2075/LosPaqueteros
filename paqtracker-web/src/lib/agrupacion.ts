/** Un grupo de elementos cercanos: su ancla es la posición del primer miembro (no se mueve al sumar otros). */
export interface GrupoCercano<T> {
  centro: { x: number; y: number };
  miembros: T[];
}

/**
 * Agrupa por cercanía, de forma codiciosa y en el orden recibido: cada elemento se une al primer grupo
 * cuyo ancla está a `radioPx` o menos (distancia euclidiana, inclusive); si no hay ninguno, abre uno nuevo.
 * Los elementos excluidos forman siempre un grupo propio y nunca atraen a otros.
 */
export function agruparCercanas<T extends { codigo: string }>(
  items: T[],
  posicion: (t: T) => { x: number; y: number },
  radioPx: number,
  excluir: (t: T) => boolean,
): GrupoCercano<T>[] {
  const grupos: GrupoCercano<T>[] = [];
  // Los grupos abiertos por un excluido quedan fuera de la búsqueda.
  const atraen = new Set<GrupoCercano<T>>();
  for (const item of items) {
    const p = posicion(item);
    const solo = excluir(item);
    const destino = solo ? undefined : [...atraen].find((g) => Math.hypot(g.centro.x - p.x, g.centro.y - p.y) <= radioPx);
    if (destino) {
      destino.miembros.push(item);
      continue;
    }
    const nuevo = { centro: { x: p.x, y: p.y }, miembros: [item] };
    grupos.push(nuevo);
    if (!solo) atraen.add(nuevo);
  }
  return grupos;
}
