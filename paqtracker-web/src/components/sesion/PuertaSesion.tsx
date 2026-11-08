import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clienteSesion } from '../../services/clienteApi';
import { desconectar } from '../../services/clienteStomp';
import { alTerminarSesion, borrarSesion, CLAVE_SESION, guardarSesion, leerSesion, terminarSesion } from '../../services/sesion';
import { ContextoSesion, type ContextoSesionValor } from './contextoSesion';
import { PantallaLogin, VerificandoSesion, type AvisoLogin } from './PantallaLogin';

// Puerta del login: muestra la aplicación solo con una sesión vigente. Sin sesión, al recargar, cuando
// el token vence o cuando la API responde 401, vuelve a la pantalla de login. Si la API no exige
// sesión (solo en desarrollo), deja pasar directo.

type Estado =
  | { fase: 'verificando' }
  | { fase: 'abierta' }
  | { fase: 'autenticada'; usuario: string; expiraEnMs: number }
  | { fase: 'login'; aviso: AvisoLogin; usuario: string };

/** setTimeout admite hasta ~24,8 días; una sesión nunca dura tanto, pero se acota por seguridad. */
const MAX_ESPERA_MS = 2_147_483_647;

export const PuertaSesion: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [estado, setEstado] = useState<Estado>({ fase: 'verificando' });
  const ultimoUsuario = useRef('');

  // Comprueba la sesión guardada contra la API y devuelve la pantalla que corresponde.
  const comprobar = useCallback(async (): Promise<Estado> => {
    const guardada = leerSesion();
    if (guardada) ultimoUsuario.current = guardada.usuario;
    try {
      const respuesta = await clienteSesion.consultar(guardada?.token ?? null);
      if (!respuesta.seguridadActiva) return { fase: 'abierta' };
      if (respuesta.autenticado && guardada && respuesta.expiraEnMs !== null) {
        guardarSesion({ ...guardada, expiraEnMs: respuesta.expiraEnMs });
        return { fase: 'autenticada', usuario: guardada.usuario, expiraEnMs: respuesta.expiraEnMs };
      }
      if (guardada) borrarSesion();
      return { fase: 'login', aviso: guardada ? 'vencida' : null, usuario: ultimoUsuario.current };
    } catch {
      return { fase: 'login', aviso: 'sinConexion', usuario: ultimoUsuario.current };
    }
  }, []);

  const verificar = useCallback(() => comprobar().then(setEstado), [comprobar]);

  useEffect(() => {
    let vigente = true;
    void comprobar().then((siguiente) => {
      if (vigente) setEstado(siguiente);
    });
    return () => {
      vigente = false;
    };
  }, [comprobar]);

  // Fin de la sesión por cualquier motivo: botón Salir, vencimiento o un 401 de la API.
  useEffect(
    () =>
      alTerminarSesion((motivo) => {
        desconectar();
        setEstado({ fase: 'login', aviso: motivo === 'vencida' ? 'vencida' : null, usuario: ultimoUsuario.current });
      }),
    [],
  );

  // Vencimiento local: a la hora exacta, sin esperar a que una llamada a la API responda 401.
  const expiraEnMs = estado.fase === 'autenticada' ? estado.expiraEnMs : null;
  useEffect(() => {
    if (expiraEnMs === null) return;
    const espera = Math.min(Math.max(0, expiraEnMs - Date.now()), MAX_ESPERA_MS);
    const temporizador = window.setTimeout(() => terminarSesion('vencida'), espera);
    return () => window.clearTimeout(temporizador);
  }, [expiraEnMs]);

  // Otra pestaña cerró o abrió la sesión: esta la sigue.
  useEffect(() => {
    const alCambiarAlmacen = (evento: StorageEvent) => {
      if (evento.key !== CLAVE_SESION) return;
      if (evento.newValue === null) {
        desconectar();
        setEstado((actual) => (actual.fase === 'autenticada' ? { fase: 'login', aviso: null, usuario: actual.usuario } : actual));
      } else {
        setEstado((actual) => {
          if (actual.fase === 'login') void verificar();
          return actual;
        });
      }
    };
    window.addEventListener('storage', alCambiarAlmacen);
    return () => window.removeEventListener('storage', alCambiarAlmacen);
  }, [verificar]);

  const ingresar = useCallback(async (usuario: string, clave: string) => {
    const sesion = await clienteSesion.iniciar(usuario, clave);
    guardarSesion(sesion);
    ultimoUsuario.current = sesion.usuario;
    setEstado({ fase: 'autenticada', usuario: sesion.usuario, expiraEnMs: sesion.expiraEnMs });
  }, []);

  const cerrarSesion = useCallback(() => {
    const guardada = leerSesion();
    terminarSesion('cerrada');
    if (guardada) void clienteSesion.cerrar(guardada.token);
  }, []);

  const usuario = estado.fase === 'autenticada' ? estado.usuario : null;
  const valor = useMemo<ContextoSesionValor | null>(() => (usuario ? { usuario, cerrarSesion } : null), [usuario, cerrarSesion]);

  if (estado.fase === 'verificando') return <VerificandoSesion />;
  if (estado.fase === 'login') {
    return (
      <PantallaLogin
        // Con otro aviso se vuelve a montar: el foco y los campos parten limpios.
        key={estado.aviso ?? 'login'}
        aviso={estado.aviso}
        usuarioInicial={estado.usuario}
        onIngresar={ingresar}
        onReintentarConexion={() => {
          setEstado({ fase: 'verificando' });
          void verificar();
        }}
      />
    );
  }
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
};
