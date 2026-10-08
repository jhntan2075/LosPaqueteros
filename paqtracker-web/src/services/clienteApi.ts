import type {
  DetallePedidoApi,
  EjecucionApi,
  ErrorApi,
  ImportacionApi,
  MensajeEstadoApi,
  PedidoApi,
  RegistroPedidoApi,
  SolicitudEjecucionApi,
} from '../types/api';

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

async function solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, opciones);
  } catch {
    throw new ErrorDeApi(0, 'No se pudo conectar con el servidor');
  }
  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => null)) as ErrorApi | null;
    throw new ErrorDeApi(respuesta.status, cuerpo?.mensaje ?? `Error ${respuesta.status}`, cuerpo?.detalles ?? []);
  }
  return (await respuesta.json()) as T;
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

  listarPedidos: (ejecucionId: string) => solicitar<PedidoApi[]>(`/pedidos?ejecucionId=${encodeURIComponent(ejecucionId)}`),
  detallePedido: (ejecucionId: string, codigo: string) =>
    solicitar<DetallePedidoApi>(`/pedidos/${encodeURIComponent(codigo)}?ejecucionId=${encodeURIComponent(ejecucionId)}`),
  registrarPedido: (pedido: { cliente: string; x: number; y: number; cantidad: number; plazoHoras: number }) =>
    enviarJson<RegistroPedidoApi>('/pedidos', pedido),

  /** Mes en formato YYYYMM. */
  subirVentas: (archivo: File, mes: string) => subirArchivo('/archivos/pedidos', archivo, mes),
  subirBloqueos: (archivo: File, mes: string) => subirArchivo('/archivos/bloqueos', archivo, mes),
};
