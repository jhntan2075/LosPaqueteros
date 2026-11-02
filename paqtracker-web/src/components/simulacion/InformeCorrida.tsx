import React from 'react';
import { Download } from 'lucide-react';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import type { DatosOperacion } from '../../types/operacion';
import { formatearCronometro, formatearDiasHoras, formatearFechaLarga, formatearMiles } from '../../lib/formato';
import type { EjecucionApi } from '../../types/api';
import type { EstadoCorrida } from '../../types/simulacion';
import { ESTADO_CORRIDA } from './estadoCorrida';

/** Mismas filas que las tres tarjetas del informe, para que la descarga audite exactamente lo que se ve en pantalla. */
function exportarCsv(ejecucion: EjecucionApi, estado: EstadoCorrida, datos: DatosOperacion) {
  const { resumen, indicadores } = datos;
  const colapso = estado === 'COLAPSO';
  const porcentaje = (valor: number) => `${valor.toFixed(1).replace('.', ',')} %`;
  const filas: [string, string][] = [
    ['Estado', ESTADO_CORRIDA[estado].texto],
    ['Escenario', ejecucion.tipoEscenario === 'COLAPSO_LOGISTICO' ? 'Hasta el colapso' : `Simulación ${ejecucion.dias} días`],
    [colapso ? 'Instante del colapso' : 'Reloj simulado', formatearFechaLarga(datos.reloj, false)],
    ['Operación soportada', formatearDiasHoras(datos.transcurridoSimuladoMs)],
    ['Tiempo de ejecución', formatearCronometro(datos.transcurridoRealMs)],
    ['Planificaciones', String(indicadores.replanificaciones)],
    ['Tiempo de la última planificación', `${indicadores.tiempoComputoUltimoTaMs} ms`],
    ['Pedidos', String(resumen.total)],
    ['Entregados', String(resumen.entregados)],
    ['Cumplimiento en plazo', porcentaje(indicadores.porcentajeCumplimiento)],
    ['Fuera de plazo', String(resumen.fueraDePlazo)],
    ['En espera al cierre', String(resumen.enEspera)],
    ['Distancia recorrida', `${Math.round(indicadores.distanciaTotalKm)} km`],
    ['Inicio', formatearFechaLarga(datos.relojInicio, false)],
    ['Algoritmo', ejecucion.algoritmo],
    ['Flota', `${ejecucion.flota.autos} A · ${ejecucion.flota.motos} M · ${ejecucion.flota.bicicletas} B`],
    ['Factor de aceleración (k)', `×${ejecucion.parametros.factorAceleracionK}`],
    ['Planifica cada', `${ejecucion.parametros.saltoAlgoritmoSaMinutos} min simulados`],
    ['Actualiza la vista cada', `${ejecucion.parametros.saltoConsumoScSegundos} s reales`],
    ['Semáforo de holgura', `ajustado < ${Math.round(ejecucion.parametros.fraccionSemaforoAmbar * 100)} % · crítico < ${Math.round(ejecucion.parametros.fraccionSemaforoRojo * 100)} %`],
  ];
  const csv = [['Indicador', 'Valor'], ...filas]
    .map((fila) => fila.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  enlace.download = `informe-${ejecucion.id}.csv`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 0);
}

// Informe de la corrida (SI-05). El frame de Figma no estuvo disponible: esta versión reúne los datos
// que el informe debe auditar con el lenguaje visual del resto del sistema. Los valores son los de la
// última instantánea de la ejecución.

const Tarjeta: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <section className="bg-white border border-[#E2E8F0] rounded-[10px]">
    <h2 className="h-[44px] px-[15px] flex items-center border-b border-[#E2E8F0] font-sans font-semibold text-[14px] text-[#0F172A]">{titulo}</h2>
    <div className="px-[15px] py-[8px]">{children}</div>
  </section>
);

const Fila: React.FC<{ etiqueta: string; valor: string; color?: string }> = ({ etiqueta, valor, color = 'text-[#0F172A]' }) => (
  <div className="h-[30px] flex items-center justify-between border-b border-dashed border-[#E2E8F0] last:border-0 text-[12px]">
    <span className="font-sans text-[#64748B]">{etiqueta}</span>
    <span className={`tabular-nums ${color}`}>{valor}</span>
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
        <span className={`ml-[8px] rounded-[4px] px-[10px] py-[5px] font-sans font-semibold text-[12px] tracking-[0.5px] ${ESTADO_CORRIDA[estado].clase}`}>
          {ESTADO_CORRIDA[estado].texto}
        </span>
        <button
          type="button"
          onClick={() => exportarCsv(ejecucion, estado, datos)}
          className="ml-auto h-[36px] px-[14px] rounded-[6px] border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#334155] font-sans font-medium text-[12px] flex items-center gap-[8px]"
        >
          <Download className="w-[14px] h-[14px]" />
          Exportar informe (CSV)
        </button>
        <button type="button" onClick={onNuevaCorrida} className="h-[36px] px-[16px] rounded-[6px] bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-sans font-semibold text-[12px]">
          Nueva corrida
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[16px] p-[24px] items-start">
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
            <Fila etiqueta="Tiempo de la última planificación" valor={`${indicadores.tiempoComputoUltimoTaMs} ms`} />
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
            <Fila etiqueta="Planifica cada" valor={`${ejecucion.parametros.saltoAlgoritmoSaMinutos} min simulados`} />
            <Fila etiqueta="Actualiza la vista cada" valor={`${ejecucion.parametros.saltoConsumoScSegundos} s reales`} />
            <Fila
              etiqueta="Semáforo de holgura"
              valor={`ajustado < ${Math.round(ejecucion.parametros.fraccionSemaforoAmbar * 100)} % · crítico < ${Math.round(ejecucion.parametros.fraccionSemaforoRojo * 100)} %`}
            />
          </Tarjeta>
        </div>
      </div>
    </div>
  );
};
