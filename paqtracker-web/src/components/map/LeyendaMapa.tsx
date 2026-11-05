import React from 'react';
import { X } from 'lucide-react';
import { ALERTA_STOCK_BAJO, NOMBRE_CARGA, RANGO_HOLGURA, RANGO_OCUPACION, RANGO_STOCK } from '../../config/glosario';
import { NIVELES_CARGA } from '../../lib/semaforo';
import { CAPAS, type Capa } from './capas';
import { iconoVehiculo } from './iconosVehiculo';
import {
  AlmacenCentral,
  AlmacenIntermedio,
  COLOR_EN_ENTREGA,
  InsigniaStockBajo,
  MarcaBloqueo,
  MarcaSemaforo,
  PinDestino,
} from './simbolos';

// Capas y leyenda del mapa: panel flotante y no modal, para usarlo sin dejar de ver el mapa. Qué capas
// se dibujan (rutas, unidades, destinos, bloqueos, almacenes) y qué es cada símbolo; el detalle de cada
// objeto está en su tooltip y en el panel lateral.

const ROJO = '#B91C1C';
const VERDE = '#15803D';
const GRIS = '#64748B';

/**
 * Símbolo SVG en una caja fija de 28 × 22: `caja` es el rectángulo del símbolo (con su sombra) y se
 * escala para caber, así todos los íconos quedan de una altura parecida y alineados en columna.
 */
const Simbolo: React.FC<{ caja: string; children: React.ReactNode }> = ({ caja, children }) => (
  <svg width="28" height="22" viewBox={caja} className="block overflow-visible" aria-hidden="true">
    {children}
  </svg>
);

const IconoUnidad: React.FC<{ tipo: 'AUTO' | 'MOTO' | 'BICICLETA'; hueco?: boolean }> = ({ tipo, hueco = false }) => {
  const icono = iconoVehiculo(tipo, GRIS, hueco);
  return <img src={icono.href} alt="" width={icono.ancho} height={icono.alto} className="block max-w-none" />;
};

/** Fila de símbolo: columna de ícono de ancho fijo, nombre y, opcional, qué codifica en gris. */
const Fila: React.FC<{ simbolo: React.ReactNode; nombre: string; detalle?: string }> = ({ simbolo, nombre, detalle }) => (
  <li className="grid grid-cols-[28px_1fr] items-center gap-x-[10px] h-[26px]">
    <span className="h-[22px] flex items-center justify-center">{simbolo}</span>
    <span className="text-[12px] text-[#0F172A] truncate">
      {nombre}
      {detalle && <span className="text-[#64748B]"> · {detalle}</span>}
    </span>
  </li>
);

const NIVELES_HOLGURA: ('ROJO' | 'AMBAR' | 'VERDE')[] = ['ROJO', 'AMBAR', 'VERDE'];

interface LeyendaMapaProps {
  onCerrar: () => void;
  /** Qué capas se dibujan; sin valor (o sin onCambiarCapa), el panel no muestra la sección de capas. */
  capas?: Record<Capa, boolean>;
  onCambiarCapa?: (clave: Capa) => void;
}

