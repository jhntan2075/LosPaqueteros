import type { ArchivoCargado, TipoArchivo } from '../types/simulacion';

// Validación de los archivos de entrada de una corrida, con los mismos formatos que leen
// CargadorPedidos y CargadorBloqueos del planificador:
//   pedidos:  ##d##h##m:x,y,cCLIENTE,cantidad,plazoHoras      (p. ej. 01d00h25m:62,02,c0650,03,36)
//   bloqueos: ##d##h##m-##d##h##m:x1,y1,x2,y2[,...]           (polilínea de al menos dos nodos)
// El planificador aún no lee averías: se cuentan las líneas no vacías sin validar su formato.

const PATRONES: Record<TipoArchivo, RegExp | null> = {
  pedidos: /^\d+d\d+h\d+m:\d+,\d+,c\w+,\d+,\d+$/i,
  bloqueos: /^\d+d\d+h\d+m-\d+d\d+h\d+m:\d+,\d+(,\d+,\d+)+$/,
  averias: null,
};

export const NOMBRE_REGISTRO: Record<TipoArchivo, { singular: string; plural: string }> = {
  pedidos: { singular: 'pedido', plural: 'pedidos' },
  bloqueos: { singular: 'bloqueo', plural: 'bloqueos' },
  averias: { singular: 'avería', plural: 'averías' },
};

export function validarArchivo(tipo: TipoArchivo, nombre: string, contenido: string): ArchivoCargado {
  const patron = PATRONES[tipo];
  let registros = 0;
  const lineasInvalidas: number[] = [];
  contenido.split(/\r?\n/).forEach((linea, i) => {
    const limpia = linea.trim();
    if (limpia === '') return;
    if (patron && !patron.test(limpia)) lineasInvalidas.push(i + 1);
    else registros++;
  });
  return { nombre, registros, lineasInvalidas };
}

export async function leerArchivo(tipo: TipoArchivo, archivo: File): Promise<ArchivoCargado> {
  return validarArchivo(tipo, archivo.name, await archivo.text());
}
