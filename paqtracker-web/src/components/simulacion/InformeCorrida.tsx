import React from 'react';
import { NOMBRE_REGISTRO } from '../../lib/archivosSimulacion';
import { formatearCronometro, formatearDiasHoras, formatearFechaLarga, formatearMiles } from '../../lib/formato';
import { RESUMEN_PEDIDOS } from '../../mocks/operacion';
import { DIAGNOSTICO_COLAPSO, RESUMEN_COLAPSO } from '../../mocks/simulacion';
import type { ConfiguracionCorrida, TipoArchivo } from '../../types/simulacion';
import type { ResultadoCorrida } from './CorridaSimulacion';

// Informe de la corrida (SI-05). PROVISIONAL: el frame "SI-05 · Informe de la corrida" no estuvo
// disponible (límite de llamadas de Figma y sin captura); esta versión reúne los datos que el
// informe debe auditar con el lenguaje visual del resto del sistema, a la espera del diseño.

const Tarjeta: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <section className="bg-white border border-[#E2E8F0] rounded-[4px]">
    <h2 className="h-[44px] px-[15px] flex items-center border-b border-[#E2E8F0] font-sans font-semibold text-[14px] text-[#0F172A]">{titulo}</h2>
    <div className="px-[15px] py-[8px]">{children}</div>
  </section>
);

const Fila: React.FC<{ etiqueta: string; valor: string; color?: string }> = ({ etiqueta, valor, color = 'text-[#0F172A]' }) => (
  <div className="h-[30px] flex items-center justify-between border-b border-dashed border-[#E2E8F0] last:border-0 text-[12px]">
    <span className="font-sans text-[#64748B]">{etiqueta}</span>
    <span className={`font-mono ${color}`}>{valor}</span>
  </div>
);

interface InformeCorridaProps {
  configuracion: ConfiguracionCorrida;
  resultado: ResultadoCorrida;
  onVolverACorrida: () => void;
  onNuevaCorrida: () => void;
}

export const InformeCorrida: React.FC<InformeCorridaProps> = ({ configuracion, resultado, onVolverACorrida, onNuevaCorrida }) => {
  const colapso = resultado.estado === 'COLAPSO';
  const resumen = colapso ? RESUMEN_COLAPSO : RESUMEN_PEDIDOS;
  const cumplimiento = (resumen.enPlazo / Math.max(1, resumen.entregados)) * 100;
  return (
    <div className="flex-1 flex flex-col min-h-0 leading-[normal]">
      <header className="h-[80px] bg-white border-b border-[#E2E8F0] px-[24px] flex items-center gap-[16px] shrink-0">
        <div className="flex flex-col gap-[6px]">
          <button type="button" onClick={onVolverACorrida} className="self-start font-sans font-medium text-[12px] text-[#1E40AF] hover:underline">
            ‹ Volver a la corrida
          </button>
          <h1 className="font-sans font-semibold text-[18px] text-[#0F172A]">Informe de la corrida</h1>
        </div>
        <span
          className={`ml-[8px] rounded-[4px] px-[10px] py-[5px] font-sans font-semibold text-[12px] tracking-[0.5px] ${
            colapso ? 'border border-[#B91C1C] text-[#B91C1C]' : 'bg-[#DCFCE7] text-[#15803D]'
          }`}
        >
          {colapso ? 'COLAPSO DETECTADO' : 'COMPLETADA'}
        </span>
        <span className="ml-auto font-sans text-[12px] text-[#94A3B8]" title="El frame SI-05 de Figma no estuvo disponible">
          SI-05 · diseño provisional
        </span>
        <button type="button" onClick={onNuevaCorrida} className="h-[36px] px-[16px] rounded-[2px] bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-sans font-semibold text-[12px]">
          Nueva corrida
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-3 gap-[16px] p-[24px] items-start min-w-[1000px]">
          <Tarjeta titulo="Resultado">
            <Fila etiqueta="Escenario" valor={configuracion.escenario === 'COLAPSO' ? 'Hasta el colapso' : 'Simulación 5 días'} />
            <Fila etiqueta={colapso ? 'Instante del colapso' : 'Fin de la corrida'} valor={formatearFechaLarga(resultado.relojFinal, false)} color={colapso ? 'text-[#B91C1C]' : undefined} />
            <Fila etiqueta="Operación soportada" valor={formatearDiasHoras(resultado.simuladoMs)} />
            <Fila etiqueta="Tiempo de ejecución" valor={formatearCronometro(resultado.transcurridoRealMs)} />
            {colapso && <Fila etiqueta="Causa dominante" valor={DIAGNOSTICO_COLAPSO.causa.titulo} color="text-[#B91C1C]" />}
            {colapso && <Fila etiqueta="Pedido que rompe el plazo" valor={`${DIAGNOSTICO_COLAPSO.pedido.codigo} · ${DIAGNOSTICO_COLAPSO.pedido.holgura}`} />}
          </Tarjeta>

          <Tarjeta titulo="Indicadores">
            <Fila etiqueta="Pedidos" valor={formatearMiles(resumen.total)} />
            <Fila etiqueta="Entregados" valor={formatearMiles(resumen.entregados)} />
            <Fila etiqueta="Cumplimiento en plazo" valor={`${cumplimiento.toFixed(1).replace('.', ',')} %`} />
            <Fila etiqueta="Fuera de plazo" valor={String(resumen.fueraDePlazo)} />
            <Fila etiqueta="En espera al cierre" valor={String(resumen.enEspera)} />
            <Fila
              etiqueta="Saturación al cierre"
              valor={resumen.saturacion.toFixed(2).replace('.', ',')}
              color={resumen.saturacion >= 1 ? 'text-[#B91C1C]' : resumen.saturacion >= 0.7 ? 'text-[#B45309]' : undefined}
            />
          </Tarjeta>

          <Tarjeta titulo="Parámetros de la corrida">
            <Fila etiqueta="Inicio" valor={formatearFechaLarga(configuracion.inicio, false)} />
            {(Object.keys(configuracion.archivos) as TipoArchivo[]).map((tipo) => (
              <Fila
                key={tipo}
                etiqueta={NOMBRE_REGISTRO[tipo].plural.charAt(0).toUpperCase() + NOMBRE_REGISTRO[tipo].plural.slice(1)}
                valor={`${formatearMiles(configuracion.archivos[tipo].registros)} · ${configuracion.archivos[tipo].nombre}`}
              />
            ))}
            <Fila etiqueta="Semáforo de holgura (CF-02)" valor={`${Math.round(configuracion.corteVerde * 100)} % / ${Math.round(configuracion.corteRojo * 100)} %`} />
          </Tarjeta>
        </div>
      </div>
    </div>
  );
};
