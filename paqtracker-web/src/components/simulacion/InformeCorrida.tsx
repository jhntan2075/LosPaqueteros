import React from 'react';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { formatearCronometro, formatearDiasHoras, formatearFechaLarga, formatearMiles } from '../../lib/formato';
import type { EjecucionApi } from '../../types/api';
import type { EstadoCorrida } from '../../types/simulacion';

// Informe de la corrida (SI-05). PROVISIONAL: el frame "SI-05 · Informe de la corrida" no estuvo
// disponible; esta versión reúne los datos que el informe debe auditar con el lenguaje visual del
// resto del sistema. Los valores son los de la última instantánea de la ejecución.

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
  ejecucion: EjecucionApi;
  estado: EstadoCorrida;
  onVolverACorrida: () => void;
  onNuevaCorrida: () => void;
}

export const InformeCorrida: React.FC<InformeCorridaProps> = ({ ejecucion, estado, onVolverACorrida, onNuevaCorrida }) => {
  const datos = useDatosOperacion();
  const { resumen, indicadores } = datos;
  const colapso = estado === 'COLAPSO';
  const porcentaje = (valor: number) => `${valor.toFixed(1).replace('.', ',')} %`;
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
            colapso ? 'border border-[#B91C1C] text-[#B91C1C]' : estado === 'COMPLETADA' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#DBEAFE] text-[#1E40AF]'
          }`}
        >
          {colapso ? 'COLAPSO DETECTADO' : estado === 'COMPLETADA' ? 'COMPLETADA' : 'EN EJECUCIÓN'}
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
            <Fila etiqueta="Escenario" valor={ejecucion.tipoEscenario === 'COLAPSO_LOGISTICO' ? 'Hasta el colapso' : `Simulación ${ejecucion.dias} días`} />
            <Fila
              etiqueta={colapso ? 'Instante del colapso' : 'Reloj simulado'}
              valor={formatearFechaLarga(datos.reloj, false)}
              color={colapso ? 'text-[#B91C1C]' : undefined}
            />
            <Fila etiqueta="Operación soportada" valor={formatearDiasHoras(datos.transcurridoSimuladoMs)} />
            <Fila etiqueta="Tiempo de ejecución" valor={formatearCronometro(datos.transcurridoRealMs)} />
            <Fila etiqueta="Planificaciones" valor={formatearMiles(indicadores.replanificaciones)} />
            <Fila etiqueta="Último Ta" valor={`${indicadores.tiempoComputoUltimoTaMs} ms`} />
          </Tarjeta>

          <Tarjeta titulo="Indicadores">
            <Fila etiqueta="Pedidos" valor={formatearMiles(resumen.total)} />
            <Fila etiqueta="Entregados" valor={formatearMiles(resumen.entregados)} />
            <Fila etiqueta="Cumplimiento en plazo" valor={porcentaje(indicadores.porcentajeCumplimiento)} />
            <Fila etiqueta="Fuera de plazo" valor={String(resumen.fueraDePlazo)} color={resumen.fueraDePlazo > 0 ? 'text-[#B91C1C]' : undefined} />
            <Fila etiqueta="En espera al cierre" valor={String(resumen.enEspera)} />
            <Fila etiqueta="Distancia recorrida" valor={`${formatearMiles(Math.round(indicadores.distanciaTotalKm))} km`} />
          </Tarjeta>

          <Tarjeta titulo="Parámetros de la corrida">
            <Fila etiqueta="Inicio" valor={formatearFechaLarga(datos.relojInicio, false)} />
            <Fila etiqueta="Algoritmo" valor={ejecucion.algoritmo} />
            <Fila etiqueta="Flota" valor={`${ejecucion.flota.autos} A · ${ejecucion.flota.motos} M · ${ejecucion.flota.bicicletas} B`} />
            <Fila etiqueta="Factor de aceleración (k)" valor={`×${ejecucion.parametros.factorAceleracionK}`} />
            <Fila etiqueta="Sa / Sc" valor={`${ejecucion.parametros.saltoAlgoritmoSaMinutos} min / ${ejecucion.parametros.saltoConsumoScSegundos} s`} />
            <Fila
              etiqueta="Semáforo de holgura (CF-02)"
              valor={`${Math.round(ejecucion.parametros.fraccionSemaforoAmbar * 100)} % / ${Math.round(ejecucion.parametros.fraccionSemaforoRojo * 100)} %`}
            />
          </Tarjeta>
        </div>
      </div>
    </div>
  );
};
