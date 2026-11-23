// Capas visibles del mapa (GridMap), su catálogo para el popover de Capas (ControlCapas) y el modo de color
// de las unidades. En un archivo propio para no exportar constantes junto a un componente (rompería el
// fast refresh de ese archivo).

/** Qué codifica el color de las unidades: su carga a bordo o la holgura de su pedido más urgente. */
export type ModoColor = 'carga' | 'holgura';

export type Capa = 'rutas' | 'unidades' | 'destinos' | 'bloqueos' | 'almacenes';

export const CAPAS: { clave: Capa; etiqueta: string }[] = [
  { clave: 'rutas', etiqueta: 'Rutas' },
  { clave: 'unidades', etiqueta: 'Unidades' },
  { clave: 'destinos', etiqueta: 'Destinos' },
  { clave: 'bloqueos', etiqueta: 'Bloqueos' },
  { clave: 'almacenes', etiqueta: 'Almacenes' },
];

/** Lugar que ocupa la barra de herramientas (44 px + relleno) y su aire: los popovers se anclan a su izquierda. */
export const SEPARACION_BARRA_PX = 56;
/** Bajo este ancho del mapa, los popovers ocupan todo el espacio libre a la izquierda de la barra. */
export const ANCHO_ANGOSTO_PX = 600;
