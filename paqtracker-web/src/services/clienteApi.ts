import type {
  DetallePedidoApi,
  EjecucionApi,
  ErrorApi,
  ImportacionApi,
  MensajeEstadoApi,
  PedidoApi,
  ParametrosDominioApi,
  PlanEstableApi,
  RangosSemaforoApi,
  RegistroPedidoApi,
  EstimacionAveriaApi,
  RespuestaRegistroAveriaApi,
  SolicitudEjecucionApi,
} from '../types/api';
import { terminarSesion, tokenVigente } from './sesion';

// Cliente REST de paqtracker-api. La URL base sale de VITE_API_BASE_URL; en despliegue es relativa
// (/api) y Nginx (o el proxy de Vite en desarrollo) la reenvía a la API.

const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/** Identificador fijo de la operación día a día en paqtracker-api. */
export const ID_DIA_A_DIA = 'dia-a-dia';

/** Error devuelto por la API, con el mensaje legible de su cuerpo {estado, error, mensaje, detalles}. */
export class ErrorDeApi extends Error {
  readonly estado: number;
  readonly detalles: string[];

  constructor(estado: number, mensaje: string, detalles: string[] = []) {
    super(mensaje);
    this.name = 'ErrorDeApi';
    this.estado = estado;
    this.detalles = detalles;
  }
}

/**
 * Agrega el token de la sesión, si hay una. Sin sesión las opciones quedan tal cual (así las ven las
 * pruebas y las rutas abiertas de la API).
 */
