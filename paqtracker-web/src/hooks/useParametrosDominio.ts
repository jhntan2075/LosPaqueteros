import { useEffect, useSyncExternalStore } from 'react';
import { obtenerVersionParametros, suscribirParametros } from '../config/dominio';
import { cargarParametrosDominio } from '../services/servicioParametros';

/** Versión de los parámetros del dominio: el componente se vuelve a dibujar cuando cambian. */
export function useParametrosDominio(): number {
  return useSyncExternalStore(suscribirParametros, obtenerVersionParametros);
}

/**
 * Carga una vez los parámetros guardados en la API y suscribe al componente a sus cambios. Va en la raíz:
 * al cambiar la ubicación de un almacén o la capacidad de un tipo de unidad se vuelve a dibujar todo.
 */
export function useParametrosDominioGlobales(): number {
  useEffect(() => {
    void cargarParametrosDominio();
  }, []);
  return useParametrosDominio();
}
