import React, { useState } from 'react';
import { EVENTOS } from '../../mocks/operacion';
import type { CategoriaEvento, EventoBitacora } from '../../types/operacion';
import { FilaConBarra, PanelCompleto, TituloSeccion } from './comunes';

// OP-09 · Bitácora de eventos (Figma 1:4555). Implementado sobre la captura del frame: el contexto de
// diseño no estuvo disponible (límite de llamadas de Figma), así que medidas y espaciados son aproximados.

type Filtro = 'TODOS' | Exclude<CategoriaEvento, 'OPERACION'>;

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: 'TODOS', etiqueta: 'Todos' },
  { valor: 'INCIDENCIA', etiqueta: 'Incidencias' },
  { valor: 'PLANIFICADOR', etiqueta: 'Planificador' },
  { valor: 'ENTREGA', etiqueta: 'Entregas' },
];

/** Ventana de la meta "N eventos en los últimos 30 min simulados", contada desde el reloj de operación. */
const RELOJ_SEGUNDOS = 11 * 3600 + 15 * 60 + 40;
const segundosDe = (hora: string) => hora.split(':').map(Number).reduce((total, parte) => total * 60 + parte, 0);

function exportarCsv(eventos: EventoBitacora[]) {
  const filas = [['Hora', 'Evento', 'Detalle', 'Categoría'], ...eventos.map((e) => [e.hora, e.titulo, e.detalle, e.categoria])];
  const csv = filas.map((fila) => fila.map((celda) => `"${celda.replace(/"/g, '""')}"`).join(',')).join('\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  enlace.download = 'bitacora-eventos.csv';
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 0);
}

/**
 * `compacto`: pestaña del panel derecho de la corrida, sin marco ni cierre; el pie enlaza a la
 * bitácora completa (OP-09) con `onVerCompleta`.
 */
export const BitacoraEventos: React.FC<{ onCerrar?: () => void; compacto?: boolean; onVerCompleta?: () => void }> = ({
  onCerrar,
  compacto = false,
  onVerCompleta,
}) => {
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  // "Congelar lista" fija los eventos visibles para leerlos sin que se desplacen con los nuevos.
  const [congelados, setCongelados] = useState<EventoBitacora[] | null>(null);
  const [verTodos, setVerTodos] = useState(false);

  const fuente = congelados ?? EVENTOS;
  const recientes = fuente.filter((e) => RELOJ_SEGUNDOS - segundosDe(e.hora) <= 30 * 60);
  const base = verTodos ? fuente : recientes;
  const visibles = filtro === 'TODOS' ? base : base.filter((e) => e.categoria === filtro);

  const contenido = (
    <>
      <div className={`px-[12px] ${compacto ? 'pt-[10px]' : 'pt-[14px]'} pb-[10px] flex flex-col gap-[10px] border-b border-[#E2E8F0]`}>
        {!compacto && <TituloSeccion onCerrar={onCerrar}>Bitácora de eventos</TituloSeccion>}
        <div className="flex gap-[4px]" role="tablist" aria-label="Filtrar eventos">
          {FILTROS.map(({ valor, etiqueta }) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={filtro === valor}
              onClick={() => setFiltro(valor)}
              className={`px-[7px] py-[3px] rounded-[4px] text-[12px] font-sans ${
                filtro === valor ? 'bg-[#DBEAFE] text-[#1E40AF] font-medium' : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <div className="flex items-center text-[12px]">
          <p className="font-sans text-[#64748B]">
            {visibles.length} eventos {verTodos ? 'registrados en la corrida' : 'en los últimos 30 min simulados'}
            {congelados && ' · lista congelada'}
          </p>
          <button
            type="button"
            aria-pressed={congelados !== null}
            onClick={() => setCongelados(congelados ? null : [...EVENTOS])}
            className={`ml-auto rounded-[4px] px-[7px] py-[3px] font-sans ${
              congelados ? 'bg-[#DBEAFE] text-[#1E40AF] font-medium' : 'bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
          >
            {congelados ? 'reanudar lista' : 'congelar lista'}
          </button>
        </div>
      </div>

      <ol className="flex-1 min-h-0 overflow-y-auto" aria-label="Eventos">
        {visibles.map((e, i) => (
          <li key={`${e.hora}-${e.titulo}`} className={`border-b border-[#E2E8F0] ${i === 0 && !congelados ? 'bg-[#F8FAFC]' : ''}`}>
            <FilaConBarra
              color={e.color}
              titulo={e.titulo}
              detalle={e.detalle}
              className="px-[12px] py-[8px] min-h-[47px]"
              derecha={<time className="font-mono text-[12px] text-[#94A3B8] whitespace-nowrap">{e.hora}</time>}
            />
          </li>
        ))}
        {visibles.length === 0 && <li className="px-[12px] py-[14px] font-sans text-[12px] text-[#64748B]">Sin eventos para este filtro.</li>}
      </ol>

      <div className="h-[32px] px-[12px] flex items-center text-[12px] border-t border-[#E2E8F0] shrink-0">
        {compacto ? (
          <button type="button" onClick={onVerCompleta} className="font-sans font-medium text-[#1E40AF] hover:underline">
            Ver bitácora completa (OP-09)
          </button>
        ) : (
          <>
            <button type="button" onClick={() => setVerTodos(!verTodos)} className="font-sans font-medium text-[#1E40AF] hover:underline">
              {verTodos ? 'Solo los últimos 30 min' : 'Todos los eventos registrados'}
            </button>
            <button type="button" onClick={() => exportarCsv(visibles)} className="ml-auto font-sans text-[#64748B] hover:text-[#0F172A]">
              exportar CSV
            </button>
          </>
        )}
      </div>
    </>
  );
  return compacto ? contenido : <PanelCompleto etiqueta="Bitácora de eventos">{contenido}</PanelCompleto>;
};
