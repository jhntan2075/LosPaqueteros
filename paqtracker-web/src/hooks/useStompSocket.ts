import { useEffect, useRef, useState, useCallback } from 'react';
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';

export interface UseStompSocketOptions {
  brokerURL?: string;
  debug?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * Hook para gestionar la conexión persistente WebSocket vía STOMP (DA-04, §4.2, §4.3)
 * En desarrollo, se conecta a ws://localhost:5173/ws (redireccionado por Vite hacia 127.0.0.1:3000)
 * En producción, se conecta a wss://[dominio]/ws (gestionado por Nginx)
 */
export function useStompSocket(options: UseStompSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const clientRef = useRef<Client | null>(null);

  // Determinar la URL por defecto según el entorno
  const getDefaultBrokerURL = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  };

  const brokerURL = options.brokerURL || getDefaultBrokerURL();

  useEffect(() => {
    const client = new Client({
      brokerURL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: options.debug ? (str) => console.log('[STOMP]', str) : undefined,
      onConnect: () => {
        setIsConnected(true);
        options.onConnect?.();
      },
      onDisconnect: () => {
        setIsConnected(false);
        options.onDisconnect?.();
      },
      onStompError: (frame) => {
        console.error('[STOMP Error]', frame.headers['message'], frame.body);
        options.onError?.(frame);
      },
      onWebSocketError: (event) => {
        console.error('[WebSocket Error]', event);
        options.onError?.(event);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (client.active) {
        client.deactivate();
      }
      setIsConnected(false);
    };
  }, [brokerURL]);

  /**
   * Suscribirse a un tópico específico
   */
  const subscribe = useCallback(
    <T>(destination: string, callback: (data: T) => void): (() => void) => {
      if (!clientRef.current || !clientRef.current.connected) {
        console.warn(`[STOMP] Intentando suscribirse a ${destination} sin conexión activa.`);
      }

      let sub: StompSubscription | null = null;

      const performSubscription = () => {
        if (clientRef.current && clientRef.current.connected) {
          sub = clientRef.current.subscribe(destination, (message: IMessage) => {
            try {
              const parsed: T = JSON.parse(message.body);
              callback(parsed);
            } catch (err) {
              console.error(`[STOMP] Error al parsear mensaje de ${destination}:`, err);
            }
          });
        }
      };

      if (clientRef.current?.connected) {
        performSubscription();
      }

      return () => {
        if (sub) {
          sub.unsubscribe();
        }
      };
    },
    []
  );

  return {
    isConnected,
    subscribe,
    stompClient: clientRef.current,
  };
}
