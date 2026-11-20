import React, { useState } from 'react';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { DialogoReporteCierre } from '../reporte/DialogoReporteCierre';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { formatearMiles } from '../../lib/formato';
import { estadoFlota, resumenRiesgo } from '../../lib/operacion';
import type { SeleccionPanel } from '../../types/operacion';
import { PuntoHolgura } from '../pedidos/iconos';
import { Boton } from '../ui';
import { TituloSeccion } from './comunes';
import trianguloAmbar from '../../assets/figma/pedidos/holgura-ambar-triangulo.svg';

// Pestaña "Resumen" del panel lateral (antes, un popover de métricas flotante sobre el mapa). Los
// mismos indicadores, en una sola columna angosta: entregas, incidencias y flota de un vistazo.

interface FichaProps {
  titulo: string;
  valor: React.ReactNode;
  linea1: string;
  linea2: string;
  onClick?: () => void;
  esAlerta?: boolean;
}

const Ficha: React.FC<FichaProps> = ({ titulo, valor, linea1, linea2, onClick, esAlerta }) => {
  const contenido = (
    <>
      <div className="flex items-center justify-between w-full">
        <span className="font-sans text-caption font-medium text-neutral-600 tracking-tight truncate">{titulo}</span>
        {onClick && <ArrowRight className="size-3 text-neutral-600 group-hover:text-primary-600 transition shrink-0" />}
      </div>
      <span className="flex items-center gap-1.5 tabular-nums text-title text-neutral-900">{valor}</span>
      <span className="font-sans text-caption text-neutral-600 truncate w-full">{linea1}</span>
      <span className="font-sans text-caption text-neutral-600 truncate w-full">{linea2}</span>
    </>
  );
  const base = 'w-full bg-superficie border rounded-card px-2.5 py-2 flex flex-col gap-0.5 items-start text-left overflow-hidden transition';
  const borde = esAlerta ? 'border-critical-600/25 bg-critical-50/40' : 'border-neutral-200';
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`group ${base} ${borde} hover:border-primary-600 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-primary-600/30 cursor-pointer`}
    >
      {contenido}
    </button>
  ) : (
    <div className={`${base} ${borde}`}>{contenido}</div>
  );
};

export const ResumenOperacion: React.FC<{ onSeleccionar: (seleccion: SeleccionPanel) => void }> = ({ onSeleccionar }) => {
  const datos = useDatosOperacion();
  const { resumen } = datos;
  const flota = estadoFlota(datos);
  const riesgo = resumenRiesgo(datos);
  const quiebre = resumen.saturacion >= 1;
  const alertaCarga = resumen.saturacion >= 0.7;
  const porcentaje = (resumen.total === 0 ? 0 : (resumen.entregados / resumen.total) * 100).toFixed(1).replace('.', ',');
  const enRutaDe = (tipo: string) => flota.porTipo.find((t) => t.tipo === tipo)?.enRuta ?? 0;
  const diaADia = datos.tipoEscenario === 'DIA_A_DIA';
  // Instante del reloj en que se generó el reporte; null con el diálogo cerrado.
  const [generadoEn, setGeneradoEn] = useState<Date | null>(null);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {/* G09: la última planificación estable como reporte de cierre; no detiene la operación. */}
      <div className="px-3 pt-3">
        <Boton icono={ClipboardList} onClick={() => setGeneradoEn(datos.reloj)} className="w-full">
          {diaADia ? 'Generar reporte de cierre' : 'Ver la última planificación'}
        </Boton>
        <p className="mt-1 text-caption text-neutral-600">
          Rutas y paradas de la última planificación estable. {diaADia ? 'No detiene la operación.' : 'No detiene la simulación.'}
        </p>
      </div>
      {generadoEn && <DialogoReporteCierre ejecucionId={datos.ejecucionId} diaADia={diaADia} reloj={generadoEn} onCerrar={() => setGeneradoEn(null)} />}
      <section className="p-3 flex flex-col gap-2">
        <TituloSeccion>Entregas</TituloSeccion>
        <Ficha
          titulo="Pedidos entregados"
          valor={resumen.entregados}
          linea1={`${porcentaje} % de ${formatearMiles(resumen.total)} pedidos`}
          linea2={`${resumen.enPlazo} en plazo · ${resumen.fueraDePlazo} fuera de plazo`}
        />
        <Ficha
          titulo="Pedidos en tránsito"
          valor={resumen.enRuta}
          linea1={`En ${flota.enRuta} ${flota.enRuta === 1 ? 'unidad' : 'unidades'} en ruta`}
          linea2={resumen.proximaEntregaMin === null ? 'Sin llegadas en camino' : `Próxima llegada: ${resumen.proximaEntregaMin} min`}
        />
        <Ficha
          titulo="Pedidos en espera"
          valor={resumen.enEspera}
          linea1="Registrados, aún sin salir a ruta"
          linea2="Entran en la próxima planificación"
        />

        <div className="mt-1">
          <TituloSeccion>Incidencias y flota</TituloSeccion>
        </div>
        {/* El riesgo vive en Incidencias: aquí solo se enlaza, con el mismo número que las alertas del mapa. */}
        <button
          type="button"
          onClick={() => onSeleccionar({ tipo: 'incidencias', seccion: 'riesgo' })}
          className="group w-full flex items-center gap-1.5 px-2.5 py-2 rounded-card border border-neutral-200 text-left text-body-sm hover:border-primary-600 focus-visible:ring-2 focus-visible:ring-primary-600/30"
        >
          <PuntoHolgura nivel="ROJO" />
          <span className="tabular-nums text-neutral-900">
            {riesgo.rojo + riesgo.ambar} en riesgo
            <span className="text-neutral-600"> · {riesgo.rojo} críticos · {riesgo.ambar} ajustados</span>
          </span>
          <span className="ml-auto flex items-center gap-1 font-medium text-primary-600 whitespace-nowrap">
            Ver en Incidencias
            <ArrowRight className="size-3" />
          </span>
        </button>
        <Ficha
          titulo="Unidades en ruta"
          valor={`${flota.enRuta} / ${flota.total}`}
          linea1={`Auto ${enRutaDe('AUTO')} · Moto ${enRutaDe('MOTO')} · Bici ${enRutaDe('BICICLETA')}`}
          linea2={`${flota.disponibles} disponibles · ${flota.averiadas.length} averiadas`}
          onClick={() => onSeleccionar({ tipo: 'flota' })}
          esAlerta={flota.averiadas.length > 0}
        />
        <Ficha
          titulo="Saturación de la flota"
          valor={
            <>
              {quiebre ? <span className="text-critical-600 text-caption">▲</span> : <img src={trianguloAmbar} alt="" className="block" />}
              <span className={quiebre ? 'text-critical-600' : 'text-warn-700'}>{Math.round(resumen.saturacion * 100)} %</span>
            </>
          }
          linea1="Unidades en ruta sobre el total"
          linea2={
            quiebre
              ? datos.estadoEjecucion === 'COLAPSADA'
                ? 'Al detectarse el colapso'
                : 'Toda la flota está en ruta'
              : alertaCarga
                ? 'Alta: 70 % o más en ruta'
                : 'En rango normal'
          }
          esAlerta={quiebre}
        />
      </section>
    </div>
  );
};
