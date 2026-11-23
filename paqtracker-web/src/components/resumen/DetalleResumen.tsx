import React from 'react';
import {
  lineaDisponibles,
  lineaEntregados,
  lineaPlazo,
  lineaTiposEnRuta,
  MARCA_FLOTA_CARGA_ALTA,
  MARCA_FLOTA_COMPLETA,
  PROXIMA_LLEGADA,
  TITULO_PEDIDOS_ENTREGADOS,
  TITULO_UNIDADES_EN_RUTA,
  valorProximaLlegada,
} from '../../config/glosario';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { formatearNumero } from '../../lib/formato';
import { metricasResumen } from '../../lib/resumen';
import type { ConfiguracionCorrida } from '../../types/simulacion';
import { FilaDato } from '../ui';
import { MarcaSemaforo } from '../map/simbolos';
import { BloqueSimulacion } from './BloqueSimulacion';
import { FichaResumen } from './FichaResumen';

interface DetalleResumenProps {
  /** Solo en una simulación: con qué configuración corre. En el día a día no hay bloque de simulación. */
  simulacion?: ConfiguracionCorrida;
  /** Abre la lista de Flota: la ficha de unidades en ruta es su acceso. Sin valor, solo informa. */
  onAbrirFlota?: () => void;
}

/**
 * Lo que el desplegable del resumen suma a las cuatro métricas de la franja: entregados, el uso de la flota con
 * su semáforo, la próxima llegada y, en una simulación, cómo corre.
 */
export const DetalleResumen: React.FC<DetalleResumenProps> = ({ simulacion, onAbrirFlota }) => {
  const { resumen, flota, usoFlota, quiebre, alertaCarga, porcentajeEntregado, totalPedidos, enRutaDe } = metricasResumen(useDatosOperacion());
  return (
    <>
      <FichaResumen
        titulo={TITULO_PEDIDOS_ENTREGADOS}
        valor={resumen.entregados}
        linea1={lineaEntregados(porcentajeEntregado, totalPedidos)}
        linea2={lineaPlazo(resumen.enPlazo, resumen.fueraDePlazo)}
      />
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
        onClick={onAbrirFlota}
        esAlerta={flota.averiadas.length > 0 || quiebre}
      />
      <FilaDato etiqueta={PROXIMA_LLEGADA} valor={valorProximaLlegada(resumen.proximaEntregaMin)} texto />
      {simulacion && <BloqueSimulacion simulacion={simulacion} className="pt-1" />}
    </>
  );
};
