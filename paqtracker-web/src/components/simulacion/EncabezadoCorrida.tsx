import React from 'react';
import { DURACION_CINCO_DIAS_MS, VENTANA_EJECUCION_MIN, type EstadoCorrida } from '../../hooks/useCorridaSimulada';
import { formatearCronometro, formatearDiasHoras, formatearFechaLarga, formatearHora } from '../../lib/formato';
import { MARCAS_AVANCE } from '../../mocks/simulacion';
import type { EscenarioSimulacion } from '../../types/simulacion';

// Franjas superiores de la corrida (Figma "Corrida de Simulación" y "· Hasta el colapso"):
// banda de modo (24 px), encabezado de corrida (56 px) y avance de la corrida (44 px).
// Implementadas sobre las capturas de los frames.

const DIA_MS = 24 * 3600 * 1000;

interface EncabezadoCorridaProps {
  escenario: EscenarioSimulacion;
  estado: EstadoCorrida;
  inicio: Date;
  relojSimulado: Date;
  simuladoMs: number;
  progreso: number;
  dia: number;
  transcurridoRealMs: number;
  restanteRealMs: number;
  estimadoTotalRealMs: number;
  onDetener: () => void;
  onVerInforme: () => void;
}

const Bloque: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({ etiqueta, children }) => (
  <div className="flex flex-col gap-[2px] whitespace-nowrap">
    <span className="font-sans text-[12px] text-[#64748B]">{etiqueta}</span>
    {children}
  </div>
);

const Separador = () => <div className="bg-[#E2E8F0] h-[36px] w-px shrink-0" />;

