import React, { useEffect, useRef, useState } from 'react';
import logo from '../../assets/marca/logo.svg';
import logoOscuro from '../../assets/marca/logo-oscuro.svg';
import { ErrorDeApi } from '../../services/clienteApi';
import { Aviso, Boton, Entrada } from '../ui';
import { IlustracionOperacion, MarcaLeyendaCentral, MarcaLeyendaIntermedio } from './IlustracionOperacion';

// Pantalla de login. En escritorio (≥ 900 px) es un panel dividido: a la izquierda la marca sobre la
// ilustración de la operación y a la derecha la tarjeta. En tablet vertical y celular queda solo la tarjeta.

export type AvisoLogin = 'vencida' | 'sinConexion' | null;

interface PantallaLoginProps {
  aviso: AvisoLogin;
  /** Usuario con el que se ingresó la última vez, para no volver a escribirlo tras un vencimiento. */
  usuarioInicial?: string;
  /** Lanza ErrorDeApi si no se pudo ingresar. */
  onIngresar: (usuario: string, clave: string) => Promise<void>;
  onReintentarConexion?: () => void;
}

interface Mensaje {
  tipo: 'error' | 'info';
  titulo?: string;
  texto: string;
}

function mensajeDeError(error: unknown): Mensaje {
  if (error instanceof ErrorDeApi) {
    if (error.estado === 401) return { tipo: 'error', titulo: 'Usuario o contraseña incorrectos.', texto: 'Revisa e inténtalo de nuevo.' };
    if (error.estado === 429) return { tipo: 'error', texto: error.message };
    if (error.estado === 0) return { tipo: 'error', texto: 'No se pudo conectar con el servidor. Inténtalo en unos segundos.' };
    if (error.estado === 400) return { tipo: 'error', texto: 'Completa usuario y contraseña.' };
    return { tipo: 'error', texto: error.message };
  }
  return { tipo: 'error', texto: 'No se pudo iniciar sesión.' };
}

const Alerta: React.FC<{ mensaje: Mensaje; accion?: React.ReactNode }> = ({ mensaje, accion }) => {
  const error = mensaje.tipo === 'error';
  return (
    <Aviso tono={error ? 'critical' : 'info'} role={error ? 'alert' : 'status'} className="mb-4">
      {mensaje.titulo && <b className="font-semibold">{mensaje.titulo} </b>}
      {mensaje.texto}
      {accion}
    </Aviso>
  );
};

const CLASE_ETIQUETA = 'block text-body-sm font-medium text-neutral-700 mb-1.5';

