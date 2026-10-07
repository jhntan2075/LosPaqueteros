import { Client, type StompSubscription } from '@stomp/stompjs';

// Cliente STOMP único de la aplicación (una conexión WebSocket por navegador). Los hooks se suscriben
// por tópico; si la conexión se cae, el cliente reconecta y vuelve a suscribir todos los tópicos.
// La URL sale de VITE_WS_URL: relativa (/ws) en despliegue, resuelta contra el host de la página.

type Oyente = (cuerpo: unknown) => void;
type OyenteConexion = (conectado: boolean) => void;

const REINTENTO_MS = 3000;
const LATIDO_MS = 10000;

function resolverUrl(configurada: string): string {
  if (/^wss?:\/\//.test(configurada)) return configurada;
  const protocolo = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocolo}//${window.location.host}${configurada.startsWith('/') ? '' : '/'}${configurada}`;
}

const oyentes = new Map<string, Set<Oyente>>();
const suscripciones = new Map<string, StompSubscription>();
const oyentesConexion = new Set<OyenteConexion>();
let conectado = false;

const cliente = new Client({
  brokerURL: resolverUrl(import.meta.env.VITE_WS_URL || '/ws'),
  reconnectDelay: REINTENTO_MS,
  heartbeatIncoming: LATIDO_MS,
  heartbeatOutgoing: LATIDO_MS,
  // stompjs invoca debug() sin comprobarlo: debe ser una función.
  debug: () => {},
  onConnect: () => {
    oyentes.forEach((_, destino) => suscribirEnBroker(destino));
    cambiarConexion(true);
  },
  onWebSocketClose: () => {
    suscripciones.clear();
    cambiarConexion(false);
  },
  onStompError: (trama) => console.error('[STOMP]', trama.headers['message'], trama.body),
});

function cambiarConexion(valor: boolean) {
  conectado = valor;
  oyentesConexion.forEach((oyente) => oyente(valor));
}

function suscribirEnBroker(destino: string) {
  if (suscripciones.has(destino)) return;
  const suscripcion = cliente.subscribe(destino, (mensaje) => {
    let cuerpo: unknown;
    try {
      cuerpo = JSON.parse(mensaje.body);
    } catch {
      return;
    }
    oyentes.get(destino)?.forEach((oyente) => oyente(cuerpo));
  });
  suscripciones.set(destino, suscripcion);
}

function activar() {
  if (!cliente.active) cliente.activate();
}

/**
 * Se suscribe a un tópico. Devuelve la función que cancela la suscripción; al quedar sin oyentes,
 * el tópico se deja de recibir.
 */
export function suscribir(destino: string, oyente: Oyente): () => void {
  activar();
  if (!oyentes.has(destino)) oyentes.set(destino, new Set());
  oyentes.get(destino)!.add(oyente);
  if (conectado) suscribirEnBroker(destino);
  return () => {
    const deDestino = oyentes.get(destino);
    deDestino?.delete(oyente);
    if (deDestino && deDestino.size === 0) {
      oyentes.delete(destino);
      suscripciones.get(destino)?.unsubscribe();
      suscripciones.delete(destino);
    }
  };
}

/** Avisa cada cambio de estado de la conexión; devuelve la función que deja de avisar. */
export function alCambiarConexion(oyente: OyenteConexion): () => void {
  activar();
  oyentesConexion.add(oyente);
  return () => oyentesConexion.delete(oyente);
}

export const estaConectado = () => conectado;
