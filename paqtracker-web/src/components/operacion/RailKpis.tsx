import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, BarChart3, X, ArrowRight } from 'lucide-react';
import { PuntoHolgura } from '../pedidos/iconos';
import type { ResumenPedidos } from '../../types/operacion';
import { formatearMiles } from '../../lib/formato';
import trianguloAmbar from '../../assets/figma/pedidos/holgura-ambar-triangulo.svg';

interface FichaProps {
  titulo: string;
  valor: React.ReactNode;
  linea1: string;
  linea2: string;
  onClick?: () => void;
  ayuda?: string;
  esAlerta?: boolean;
}

const Ficha: React.FC<FichaProps> = ({ titulo, valor, linea1, linea2, onClick, ayuda, esAlerta }) => {
  const contenido = (
    <>
      <div className="flex items-center justify-between w-full">
        <span className="font-sans text-[11px] font-medium text-[#64748B] tracking-tight truncate">{titulo}</span>
        {onClick && <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#1E40AF] transition shrink-0" />}
      </div>
      <span className="flex items-center gap-[6px] tabular-nums font-semibold text-[18px] leading-[1.1] text-[#0F172A]">
        {valor}
      </span>
      <span className="font-sans text-[11px] text-[#475569] truncate w-full">{linea1}</span>
      <span className="font-sans text-[11px] text-[#64748B] truncate w-full">{linea2}</span>
    </>
  );

  const baseClases =
    'flex-1 min-w-[130px] bg-white border rounded-[6px] px-[10px] py-[6px] flex flex-col gap-0.5 items-start text-left overflow-hidden leading-[normal] transition';
  const bordeClases = esAlerta ? 'border-red-200 bg-red-50/20' : 'border-[#E2E8F0]';

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      title={ayuda}
      className={`group ${baseClases} ${bordeClases} hover:border-[#1E40AF] hover:shadow-xs focus-visible:ring-2 focus-visible:ring-[#1E40AF]/30 cursor-pointer`}
    >
      {contenido}
    </button>
  ) : (
    <div className={`${baseClases} ${bordeClases}`}>{contenido}</div>
  );
};

export interface RailKpisProps {
  resumen: ResumenPedidos;
  riesgo: { rojo: number; ambar: number; holguraMinima: string };
  flota: { enRuta: number; total: number; disponibles: number; averiadas: number; porTipo: { tipo: string; enRuta: number }[] };
  onVerFlota?: () => void;
  onVerIncidencias?: () => void;
  /** Segunda línea de "Saturación del sistema" (p. ej. cuándo superó el quiebre en una corrida). */
  notaSaturacion?: string;
  className?: string;
}