function conSesion(opciones: RequestInit): { opciones: RequestInit; conToken: boolean } {
  const token = tokenVigente();
  if (!token) return { opciones, conToken: false };
  const cabeceras = { ...(opciones.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` };
  return { opciones: { ...opciones, headers: cabeceras }, conToken: true };
}

/** Hace la solicitud con la sesión; un 401 a una solicitud con token significa que la sesión ya no vale. */
async function pedir(ruta: string, opciones: RequestInit): Promise<Response> {
  const { opciones: conToken, conToken: llevaToken } = conSesion(opciones);
  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, conToken);
  } catch {
    throw new ErrorDeApi(0, 'No se pudo conectar con el servidor');
  }
  if (respuesta.status === 401 && llevaToken) terminarSesion('vencida');
  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => null)) as ErrorApi | null;
    throw new ErrorDeApi(respuesta.status, cuerpo?.mensaje ?? `Error ${respuesta.status}`, cuerpo?.detalles ?? []);
  }
  return respuesta;
}

async function solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await pedir(ruta, opciones);
  return (await respuesta.json()) as T;
}

/** DELETE que responde 204 sin cuerpo. */
async function eliminar(ruta: string): Promise<void> {
  await pedir(ruta, { method: 'DELETE' });
}

const enviarJson = <T>(ruta: string, cuerpo?: unknown) =>
  solicitar<T>(ruta, {
    method: 'POST',
    headers: cuerpo === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });

const subirArchivo = (ruta: string, archivo: File, mes: string) => {
  const formulario = new FormData();
  formulario.append('file', archivo);
  formulario.append('mes', mes);
  return solicitar<ImportacionApi>(ruta, { method: 'POST', body: formulario });
};

export const clienteApi = {
  listarEjecuciones: () => solicitar<EjecucionApi[]>('/ejecuciones'),
  consultarEjecucion: (id: string) => solicitar<EjecucionApi>(`/ejecuciones/${encodeURIComponent(id)}`),
  crearEjecucion: (solicitud: SolicitudEjecucionApi) => enviarJson<EjecucionApi>('/ejecuciones', solicitud),
  iniciar: (id: string) => enviarJson<EjecucionApi>(`/ejecuciones/${encodeURIComponent(id)}/iniciar`),
  pausar: (id: string) => enviarJson<EjecucionApi>(`/ejecuciones/${encodeURIComponent(id)}/pausar`),
  detener: (id: string) => enviarJson<EjecucionApi>(`/ejecuciones/${encodeURIComponent(id)}/detener`),
  /** Última instantánea: la pide quien se conecta tarde, antes de suscribirse al tópico. */
  estado: (id: string) => solicitar<MensajeEstadoApi>(`/ejecuciones/${encodeURIComponent(id)}/estado`),
  /** Última planificación estable (G08–G10); 404 si la ejecución aún no planificó. */
  planEstable: (id: string) => solicitar<PlanEstableApi>(`/ejecuciones/${encodeURIComponent(id)}/plan-estable`),

  listarPedidos: (ejecucionId: string) => solicitar<PedidoApi[]>(`/pedidos?ejecucionId=${encodeURIComponent(ejecucionId)}`),
  detallePedido: (ejecucionId: string, codigo: string) =>
    solicitar<DetallePedidoApi>(`/pedidos/${encodeURIComponent(codigo)}?ejecucionId=${encodeURIComponent(ejecucionId)}`),
  registrarPedido: (pedido: { cliente: string; x: number; y: number; cantidad: number; plazoHoras: number }) =>
    enviarJson<RegistroPedidoApi>('/pedidos', pedido),

  /** CU-13: registra una avería ahora o, con `instanteMs`, en un instante futuro del reloj de la ejecución. */
  registrarAveria: (ejecucionId: string, unidad: string, tipo: 1 | 2 | 3, instanteMs?: number) =>
    enviarJson<RespuestaRegistroAveriaApi>(
      `/ejecuciones/${encodeURIComponent(ejecucionId)}/averias`,
      instanteMs === undefined ? { unidad, tipo } : { unidad, tipo, instanteMs },
    ),
  /** Deshace una avería mientras sigue programada; 409 si el motor ya la aplicó. */
  cancelarAveria: (ejecucionId: string, averiaId: number) =>
    eliminar(`/ejecuciones/${encodeURIComponent(ejecucionId)}/averias/${averiaId}`),
  /** Cuándo volvería a operar una unidad si ahora se registrara cada tipo de avería. No registra nada. */
  estimarAverias: (ejecucionId: string) =>
    solicitar<EstimacionAveriaApi[]>(`/ejecuciones/${encodeURIComponent(ejecucionId)}/averias/estimacion`),

  /** Rangos vigentes de los semáforos (fracciones 0–1). */
  consultarRangosSemaforo: () => solicitar<RangosSemaforoApi>('/configuracion/semaforo'),
  /** Cambia los rangos; la API responde 400 con el motivo si no son coherentes. */
  guardarRangosSemaforo: (rangos: RangosSemaforoApi) =>
    solicitar<RangosSemaforoApi>('/configuracion/semaforo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rangos),
    }),

  /** Almacenes, unidades y averías vigentes (B02, B04, B07-B09). */
  consultarParametros: () => solicitar<ParametrosDominioApi>('/configuracion/parametros'),
  /** Cambia los parámetros; rigen para las ejecuciones nuevas. 400 con el motivo si no son coherentes. */
  guardarParametros: (parametros: ParametrosDominioApi) =>
    solicitar<ParametrosDominioApi>('/configuracion/parametros', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parametros),
    }),
  /** Vuelve a los valores por defecto. */
  restablecerParametros: () => solicitar<ParametrosDominioApi>('/configuracion/parametros', { method: 'DELETE' }),
  /** Reinicia la operación día a día desde ahora con los parámetros vigentes; conserva y replanifica sus pedidos. */
  reiniciarDiaADia: () => enviarJson<EjecucionApi>(`/ejecuciones/${ID_DIA_A_DIA}/reiniciar`),

  /** Mes en formato YYYYMM. */
  subirVentas: (archivo: File, mes: string) => subirArchivo('/archivos/pedidos', archivo, mes),
  subirBloqueos: (archivo: File, mes: string) => subirArchivo('/archivos/bloqueos', archivo, mes),
};

/** Estado de la sesión que devuelve GET /api/sesion. */
export interface EstadoSesionApi {
  seguridadActiva: boolean;
  autenticado: boolean;
  usuario: string | null;
  expiraEnMs: number | null;
}

/** Sesión recién abierta (POST /api/sesion). */
export interface InicioSesionApi {
  token: string;
  usuario: string;
  expiraEnMs: number;
}

/**
 * Login. Va aparte de `clienteApi` porque un 401 aquí es "credenciales incorrectas", no una sesión vencida,
 * y porque el token se pasa explícito en vez de leerse del almacenamiento.
 */
export const clienteSesion = {
  /** Si la API exige sesión y si el token (si se pasa) sigue vigente. */
  consultar: async (token: string | null): Promise<EstadoSesionApi> => {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${BASE}/sesion`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    } catch {
      throw new ErrorDeApi(0, 'No se pudo conectar con el servidor');
    }
    if (!respuesta.ok) throw new ErrorDeApi(respuesta.status, `Error ${respuesta.status}`);
    return (await respuesta.json()) as EstadoSesionApi;
  },
  /** 401 con "Usuario o contraseña incorrectos", 429 tras varios intentos fallidos. */
  iniciar: async (usuario: string, clave: string): Promise<InicioSesionApi> => {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${BASE}/sesion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, clave }),
      });
    } catch {
      throw new ErrorDeApi(0, 'No se pudo conectar con el servidor');
    }
    if (!respuesta.ok) {
      const cuerpo = (await respuesta.json().catch(() => null)) as ErrorApi | null;
      throw new ErrorDeApi(respuesta.status, cuerpo?.mensaje ?? `Error ${respuesta.status}`, cuerpo?.detalles ?? []);
    }
    return (await respuesta.json()) as InicioSesionApi;
  },
  /** Cierra la sesión en la API; si falla la red no importa, el token se borra igual en el navegador. */
  cerrar: async (token: string): Promise<void> => {
    try {
      await fetch(`${BASE}/sesion`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    } catch {
      // Sin red: el token vence solo en la API.
    }
  },
};
