// Sesión del login guardada en el navegador. Es una cuenta compartida del equipo: el token vale para
// todas las pestañas y sobrevive a una recarga hasta que vence (12 h por defecto en la API). Si el
// navegador no permite almacenamiento (ventana privada estricta), la sesión dura lo que dure la pestaña.

export interface SesionGuardada {
  token: string;
  usuario: string;
  /** Vencimiento en milisegundos desde la época. */
  expiraEnMs: number;
}

/** Por qué se terminó la sesión: la cerró el usuario, o venció (o la API respondió 401). */
export type MotivoFin = 'cerrada' | 'vencida';

const CLAVE = 'paqtracker.sesion';

let enMemoria: SesionGuardada | null = null;
const oyentesFin = new Set<(motivo: MotivoFin) => void>();

function almacen(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function esSesion(valor: unknown): valor is SesionGuardada {
  const v = valor as SesionGuardada | null;
  return !!v && typeof v.token === 'string' && typeof v.usuario === 'string' && typeof v.expiraEnMs === 'number';
}

export function leerSesion(): SesionGuardada | null {
  const local = almacen();
  if (local) {
    try {
      const crudo = local.getItem(CLAVE);
      const valor: unknown = crudo ? JSON.parse(crudo) : null;
      enMemoria = esSesion(valor) ? valor : null;
    } catch {
      // Valor corrupto o almacenamiento bloqueado: se usa lo que haya en memoria.
    }
  }
  return enMemoria;
}

export function guardarSesion(sesion: SesionGuardada): void {
  enMemoria = sesion;
  try {
    almacen()?.setItem(CLAVE, JSON.stringify(sesion));
  } catch {
    // Sin almacenamiento la sesión queda solo en memoria.
  }
}

export function borrarSesion(): void {
  enMemoria = null;
  try {
    almacen()?.removeItem(CLAVE);
  } catch {
    // Nada que borrar.
  }
}

/** Token vigente para mandar a la API, o null si no hay sesión o ya venció. */
export function tokenVigente(ahoraMs = Date.now()): string | null {
  const sesion = leerSesion();
  return sesion && sesion.expiraEnMs > ahoraMs ? sesion.token : null;
}

/** Avisa cuando la sesión termina por cualquier motivo; devuelve la función que deja de avisar. */
export function alTerminarSesion(oyente: (motivo: MotivoFin) => void): () => void {
  oyentesFin.add(oyente);
  return () => oyentesFin.delete(oyente);
}

/** Borra la sesión y avisa a quien escucha (la puerta del login vuelve a mostrar la pantalla). */
export function terminarSesion(motivo: MotivoFin): void {
  borrarSesion();
  oyentesFin.forEach((oyente) => oyente(motivo));
}

/** Clave de almacenamiento, para reaccionar cuando otra pestaña cierra la sesión. */
export const CLAVE_SESION = CLAVE;
