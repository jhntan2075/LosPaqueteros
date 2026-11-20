import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  alertaStockBajo,
  NOMBRE_CARGA,
  NOMBRE_STOCK,
  RANGO_HOLGURA,
  RANGO_OCUPACION,
  RANGO_STOCK,
  SIMBOLO_AVERIA,
  SIMBOLO_BLOQUEO,
  nombreAveria,
} from '../../config/glosario';
import { useRangosSemaforo } from '../../hooks/useRangosSemaforo';
import { NIVELES_CARGA } from '../../lib/semaforo';
import { CAPAS, type Capa } from './capas';
import { Boton } from '../ui';
import { DialogoRangosSemaforo } from './DialogoRangosSemaforo';
import { iconoVehiculo } from './iconosVehiculo';
import {
  AlmacenCentral,
  AlmacenIntermedio,
  COLOR_EN_ENTREGA,
  InsigniaAveria,
  InsigniaStockBajo,
  LineaBloqueo,
  MarcaBloqueo,
  MarcadorDestino,
  MarcaSemaforo,
} from './simbolos';

// Capas y leyenda del mapa, desplegadas dentro de la columna de controles (o sueltas, con su botón de
// cerrar, si se pasa onCerrar): se usan sin dejar de ver el mapa. Qué capas
// se dibujan (rutas, unidades, destinos, bloqueos, almacenes) y qué es cada símbolo; el detalle de cada
// objeto está en su tooltip y en el panel lateral.

const ROJO = '#B91C1C';
const VERDE = '#15803D';
const AMBAR = '#B45309';
const GRIS = '#64748B';

/**
 * Símbolo SVG en una caja fija de 28 × 22: `caja` es el rectángulo del símbolo (con su sombra) y se
 * escala para caber, así todos los íconos quedan de una altura parecida y alineados en columna.
 */
const Simbolo: React.FC<{ caja: string; children: React.ReactNode }> = ({ caja, children }) => (
  <svg width="28" height="22" viewBox={caja} className="lienzo-mapa block overflow-visible" aria-hidden="true">
    {children}
  </svg>
);

const IconoUnidad: React.FC<{ tipo: 'AUTO' | 'MOTO' | 'BICICLETA'; hueco?: boolean }> = ({ tipo, hueco = false }) => {
  const icono = iconoVehiculo(tipo, GRIS, hueco);
  return <img src={icono.href} alt="" width={icono.ancho} height={icono.alto} className="block max-w-none" />;
};

/** Fila de símbolo: columna de ícono de ancho fijo, nombre y, opcional, qué codifica en gris. */
const Fila: React.FC<{ simbolo: React.ReactNode; nombre: string; detalle?: string }> = ({ simbolo, nombre, detalle }) => (
  <li className="grid grid-cols-[28px_1fr] items-center gap-x-2.5 h-[26px]">
    <span className="h-[22px] flex items-center justify-center">{simbolo}</span>
    <span className="text-body-sm text-neutral-900 truncate">
      {nombre}
      {detalle && <span className="text-neutral-600"> · {detalle}</span>}
    </span>
  </li>
);

const NIVELES_HOLGURA: ('ROJO' | 'AMBAR' | 'VERDE')[] = ['ROJO', 'AMBAR', 'VERDE'];

interface LeyendaMapaProps {
  /** Con valor, la leyenda lleva encabezado y botón de cerrar (uso suelto); en la columna no hace falta. */
  onCerrar?: () => void;
  /** Qué capas se dibujan; sin valor (o sin onCambiarCapa), el panel no muestra la sección de capas. */
  capas?: Record<Capa, boolean>;
  onCambiarCapa?: (clave: Capa) => void;
}

