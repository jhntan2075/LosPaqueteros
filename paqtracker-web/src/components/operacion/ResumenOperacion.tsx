import React from 'react';
import {
  ACTIVIDAD_RECIENTE,
  lineaDisponibles,
  lineaEntregados,
  lineaPlazo,
  lineaTiposEnRuta,
  MARCA_FLOTA_CARGA_ALTA,
  MARCA_FLOTA_COMPLETA,
  PROXIMA_LLEGADA,
  SIN_INCIDENCIAS_RECIENTES,
  TITULO_PEDIDOS_ENTREGADOS,
  TITULO_UNIDADES_EN_RUTA,
  valorProximaLlegada,
  VER_ACTIVIDAD,
} from '../../config/glosario';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { formatearNumero } from '../../lib/formato';
import { metricasResumen } from '../../lib/resumen';
import type { SeleccionPanel } from '../../types/operacion';
import type { ConfiguracionCorrida } from '../../types/simulacion';
import { BotonReporteCierre } from '../reporte/BotonReporteCierre';
import { BloqueSimulacion } from '../resumen/BloqueSimulacion';
import { FichaResumen } from '../resumen/FichaResumen';
import { TituloSeccion } from './comunes';
import { MarcaSemaforo } from '../map/simbolos';

// Pestaña "Resumen" del panel lateral (antes, un popover de métricas flotante sobre el mapa). Los
// mismos indicadores, en una sola columna angosta: entregas, incidencias y flota de un vistazo.

/** Incidencias que se listan en "Actividad reciente". */
const INCIDENCIAS_RECIENTES = 5;

interface ResumenOperacionProps {
  onSeleccionar: (seleccion: SeleccionPanel) => void;
  /** Solo en una simulación: con qué configuración corre. En el día a día no hay bloque de simulación. */
  simulacion?: ConfiguracionCorrida;
}

export const ResumenOperacion: React.FC<ResumenOperacionProps> = ({ onSeleccionar, simulacion }) => {
  const datos = useDatosOperacion();
  const { resumen, flota, usoFlota, quiebre, alertaCarga, porcentajeEntregado, totalPedidos, enRutaDe } = metricasResumen(datos);
  // Los eventos llegan del más nuevo al más antiguo.
  const incidencias = datos.eventos.filter((e) => e.categoria === 'INCIDENCIA').slice(0, INCIDENCIAS_RECIENTES);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <section className="p-3 flex flex-col gap-2">
        <TituloSeccion>Entregas</TituloSeccion>
        <FichaResumen
          titulo={TITULO_PEDIDOS_ENTREGADOS}
          valor={resumen.entregados}
          linea1={lineaEntregados(porcentajeEntregado, totalPedidos)}
          linea2={lineaPlazo(resumen.enPlazo, resumen.fueraDePlazo)}
        />
        <FichaResumen
          titulo="Pedidos en tránsito"
          valor={resumen.enRuta}
          linea1={`En ${flota.enRuta} ${flota.enRuta === 1 ? 'unidad' : 'unidades'} en ruta`}
          linea2={resumen.proximaEntregaMin === null ? valorProximaLlegada(null) : `${PROXIMA_LLEGADA}: ${resumen.proximaEntregaMin} min`}
        />
        <FichaResumen
          titulo="Pedidos en espera"
          valor={resumen.enEspera}
          linea1="Registrados, aún sin salir a ruta"
          linea2="Entran en la próxima planificación"
        />

        <div className="mt-1">
          <TituloSeccion>Incidencias y flota</TituloSeccion>
        </div>
        <FichaResumen
          titulo={TITULO_UNIDADES_EN_RUTA}
          valor={
            <>
              {quiebre ? (
                <MarcaSemaforo nivel="ROJO" titulo={MARCA_FLOTA_COMPLETA} />
              ) : alertaCarga ? (
                <MarcaSemaforo nivel="AMBAR" titulo={MARCA_FLOTA_CARGA_ALTA} />
              ) : null}
              <span className={quiebre ? 'text-critical-600' : alertaCarga ? 'text-warn-700' : undefined}>
                {flota.total === 0 ? '0 de 0' : `${flota.enRuta} de ${flota.total} (${formatearNumero(Math.round(usoFlota * 100))} %)`}
              </span>
            </>
          }
          linea1={lineaTiposEnRuta(enRutaDe('AUTO'), enRutaDe('MOTO'), enRutaDe('BICICLETA'))}
          linea2={lineaDisponibles(flota.disponibles, flota.averiadas.length)}
          onClick={() => onSeleccionar({ tipo: 'flota' })}
          esAlerta={flota.averiadas.length > 0 || quiebre}
        />
      </section>
      <section aria-label={ACTIVIDAD_RECIENTE} className="px-3 pb-3 flex flex-col gap-1.5">
        <TituloSeccion>{ACTIVIDAD_RECIENTE}</TituloSeccion>
        {incidencias.length === 0 ? (
          <p className="text-body-sm text-neutral-600">{SIN_INCIDENCIAS_RECIENTES}</p>
        ) : (
          <ul className="flex flex-col">
            {incidencias.map((e) => (
              <li key={e.id} className="min-h-7 flex items-baseline gap-2 text-body-sm">
                <span className="tabular-nums text-neutral-600 shrink-0">{e.hora}</span>
                <span className="font-sans text-neutral-900 truncate">{e.titulo}</span>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => onSeleccionar({ tipo: 'bitacora' })}
          className="min-h-11 self-start font-sans text-body-sm font-medium text-primary-600 hover:underline"
        >
          {VER_ACTIVIDAD}
        </button>
      </section>
      {simulacion && <BloqueSimulacion simulacion={simulacion} className="px-3 pb-3" />}
      <BotonReporteCierre className="px-3 pb-3" />
    </div>
  );
};
