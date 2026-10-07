import React from 'react';
import { ALMACENES } from '../../config/dominio';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { estadoFlota, pedidosEnRiesgo } from '../../lib/operacion';
import type { EventoBitacora } from '../../types/operacion';
import type { NivelHolgura } from '../../types/pedidos';
import { COLOR_HOLGURA } from '../pedidos/estilos';

// Panel derecho "Diagnóstico del colapso" (Figma "Corrida de Simulación · Hasta el colapso"). Se arma
// con el estado de la ejecución en el instante en que el servidor la detuvo por colapso.

/** Eventos previos que se muestran como deterioro. */
const EVENTOS_PREVIOS = 4;
/** Ocupación de la flota desde la que se atribuye el colapso a falta de unidades. */
const OCUPACION_SATURADA = 0.9;

const NIVEL_POR_COLOR: Record<EventoBitacora['color'], NivelHolgura> = { rojo: 'ROJO', ambar: 'AMBAR', azul: 'VERDE', gris: 'CERRADO' };

const Titulo: React.FC<{ numero: string; children: React.ReactNode; derecha?: string }> = ({ numero, children, derecha }) => (
  <div className="flex items-center gap-[8px]">
    <h3 className="min-w-0 truncate font-sans font-semibold text-[12px] text-[#64748B] tracking-[0.7px] uppercase">
      {numero} · {children}
    </h3>
    {derecha && <span className="ml-auto font-mono text-[12px] text-[#94A3B8] whitespace-nowrap">{derecha}</span>}
  </div>
);

const Dato: React.FC<{ etiqueta: string; valor: string; color?: string }> = ({ etiqueta, valor, color = 'text-[#0F172A]' }) => (
  <div className="flex justify-between gap-[8px] text-[12px]">
    <span className="font-sans text-[#64748B] whitespace-nowrap">{etiqueta}</span>
    <span className={`font-mono font-medium whitespace-nowrap ${color}`}>{valor}</span>
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
    <aside
      aria-label="Diagnóstico del colapso"
      data-sin-zoom
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute right-[12px] top-0 bottom-0 z-20 w-[340px] bg-white border border-[#E2E8F0] rounded-[10px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.16)] flex flex-col overflow-hidden leading-[normal]"
    >
      <div className="h-[36px] px-[12px] flex items-center gap-[8px] border-b border-[#E2E8F0] shrink-0">
        <span className="size-[7px] rounded-full bg-[#B91C1C]" />
        <h2 className="font-sans font-semibold text-[13px] text-[#0F172A]">Diagnóstico del colapso</h2>
        <button type="button" onClick={onCerrar} aria-label="Cerrar diagnóstico" className="ml-auto size-[22px] rounded text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]">
          ✕
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <section className="px-[12px] pt-[10px] pb-[10px] flex flex-col gap-[7px] border-b border-[#E2E8F0]">
          <Titulo numero="01" derecha="últimos eventos">Antes — deterioro previo</Titulo>
          {previos.length === 0 && <p className="font-sans text-[12px] text-[#94A3B8]">Sin eventos registrados en esta vista.</p>}
          {previos.map((evento) => (
            <div key={evento.id} className="flex gap-[10px] text-[12px]">
              <time className="w-[52px] font-mono text-[#94A3B8] shrink-0">{evento.hora}</time>
              <span className={`font-sans ${COLOR_HOLGURA[NIVEL_POR_COLOR[evento.color]]}`}>{evento.detalle}</span>
            </div>
          ))}
        </section>

        <section className="px-[12px] pt-[10px] pb-[10px] flex flex-col gap-[8px] border-b border-[#E2E8F0]">
          <Titulo numero="02" derecha={diaColapso}>Instante — pedido que rompe el plazo</Titulo>
          {critico ? (
            <div className="border border-[#B91C1C] rounded-[4px] px-[12px] py-[10px] flex flex-col gap-[6px]">
              <div className="flex items-center">
                <span className="font-mono font-semibold text-[14px] text-[#0F172A]">Pedido {critico.codigo}</span>
                <span className="ml-auto border border-[#B91C1C] rounded-[4px] px-[6px] py-[1px] font-sans font-medium text-[12px] text-[#B91C1C]">
                  {critico.plazoHoras === 36 ? 'Regular' : 'Priorizado'} {critico.plazoHoras} h
                </span>
              </div>
              <Dato etiqueta="Destino / Cantidad" valor={`(${critico.destino.x},${critico.destino.y}) · ${critico.cantidad} u`} />
              <Dato etiqueta="Registrado / Límite" valor={`${critico.registrado} → ${critico.horaLimite}`} />
              <Dato etiqueta="Mejor ETA factible" valor={critico.eta} />
              <Dato etiqueta="Holgura" valor={critico.holgura} color="text-[#B91C1C]" />
            </div>
          ) : (
            <p className="font-sans text-[12px] text-[#64748B]">El pedido incumplido ya salió en una ruta que llega tarde.</p>
          )}
        </section>

        <section className="px-[12px] pt-[10px] pb-[12px] flex flex-col gap-[8px]">
          <Titulo numero="03">Después — causa dominante</Titulo>
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[4px] px-[10px] py-[8px] flex items-center gap-[8px] text-[12px]">
            <span className="text-[#B91C1C] text-[10px]">▲</span>
            <span className="font-sans font-semibold text-[#0F172A]">{causa.titulo}</span>
            <span className="ml-auto font-mono text-[#B91C1C]">{causa.detalle}</span>
          </div>
          <div className="flex items-center text-[12px] mt-[4px]">
            <span className="font-sans font-semibold text-[#0F172A]">Almacenes en el instante del quiebre</span>
            <span className="ml-auto font-mono text-[#94A3B8]">recarga a las 00:00</span>
          </div>
          {intermedios.map((a) => {
            const fraccion = (a.stock as number) / (a.capacidad as number);
            return (
              <div key={a.id} className="flex flex-col gap-[4px]">
                <span className={`font-mono text-[12px] truncate ${a.nivel === 'ROJO' ? 'text-[#B91C1C]' : 'text-[#0F172A]'}`}>
                  {ALMACENES.find((x) => x.id === a.id)?.nombre} · {a.stock}/{a.capacidad} u · {Math.round(fraccion * 100)} %
                </span>
                <div className="h-[4px] bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className={`h-full ${a.nivel === 'ROJO' ? 'bg-[#B91C1C]' : 'bg-[#1E40AF]'}`} style={{ width: `${fraccion * 100}%` }} />
                </div>
              </div>
            );
          })}
          <p className="border-l-[3px] border-[#94A3B8] pl-[8px] font-sans text-[12px] text-[#64748B]">
            {datos.bloqueos.length} {datos.bloqueos.length === 1 ? 'tramo bloqueado vigente' : 'tramos bloqueados vigentes'} · {datos.resumen.enEspera} pedidos en espera
          </p>
        </section>
      </div>

      <div className="p-[12px] border-t border-[#E2E8F0] flex gap-[8px] shrink-0">
        <button type="button" onClick={onEstadoCompleto} className="flex-1 h-[32px] border border-[#CBD5E1] rounded-[2px] font-sans font-medium text-[12px] text-[#0F172A] hover:bg-[#F8FAFC]">
          Estado completo del sistema
        </button>
        <button type="button" onClick={onVerInforme} className="flex-1 h-[32px] rounded-[2px] bg-[#1E40AF] hover:bg-[#1E3A8A] font-sans font-semibold text-[12px] text-white">
          Ver informe
        </button>
      </div>
    </aside>
  );
};
