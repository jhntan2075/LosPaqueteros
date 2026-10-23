import React from 'react';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { formatearCronometro, formatearDiasHoras, formatearFechaLarga, formatearMiles } from '../../lib/formato';
import type { EjecucionApi } from '../../types/api';
import type { EstadoCorrida } from '../../types/simulacion';
import { ESTADO_CORRIDA } from './estadoCorrida';
import { Etiqueta } from '../ui/Etiqueta';
import { Boton } from '../ui/Boton';
import { Tarjeta as Superficie } from '../ui/Tarjeta';

// Informe de la corrida (SI-05). El frame de Figma no estuvo disponible: esta versión reúne los datos
// que el informe debe auditar con el lenguaje visual del resto del sistema. Los valores son los de la
// última instantánea de la ejecución.

const Tarjeta: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <Superficie como="section">
    <h2 className="h-[44px] px-[15px] flex items-center border-b border-neutral-200 font-sans font-semibold text-body-lg text-neutral-900">{titulo}</h2>
    <div className="px-[15px] py-[8px]">{children}</div>
  </Superficie>
);

const Fila: React.FC<{ etiqueta: string; valor: string; color?: string }> = ({ etiqueta, valor, color = 'text-neutral-900' }) => (
  <div className="h-[30px] flex items-center justify-between border-b border-dashed border-neutral-200 last:border-0 text-body">
    <span className="font-sans text-neutral-500">{etiqueta}</span>
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
      <header className="h-[80px] bg-white border-b border-neutral-200 px-[24px] flex items-center gap-[16px] shrink-0">
        <div className="flex flex-col gap-[6px]">
          <button type="button" onClick={onVolverACorrida} className="self-start font-sans font-medium text-body text-primary-600 hover:underline">
            ‹ Volver a la corrida
          </button>
          <h1 className="font-sans font-semibold text-title text-neutral-900">Informe de la corrida</h1>
        </div>
        <Etiqueta tono={ESTADO_CORRIDA[estado].tono} className="ml-[8px]">
          {ESTADO_CORRIDA[estado].texto}
        </Etiqueta>
        <Boton variante="primario" tamano="md" className="ml-auto" onClick={onNuevaCorrida}>
          Nueva corrida
        </Boton>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[16px] p-[24px] items-start">
          <Tarjeta titulo="Resultado">
            <Fila etiqueta="Escenario" valor={ejecucion.tipoEscenario === 'COLAPSO_LOGISTICO' ? 'Hasta el colapso' : `Simulación ${ejecucion.dias} días`} />
            <Fila
              etiqueta={colapso ? 'Instante del colapso' : 'Reloj simulado'}
              valor={formatearFechaLarga(datos.reloj, false)}
              color={colapso ? 'text-critical-600' : undefined}
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
            <Fila etiqueta="Fuera de plazo" valor={String(resumen.fueraDePlazo)} color={resumen.fueraDePlazo > 0 ? 'text-critical-600' : undefined} />
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
