import { fijarRangos } from '../config/rangosSemaforo';
import type { RangosSemaforoApi } from '../types/api';
import { clienteApi } from './clienteApi';

// Rangos de los semáforos guardados en paqtracker-api. Lo que responde la API pasa al almacén en memoria
// (config/rangosSemaforo.ts), de donde lo leen el mapa, los paneles y la leyenda.

/** Trae los rangos guardados. Si la API no responde, siguen los vigentes (por defecto, los de siempre). */
export async function cargarRangosSemaforo(): Promise<void> {
  try {
    fijarRangos(await clienteApi.consultarRangosSemaforo());
  } catch {
    // Sin API se sigue pintando con los rangos por defecto; el diálogo muestra el error al guardar.
  }
}

/** Guarda los rangos y, si la API los acepta, rigen de inmediato en toda la pantalla. */
export async function guardarRangosSemaforo(rangos: RangosSemaforoApi): Promise<RangosSemaforoApi> {
  const guardados = await clienteApi.guardarRangosSemaforo(rangos);
  fijarRangos(guardados);
  return guardados;
}