export const RailKpis: React.FC<RailKpisProps> = ({
  resumen,
  riesgo,
  flota,
  onVerFlota,
  onVerIncidencias,
  notaSaturacion,
  className = '',
}) => {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera o presionar Esc
  useEffect(() => {
    if (!abierto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [abierto]);

  const quiebre = resumen.saturacion >= 1;
  const alertaCarga = resumen.saturacion >= 0.7;
  const porcentaje = (resumen.total === 0 ? 0 : (resumen.entregados / resumen.total) * 100).toFixed(1).replace('.', ',');
  const enRutaDe = (tipo: string) => flota.porTipo.find((t) => t.tipo === tipo)?.enRuta ?? 0;
  const totalRiesgo = riesgo.rojo + riesgo.ambar;

  return (
    <div className={`relative ${className}`} ref={contenedorRef} data-sin-zoom>
      {/* 1. Botón Píldora HUD Flotante */}
      <button
        type="button"
        aria-expanded={abierto}
        aria-haspopup="dialog"
        onClick={() => setAbierto(!abierto)}
        title="Mostrar u ocultar las métricas operativas"
        className={`h-[32px] bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.13)] rounded-full border flex items-center px-3 gap-1.5 transition cursor-pointer select-none ${
          abierto ? 'border-[#1E40AF] bg-blue-50/40' : 'border-[#E2E8F0] hover:bg-slate-50'
        }`}
      >
        <BarChart3 className={`w-3.5 h-3.5 ${abierto ? 'text-[#1E40AF]' : 'text-[#64748B]'}`} />
        <span className="font-sans text-[12px] font-medium text-[#0F172A]">Métricas</span>
        <span className="tabular-nums text-[11px] text-[#64748B] hidden sm:inline">
          {resumen.entregados} ({porcentaje} %)
        </span>

        {/* Badge de alerta si hay riesgo o averías */}
        {totalRiesgo > 0 ? (
          <span
            title={`${riesgo.rojo} críticos · ${riesgo.ambar} ajustados`}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full tabular-nums text-[11px] font-bold ${
              riesgo.rojo > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${riesgo.rojo > 0 ? 'bg-red-600 animate-pulse' : 'bg-amber-600'}`} />
            {totalRiesgo}
          </span>
        ) : alertaCarga ? (
          <span className="w-2 h-2 rounded-full bg-amber-500" title="Saturación de la flota alta" />
        ) : null}

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#64748B] transition-transform duration-200 ${
            abierto ? 'rotate-180 text-[#1E40AF]' : ''
          }`}
        />
      </button>

      {/* 2. Popover Flotante sobre el Mapa */}
      {abierto && (
        <div
          role="dialog"
          aria-label="Panel de métricas operativas"
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute left-0 top-[38px] z-30 w-[680px] max-w-[calc(100vw-24px)] bg-white/95 backdrop-blur-md border border-[#CBD5E1] rounded-xl shadow-[0px_8px_30px_rgba(0,0,0,0.18)] p-3.5 leading-normal"
        >
          {/* Encabezado del Popover */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#DBEAFE] flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-[#1E40AF]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-sans font-bold text-[13px] text-[#0F172A] leading-tight">
                    Métricas operativas
                  </h3>
                </div>
                <p className="font-sans text-[11px] text-[#64748B] leading-tight">
                  Entregas, flota e incidencias en este momento
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="size-6 rounded flex items-center justify-center hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
              aria-label="Cerrar panel de métricas"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grid de 6 Tarjetas con microcopy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {/* 1. Pedidos entregados */}
            <Ficha
              titulo="Pedidos entregados"
              valor={resumen.entregados}
              linea1={`${porcentaje} % de ${formatearMiles(resumen.total)} pedidos`}
              linea2={`${resumen.enPlazo} en plazo · ${resumen.fueraDePlazo} fuera de plazo`}
            />

            {/* 2. Pedidos en ruta */}
            <Ficha
              titulo="Pedidos en tránsito"
              valor={resumen.enRuta}
              linea1={`En ${flota.enRuta} ${flota.enRuta === 1 ? 'unidad' : 'unidades'} en ruta`}
              linea2={resumen.proximaEntregaMin === null ? 'Sin llegadas en camino' : `Próxima llegada: ${resumen.proximaEntregaMin} min`}
            />

            {/* 3. Pedidos en espera */}
            <Ficha
              titulo="Pedidos en espera"
              valor={resumen.enEspera}
              linea1="Registrados, aún sin salir a ruta"
              linea2="Entran en la próxima planificación"
            />

            {/* 4. Pedidos en riesgo */}
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
              linea1={`${riesgo.rojo} críticos · ${riesgo.ambar} ajustados`}
              linea2={`Holgura mínima: ${riesgo.holguraMinima}`}
              onClick={() => {
                setAbierto(false);
                onVerIncidencias?.();
              }}
              ayuda="Ver los pedidos en riesgo en el panel de incidencias"
              esAlerta={riesgo.rojo > 0}
            />

            {/* 5. Flota en uso */}
            <Ficha
              titulo="Unidades en ruta"
              valor={`${flota.enRuta} / ${flota.total}`}
              linea1={`Auto ${enRutaDe('AUTO')} · Moto ${enRutaDe('MOTO')} · Bici ${enRutaDe('BICICLETA')}`}
              linea2={`${flota.disponibles} disponibles · ${flota.averiadas} averiadas`}
              onClick={() => {
                setAbierto(false);
                onVerFlota?.();
              }}
              ayuda="Ver el estado de la flota"
              esAlerta={flota.averiadas > 0}
            />

            {/* 6. Saturación del sistema */}
            <Ficha
              titulo="Saturación de la flota"
              valor={
                <>
                  {quiebre ? <span className="text-[#B91C1C] text-[11px]">▲</span> : <img src={trianguloAmbar} alt="" className="block" />}
                  <span className={quiebre ? 'text-[#B91C1C]' : 'text-[#B45309]'}>
                    {Math.round(resumen.saturacion * 100)} %
                  </span>
                </>
              }
              linea1="Unidades en ruta sobre el total"
              linea2={notaSaturacion ?? (quiebre ? 'Toda la flota está en ruta' : alertaCarga ? 'Alta: 70 % o más en ruta' : 'En rango normal')}
              esAlerta={quiebre}
            />
          </div>

          {/* Pie del Popover */}
          <div className="mt-2.5 pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B]">
            <span>«Pedidos en riesgo» y «Unidades en ruta» abren su detalle</span>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="text-[#1E40AF] font-medium hover:underline cursor-pointer"
            >
              Cerrar panel (Esc)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