export const LeyendaMapa: React.FC<LeyendaMapaProps> = ({ onCerrar, capas, onCambiarCapa }) => {
  const [configurando, setConfigurando] = useState(false);
  // Suscrita a los rangos: al guardarlos, la tabla de abajo muestra los nuevos sin esperar a la raíz.
  useRangosSemaforo();
  return (
  <section aria-label="Capas y leyenda" className="cursor-default">
    {onCerrar && (
    <header className="h-9 pl-3 pr-2 flex items-center border-b border-neutral-200">
      <h2 className="font-semibold text-body text-neutral-900">Capas y leyenda</h2>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar capas y leyenda"
        className="ml-auto size-6 flex items-center justify-center rounded-control text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
      >
        <X className="size-3.5" />
      </button>
    </header>
    )}

    {capas && onCambiarCapa && (
      <fieldset className="py-2 border-b border-neutral-200 flex flex-col gap-0.5">
        <legend className="sr-only">Capas visibles</legend>
        {CAPAS.map(({ clave, etiqueta }) => (
          <label key={clave} className="flex items-center gap-2 py-0.5 text-body-sm font-sans text-neutral-900 cursor-pointer">
            <input type="checkbox" checked={capas[clave]} onChange={() => onCambiarCapa(clave)} className="accent-primary-600" />
            {etiqueta}
          </label>
        ))}
      </fieldset>
    )}

    <ul className="py-2">
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
        nombre={alertaStockBajo()}
      />
      <Fila simbolo={<IconoUnidad tipo="AUTO" />} nombre="Auto" detalle="color = carga" />
      <Fila simbolo={<IconoUnidad tipo="MOTO" />} nombre="Moto" />
      <Fila simbolo={<IconoUnidad tipo="BICICLETA" />} nombre="Bicicleta" />
      <Fila simbolo={<IconoUnidad tipo="AUTO" hueco />} nombre="Unidad vacía" detalle="ícono hueco" />
      {([1, 2, 3] as const).map((tipo) => (
        <Fila
          key={tipo}
          simbolo={
            <Simbolo caja="-12 -12 24 24">
              <InsigniaAveria tipo={tipo} restante={0.65} />
            </Simbolo>
          }
          nombre={`Avería ${nombreAveria(tipo).toLowerCase()}`}
          detalle={tipo === 1 ? `${SIMBOLO_AVERIA[tipo]}; anillo = lo que falta` : SIMBOLO_AVERIA[tipo]}
        />
      ))}
      <Fila simbolo={<Simbolo caja="-14 -11 28 22"><MarcadorDestino variante="VERDE" color={VERDE} /></Simbolo>} nombre="Destino a tiempo" detalle="anillo hueco" />
      <Fila simbolo={<Simbolo caja="-14 -11 28 22"><MarcadorDestino variante="AMBAR" color={AMBAR} /></Simbolo>} nombre="Destino en alerta" />
      <Fila simbolo={<Simbolo caja="-14 -11 28 22"><MarcadorDestino variante="ROJO" color={ROJO} /></Simbolo>} nombre="Destino crítico" detalle="más grande, con «!»" />
      <Fila simbolo={<Simbolo caja="-14 -11 28 22"><MarcadorDestino variante="ENTREGA" color={COLOR_EN_ENTREGA} /></Simbolo>} nombre="Entregando ahora" detalle="la unidad está en el destino" />
      <Fila
        simbolo={<Simbolo caja="-14 -11 28 22"><line x1="-12" y1="0" x2="12" y2="0" stroke="#9EABBA" strokeWidth="1.5" strokeOpacity={0.4} /></Simbolo>}
        nombre="Tramo recorrido"
      />
      <Fila
        simbolo={
          <Simbolo caja="-14 -11 28 22">
            <line x1="-12" y1="0" x2="12" y2="0" stroke="#94A3B8" strokeWidth="2" strokeOpacity={0.55} strokeDasharray="6 4" />
          </Simbolo>
        }
        nombre="Tramo pendiente"
      />
      <Fila
        simbolo={
          <Simbolo caja="-14 -11 28 22">
            <LineaBloqueo />
            <MarcaBloqueo />
          </Simbolo>
        }
        nombre="Tramo bloqueado"
        detalle={SIMBOLO_BLOQUEO}
      />
    </ul>

    <div className="pt-2.5 pb-1 border-t border-neutral-200 flex flex-col gap-2.5">
      <table className="w-full text-body-sm tabular-nums">
        <caption className="text-left font-semibold text-body-sm text-neutral-900 pb-1">Semáforo de carga y stock</caption>
        <thead>
          <tr className="text-caption text-neutral-600">
            <th scope="col" className="text-left font-normal pb-0.5">
              <span className="sr-only">Color</span>
            </th>
            <th scope="col" className="text-left font-normal pb-0.5">Unidad (carga)</th>
            <th scope="col" className="text-left font-normal pb-0.5">Almacén (stock)</th>
          </tr>
        </thead>
        <tbody>
          {/* El mismo color se lee distinto: en la unidad rojo = casi llena; en el almacén rojo = stock bajo. */}
          {NIVELES_CARGA.map((nivel) => (
            <tr key={nivel} className="h-5 text-neutral-900 align-top">
              <th scope="row" className="text-left font-normal pr-1.5">
                <MarcaSemaforo nivel={nivel} titulo={nivel === 'VACIO' ? 'Vacío' : nivel === 'VERDE' ? 'Verde' : nivel === 'AMBAR' ? 'Ámbar' : 'Rojo'} />
              </th>
              <td className="text-left pr-2">
                {NOMBRE_CARGA[nivel]} <span className="text-neutral-600 whitespace-nowrap">{RANGO_OCUPACION[nivel]}</span>
              </td>
              <td className="text-left">
                {NOMBRE_STOCK[nivel]} <span className="text-neutral-600 whitespace-nowrap">{RANGO_STOCK[nivel]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid grid-cols-[52px_repeat(3,minmax(0,1fr))] gap-x-2 items-center text-body-sm">
        <span className="text-neutral-600">Holgura</span>
        {NIVELES_HOLGURA.map((nivel) => (
          <span key={nivel} className="flex items-center gap-1 whitespace-nowrap tabular-nums text-neutral-900">
            <MarcaSemaforo nivel={nivel} />
            {RANGO_HOLGURA[nivel]}
          </span>
        ))}
      </div>
      <p className="text-caption text-neutral-600">La forma también indica el nivel, no solo el color.</p>
      <Boton tamano="sm" variante="secundario" onClick={() => setConfigurando(true)} className="self-start">
        Configurar rangos
      </Boton>
    </div>
    {/* En un portal: la leyenda tiene scroll propio y el diálogo debe cubrir toda la pantalla. */}
    {configurando && createPortal(<DialogoRangosSemaforo onCerrar={() => setConfigurando(false)} />, document.body)}
  </section>
  );
};
