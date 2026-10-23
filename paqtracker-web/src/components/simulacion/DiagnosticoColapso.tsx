import React from 'react';
import { ALMACENES } from '../../config/dominio';
import { etiquetaPlazo } from '../../config/glosario';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { estadoFlota, pedidosEnRiesgo } from '../../lib/operacion';
import type { EventoBitacora } from '../../types/operacion';
import type { NivelHolgura } from '../../types/pedidos';
import { COLOR_HOLGURA } from '../pedidos/estilos';
import { Boton } from '../ui/Boton';
import { Tarjeta } from '../ui/Tarjeta';

// Panel derecho "Diagnóstico del colapso" (Figma "Corrida de Simulación · Hasta el colapso"). Se arma
// con el estado de la ejecución en el instante en que el servidor la detuvo por colapso.

/** Eventos previos que se muestran como deterioro. */
const EVENTOS_PREVIOS = 4;
/** Ocupación de la flota desde la que se atribuye el colapso a falta de unidades. */
const OCUPACION_SATURADA = 0.9;

const NIVEL_POR_COLOR: Record<EventoBitacora['color'], NivelHolgura> = { rojo: 'ROJO', ambar: 'AMBAR', azul: 'VERDE', gris: 'CERRADO' };

const Titulo: React.FC<{ numero: string; children: React.ReactNode; derecha?: string }> = ({ numero, children, derecha }) => (
  <div className="flex items-center gap-[8px]">
    <h3 className="min-w-0 truncate font-sans font-semibold text-body text-neutral-500 tracking-[0.7px] uppercase">
      {numero} · {children}
    </h3>
    {derecha && <span className="ml-auto tabular-nums text-body text-neutral-500 whitespace-nowrap">{derecha}</span>}
  </div>
);

const Dato: React.FC<{ etiqueta: string; valor: string; color?: string }> = ({ etiqueta, valor, color = 'text-neutral-900' }) => (
  <div className="flex justify-between gap-[8px] text-body">
    <span className="font-sans text-neutral-500 whitespace-nowrap">{etiqueta}</span>
    <span className={`tabular-nums font-medium whitespace-nowrap ${color}`}>{valor}</span>
  </div>
);

interface DiagnosticoColapsoProps {
  diaColapso: string; // "29 ago"
  onCerrar: () => void;
  onEstadoCompleto: () => void;
  onVerInforme: () => void;
}

