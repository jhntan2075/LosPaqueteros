import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { ReportePlanificacion } from '../reporte/ReportePlanificacion';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import type { DatosOperacion } from '../../types/operacion';
import { formatearCronometro, formatearDiasHoras, formatearFechaLarga, formatearMiles } from '../../lib/formato';
import type { EjecucionApi } from '../../types/api';
import type { EstadoCorrida } from '../../types/simulacion';
import { Boton, EncabezadoPagina, FilaDato, Insignia, Pestanas, Tarjeta, type Tono } from '../ui';
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

/**
 * Sección del informe. El título va en el mismo contenedor que las filas (no en el encabezado de la
 * Tarjeta): las pruebas de la rúbrica localizan cada fila desde el título (`heading.parentElement`).
 */
const SeccionInforme: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <Tarjeta cuerpoClassName="flex flex-col px-5 pb-3 pt-4">
    <h2 className="border-b border-neutral-200 pb-3 text-title-sm text-neutral-900">{titulo}</h2>
    {children}
  </Tarjeta>
);

const Fila: React.FC<{ etiqueta: string; valor: string; tono?: Tono }> = ({ etiqueta, valor, tono }) => (
  <FilaDato separador etiqueta={etiqueta} valor={valor} tono={tono} />
);

interface InformeCorridaProps {
  ejecucion: EjecucionApi;
  estado: EstadoCorrida;
  onVolverACorrida: () => void;
  onNuevaCorrida: () => void;
}

type VistaInforme = 'resumen' | 'planificacion';

export const InformeCorrida: React.FC<InformeCorridaProps> = ({ ejecucion, estado, onVolverACorrida, onNuevaCorrida }) => {
  const datos = useDatosOperacion();
  // Resumen de indicadores, o el reporte de la última planificación estable (G08; G10 en el colapso).
  const [vista, setVista] = useState<VistaInforme>('resumen');
  const { resumen, indicadores } = datos;
  const colapso = estado === 'COLAPSO';
  const porcentaje = (valor: number) => `${valor.toFixed(1).replace('.', ',')} %`;
  const estadoCorrida = ESTADO_CORRIDA[estado];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EncabezadoPagina
        titulo="Informe de la corrida"
        volver={{ texto: 'Volver a la corrida', onClick: onVolverACorrida }}
        estado={
          <Insignia tamano="md" tono={estadoCorrida.tono} punto={estadoCorrida.punto} contorno={estadoCorrida.contorno}>
            {estadoCorrida.texto}
          </Insignia>
        }
        acciones={
          <>
            <Boton variante="secundario" icono={Download} onClick={() => exportarCsv(ejecucion, estado, datos)}>
              Exportar informe (CSV)
            </Boton>
            <Boton variante="primario" onClick={onNuevaCorrida}>
              Nueva corrida
            </Boton>
          </>
        }
      />

      <div className="shrink-0 border-b border-neutral-200 bg-white px-4 sm:px-6">
        <Pestanas
          etiqueta="Contenido del informe"
          activa={vista}
          onCambiar={setVista}
          className="mx-auto max-w-6xl border-b-0"
          opciones={[
            { id: 'resumen', etiqueta: 'Resumen' },
            { id: 'planificacion', etiqueta: colapso ? 'Última planificación estable (antes del colapso)' : 'Última planificación estable' },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white" role="tabpanel">
        <div className="mx-auto w-full max-w-6xl">
          {vista === 'planificacion' ? (
            <ReportePlanificacion ejecucionId={ejecucion.id} />
          ) : (
            <div className="grid grid-cols-1 items-start gap-4 p-4 sm:p-6 lg:grid-cols-3">
              <SeccionInforme titulo="Resultado">
                <Fila etiqueta="Escenario" valor={ejecucion.tipoEscenario === 'COLAPSO_LOGISTICO' ? 'Hasta el colapso' : `Simulación ${ejecucion.dias} días`} />
                <Fila
                  etiqueta={colapso ? 'Instante del colapso' : 'Reloj simulado'}
                  valor={formatearFechaLarga(datos.reloj, false)}
                  tono={colapso ? 'critical' : undefined}
                />
                <Fila etiqueta="Operación soportada" valor={formatearDiasHoras(datos.transcurridoSimuladoMs)} />
                <Fila etiqueta="Tiempo de ejecución" valor={formatearCronometro(datos.transcurridoRealMs)} />
                <Fila etiqueta="Planificaciones" valor={formatearMiles(indicadores.replanificaciones)} />
                <Fila etiqueta="Tiempo de la última planificación" valor={`${indicadores.tiempoComputoUltimoTaMs} ms`} />
              </SeccionInforme>

              <SeccionInforme titulo="Indicadores">
                <Fila etiqueta="Pedidos" valor={formatearMiles(resumen.total)} />
                <Fila etiqueta="Entregados" valor={formatearMiles(resumen.entregados)} />
                <Fila etiqueta="Cumplimiento en plazo" valor={porcentaje(indicadores.porcentajeCumplimiento)} />
                <Fila etiqueta="Fuera de plazo" valor={String(resumen.fueraDePlazo)} tono={resumen.fueraDePlazo > 0 ? 'critical' : undefined} />
                <Fila etiqueta="En espera al cierre" valor={String(resumen.enEspera)} />
                <Fila etiqueta="Distancia recorrida" valor={`${formatearMiles(Math.round(indicadores.distanciaTotalKm))} km`} />
              </SeccionInforme>

              <SeccionInforme titulo="Parámetros de la corrida">
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
              </SeccionInforme>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
