import { clienteApi } from './clienteApi';
import type { ArchivoCargado, TipoArchivo } from '../types/simulacion';

// Archivos de entrada de una simulación. Se suben a paqtracker-api, que los valida línea por línea
// (CU-02) con el mismo lector del planificador y los guarda solo si no tienen errores. Cada archivo
// corresponde a un mes:
//   pedidos:  ventas.YYYYMM.txt    líneas ##d##h##m:x,y,cCLIENTE,cantidad,plazoHoras
//   bloqueos: bloqueo.YYMM.txt     líneas ##d##h##m-##d##h##m:x1,y1,x2,y2[,...]

export const NOMBRE_REGISTRO: Record<TipoArchivo, { singular: string; plural: string }> = {
  pedidos: { singular: 'pedido', plural: 'pedidos' },
  bloqueos: { singular: 'bloqueo', plural: 'bloqueos' },
};

/**
 * Mes (YYYYMM) de un archivo: del nombre si sigue la convención (ventas.202703.txt, bloqueo.2703.txt
 * o bloqueo.202703.txt); si no, el mes de respaldo (el de la fecha de inicio de la simulación).
 */
export function mesDeArchivo(nombre: string, respaldo: string | null): string | null {
  const largo = nombre.match(/\.(\d{6})\.txt$/i);
  if (largo) return largo[1];
  const corto = nombre.match(/\.(\d{4})\.txt$/i);
  if (corto) return `20${corto[1]}`;
  return respaldo;
}

export async function subirArchivo(tipo: TipoArchivo, archivo: File, mes: string): Promise<ArchivoCargado> {
  const respuesta = tipo === 'pedidos' ? await clienteApi.subirVentas(archivo, mes) : await clienteApi.subirBloqueos(archivo, mes);
  return {
    nombre: archivo.name,
    mes: respuesta.mes,
    registros: respuesta.registrosValidos,
    lineasInvalidas: respuesta.lineasInvalidas,
    guardado: respuesta.guardado,
  };
}
