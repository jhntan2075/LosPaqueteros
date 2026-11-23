import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { notaReporteDeCierre, reporteDeCierre } from '../../config/glosario';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { Boton } from '../ui';
import { DialogoReporteCierre } from './DialogoReporteCierre';

/**
 * G09: la última planificación estable como reporte de cierre; no detiene la operación ni la simulación.
 * Botón secundario a todo el ancho con su nota debajo; el reporte se abre en un diálogo.
 */
export const BotonReporteCierre: React.FC<{ className?: string }> = ({ className }) => {
  const datos = useDatosOperacion();
  const diaADia = datos.tipoEscenario === 'DIA_A_DIA';
  // Instante del reloj en que se generó el reporte; null con el diálogo cerrado.
  const [generadoEn, setGeneradoEn] = useState<Date | null>(null);
  return (
    <div className={className}>
      {generadoEn && <DialogoReporteCierre ejecucionId={datos.ejecucionId} diaADia={diaADia} reloj={generadoEn} onCerrar={() => setGeneradoEn(null)} />}
      <Boton variante="secundario" icono={ClipboardList} onClick={() => setGeneradoEn(datos.reloj)} className="w-full">
        {reporteDeCierre(diaADia)}
      </Boton>
      <p className="mt-1 text-caption text-neutral-600">{notaReporteDeCierre(diaADia)}</p>
    </div>
  );
};
