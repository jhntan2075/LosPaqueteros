import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { Boton } from '../ui';
import { DialogoReporteCierre } from './DialogoReporteCierre';

// G09: la última planificación estable como reporte de cierre; no detiene la operación. Vive aquí para
// que lo usen el resumen del panel lateral y el pulso de la barra superior.

export const BotonReporteCierre: React.FC<{ compacto?: boolean }> = ({ compacto = false }) => {
  const datos = useDatosOperacion();
  const diaADia = datos.tipoEscenario === 'DIA_A_DIA';
  const nombre = diaADia ? 'Generar reporte de cierre' : 'Ver la última planificación';
  // Instante del reloj en que se generó el reporte; null con el diálogo cerrado.
  const [generadoEn, setGeneradoEn] = useState<Date | null>(null);

  return (
    <>
      <Boton
        icono={ClipboardList}
        onClick={() => setGeneradoEn(datos.reloj)}
        {...(compacto ? { tamano: 'sm', variante: 'secundario', 'aria-label': nombre, title: nombre } : { className: 'w-full' })}
      >
        {compacto ? <span className="hidden xl:inline">Reporte de cierre</span> : nombre}
      </Boton>
      {generadoEn && <DialogoReporteCierre ejecucionId={datos.ejecucionId} diaADia={diaADia} reloj={generadoEn} onCerrar={() => setGeneradoEn(null)} />}
    </>
  );
};
