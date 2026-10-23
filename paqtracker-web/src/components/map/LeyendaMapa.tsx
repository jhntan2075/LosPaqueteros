import React from 'react';
import { X } from 'lucide-react';
import { RANGO_HOLGURA, RANGO_INVENTARIO, RANGO_OCUPACION } from '../../config/glosario';
import { ATENCION, CRITICO, NEUTRO, OK } from '../../config/colores';
import { iconoVehiculo } from './iconosVehiculo';
import { AlmacenCentral, AlmacenIntermedio, MarcaBloqueo, PinDestino } from './simbolos';
import { Tarjeta } from '../ui/Tarjeta';

// Leyenda del mapa: panel flotante y no modal, para leerla sin dejar de ver el mapa. Solo dice qué
// es cada símbolo; el detalle de cada objeto está en su tooltip y en el panel lateral.

const ROJO = CRITICO;
const AMBAR = ATENCION;
const VERDE = OK;
const GRIS = NEUTRO[500];

type Nivel = 'ROJO' | 'AMBAR' | 'VERDE';

/**
 * Símbolo SVG en una caja fija de 28 × 22: `caja` es el rectángulo del símbolo (con su sombra) y se
 * escala para caber, así todos los íconos quedan de una altura parecida y alineados en columna.
 */
const Simbolo: React.FC<{ caja: string; children: React.ReactNode }> = ({ caja, children }) => (
  <svg width="28" height="22" viewBox={caja} className="block overflow-visible" aria-hidden="true">
    {children}
  </svg>
);

const IconoUnidad: React.FC<{ tipo: 'AUTO' | 'MOTO' | 'BICICLETA' }> = ({ tipo }) => {
  const icono = iconoVehiculo(tipo, GRIS);
  return <img src={icono.href} alt="" width={icono.ancho} height={icono.alto} className="block max-w-none" />;
};

/** Fila de símbolo: columna de ícono de ancho fijo, nombre y, opcional, qué codifica en gris. */
const Fila: React.FC<{ simbolo: React.ReactNode; nombre: string; detalle?: string }> = ({ simbolo, nombre, detalle }) => (
  <li className="grid grid-cols-[28px_1fr] items-center gap-x-[10px] h-[26px]">
    <span className="h-[22px] flex items-center justify-center">{simbolo}</span>
    <span className="text-body text-neutral-900 truncate">
      {nombre}
      {detalle && <span className="text-neutral-500"> · {detalle}</span>}
    </span>
  </li>
);

/** Marca del semáforo: la forma también distingue el nivel (círculo, triángulo, cuadrado). */
const Marca: React.FC<{ nivel: Nivel }> = ({ nivel }) => (
  <svg width="9" height="9" viewBox="0 0 9 9" className="shrink-0" aria-hidden="true">
    {nivel === 'ROJO' && <circle cx="4.5" cy="4.5" r="4" fill={ROJO} />}
    {nivel === 'AMBAR' && <path d="M4.5 0.5L8.6 8H0.4L4.5 0.5Z" fill={AMBAR} />}
    {nivel === 'VERDE' && <rect x="0.5" y="0.5" width="8" height="8" rx="1" fill={VERDE} />}
  </svg>
);

/** Columnas en el mismo orden en las tres filas (rojo, ámbar, verde): cada forma queda alineada. */
const NIVELES: Nivel[] = ['ROJO', 'AMBAR', 'VERDE'];
const SEMAFOROS: { titulo: string; rangos: Record<Nivel, string> }[] = [
  { titulo: 'Holgura', rangos: RANGO_HOLGURA },
  { titulo: 'Carga', rangos: RANGO_OCUPACION },
  { titulo: 'Stock', rangos: RANGO_INVENTARIO },
];

export const LeyendaMapa: React.FC<{ onCerrar: () => void }> = ({ onCerrar }) => (
  <Tarjeta como="section" elevada className="w-[280px] max-h-[calc(100vh-260px)] overflow-y-auto leading-[normal] cursor-default"
    aria-label="Leyenda del mapa"
    data-sin-zoom
    onPointerDown={(e) => e.stopPropagation()}
   
  >
    <header className="h-[36px] pl-[12px] pr-[8px] flex items-center border-b border-neutral-200">
      <h2 className="font-semibold text-body-lg text-neutral-900">Leyenda</h2>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar leyenda"
        className="ml-auto size-[24px] flex items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </header>

    <ul className="px-[12px] py-[8px]">
      <Fila simbolo={<Simbolo caja="-16 -16 32 32"><AlmacenCentral /></Simbolo>} nombre="Almacén central" />
      <Fila
        simbolo={<Simbolo caja="-14 -14 28 28"><AlmacenIntermedio color={VERDE} fraccionStock={0.6} /></Simbolo>}
        nombre="Almacén intermedio"
        detalle="barra = stock"
      />
      <Fila simbolo={<IconoUnidad tipo="AUTO" />} nombre="Auto" detalle="color = carga" />
      <Fila simbolo={<IconoUnidad tipo="MOTO" />} nombre="Moto" />
      <Fila simbolo={<IconoUnidad tipo="BICICLETA" />} nombre="Bicicleta" />
      <Fila simbolo={<Simbolo caja="-14 -27 28 29"><PinDestino color={VERDE} /></Simbolo>} nombre="Destino" detalle="color = holgura" />
      <Fila simbolo={<Simbolo caja="-14 -27 28 29"><PinDestino color={ROJO} critico /></Simbolo>} nombre="Destino crítico" />
      <Fila
        simbolo={<Simbolo caja="-14 -11 28 22"><line x1="-12" y1="0" x2="12" y2="0" stroke={NEUTRO[300]} strokeWidth="2" /></Simbolo>}
        nombre="Tramo recorrido"
      />
      <Fila
        simbolo={
          <Simbolo caja="-14 -11 28 22">
            <line x1="-12" y1="0" x2="12" y2="0" stroke={NEUTRO[400]} strokeWidth="2.5" strokeDasharray="6 4" />
          </Simbolo>
        }
        nombre="Tramo pendiente"
      />
      <Fila simbolo={<Simbolo caja="-14 -11 28 22"><MarcaBloqueo /></Simbolo>} nombre="Tramo bloqueado" />
    </ul>

    <div className="px-[12px] pt-[10px] pb-[12px] border-t border-neutral-200">
      <div className="grid grid-cols-[52px_repeat(3,minmax(0,1fr))] gap-x-[8px] gap-y-[6px] items-center text-body">
        {SEMAFOROS.map(({ titulo, rangos }) => (
          <React.Fragment key={titulo}>
            <span className="text-neutral-500">{titulo}</span>
            {NIVELES.map((nivel) => (
              <span key={nivel} className="flex items-center gap-[4px] whitespace-nowrap tabular-nums text-neutral-900">
                <Marca nivel={nivel} />
                {rangos[nivel]}
              </span>
            ))}
          </React.Fragment>
        ))}
      </div>
      <p className="mt-[8px] text-caption text-neutral-500">La forma también indica el nivel, no solo el color.</p>
    </div>
  </Tarjeta>
);