export const DiagnosticoColapso: React.FC<DiagnosticoColapsoProps> = ({ diaColapso, onCerrar, onEstadoCompleto, onVerInforme }) => {
  const datos = useDatosOperacion();
  const previos = datos.eventos.filter((e) => e.categoria === 'INCIDENCIA' || e.categoria === 'PLANIFICADOR').slice(0, EVENTOS_PREVIOS);
  const critico = pedidosEnRiesgo(datos)[0];
  const flota = estadoFlota(datos);
  const ocupacion = flota.total === 0 ? 0 : flota.enRuta / flota.total;
  const causa =
    ocupacion >= OCUPACION_SATURADA
      ? { titulo: 'Capacidad de flota agotada', detalle: `${flota.enRuta}/${flota.total} en ruta` }
      : { titulo: 'Plazo inalcanzable con la flota libre', detalle: `${flota.disponibles} unidades libres` };
  const intermedios = datos.almacenes.filter((a) => a.capacidad !== null && a.stock !== null);

  return (
    <Tarjeta como="aside" elevada className="absolute right-[12px] top-0 bottom-0 z-20 w-[min(340px,calc(100%-24px))] flex flex-col overflow-hidden leading-[normal]"
      aria-label="Diagnóstico del colapso"
      data-sin-zoom
      onPointerDown={(e) => e.stopPropagation()}
     
    >
      <div className="h-[36px] px-[12px] flex items-center gap-[8px] border-b border-neutral-200 shrink-0">
        <span className="size-[7px] rounded-full bg-critical-600" />
        <h2 className="font-sans font-semibold text-body-lg text-neutral-900">Diagnóstico del colapso</h2>
        <button type="button" onClick={onCerrar} aria-label="Cerrar diagnóstico" className="ml-auto size-[22px] rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900">
          ✕
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <section className="px-[12px] pt-[10px] pb-[10px] flex flex-col gap-[7px] border-b border-neutral-200">
          <Titulo numero="01" derecha="últimos eventos">Antes — deterioro previo</Titulo>
          {previos.length === 0 && <p className="font-sans text-body text-neutral-500">Sin eventos registrados en esta vista.</p>}
          {previos.map((evento) => (
            <div key={evento.id} className="flex gap-[10px] text-body">
              <time className="w-[52px] tabular-nums text-neutral-500 shrink-0">{evento.hora}</time>
              <span className={`font-sans ${COLOR_HOLGURA[NIVEL_POR_COLOR[evento.color]]}`}>{evento.detalle}</span>
            </div>
          ))}
        </section>

        <section className="px-[12px] pt-[10px] pb-[10px] flex flex-col gap-[8px] border-b border-neutral-200">
          <Titulo numero="02" derecha={diaColapso}>Instante — pedido que rompe el plazo</Titulo>
          {critico ? (
            <div className="border border-critical-600 rounded-[6px] px-[12px] py-[10px] flex flex-col gap-[6px]">
              <div className="flex items-center">
                <span className="tabular-nums font-semibold text-body-lg text-neutral-900">Pedido {critico.codigo}</span>
                <span className="ml-auto border border-critical-600 rounded-[4px] px-[6px] py-[1px] font-sans font-medium text-body text-critical-600">
                  {etiquetaPlazo(critico.plazoHoras)}
                </span>
              </div>
              <Dato etiqueta="Destino / Cantidad" valor={`(${critico.destino.x},${critico.destino.y}) · ${critico.cantidad} u`} />
              <Dato etiqueta="Registrado / Límite" valor={`${critico.registrado} → ${critico.horaLimite}`} />
              <Dato etiqueta="Mejor ETA factible" valor={critico.eta} />
              <Dato etiqueta="Holgura" valor={critico.holgura} color="text-critical-600" />
            </div>
          ) : (
            <p className="font-sans text-body text-neutral-500">El pedido incumplido ya salió en una ruta que llega tarde.</p>
          )}
        </section>

        <section className="px-[12px] pt-[10px] pb-[12px] flex flex-col gap-[8px]">
          <Titulo numero="03">Después — causa probable</Titulo>
          <div className="bg-critical-50 border border-critical-600/30 rounded-[6px] px-[10px] py-[8px] flex items-center gap-[8px] text-body">
            <span className="text-critical-600 text-caption">▲</span>
            <span className="font-sans font-semibold text-neutral-900">{causa.titulo}</span>
            <span className="ml-auto tabular-nums text-critical-600">{causa.detalle}</span>
          </div>
          <div className="flex items-center text-body mt-[4px]">
            <span className="font-sans font-semibold text-neutral-900">Almacenes en el instante del quiebre</span>
            <span className="ml-auto tabular-nums text-neutral-500">recarga a las 23:59</span>
          </div>
          {intermedios.map((a) => {
            const fraccion = (a.stock as number) / (a.capacidad as number);
            return (
              <div key={a.id} className="flex flex-col gap-[4px]">
                <span className={`tabular-nums text-body truncate ${a.nivel === 'ROJO' ? 'text-critical-600' : 'text-neutral-900'}`}>
                  {ALMACENES.find((x) => x.id === a.id)?.nombre} · {a.stock}/{a.capacidad} u · {Math.round(fraccion * 100)} %
                </span>
                <div className="h-[4px] bg-neutral-200 rounded-full overflow-hidden">
                  <div className={`h-full ${a.nivel === 'ROJO' ? 'bg-critical-600' : 'bg-primary-600'}`} style={{ width: `${fraccion * 100}%` }} />
                </div>
              </div>
            );
          })}
          <p className="border-l-[3px] border-neutral-400 pl-[8px] font-sans text-body text-neutral-500">
            {datos.bloqueos.length} {datos.bloqueos.length === 1 ? 'tramo bloqueado vigente' : 'tramos bloqueados vigentes'} · {datos.resumen.enEspera} pedidos en espera
          </p>
        </section>
      </div>

      <div className="p-[12px] border-t border-neutral-200 flex gap-[8px] shrink-0">
        <Boton variante="secundario" tamano="sm" className="flex-1" onClick={onEstadoCompleto}>
          Estado completo del sistema
        </Boton>
        <Boton variante="primario" tamano="sm" className="flex-1" onClick={onVerInforme}>
          Ver informe
        </Boton>
      </div>
    </Tarjeta>
  );
};
