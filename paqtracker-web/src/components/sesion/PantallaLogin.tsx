import React, { useEffect, useRef, useState } from 'react';
import { CircleAlert, Info } from 'lucide-react';
import logo from '../../assets/marca/logo.svg';
import logoOscuro from '../../assets/marca/logo-oscuro.svg';
import { ErrorDeApi } from '../../services/clienteApi';
import { IlustracionOperacion } from './IlustracionOperacion';

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
  const Icono = error ? CircleAlert : Info;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`flex gap-2 items-start text-[13px] leading-[1.35] rounded-[8px] px-3 py-2.5 mb-4 border ${
        error ? 'bg-[#FDECEF] border-[#F5C2CB] text-[#A3182F]' : 'bg-[#E8F3FC] border-[#B9DBF5] text-[#0F6AAE]'
      }`}
    >
      <Icono className="w-4 h-4 mt-px shrink-0" aria-hidden="true" />
      <span>
        {mensaje.titulo && <b className="font-semibold">{mensaje.titulo} </b>}
        {mensaje.texto}
        {accion}
      </span>
    </div>
  );
};

const claseCampo = (conError: boolean) =>
  `w-full h-10 rounded-[8px] border bg-white px-3 text-[14px] text-[#0D152E] outline-none transition placeholder:text-[#8190AA] disabled:bg-[#F4F6FA] focus:border-[#1B4DD9] focus:ring-[3px] focus:ring-[#1B4DD9]/20 ${
    conError ? 'border-[#C81E3A]' : 'border-[#C7D4F2]'
  }`;

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
    <div className="h-screen w-screen overflow-y-auto grid min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] bg-[#EEF3FE] font-sans">
      {/* Panel de marca: solo en escritorio */}
      <aside className="relative hidden min-[900px]:flex flex-col justify-between overflow-hidden bg-[#0D152E] text-white px-8 py-7">
        <IlustracionOperacion />
        <div className="relative flex items-center gap-2.5 font-bold text-[16px] tracking-tight">
          <img src={logoOscuro} alt="" aria-hidden="true" className="h-[30px] w-auto" />
          PaqTracker
        </div>
        <div className="relative">
          <p className="text-[26px] leading-[1.2] font-bold tracking-[-0.02em] max-w-[360px] mb-2.5">
            Planifica, despacha y sigue cada pedido en tiempo real.
          </p>
          <ul className="flex flex-wrap gap-x-[18px] gap-y-1.5 mt-4 text-[12px] text-[#A9B4C8]">
            {['Replanificación automática', 'Seguimiento en vivo', 'Autos · motos · bicicletas'].map((t) => (
              <li key={t} className="flex items-center gap-2 before:content-[''] before:w-3.5 before:h-px before:bg-[#1586D7]">
                {t}
              </li>
            ))}
          </ul>
        </div>
        <ul className="relative flex flex-wrap gap-3.5 text-[11px] text-[#A9B4C8]" aria-label="Leyenda de la ilustración">
          <li className="flex items-center gap-1.5">
            <i className="size-[9px] rounded-full bg-[#1586D7]" />
            En ruta
          </li>
          <li className="flex items-center gap-1.5">
            <i className="size-[9px] rounded-full bg-[#FB8229]" />
            Con retraso
          </li>
          <li className="flex items-center gap-1.5">
            <i className="size-[9px] rounded-full bg-[#C81E3A]" />
            Bloqueo
          </li>
          <li className="flex items-center gap-1.5">
            <svg width="12" height="11" viewBox="-15 -14 30 28" aria-hidden="true">
              <path d="M0 -13L14 -4V13H-14V-4L0 -13Z" fill="#0F172A" stroke="#fff" strokeWidth="2.5" />
            </svg>
            Almacén central
          </li>
          <li className="flex items-center gap-1.5">
            <svg width="11" height="10" viewBox="-13 -12 26 24" aria-hidden="true">
              <path d="M0 -11L12 -3V11H-12V-3L0 -11Z" fill="#fff" stroke="#15803D" strokeWidth="2.5" />
            </svg>
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
          className="w-full max-w-[360px] bg-white border border-[#BFD0F8] rounded-[12px] px-7 pt-7 pb-6 shadow-[0_1px_2px_rgba(21,60,176,0.08),0_12px_32px_rgba(21,60,176,0.12)]"
        >
          <div className="flex flex-col items-center text-center mb-5">
            <div className="size-14 rounded-[14px] bg-[#DBEAFE] border border-[#BFD0F8] flex items-center justify-center mb-3">
              <img src={logo} alt="" aria-hidden="true" className="h-9 w-auto" />
            </div>
            <h1 id="login-titulo" className="text-[20px] font-bold tracking-[-0.01em] text-[#1E40AF]">
              Iniciar sesión
            </h1>
            <p className="text-[13px] text-[#5F6F8C] mt-1">Ingresa con la cuenta del equipo</p>
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
            <label htmlFor="login-usuario" className="block text-[12px] font-semibold text-[#1E3A8A] mb-1.5">
              Usuario
            </label>
            <input
              id="login-usuario"
              ref={refUsuario}
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={enviando}
              aria-invalid={credencialesMal || undefined}
              className={claseCampo(credencialesMal)}
            />
          </div>

          <div className="mb-3.5">
            <label htmlFor="login-clave" className="block text-[12px] font-semibold text-[#1E3A8A] mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="login-clave"
                ref={refClave}
                type={verClave ? 'text' : 'password'}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                autoComplete="current-password"
                disabled={enviando}
                aria-invalid={credencialesMal || undefined}
                className={`${claseCampo(credencialesMal)} pr-[76px]`}
              />
              <button
                type="button"
                onClick={() => setVerClave((v) => !v)}
                aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={verClave}
                className="absolute right-1.5 top-1.5 h-7 px-2 rounded-[6px] text-[12px] text-[#1B4DD9] hover:bg-[#DBEAFE] cursor-pointer"
              >
                {verClave ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="mt-1.5 w-full h-11 rounded-[6px] bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#1E40AF]"
          >
            {enviando && <span className="size-3.5 rounded-full border-2 border-white/45 border-t-white animate-spin" aria-hidden="true" />}
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>

          <p className="text-[12px] text-[#5F6F8C] text-center mt-3.5">¿Olvidaste la contraseña? Pídela al responsable del equipo.</p>
          <p className="text-[11px] text-[#8190AA] text-center mt-[18px] pt-3 border-t border-[#E1E9FB] tabular-nums">
            v{__APP_VERSION__} · {__APP_COMMIT__}
          </p>
        </form>
      </main>
    </div>
  );
};

/** Pantalla breve mientras se comprueba la sesión guardada. */
export const VerificandoSesion: React.FC = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-[#EEF3FE] font-sans">
    <p className="text-[12px] text-[#5F6F8C] flex items-center gap-2" role="status">
      <span className="size-[6px] rounded-full bg-[#1E40AF] animate-pulse" /> Verificando sesión…
    </p>
  </div>
);

