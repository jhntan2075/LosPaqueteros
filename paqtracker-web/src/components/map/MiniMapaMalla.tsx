import React, { useRef } from 'react';
import { MALLA_ALTO_KM, MALLA_ANCHO_KM } from '../../config/dominio';
import { useTamanoElemento } from '../../hooks/useTamanoElemento';
import { pasoCuadricula, proyectar, vistaCompleta, vistaDeLimites, type Vista } from '../../lib/malla';
import type { Coordenada } from '../../types/domain';

// Vista fija (sin zoom ni arrastre) de la malla de 70 × 50 km, limitada a su contenedor: muestra la
// malla completa o encuadra un conjunto de nodos, sin deformarla ni dejar ver espacio fuera de ella.
// Las capas (marcadores, rutas) se dibujan con la vista que recibe la función hija, en px de
// pantalla, así conservan su tamaño sin importar la escala.

interface MiniMapaMallaProps {
  alto: number;
  /**
   * Espacio libre alrededor de la malla para que los marcadores de los bordes no se corten.
   * 40 px cubre el pin de destino (~27 px sobre su punta) y el marcador de almacén con su rótulo (~37 px bajo el nodo).
   */
  margen?: number;
  /** Nodos a encuadrar; si se omite, se muestra la malla completa. */
  encuadrar?: Coordenada[];
  etiqueta: string;
  children: (vista: Vista, tamano: { ancho: number; alto: number }) => React.ReactNode;
}

export const MiniMapaMalla: React.FC<MiniMapaMallaProps> = ({ alto, margen = 40, encuadrar, etiqueta, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const tamano = useTamanoElemento(ref);
  const listo = tamano.ancho > 0 && tamano.alto > 0;
  const lienzo = { ...tamano, margen };
  const vista = !listo ? null : encuadrar ? vistaDeLimites(encuadrar, lienzo) : vistaCompleta(lienzo);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={etiqueta}
      className="relative w-full shrink-0 bg-[#F1F5F9] border border-[#E2E8F0] rounded-[8px] overflow-hidden"
      style={{ height: alto }}
    >
      {vista && (
        <>
          <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
            <CuadriculaMalla vista={vista} />
          </svg>
          {children(vista, tamano)}
        </>
      )}
    </div>
  );
};

const CuadriculaMalla: React.FC<{ vista: Vista }> = ({ vista }) => {
  const paso = pasoCuadricula(vista.escala);
  const origen = proyectar(vista, { x: 0, y: 0 });
  const ancho = MALLA_ANCHO_KM * vista.escala;
  const alto = MALLA_ALTO_KM * vista.escala;
  return (
    <g>
      <rect x={origen.x} y={origen.y} width={ancho} height={alto} fill="#F8FAFC" />
      {Array.from({ length: Math.floor(MALLA_ANCHO_KM / paso) + 1 }, (_, i) => {
        const x = origen.x + i * paso * vista.escala;
        return <line key={`v${i}`} x1={x} y1={origen.y} x2={x} y2={origen.y + alto} stroke="#E2E8F0" strokeWidth="1" />;
      })}
      {Array.from({ length: Math.floor(MALLA_ALTO_KM / paso) + 1 }, (_, i) => {
        const y = origen.y + i * paso * vista.escala;
        return <line key={`h${i}`} x1={origen.x} y1={y} x2={origen.x + ancho} y2={y} stroke="#E2E8F0" strokeWidth="1" />;
      })}
      <rect x={origen.x} y={origen.y} width={ancho} height={alto} fill="none" stroke="#CBD5E1" strokeWidth="1" />
    </g>
  );
};