export const EncabezadoCorrida: React.FC<EncabezadoCorridaProps> = ({
  escenario,
  estado,
  inicio,
  relojSimulado,
  simuladoMs,
  progreso,
  dia,
  transcurridoRealMs,
  restanteRealMs,
  estimadoTotalRealMs,
  onDetener,
  onVerInforme,
}) => {
  const colapso = estado === 'COLAPSO';
  const completada = estado === 'COMPLETADA';
  const fin = new Date(inicio.getTime() + DURACION_CINCO_DIAS_MS);
  const estimadoMin = estimadoTotalRealMs / 60_000;
  const enVentana = estimadoMin >= VENTANA_EJECUCION_MIN.minima && estimadoMin <= VENTANA_EJECUCION_MIN.maxima;
  const porcentaje = Math.round(progreso * 100);
  const diaMarcador = Math.min(5, Math.floor(simuladoMs / DIA_MS) + 1);

  return (
    <div className="shrink-0 leading-[normal]">
      {/* Banda de modo */}
      <div className={`h-[24px] px-[16px] flex items-center gap-[8px] text-[12px] text-white ${colapso ? 'bg-[#B91C1C]' : 'bg-[#1E40AF]'}`}>
        <span className="size-[6px] rounded-full bg-white" />
        <span className="font-sans font-semibold tracking-[0.5px]">
          {colapso ? 'SIMULACIÓN — COLAPSO' : escenario === 'COLAPSO' ? 'SIMULACIÓN — HASTA EL COLAPSO' : 'SIMULACIÓN 5 DÍAS'}
        </span>
        <span className="font-mono opacity-80">
          · {formatearFechaLarga(inicio, false)} → {colapso ? `Colapso ${formatearFechaLarga(relojSimulado, false)}` : formatearFechaLarga(fin, false)}
        </span>
        <span className="ml-auto font-sans opacity-90">
          {colapso
            ? 'Simulación finalizada por colapso logístico'
            : completada
              ? 'Simulación completada'
              : 'Acciones de escritura deshabilitadas durante la corrida'}
        </span>
      </div>

      {/* Encabezado de corrida */}
      <header className="h-[56px] bg-white border-b border-[#E2E8F0] px-[16px] flex items-center gap-[20px]">
        <Bloque etiqueta={colapso ? 'Instante del colapso' : 'Fecha de Operaciones'}>
          <span className={`font-mono font-semibold text-[20px] ${colapso ? 'text-[#B91C1C]' : 'text-[#0F172A]'}`}>{formatearFechaLarga(relojSimulado)}</span>
        </Bloque>
        <span
          className={`rounded-[4px] px-[8px] py-[4px] font-mono font-medium text-[12px] whitespace-nowrap ${
            colapso ? 'border border-[#B91C1C] text-[#B91C1C]' : 'bg-[#DBEAFE] text-[#1E40AF]'
          }`}
        >
          {colapso ? `Día simulado ${dia}` : `Día ${dia} de 5`}
        </span>
        <Separador />
        <Bloque etiqueta={colapso || completada ? 'Transcurrido / Estado' : 'Transcurrido / Restante'}>
          <span className="font-mono text-[12px] text-[#0F172A]">
            {formatearCronometro(transcurridoRealMs)} · {colapso || completada ? 'detenida' : `~${formatearCronometro(restanteRealMs)}`}
          </span>
        </Bloque>
        <Separador />
        {colapso ? (
          <Bloque etiqueta="operación soportada">
            <span className="font-mono text-[12px] text-[#0F172A]">{formatearDiasHoras(simuladoMs)}</span>
          </Bloque>
        ) : (
          <Bloque etiqueta={`Ventana de ejecución ${VENTANA_EJECUCION_MIN.minima}–${VENTANA_EJECUCION_MIN.maxima} min`}>
            <span className={`font-mono text-[12px] ${enVentana ? 'text-[#15803D]' : 'text-[#B45309]'}`}>
              {formatearCronometro(estimadoTotalRealMs)} estimado {enVentana ? '√' : '· fuera de la ventana'}
            </span>
          </Bloque>
        )}
        <div className="flex-1" />
        {estado === 'EJECUCION' && (
          <>
            <button type="button" onClick={onDetener} className="font-sans text-[12px] text-[#64748B] hover:text-[#B91C1C] hover:underline">
              Detener corrida
            </button>
            <span className="bg-[#DBEAFE] rounded-[4px] px-[10px] py-[5px] flex items-center gap-[6px] font-sans font-semibold text-[12px] tracking-[0.5px] text-[#1E40AF] whitespace-nowrap">
              <span className="size-[6px] rounded-full bg-[#1E40AF] animate-pulse" /> EN EJECUCIÓN
            </span>
          </>
        )}
        {estado !== 'EJECUCION' && (
          <>
            <span
              className={`rounded-[4px] px-[10px] py-[5px] flex items-center gap-[6px] font-sans font-semibold text-[12px] tracking-[0.5px] whitespace-nowrap ${
                colapso ? 'border border-[#B91C1C] text-[#B91C1C]' : 'bg-[#DCFCE7] text-[#15803D]'
              }`}
            >
              <span className={`size-[6px] rounded-full ${colapso ? 'bg-[#B91C1C]' : 'bg-[#15803D]'}`} /> {colapso ? 'COLAPSO DETECTADO' : 'COMPLETADA'}
            </span>
            <button
              type="button"
              onClick={onVerInforme}
              className="h-[32px] px-[16px] rounded-[2px] bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-sans font-semibold text-[12px] whitespace-nowrap"
            >
              Ver informe de la corrida
            </button>
          </>
        )}
      </header>

      {/* Avance de la corrida */}
      <div className="h-[44px] bg-white border-b border-[#E2E8F0] px-[16px] flex items-center gap-[16px] text-[12px]">
        <span className="font-sans text-[#64748B] whitespace-nowrap w-[110px] shrink-0">Avance de la corrida</span>
        <div className="relative flex-1 h-full" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje} aria-label="Avance de la corrida">
          {/* Eje de 5 días */}
          <div className="absolute left-0 right-0 top-[20px] h-[2px] bg-[#CBD5E1]" />
          <div className={`absolute left-0 top-[19px] h-[4px] ${colapso ? 'bg-[#B91C1C]' : 'bg-[#1E40AF]'}`} style={{ width: `${Math.min(100, progreso * 100)}%` }} />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="absolute top-[16px]" style={{ left: `${i * 20}%` }}>
              <div className="w-px h-[10px] bg-[#94A3B8]" />
              <span className="absolute top-[12px] left-[2px] font-mono text-[11px] text-[#64748B]">D{i + 1}</span>
            </div>
          ))}
          {/* Marcas de incidencias y del planificador ya ocurridas */}
          {MARCAS_AVANCE.filter((m) => m.minuto * 60_000 <= simuladoMs).map((m) => (
            <span
              key={m.minuto}
              title={m.tipo === 'INCIDENCIA' ? 'Incidencia' : 'Planificador'}
              className={`absolute ${m.tipo === 'INCIDENCIA' ? 'top-[7px] size-[4px] bg-[#64748B]' : 'top-[7px] w-px h-[7px] bg-[#94A3B8]'}`}
              style={{ left: `${((m.minuto * 60_000) / DURACION_CINCO_DIAS_MS) * 100}%` }}
            />
          ))}
          {/* Marcador del instante actual */}
          <div className="absolute top-[12px]" style={{ left: `${Math.min(100, progreso * 100)}%` }}>
            <div className={`w-[2px] h-[18px] ${colapso ? 'bg-[#B91C1C]' : 'bg-[#1E40AF]'}`} />
            <span
              className={`absolute -top-[10px] left-[6px] font-mono font-medium text-[12px] whitespace-nowrap ${colapso ? 'text-[#B91C1C]' : 'text-[#1E40AF]'} ${
                progreso > 0.85 ? '-translate-x-[calc(100%+12px)]' : ''
              }`}
            >
              D{diaMarcador} · {formatearHora(relojSimulado)}
              {colapso && ' · Colapso'}
            </span>
          </div>
        </div>
        <span className="flex items-center gap-[6px] font-sans text-[#64748B] whitespace-nowrap">
          <span className="size-[5px] bg-[#64748B]" /> Incidencia <span className="w-px h-[9px] bg-[#94A3B8]" /> Planificador
        </span>
        <span className="font-mono font-medium text-[#0F172A] whitespace-nowrap">
          {colapso ? `Detenida en ${porcentaje} %` : `${porcentaje} % completado`}
        </span>
      </div>
    </div>
  );
};
