import { aplicarParametrosDominio } from '../config/dominio';
import type { ParametrosDominioApi } from '../types/api';
import { clienteApi } from './clienteApi';

// Parámetros del dominio guardados en paqtracker-api (almacenes, unidades, averías). Lo que responde la API
// se escribe sobre config/dominio.ts, de donde lo leen el mapa, los paneles y los formularios.

/** Trae los parámetros vigentes. Si la API no responde, siguen los valores por defecto. */
export async function cargarParametrosDominio(): Promise<ParametrosDominioApi | null> {
  try {
    const parametros = await clienteApi.consultarParametros();
    aplicarParametrosDominio(parametros);
    return parametros;
  } catch {
    return null;
  }
}

/** Guarda los parámetros y, si la API los acepta, rigen en la pantalla y en las ejecuciones nuevas. */
export async function guardarParametrosDominio(parametros: ParametrosDominioApi): Promise<ParametrosDominioApi> {
  const guardados = await clienteApi.guardarParametros(parametros);
  aplicarParametrosDominio(guardados);
  return guardados;
}

/** Vuelve a los valores por defecto. */
export async function restablecerParametrosDominio(): Promise<ParametrosDominioApi> {
  const porDefecto = await clienteApi.restablecerParametros();
  aplicarParametrosDominio(porDefecto);
  return porDefecto;
}
