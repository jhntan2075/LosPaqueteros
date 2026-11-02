// Capas visibles del mapa (GridMap) y su catálogo para el panel de Capas y leyenda (LeyendaMapa).
// En un archivo propio para no exportar una constante junto al componente de LeyendaMapa (rompería
// el fast refresh de ese archivo).

export type Capa = 'rutas' | 'unidades' | 'destinos' | 'bloqueos' | 'almacenes';

export const CAPAS: { clave: Capa; etiqueta: string }[] = [
  { clave: 'rutas', etiqueta: 'Rutas' },
  { clave: 'unidades', etiqueta: 'Unidades' },
  { clave: 'destinos', etiqueta: 'Destinos' },
  { clave: 'bloqueos', etiqueta: 'Bloqueos' },
  { clave: 'almacenes', etiqueta: 'Almacenes' },
];
