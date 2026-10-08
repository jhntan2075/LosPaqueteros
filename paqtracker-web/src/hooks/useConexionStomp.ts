import { useEffect, useState } from 'react';
import { alCambiarConexion, estaConectado } from '../services/clienteStomp';

/** Estado de la conexión STOMP compartida. */
export function useConexionStomp(): boolean {
  const [conectado, setConectado] = useState(estaConectado);
  useEffect(() => alCambiarConexion(setConectado), []);
  return conectado;
}
