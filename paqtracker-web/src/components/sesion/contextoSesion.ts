import { createContext, useContext } from 'react';

export interface ContextoSesionValor {
  usuario: string;
  cerrarSesion: () => void;
}

/**
 * Sesión abierta, para quien muestra el usuario o el botón "Salir". Es null si la API no exige sesión o
 * si el componente se monta fuera de la puerta del login (por ejemplo, en las pruebas).
 */
export const ContextoSesion = createContext<ContextoSesionValor | null>(null);

export const useSesion = () => useContext(ContextoSesion);
