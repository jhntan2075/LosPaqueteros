import React from 'react';
import { DIAGNOSTICO_COLAPSO } from '../../mocks/simulacion';
import { COLOR_HOLGURA } from '../pedidos/estilos';

// Panel derecho "Diagnóstico del colapso" (Figma "Corrida de Simulación · Hasta el colapso"),
// implementado sobre la captura del frame.

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
  const d = DIAGNOSTICO_COLAPSO;
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
          <Titulo numero="01" derecha="últimas 8 h">Antes — deterioro previo</Titulo>
          {d.antes.map((hito) => (
            <div key={hito.hora} className="flex gap-[10px] text-[12px]">
              <time className="w-[34px] font-mono text-[#94A3B8] shrink-0">{hito.hora}</time>
              <span className={`font-sans ${COLOR_HOLGURA[hito.nivel]}`}>{hito.texto}</span>
            </div>
          ))}
        </section>

        <section className="px-[12px] pt-[10px] pb-[10px] flex flex-col gap-[8px] border-b border-[#E2E8F0]">
          <Titulo numero="02" derecha={diaColapso}>Instante — pedido que rompe el plazo</Titulo>
          <div className="border border-[#B91C1C] rounded-[4px] px-[12px] py-[10px] flex flex-col gap-[6px]">
            <div className="flex items-center">
              <span className="font-mono font-semibold text-[14px] text-[#0F172A]">Pedido {d.pedido.codigo}</span>
              <span className="ml-auto border border-[#B91C1C] rounded-[4px] px-[6px] py-[1px] font-sans font-medium text-[12px] text-[#B91C1C]">{d.pedido.plazo}</span>
            </div>
            <Dato etiqueta="Cliente / Destino" valor={`${d.pedido.cliente} · ${d.pedido.destino}`} />
            <Dato etiqueta="Registrado / Límite" valor={`${d.pedido.registrado} → ${d.pedido.limite}`} />
            <Dato etiqueta="Mejor ETA factible" valor={d.pedido.mejorEta} />
            <Dato etiqueta="Holgura" valor={d.pedido.holgura} color="text-[#B91C1C]" />
          </div>
        </section>

        <section className="px-[12px] pt-[10px] pb-[12px] flex flex-col gap-[8px]">
          <Titulo numero="03">Después — causa dominante</Titulo>
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[4px] px-[10px] py-[8px] flex items-center gap-[8px] text-[12px]">
            <span className="text-[#B91C1C] text-[10px]">▲</span>
            <span className="font-sans font-semibold text-[#0F172A]">{d.causa.titulo}</span>
            <span className="ml-auto font-mono text-[#B91C1C]">{d.causa.detalle}</span>
          </div>
          <div className="flex items-center text-[12px] mt-[4px]">
            <span className="font-sans font-semibold text-[#0F172A]">Almacenes en el instante del quiebre</span>
            <span className="ml-auto font-mono text-[#94A3B8]">recarga en {d.recarga}</span>
          </div>
          {d.almacenes.map((a) => {
            const fraccion = a.stock / a.capacidad;
            return (
              <div key={a.nombre} className="flex flex-col gap-[4px]">
                <span className="font-mono text-[12px] text-[#B91C1C] truncate">
                  {a.nombre} · {a.stock}/{a.capacidad} u · {Math.round(fraccion * 100)} % · {a.nota}
                </span>
                <div className="h-[4px] bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#B91C1C]" style={{ width: `${fraccion * 100}%` }} />
                </div>
              </div>
            );
          })}
          {d.factores.map((f) => (
            <p key={f} className="border-l-[3px] border-[#94A3B8] pl-[8px] font-sans text-[12px] text-[#64748B]">
              {f}
            </p>
          ))}
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
