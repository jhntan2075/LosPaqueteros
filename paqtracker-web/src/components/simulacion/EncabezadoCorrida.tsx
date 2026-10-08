import React from 'react';
import { formatearCronometro, formatearDiasHoras, formatearFechaLarga, formatearHora } from '../../lib/formato';
import type { EscenarioSimulacion, EstadoCorrida, MarcaAvance } from '../../types/simulacion';

// Franjas superiores de la corrida (Figma "Corrida de Simulación" y "· Hasta el colapso"):
// banda de modo (24 px), encabezado de corrida (56 px) y avance de la corrida (44 px).
// No hay controles de velocidad: el factor k lo fija el servidor para todos los que observan.

const DIA_MS = 24 * 3600 * 1000;
/** La simulación de periodo debe correr en 30–60 min reales (DA-08). */
const VENTANA_EJECUCION_MIN = { minima: 30, maxima: 60 };
/** Rótulos de día como máximo en el eje; con más días se rotula uno de cada varios. */
const ROTULOS_MAXIMOS = 10;

interface EncabezadoCorridaProps {
  escenario: EscenarioSimulacion;
  estado: EstadoCorrida;
  inicio: Date;
  relojSimulado: Date;
  simuladoMs: number;
  diasTotales: number;
  transcurridoRealMs: number;
  factorAceleracion: number;
  marcas: MarcaAvance[];
  onDetener: () => void;
  onSalir: () => void;
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
  diasTotales,
  transcurridoRealMs,
  factorAceleracion,
  marcas,
  onDetener,
  onSalir,
  onVerInforme,
}) => {
  const colapso = estado === 'COLAPSO';
  const completada = estado === 'COMPLETADA';
  const duracionMs = diasTotales * DIA_MS;
  const fin = new Date(inicio.getTime() + duracionMs);
  const progreso = duracionMs === 0 ? 0 : Math.min(1, simuladoMs / duracionMs);
  const estimadoTotalRealMs = duracionMs / factorAceleracion;
  const restanteRealMs = Math.max(0, (duracionMs - simuladoMs) / factorAceleracion);
  const estimadoMin = estimadoTotalRealMs / 60_000;
  const enVentana = estimadoMin >= VENTANA_EJECUCION_MIN.minima && estimadoMin <= VENTANA_EJECUCION_MIN.maxima;
  const porcentaje = Math.round(progreso * 100);
  const dia = Math.min(diasTotales, Math.floor(simuladoMs / DIA_MS) + 1);
  const pasoRotulo = Math.max(1, Math.ceil(diasTotales / ROTULOS_MAXIMOS));
  const titulo = colapso ? 'SIMULACIÓN — COLAPSO' : escenario === 'COLAPSO_LOGISTICO' ? 'SIMULACIÓN — HASTA EL COLAPSO' : `SIMULACIÓN ${diasTotales} DÍAS`;

  return (
    <div className="shrink-0 leading-[normal]">
      {/* Banda de modo */}
      <div className={`h-[24px] px-[16px] flex items-center gap-[8px] text-[12px] text-white ${colapso ? 'bg-[#B91C1C]' : 'bg-[#1E40AF]'}`}>
        <span className="size-[6px] rounded-full bg-white" />
        <span className="font-sans font-semibold tracking-[0.5px]">{titulo}</span>
        <span className="font-mono opacity-80">
          · {formatearFechaLarga(inicio, false)} → {colapso ? `Colapso ${formatearFechaLarga(relojSimulado, false)}` : formatearFechaLarga(fin, false)}
        </span>
        <span className="ml-auto font-sans opacity-90">
          {colapso ? 'Simulación finalizada por colapso logístico' : completada ? 'Simulación completada' : `Reloj acelerado ×${factorAceleracion}`}
        </span>
      </div>

      {/* Encabezado de corrida */}
      <header className="h-[56px] bg-white border-b border-[#E2E8F0] px-[16px] flex items-center gap-[20px]">
        <Bloque etiqueta={colapso ? 'Instante del colapso' : 'Fecha y hora simulada'}>
          <span className={`font-mono font-semibold text-[20px] ${colapso ? 'text-[#B91C1C]' : 'text-[#0F172A]'}`}>{formatearFechaLarga(relojSimulado)}</span>
        </Bloque>
        <span
          className={`rounded-[4px] px-[8px] py-[4px] font-mono font-medium text-[12px] whitespace-nowrap ${
            colapso ? 'border border-[#B91C1C] text-[#B91C1C]' : 'bg-[#DBEAFE] text-[#1E40AF]'
          }`}
        >
          {colapso ? `Día simulado ${dia}` : `Día ${dia} de ${diasTotales}`}
        </span>
        <Separador />
        <Bloque etiqueta="Tiempo simulado transcurrido">
          <span className="font-mono text-[12px] text-[#0F172A]">{formatearDiasHoras(simuladoMs)}</span>
        </Bloque>
        <Separador />
        <Bloque etiqueta={colapso || completada ? 'Tiempo real / Estado' : 'Tiempo real transcurrido / Restante'}>
          <span className="font-mono text-[12px] text-[#0F172A]">
            {formatearCronometro(transcurridoRealMs)} · {colapso || completada ? 'detenida' : `~${formatearCronometro(restanteRealMs)}`}
          </span>
        </Bloque>
        {escenario === 'SIMULACION_PERIODO' && !colapso && (
          <>
            <Separador />
            <Bloque etiqueta={`Ventana de ejecución ${VENTANA_EJECUCION_MIN.minima}–${VENTANA_EJECUCION_MIN.maxima} min`}>
              <span className={`font-mono text-[12px] ${enVentana ? 'text-[#15803D]' : 'text-[#B45309]'}`}>
                {formatearCronometro(estimadoTotalRealMs)} estimado {enVentana ? '√' : '· fuera de la ventana'}
              </span>
            </Bloque>
          </>
        )}
        <div className="flex-1" />
        <button type="button" onClick={onSalir} className="font-sans text-[12px] text-[#64748B] hover:text-[#0F172A] hover:underline">
          ‹ Otras simulaciones
        </button>
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
          <div className="absolute left-0 right-0 top-[20px] h-[2px] bg-[#CBD5E1]" />
          <div className={`absolute left-0 top-[19px] h-[4px] ${colapso ? 'bg-[#B91C1C]' : 'bg-[#1E40AF]'}`} style={{ width: `${progreso * 100}%` }} />
          {Array.from({ length: diasTotales }, (_, i) => i)
            .filter((i) => i % pasoRotulo === 0)
            .map((i) => (
              <div key={i} className="absolute top-[16px]" style={{ left: `${(i / diasTotales) * 100}%` }}>
                <div className="w-px h-[10px] bg-[#94A3B8]" />
                <span className="absolute top-[12px] left-[2px] font-mono text-[11px] text-[#64748B]">D{i + 1}</span>
              </div>
            ))}
          {/* Marcas de incidencias y del planificador ya ocurridas */}
          {marcas
            .filter((m) => m.minuto * 60_000 <= simuladoMs)
            .map((m) => (
              <span
                key={m.id}
                title={m.tipo === 'INCIDENCIA' ? 'Incidencia' : 'Planificador'}
                className={`absolute ${m.tipo === 'INCIDENCIA' ? 'top-[7px] size-[4px] bg-[#64748B]' : 'top-[7px] w-px h-[7px] bg-[#94A3B8]'}`}
                style={{ left: `${Math.min(100, ((m.minuto * 60_000) / duracionMs) * 100)}%` }}
              />
            ))}
          <div className="absolute top-[12px]" style={{ left: `${progreso * 100}%` }}>
            <div className={`w-[2px] h-[18px] ${colapso ? 'bg-[#B91C1C]' : 'bg-[#1E40AF]'}`} />
            <span
              className={`absolute -top-[10px] left-[6px] font-mono font-medium text-[12px] whitespace-nowrap ${colapso ? 'text-[#B91C1C]' : 'text-[#1E40AF]'} ${
                progreso > 0.85 ? '-translate-x-[calc(100%+12px)]' : ''
              }`}
            >
              D{dia} · {formatearHora(relojSimulado)}
              {colapso && ' · Colapso'}
            </span>
          </div>
        </div>
        <span className="flex items-center gap-[6px] font-sans text-[#64748B] whitespace-nowrap">
          <span className="size-[5px] bg-[#64748B]" /> Incidencia <span className="w-px h-[9px] bg-[#94A3B8]" /> Planificador
        </span>
        <span className="font-mono font-medium text-[#0F172A] whitespace-nowrap">{colapso ? `Detenida en ${porcentaje} %` : `${porcentaje} % completado`}</span>
      </div>
    </div>
  );
};
