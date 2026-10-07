import React from 'react';
import { PuntoHolgura } from '../pedidos/iconos';
import type { ResumenPedidos } from '../../types/operacion';
import { formatearMiles } from '../../lib/formato';

import trianguloAmbar from '../../assets/figma/pedidos/holgura-ambar-triangulo.svg';

// Fila de KPIs de 96 px de Operación (Figma 1:1213): seis fichas que reparten el ancho.

interface FichaProps {
  titulo: string;
  valor: React.ReactNode;
  linea1: string;
  linea2: string;
  onClick?: () => void;
  ayuda?: string;
}

const Ficha: React.FC<FichaProps> = ({ titulo, valor, linea1, linea2, onClick, ayuda }) => {
  const contenido = (
    <>
      <span className="font-sans text-[12px] text-[#64748B] truncate">{titulo}</span>
      <span className="flex items-center gap-[6px] font-mono font-semibold text-[20px] leading-[1.1] text-[#0F172A]">{valor}</span>
      <span className="font-sans text-[12px] text-[#64748B] truncate">{linea1}</span>
      <span className="font-sans text-[12px] text-[#94A3B8] truncate">{linea2}</span>
    </>
  );
  const clases = 'flex-1 min-w-0 bg-white border border-[#E2E8F0] rounded-[4px] px-[12px] py-[5px] flex flex-col gap-0 items-start text-left overflow-hidden leading-[normal]';
  return onClick ? (
    <button type="button" onClick={onClick} title={ayuda} className={`${clases} hover:border-[#1E40AF] focus-visible:border-[#1E40AF] transition`}>
      {contenido}
    </button>
  ) : (
    <div className={clases}>{contenido}</div>
  );
};

interface RailKpisProps {
  resumen: ResumenPedidos;
  riesgo: { rojo: number; ambar: number; holguraMinima: string };
  flota: { enRuta: number; total: number; disponibles: number; averiadas: number; porTipo: { tipo: string; enRuta: number }[] };
  onVerFlota?: () => void;
  onVerIncidencias?: () => void;
  /** Segunda línea de "Saturación del sistema" (p. ej. cuándo superó el quiebre en una corrida). */
  notaSaturacion?: string;
}

export const RailKpis: React.FC<RailKpisProps> = ({ resumen, riesgo, flota, onVerFlota, onVerIncidencias, notaSaturacion }) => {
  const quiebre = resumen.saturacion >= 1;
  const porcentaje = (resumen.total === 0 ? 0 : (resumen.entregados / resumen.total) * 100).toFixed(1).replace('.', ',');
  const enRutaDe = (tipo: string) => flota.porTipo.find((t) => t.tipo === tipo)?.enRuta ?? 0;
  return (
    <div className="h-[96px] bg-white border-b border-[#E2E8F0] px-[16px] py-[8px] flex gap-[8px] shrink-0">
      <Ficha
        titulo="Pedidos entregados"
        valor={resumen.entregados}
        linea1={`${porcentaje} % de ${formatearMiles(resumen.total)} pedidos`}
        linea2={`en plazo ${resumen.enPlazo} · fuera de plazo ${resumen.fueraDePlazo}`}
      />
      <Ficha
        titulo="Pedidos en ruta"
        valor={resumen.enRuta}
        linea1={`a bordo de ${flota.enRuta} unidades`}
        linea2={`próxima entrega en ${resumen.proximaEntregaMin} min`}
      />
      <Ficha
        titulo="Pedidos en espera"
        valor={resumen.enEspera}
        linea1="aún no salen de almacén"
        linea2={`sin ruta asignada ${resumen.sinRuta}`}
      />
      <Ficha
        titulo="Pedidos en riesgo"
        valor={
          <>
            <PuntoHolgura nivel="ROJO" />
            <span className="text-[#B91C1C]">{riesgo.rojo}</span>
            <img src={trianguloAmbar} alt="" className="block" />
            <span className="text-[#B45309]">{riesgo.ambar}</span>
          </>
        }
        linea1={`${riesgo.rojo} en rojo · ${riesgo.ambar} en ámbar`}
        linea2={`holgura mínima ${riesgo.holguraMinima}`}
        onClick={onVerIncidencias}
        ayuda="Ver incidencias"
      />
      <Ficha
        titulo="Unidades de transporte en uso"
        valor={`${flota.enRuta} / ${flota.total}`}
        linea1={`Auto ${enRutaDe('AUTO')} · Moto ${enRutaDe('MOTO')} · Bicicleta ${enRutaDe('BICICLETA')}`}
        linea2={`${flota.disponibles} disponibles · ${flota.averiadas} averiadas`}
        onClick={onVerFlota}
        ayuda="Ver estado de la flota"
      />
      <Ficha
        titulo="Saturación del sistema"
        valor={
          <>
            {quiebre ? <span className="text-[#B91C1C] text-[11px]">▲</span> : <img src={trianguloAmbar} alt="" className="block" />}
            <span className={quiebre ? 'text-[#B91C1C]' : 'text-[#B45309]'}>{resumen.saturacion.toFixed(2).replace('.', ',')}</span>
          </>
        }
        linea1="Pedidos en espera ÷ Capacidad"
        linea2={notaSaturacion ?? 'ámbar desde 0,70 · quiebre en 1,00'}
      />
    </div>
  );
};