export const PantallaLogin: React.FC<PantallaLoginProps> = ({ aviso, usuarioInicial = '', onIngresar, onReintentarConexion }) => {
  const [usuario, setUsuario] = useState(usuarioInicial);
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<Mensaje | null>(null);
  const [credencialesMal, setCredencialesMal] = useState(false);
  const refUsuario = useRef<HTMLInputElement>(null);
  const refClave = useRef<HTMLInputElement>(null);

  // El foco empieza donde hay que escribir: en la clave si el usuario ya viene puesto.
  useEffect(() => {
    (usuarioInicial ? refClave : refUsuario).current?.focus();
  }, [usuarioInicial]);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (enviando) return;
    if (!usuario.trim() || !clave) {
      setError({ tipo: 'error', texto: 'Completa usuario y contraseña.' });
      (usuario.trim() ? refClave : refUsuario).current?.focus();
      return;
    }
    setEnviando(true);
    setError(null);
    setCredencialesMal(false);
    try {
      await onIngresar(usuario.trim(), clave);
    } catch (e) {
      setError(mensajeDeError(e));
      setCredencialesMal(e instanceof ErrorDeApi && e.estado === 401);
      setClave('');
      setEnviando(false);
      // El foco vuelve tras re-habilitar el campo.
      setTimeout(() => refClave.current?.focus(), 0);
    }
  };

  const avisoInicial: Mensaje | null =
    aviso === 'vencida'
      ? { tipo: 'info', texto: 'Tu sesión venció. Vuelve a ingresar para continuar.' }
      : aviso === 'sinConexion'
        ? { tipo: 'error', texto: 'No se pudo conectar con el servidor.' }
        : null;
  const mensaje = error ?? avisoInicial;

  return (
    <div className="h-screen w-screen overflow-y-auto grid min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] bg-primary-50 font-sans">
      {/* Panel de marca: solo en escritorio */}
      <aside className="relative hidden min-[900px]:flex flex-col justify-between overflow-hidden bg-neutral-900 text-white px-8 py-7">
        <IlustracionOperacion />
        <div className="relative flex items-center gap-2.5 text-title tracking-tight">
          <img src={logoOscuro} alt="" aria-hidden="true" className="h-[30px] w-auto" />
          PaqTracker
        </div>
        <div className="relative">
          <p className="text-kpi tracking-tight max-w-[360px] mb-2.5">
            Planifica, despacha y sigue cada pedido en tiempo real.
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-body-sm text-neutral-300">
            {['Replanificación automática', 'Seguimiento en vivo', 'Autos · motos · bicicletas'].map((t) => (
              <li key={t} className="flex items-center gap-2 before:content-[''] before:w-3.5 before:h-px before:bg-info-600">
                {t}
              </li>
            ))}
          </ul>
        </div>
        <ul className="relative flex flex-wrap gap-3.5 text-caption text-neutral-300" aria-label="Leyenda de la ilustración">
          <li className="flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-info-600" />
            En ruta
          </li>
          <li className="flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-warn-500" />
            Con retraso
          </li>
          <li className="flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-critical-600" />
            Bloqueo
          </li>
          <li className="flex items-center gap-1.5">
            <MarcaLeyendaCentral />
            Almacén central
          </li>
          <li className="flex items-center gap-1.5">
            <MarcaLeyendaIntermedio />
            Intermedio (stock)
          </li>
        </ul>
      </aside>

      {/* Tarjeta de inicio de sesión */}
      <main className="flex items-center justify-center px-4 py-8 min-h-full">
        <form
          onSubmit={enviar}
          noValidate
          aria-labelledby="login-titulo"
          className="w-full max-w-[360px] bg-white border border-primary-100 rounded-card px-7 pt-7 pb-6 shadow-overlay"
        >
          <div className="flex flex-col items-center text-center mb-5">
            <div className="size-14 rounded-card bg-primary-100 border border-primary-100 flex items-center justify-center mb-3">
              <img src={logo} alt="" aria-hidden="true" className="h-9 w-auto" />
            </div>
            <h1 id="login-titulo" className="text-title tracking-tight text-primary-600">
              Iniciar sesión
            </h1>
            <p className="text-body text-neutral-600 mt-1">Ingresa con la cuenta del equipo</p>
          </div>

          {mensaje && (
            <Alerta
              mensaje={mensaje}
              accion={
                !error && aviso === 'sinConexion' && onReintentarConexion ? (
                  <button type="button" onClick={onReintentarConexion} className="ml-1 underline font-semibold cursor-pointer">
                    Reintentar
                  </button>
                ) : undefined
              }
            />
          )}

          <div className="mb-3.5">
            <label htmlFor="login-usuario" className={CLASE_ETIQUETA}>
              Usuario
            </label>
            <Entrada
              id="login-usuario"
              tamano="lg"
              ref={refUsuario}
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={enviando}
              aria-invalid={credencialesMal || undefined}
              className="text-title-sm font-normal"
            />
          </div>

          <div className="mb-3.5">
            <label htmlFor="login-clave" className={CLASE_ETIQUETA}>
              Contraseña
            </label>
            <div className="relative">
              <Entrada
                id="login-clave"
                tamano="lg"
                ref={refClave}
                type={verClave ? 'text' : 'password'}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                autoComplete="current-password"
                disabled={enviando}
                aria-invalid={credencialesMal || undefined}
                className="text-title-sm font-normal pr-20"
              />
              <button
                type="button"
                onClick={() => setVerClave((v) => !v)}
                aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={verClave}
                className="absolute right-1.5 top-1.5 h-7 px-2 rounded-control text-body-sm text-primary-600 hover:bg-primary-100 cursor-pointer"
              >
                {verClave ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <Boton
            type="submit"
            variante="primario"
            tamano="lg"
            cargando={enviando}
            textoCargando={
              <>
                <span className="size-3.5 rounded-full border-2 border-white/45 border-t-white animate-spin" aria-hidden="true" />
                Ingresando…
              </>
            }
            className="mt-1.5 w-full h-11 gap-2"
          >
            Ingresar
          </Boton>

          <p className="text-body-sm text-neutral-600 text-center mt-3.5">¿Olvidaste la contraseña? Pídela al responsable del equipo.</p>
          <p className="text-caption text-neutral-600 text-center mt-4 pt-3 border-t border-primary-100 tabular-nums">
            v{__APP_VERSION__} · {__APP_COMMIT__}
          </p>
        </form>
      </main>
    </div>
  );
};

/** Pantalla breve mientras se comprueba la sesión guardada. */
export const VerificandoSesion: React.FC = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-primary-50 font-sans">
    <p className="text-body-sm text-neutral-600 flex items-center gap-2" role="status">
      <span className="size-1.5 rounded-full bg-primary-600 animate-pulse" /> Verificando sesión…
    </p>
  </div>
);

