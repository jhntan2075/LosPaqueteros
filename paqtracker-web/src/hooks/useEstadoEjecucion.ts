import { useEffect, useState } from 'react';
import { ErrorDeApi, clienteApi } from '../services/clienteApi';
import { combinarEventos } from '../lib/eventos';
import { alCambiarConexion, suscribir } from '../services/clienteStomp';
import type { MensajeEstadoApi, MensajeEventoApi } from '../types/api';

// Estado en vivo de una ejecución: al montarse pide la última instantánea por REST (quien se conecta
// tarde ve el estado actual de inmediato) y luego se suscribe a los tópicos de estado y eventos de esa
// ejecución. Sin polling: las actualizaciones llegan solo por STOMP. El historial de eventos se pide por
// REST al abrir, al reconectar el socket y al volver a la pestaña (el tópico no re-envía lo ya publicado).

export interface EstadoEjecucion {
  mensaje: MensajeEstadoApi | null;
  /** Instante real (Date.now) en que llegó la instantánea, para interpolar desde ahí. */
  recibidoEnMs: number;
  /** Historial cargado más los eventos recibidos en vivo, el más reciente primero. */
  eventos: MensajeEventoApi[];
  error: string | null;
}

const INICIAL: EstadoEjecucion = { mensaje: null, recibidoEnMs: 0, eventos: [], error: null };

/** Estado guardado junto con la ejecución a la que pertenece: al cambiar de ejecución se descarta solo. */
type EstadoDe = EstadoEjecucion & { ejecucionId: string | null };

export function useEstadoEjecucion(ejecucionId: string | null): EstadoEjecucion {
  const [guardado, setEstado] = useState<EstadoDe>({ ...INICIAL, ejecucionId: null });

  useEffect(() => {
    if (!ejecucionId) return undefined;
    // Las actualizaciones de una ejecución anterior se descartan; la primera de la nueva parte de cero.
    const deEsta = (previo: EstadoDe): EstadoDe => (previo.ejecucionId === ejecucionId ? previo : { ...INICIAL, ejecucionId });
    let vigente = true;

    // Una instantánea más vieja que la vigente (p. ej. la respuesta REST llega después de un
    // mensaje STOMP) se descarta.
    const aplicar = (mensaje: MensajeEstadoApi) => {
      if (!vigente) return;
      setEstado((anterior) => {
        const previo = deEsta(anterior);
        return previo.mensaje && previo.mensaje.pasoSc > mensaje.pasoSc ? previo : { ...previo, mensaje, recibidoEnMs: Date.now(), error: null };
      });
    };

    clienteApi
      .estado(ejecucionId)
      .then(aplicar)
      .catch((error: unknown) => {
        if (!vigente) return;
        const texto = error instanceof ErrorDeApi ? error.message : 'No se pudo obtener el estado';
        setEstado((anterior) => ({ ...deEsta(anterior), error: texto }));
      });

    // Mezcla con lo que ya llegó por STOMP: una respuesta tardía no descarta eventos en vivo.
    const cargarHistorial = () => {
      clienteApi
        .eventos(ejecucionId)
        .then((historial) => {
          if (!vigente) return;
          setEstado((anterior) => {
            const previo = deEsta(anterior);
            return { ...previo, eventos: combinarEventos(previo.eventos, historial) };
          });
        })
        .catch(() => {
          // Sin historial la actividad sigue mostrando lo que llega en vivo; el próximo intento lo recupera.
        });
    };
    cargarHistorial();
    const cancelarConexion = alCambiarConexion((conectado) => {
      if (conectado) cargarHistorial();
    });
    const alVolverAVer = () => {
      if (document.visibilityState === 'visible') cargarHistorial();
    };
    document.addEventListener('visibilitychange', alVolverAVer);

    const cancelarEstado = suscribir(`/topic/ejecuciones/${ejecucionId}/estado`, (cuerpo) => aplicar(cuerpo as MensajeEstadoApi));
    const cancelarEventos = suscribir(`/topic/ejecuciones/${ejecucionId}/eventos`, (cuerpo) => {
      if (!vigente) return;
      setEstado((anterior) => {
        const previo = deEsta(anterior);
        return { ...previo, eventos: combinarEventos(previo.eventos, [cuerpo as MensajeEventoApi]) };
      });
    });

    return () => {
      vigente = false;
      cancelarEstado();
      cancelarConexion();
      document.removeEventListener('visibilitychange', alVolverAVer);
      cancelarEventos();
    };
  }, [ejecucionId]);

  return guardado.ejecucionId === ejecucionId ? guardado : INICIAL;
}
