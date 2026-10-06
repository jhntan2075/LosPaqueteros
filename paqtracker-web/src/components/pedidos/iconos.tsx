import React from 'react';
import type { IdAlmacen, TipoUnidad } from '../../config/dominio';
import type { NivelHolgura } from '../../types/pedidos';

import holguraRojo from '../../assets/figma/pedidos/holgura-rojo.svg';
import holguraAmbar from '../../assets/figma/pedidos/holgura-ambar.svg';
import holguraVerde from '../../assets/figma/pedidos/holgura-verde.svg';
import holguraNeutra from '../../assets/figma/pedidos/holgura-neutra.svg';
import depositoCentral from '../../assets/figma/pedidos/deposito-central.svg';
import depositoIntermedio from '../../assets/figma/pedidos/deposito-intermedio.svg';
import almacenIntermedio from '../../assets/figma/pedidos/almacen-intermedio.svg';
import almacenIntermedioRuta from '../../assets/figma/pedidos/almacen-intermedio-ruta.svg';
import iconoAuto from '../../assets/figma/pedidos/icono-auto.svg';
import iconoMoto from '../../assets/figma/pedidos/icono-moto.svg';
import iconoBici from '../../assets/figma/pedidos/icono-bici.svg';
import halo from '../../assets/figma/pedidos/halo.svg';
import destinoRiesgo from '../../assets/figma/pedidos/destino-riesgo.svg';
import destinoAmbar from '../../assets/figma/pedidos/destino-ambar.svg';

// Los SVG de Figma traen su tamaño intrínseco: se posicionan con left/top y nunca se
// les fuerza ancho ni alto.

const PUNTO_HOLGURA: Record<NivelHolgura, string> = {
  ROJO: holguraRojo,
  AMBAR: holguraAmbar,
  VERDE: holguraVerde,
  CERRADO: holguraNeutra,
};

/** Punto de 7 px del semáforo de holgura. */
export const PuntoHolgura: React.FC<{ nivel: NivelHolgura }> = ({ nivel }) => (
  <img src={PUNTO_HOLGURA[nivel]} alt="" className="block shrink-0" />
);

/**
 * Marcador de almacén de 40 × 40 centrado en el punto (cx, cy) del mapa. El Intermedio 2 usa
 * la variante en rojo (stock bajo) o, sobre una ruta, la variante en ámbar, como en el diseño.
 */
export const MarcadorAlmacen: React.FC<{ almacen: IdAlmacen; cx: number; cy: number; enRuta?: boolean }> = ({
  almacen,
  cx,
  cy,
  enRuta = false,
}) => (
  <div className="absolute size-[40px]" style={{ left: cx - 20, top: cy - 20 }}>
    {almacen === 'CENTRAL' && (
      <>
        <img src={depositoCentral} alt="" className="absolute block max-w-none left-[2px] top-[4px]" />
        <div className="absolute bg-white h-[10px] left-[16px] rounded-[1px] top-[23px] w-[8px]" />
      </>
    )}
    {almacen === 'INTERMEDIO_1' && (
      <>
        <img src={depositoIntermedio} alt="" className="absolute block max-w-none left-[5px] top-[7px]" />
        <div className="absolute bg-[#E2E8F0] h-[12px] left-[10px] rounded-[1px] top-[18px] w-[20px]" />
        <div className="absolute bg-[#15803D] h-[7.44px] left-[10px] rounded-[1px] top-[22.56px] w-[20px]" />
      </>
    )}
    {almacen === 'INTERMEDIO_2' && (
      <img src={enRuta ? almacenIntermedioRuta : almacenIntermedio} alt="" className="absolute block max-w-none inset-0" />
    )}
  </div>
);

/** Caja visible del ícono en Figma y desplazamiento del SVG (que incluye su sombra). */
const ICONO_VEHICULO: Record<TipoUnidad, { src: string; ancho: number; alto: number; dx: number; dy: number }> = {
  AUTO: { src: iconoAuto, ancho: 19.8, alto: 10, dx: 4.3, dy: 3.3 },
  MOTO: { src: iconoMoto, ancho: 20.79, alto: 11.06, dx: 4.3, dy: 3.3 },
  BICICLETA: { src: iconoBici, ancho: 21.45, alto: 13.04, dx: 4.3, dy: 3.3 },
};

/** Ícono de la unidad centrado en (cx, cy) dentro de un contenedor relativo. */
export const IconoVehiculo: React.FC<{ tipo: TipoUnidad; cx: number; cy: number }> = ({ tipo, cx, cy }) => {
  const { src, ancho, alto, dx, dy } = ICONO_VEHICULO[tipo];
  return (
    <img
      src={src}
      alt=""
      className="absolute block max-w-none"
      style={{ left: cx - ancho / 2 - dx, top: cy - alto / 2 - dy }}
    />
  );
};

/** Unidad en ruta: halo de 26 px centrado en el nodo, con el ícono ligeramente elevado como en el diseño. */
export const UnidadEnMapa: React.FC<{ tipo: TipoUnidad; cx: number; cy: number }> = ({ tipo, cx, cy }) => (
  <>
    <img src={halo} alt="" className="absolute block max-w-none" style={{ left: cx - 13, top: cy - 13 }} />
    <IconoVehiculo tipo={tipo} cx={cx + 1.4} cy={cy - 4.5} />
  </>
);

/** Pin de destino (caja de 18 × 24 en Figma) con la punta sobre (x, y). */
export const PinDestino: React.FC<{ variante: 'riesgo' | 'ambar'; x: number; y: number }> = ({ variante, x, y }) => (
  <img
    src={variante === 'riesgo' ? destinoRiesgo : destinoAmbar}
    alt=""
    className="absolute block max-w-none"
    style={{ left: x - 9 - 3.75, top: y - 24 - 2.75 }}
  />
);

/** Rótulo centrado en x, que se desplaza lo necesario para no salirse del ancho del mapa. */
export const RotuloMapa: React.FC<{ x: number; y: number; anchoMapa: number; className: string; children: React.ReactNode }> = ({
  x,
  y,
  anchoMapa,
  className,
  children,
}) => {
  const MEDIO_ANCHO_ESTIMADO = 40;
  const centro = Math.min(Math.max(x, MEDIO_ANCHO_ESTIMADO + 4), anchoMapa - MEDIO_ANCHO_ESTIMADO - 4);
  return (
    <p className={`absolute -translate-x-1/2 whitespace-nowrap text-[12px] ${className}`} style={{ left: centro, top: y }}>
      {children}
    </p>
  );
};
