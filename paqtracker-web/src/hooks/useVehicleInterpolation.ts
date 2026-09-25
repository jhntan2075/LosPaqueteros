import { useState, useEffect, useRef } from 'react';
import type { Camion, Coordenada } from '../types/domain';

export interface PosicionInterpolada {
  camionId: string;
  codigo: string;
  coordenada: Coordenada;
  progresoPorcentaje: number; // 0 a 100%
  enMovimiento: boolean;
}

/**
 * Hook para interpolar fluidamente la posición de los camiones entre saltos de tiempo Sc (QA-02, LE-064)
 * Evita saltos bruscos en el mapa calculando la posición intermedia según el reloj simulado actual.
 */
export function useVehicleInterpolation(
  camiones: Camion[],
  relojSimuladoMs: number
): Record<string, PosicionInterpolada> {
  const [posiciones, setPosiciones] = useState<Record<string, PosicionInterpolada>>({});
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const interpolar = () => {
      const nuevasPosiciones: Record<string, PosicionInterpolada> = {};

      camiones.forEach((camion) => {
        const tramo = camion.tramoEnCurso;

        if (!tramo || camion.estado !== 'EN_RUTA') {
          // Si no está en ruta o no tiene tramo, permanece en su ubicación fija
          nuevasPosiciones[camion.id] = {
            camionId: camion.id,
            codigo: camion.codigo,
            coordenada: camion.ubicacionActual,
            progresoPorcentaje: 0,
            enMovimiento: false,
          };
          return;
        }

        const { origen, destino, tiempoSalidaSimulado, tiempoLlegadaEstimado } = tramo;
        const duracionTotal = tiempoLlegadaEstimado - tiempoSalidaSimulado;

        if (duracionTotal <= 0 || relojSimuladoMs < tiempoSalidaSimulado) {
          nuevasPosiciones[camion.id] = {
            camionId: camion.id,
            codigo: camion.codigo,
            coordenada: origen,
            progresoPorcentaje: 0,
            enMovimiento: false,
          };
          return;
        }

        if (relojSimuladoMs >= tiempoLlegadaEstimado) {
          nuevasPosiciones[camion.id] = {
            camionId: camion.id,
            codigo: camion.codigo,
            coordenada: destino,
            progresoPorcentaje: 100,
            enMovimiento: false,
          };
          return;
        }

        // Fracción normalizada de avance [0.0, 1.0]
        const fraccion = (relojSimuladoMs - tiempoSalidaSimulado) / duracionTotal;
        const xInterpolado = origen.x + (destino.x - origen.x) * fraccion;
        const yInterpolado = origen.y + (destino.y - origen.y) * fraccion;

        nuevasPosiciones[camion.id] = {
          camionId: camion.id,
          codigo: camion.codigo,
          coordenada: { x: xInterpolado, y: yInterpolado },
          progresoPorcentaje: Math.round(fraccion * 100),
          enMovimiento: true,
        };
      });

      setPosiciones(nuevasPosiciones);
    };

    animationFrameId.current = requestAnimationFrame(interpolar);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [camiones, relojSimuladoMs]);

  return posiciones;
}
