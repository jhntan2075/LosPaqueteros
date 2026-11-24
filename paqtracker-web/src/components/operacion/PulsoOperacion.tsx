import React from 'react';
import { formatearPorcentaje } from '../../lib/formato';
import { ocupacionAlmacenes, ocupacionFlota, resumenRiesgo } from '../../lib/operacion';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import type { SeleccionPanel } from '../../types/operacion';
import type { NivelApi } from '../../types/api';
import { IndicadoresGlobales } from '../map/IndicadoresGlobales';
import { BotonReporteCierre } from '../reporte/BotonReporteCierre';
import { Insignia } from '../ui';

// Pulso de la operación en la barra superior: ocupación global (G01–G04), los resultados del día que
// entrega la API y el reporte de cierre (G09). Con poco ancho se omiten primero los menos urgentes.

const MARCA_CUMPLIMIENTO: Record<NivelApi, { marca: string; clase: string }> = {
  VERDE: { marca: '✓', clase: 'text-ok-700' },
  AMBAR: { marca: '⚠', clase: 'text-warn-700' },
  ROJO: { marca: '✕', clase: 'text-critical-600' },
};

interface ResultadoProps {
  etiqueta: string;
  etiquetaAccesible: string;
  onClick: () => void;
  /** Visibilidad por ancho: lo menos urgente se oculta primero. */
  clase?: string;
  children: React.ReactNode;
}

const Resultado: React.FC<ResultadoProps> = ({ etiqueta, etiquetaAccesible, onClick, clase = 'flex', children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={etiquetaAccesible}
    className={`${clase} h-full px-3 items-center gap-2 cursor-pointer hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-primary-600/30`}
  >
    <span className="text-caption text-neutral-600 font-sans">{etiqueta}</span>
    <span className="flex items-center gap-1 tabular-nums font-semibold text-body text-neutral-900">{children}</span>
  </button>
);

export const PulsoOperacion: React.FC<{ onSeleccionar: (seleccion: SeleccionPanel) => void }> = ({ onSeleccionar }) => {
  const datos = useDatosOperacion();
  const i = datos.indicadores;
  const rojo = resumenRiesgo(datos).rojo;
  const pct = formatearPorcentaje(i.porcentajeCumplimiento);
  const semaforo = MARCA_CUMPLIMIENTO[i.estadoSemaforoGlobal];
  const entregados = i.pedidosEntregadosATiempo + i.pedidosEntregadosConRetraso;
  const abrirPedidos = () => onSeleccionar({ tipo: 'pedidos' });

  return (
    <div className="flex items-center gap-2">
      <IndicadoresGlobales
        flota={ocupacionFlota(datos.flota)}
        almacenes={ocupacionAlmacenes(datos.almacenes)}
        onAbrirFlota={() => onSeleccionar({ tipo: 'flota' })}
        onAbrirAlmacenes={() => onSeleccionar({ tipo: 'almacenes' })}
      />
      <section
        aria-label="Resultados del día"
        className="h-8 bg-superficie shadow-xs rounded-full border border-neutral-200 flex items-center overflow-hidden"
      >
        <Resultado etiqueta="Cumplimiento" etiquetaAccesible={`Cumplimiento: ${pct}. Ver pedidos`} onClick={abrirPedidos}>
          {pct}
          <span aria-hidden="true" className={semaforo.clase}>
            {semaforo.marca}
          </span>
        </Resultado>
        <Resultado
          etiqueta="En camino"
          etiquetaAccesible={`En camino: ${i.pedidosEnTransito} pedidos, ${rojo} críticos. Ver pedidos`}
          onClick={abrirPedidos}
        >
          {i.pedidosEnTransito}
          {rojo > 0 && <Insignia tono="critical">{`✕ ${rojo}`}</Insignia>}
        </Resultado>
        <Resultado
          etiqueta="En espera"
          etiquetaAccesible={`En espera de unidad: ${i.pedidosPendientes}. Ver pedidos`}
          onClick={abrirPedidos}
          clase="hidden xl:flex"
        >
          {i.pedidosPendientes}
        </Resultado>
        <Resultado
          etiqueta="Entregados hoy"
          etiquetaAccesible={`Entregados hoy: ${entregados}, ${i.pedidosEntregadosConRetraso} con retraso. Ver pedidos`}
          onClick={abrirPedidos}
          clase="hidden 2xl:flex"
        >
          {entregados}
          <span className="text-caption font-normal text-neutral-600">{`${i.pedidosEntregadosConRetraso} tarde`}</span>
        </Resultado>
      </section>
      <BotonReporteCierre compacto />
    </div>
  );
};
