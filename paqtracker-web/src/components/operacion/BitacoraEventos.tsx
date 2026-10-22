import React, { useState } from 'react';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import type { CategoriaEvento, EventoBitacora } from '../../types/operacion';
import { FilaConBarra } from './comunes';

// OP-09 · Bitácora de eventos (Figma 1:4555). Implementado sobre la captura del frame: el contexto de
// diseño no estuvo disponible (límite de llamadas de Figma), así que medidas y espaciados son aproximados.

type Filtro = 'TODOS' | Exclude<CategoriaEvento, 'OPERACION'>;

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: 'TODOS', etiqueta: 'Todos' },
  { valor: 'INCIDENCIA', etiqueta: 'Incidencias' },
  { valor: 'PLANIFICADOR', etiqueta: 'Planificador' },
  { valor: 'ENTREGA', etiqueta: 'Entregas' },
];

/** Ventana de "N eventos en los últimos 30 min simulados", contada desde el reloj de la ejecución. */
const VENTANA_RECIENTES_MS = 30 * 60_000;

function exportarCsv(eventos: EventoBitacora[]) {
  const filas = [['Hora', 'Evento', 'Detalle', 'Categoría'], ...eventos.map((e) => [e.hora, e.titulo, e.detalle, e.categoria])];
  const csv = filas.map((fila) => fila.map((celda) => `"${celda.replace(/"/g, '""')}"`).join(',')).join('\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  enlace.download = 'bitacora-eventos.csv';
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 0);
}

/** Pestaña "Bitácora" del panel lateral del mapa (Operación y corrida de simulación). */
export const BitacoraEventos: React.FC = () => {
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  // "Pausar lista" fija los eventos visibles para leerlos sin que se desplacen con los nuevos.
  const [congelados, setCongelados] = useState<EventoBitacora[] | null>(null);
  const [verTodos, setVerTodos] = useState(false);

  const { eventos, reloj } = useDatosOperacion();
  const fuente = congelados ?? eventos;
  const recientes = fuente.filter((e) => reloj.getTime() - e.instanteMs <= VENTANA_RECIENTES_MS);
  const base = verTodos ? fuente : recientes;
  const visibles = filtro === 'TODOS' ? base : base.filter((e) => e.categoria === filtro);

  return (
    <>
      <div className="px-[12px] pt-[10px] pb-[10px] flex flex-col gap-[10px] border-b border-neutral-200">
        <div className="flex gap-[4px]" role="group" aria-label="Filtrar eventos">
          {FILTROS.map(({ valor, etiqueta }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={filtro === valor}
              onClick={() => setFiltro(valor)}
              className={`px-[7px] py-[3px] rounded-[4px] text-[12px] font-sans ${
                filtro === valor ? 'bg-primary-100 text-primary-600 font-medium' : 'bg-white border border-neutral-200 text-neutral-500 hover:border-neutral-300'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <div className="flex items-center text-[12px]">
          <p className="font-sans text-neutral-500">
            {visibles.length} {visibles.length === 1 ? 'evento' : 'eventos'} {verTodos ? 'registrados' : 'en los últimos 30 min simulados'}
            {congelados && ' · lista en pausa'}
          </p>
          <button
            type="button"
            aria-pressed={congelados !== null}
            onClick={() => setCongelados(congelados ? null : [...eventos])}
            className={`ml-auto rounded-[4px] px-[7px] py-[3px] font-sans ${
              congelados ? 'bg-primary-100 text-primary-600 font-medium' : 'bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            {congelados ? 'Reanudar lista' : 'Pausar lista'}
          </button>
        </div>
      </div>

      <ol className="flex-1 min-h-0 overflow-y-auto" aria-label="Eventos">
        {visibles.map((e, i) => (
          <li key={e.id} className={`border-b border-neutral-200 ${i === 0 && !congelados ? 'bg-neutral-50' : ''}`}>
            <FilaConBarra
              color={e.color}
              titulo={e.titulo}
              detalle={e.detalle}
              className="px-[12px] py-[8px] min-h-[47px]"
              derecha={<time className="tabular-nums text-[12px] text-neutral-500 whitespace-nowrap">{e.hora}</time>}
            />
          </li>
        ))}
        {visibles.length === 0 && <li className="px-[12px] py-[14px] font-sans text-[12px] text-neutral-500">Sin eventos para este filtro.</li>}
      </ol>

      <div className="h-[32px] px-[12px] flex items-center text-[12px] border-t border-neutral-200 shrink-0">
        <button type="button" onClick={() => setVerTodos(!verTodos)} className="font-sans font-medium text-primary-600 hover:underline">
          {verTodos ? 'Ver solo los últimos 30 min' : 'Ver todos los eventos'}
        </button>
        <button type="button" onClick={() => exportarCsv(visibles)} className="ml-auto font-sans text-neutral-500 hover:text-neutral-900">
          Exportar CSV
        </button>
      </div>
    </>
  );
};