export const LeyendaMapa: React.FC<LeyendaMapaProps> = ({ onCerrar, capas, onCambiarCapa }) => (
  <section
    aria-label="Capas y leyenda"
    data-sin-zoom
    onPointerDown={(e) => e.stopPropagation()}
    className="w-[280px] max-h-[calc(100vh-260px)] overflow-y-auto bg-white border border-[#E2E8F0] rounded-[10px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.16)] leading-[normal] cursor-default"
  >
    <header className="h-[36px] pl-[12px] pr-[8px] flex items-center border-b border-[#E2E8F0]">
      <h2 className="font-semibold text-[13px] text-[#0F172A]">Capas y leyenda</h2>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar capas y leyenda"
        className="ml-auto size-[24px] flex items-center justify-center rounded text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </header>

    {capas && onCambiarCapa && (
      <fieldset className="px-[12px] py-[8px] border-b border-[#E2E8F0] flex flex-col gap-[2px]">
        <legend className="sr-only">Capas visibles</legend>
        {CAPAS.map(({ clave, etiqueta }) => (
          <label key={clave} className="flex items-center gap-[8px] py-[2px] text-[12px] font-sans text-[#0F172A] cursor-pointer">
            <input type="checkbox" checked={capas[clave]} onChange={() => onCambiarCapa(clave)} className="accent-[#1E40AF]" />
            {etiqueta}
          </label>
        ))}
      </fieldset>
    )}

    <ul className="px-[12px] py-[8px]">
      <Fila simbolo={<Simbolo caja="-16 -16 32 32"><AlmacenCentral /></Simbolo>} nombre="Almacén central" />
      <Fila
        simbolo={<Simbolo caja="-14 -14 28 28"><AlmacenIntermedio color={VERDE} fraccionStock={0.6} /></Simbolo>}
        nombre="Almacén intermedio"
        detalle="barra = stock"
      />
      <Fila
        simbolo={
          <Simbolo caja="-14 -14 28 28">
            <AlmacenIntermedio color={GRIS} fraccionStock={0.1} />
            <g transform="translate(11, -10)">
              <InsigniaStockBajo />
            </g>
          </Simbolo>
        }
        nombre={ALERTA_STOCK_BAJO}
      />
      <Fila simbolo={<IconoUnidad tipo="AUTO" />} nombre="Auto" detalle="color = carga" />
      <Fila simbolo={<IconoUnidad tipo="MOTO" />} nombre="Moto" />
      <Fila simbolo={<IconoUnidad tipo="BICICLETA" />} nombre="Bicicleta" />
      <Fila simbolo={<IconoUnidad tipo="AUTO" hueco />} nombre="Unidad vacía" detalle="ícono hueco" />
      <Fila simbolo={<Simbolo caja="-14 -27 28 29"><PinDestino color={VERDE} /></Simbolo>} nombre="Destino" detalle="color = holgura" />
      <Fila simbolo={<Simbolo caja="-14 -27 28 29"><PinDestino color={ROJO} critico /></Simbolo>} nombre="Destino crítico" />
      <Fila simbolo={<Simbolo caja="-14 -27 28 29"><PinDestino color={COLOR_EN_ENTREGA} /></Simbolo>} nombre="Entregando ahora" detalle="la unidad está en el destino" />
      <Fila
        simbolo={<Simbolo caja="-14 -11 28 22"><line x1="-12" y1="0" x2="12" y2="0" stroke="#9EABBA" strokeWidth="2" /></Simbolo>}
        nombre="Tramo recorrido"
      />
      <Fila
        simbolo={
          <Simbolo caja="-14 -11 28 22">
            <line x1="-12" y1="0" x2="12" y2="0" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="6 4" />
          </Simbolo>
        }
        nombre="Tramo pendiente"
      />
      <Fila simbolo={<Simbolo caja="-14 -11 28 22"><MarcaBloqueo /></Simbolo>} nombre="Tramo bloqueado" />
    </ul>

    <div className="px-[12px] pt-[10px] pb-[12px] border-t border-[#E2E8F0] flex flex-col gap-[10px]">
      <table className="w-full text-[12px] tabular-nums">
        <caption className="text-left font-semibold text-[12px] text-[#0F172A] pb-[4px]">Semáforo de carga y stock</caption>
        <thead>
          <tr className="text-[11px] text-[#64748B]">
            <th scope="col" className="text-left font-normal pb-[2px]">Nivel</th>
            <th scope="col" className="text-right font-normal pb-[2px]">Unidad</th>
            <th scope="col" className="text-right font-normal pb-[2px]">Almacén</th>
          </tr>
        </thead>
        <tbody>
          {NIVELES_CARGA.map((nivel) => (
            <tr key={nivel} className="h-[20px] text-[#0F172A]">
              <th scope="row" className="text-left font-normal">
                <span className="flex items-center gap-[6px] whitespace-nowrap">
                  <MarcaSemaforo nivel={nivel} />
                  {NOMBRE_CARGA[nivel]}
                </span>
              </th>
              <td className="text-right whitespace-nowrap">{RANGO_OCUPACION[nivel]}</td>
              <td className="text-right whitespace-nowrap">{RANGO_STOCK[nivel]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid grid-cols-[52px_repeat(3,minmax(0,1fr))] gap-x-[8px] items-center text-[12px]">
        <span className="text-[#64748B]">Holgura</span>
        {NIVELES_HOLGURA.map((nivel) => (
          <span key={nivel} className="flex items-center gap-[4px] whitespace-nowrap tabular-nums text-[#0F172A]">
            <MarcaSemaforo nivel={nivel} />
            {RANGO_HOLGURA[nivel]}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-[#64748B]">La forma también indica el nivel, no solo el color.</p>
    </div>
  </section>
);
