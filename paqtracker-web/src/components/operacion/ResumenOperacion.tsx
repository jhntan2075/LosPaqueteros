import React, { useState } from 'react';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { DialogoReporteCierre } from '../reporte/DialogoReporteCierre';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { formatearMiles } from '../../lib/formato';
import { estadoFlota, resumenRiesgo } from '../../lib/operacion';
import type { SeleccionPanel } from '../../types/operacion';
import { PuntoHolgura } from '../pedidos/iconos';
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
        <span className="font-sans text-[11px] font-medium text-[#64748B] tracking-tight truncate">{titulo}</span>
        {onClick && <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#1E40AF] transition shrink-0" />}
      </div>
      <span className="flex items-center gap-[6px] tabular-nums font-semibold text-[18px] leading-[1.1] text-[#0F172A]">{valor}</span>
      <span className="font-sans text-[11px] text-[#475569] truncate w-full">{linea1}</span>
      <span className="font-sans text-[11px] text-[#64748B] truncate w-full">{linea2}</span>
    </>
  );
  const base = 'w-full bg-white border rounded-[6px] px-[10px] py-[8px] flex flex-col gap-0.5 items-start text-left overflow-hidden leading-[normal] transition';
  const borde = esAlerta ? 'border-red-200 bg-red-50/20' : 'border-[#E2E8F0]';
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`group ${base} ${borde} hover:border-[#1E40AF] hover:shadow-xs focus-visible:ring-2 focus-visible:ring-[#1E40AF]/30 cursor-pointer`}
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
      <div className="px-[12px] pt-[12px]">
        <button
          type="button"
          onClick={() => setGeneradoEn(datos.reloj)}
          className="w-full h-[32px] rounded-[6px] border border-[#1E40AF] text-[#1E40AF] hover:bg-[#EFF6FF] text-[12px] font-semibold flex items-center justify-center gap-[6px]"
        >
          <ClipboardList className="w-[14px] h-[14px]" />
          {diaADia ? 'Generar reporte de cierre' : 'Ver la última planificación'}
        </button>
        <p className="mt-[4px] text-[11px] text-[#64748B]">
          Rutas y paradas de la última planificación estable. {diaADia ? 'No detiene la operación.' : 'No detiene la simulación.'}
        </p>
      </div>
      {generadoEn && <DialogoReporteCierre ejecucionId={datos.ejecucionId} diaADia={diaADia} reloj={generadoEn} onCerrar={() => setGeneradoEn(null)} />}
      <section className="p-[12px] flex flex-col gap-[8px]">
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

        <div className="mt-[4px]">
          <TituloSeccion>Incidencias y flota</TituloSeccion>
        </div>
        <Ficha
          titulo="Pedidos en riesgo"
          valor={
            <>
              <PuntoHolgura nivel="ROJO" />
              <span className="text-[#B91C1C]">{riesgo.rojo}</span>
              <PuntoHolgura nivel="AMBAR" />
              <span className="text-[#B45309]">{riesgo.ambar}</span>
            </>
          }
          linea1={`${riesgo.rojo} críticos · ${riesgo.ambar} ajustados`}
          linea2={`Holgura mínima: ${riesgo.holguraMinima}`}
          onClick={() => onSeleccionar({ tipo: 'incidencias' })}
          esAlerta={riesgo.rojo > 0}
        />
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
              {quiebre ? <span className="text-[#B91C1C] text-[11px]">▲</span> : <img src={trianguloAmbar} alt="" className="block" />}
              <span className={quiebre ? 'text-[#B91C1C]' : 'text-[#B45309]'}>{Math.round(resumen.saturacion * 100)} %</span>
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
