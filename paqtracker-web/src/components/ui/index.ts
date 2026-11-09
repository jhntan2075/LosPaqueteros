// Componentes base de la interfaz (docs/propuesta-unificacion-ui.md §2.5). Las pantallas componen con
// estos en lugar de repetir clases: el estilo vive aquí y en los tokens de tailwind.config.js.
export { Boton, type BotonProps, type VarianteBoton, type TamanoBoton } from './Boton';
export { Campo, Entrada, Selector, type EntradaProps, type SelectorProps } from './Campo';
export { Insignia } from './Insignia';
export { FONDO_TONO, PUNTO_TONO, TEXTO_TONO, type Tono } from './tonos';
export { Tarjeta } from './Tarjeta';
export { EncabezadoPagina } from './EncabezadoPagina';
export { TituloGrupo, FilaDato, Indicador } from './Datos';
export { Aviso, type TonoAviso } from './Aviso';
export { EstadoVacio } from './EstadoVacio';
export { Pestanas, type OpcionPestana } from './Pestanas';
