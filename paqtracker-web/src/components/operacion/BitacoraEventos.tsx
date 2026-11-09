import React, { useState } from 'react';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import type { CategoriaEvento, DatosOperacion, EventoBitacora, SeleccionPanel } from '../../types/operacion';
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

/**
 * Código de pedido o de unidad mencionado en el texto del evento, si ese objeto sigue existiendo en el
 * estado en vivo (un pedido ya entregado, por ejemplo, deja de estar en `datos.pedidos`). El mensaje no
 * trae el código por separado, así que se busca en el texto ya mostrado.
 */
function referenciaDeEvento(evento: EventoBitacora, datos: DatosOperacion): SeleccionPanel | null {
  const texto = `${evento.titulo} ${evento.detalle}`;
  const pedido = texto.match(/#\d+/)?.[0];
  if (pedido && datos.pedidos[pedido]) return { tipo: 'pedido', codigo: pedido };
  const unidad = texto.match(/\b[ABM]-\d{2,}\b/)?.[0];
  if (unidad && datos.flota.some((u) => u.codigo === unidad)) return { tipo: 'vehiculo', codigo: unidad };
  return null;
}

/** Pestaña "Bitácora" del panel lateral del mapa (Operación y corrida de simulación). */
export const BitacoraEventos: React.FC<{ onSeleccionar: (seleccion: SeleccionPanel) => void }> = ({ onSeleccionar }) => {
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  // "Pausar lista" fija los eventos visibles para leerlos sin que se desplacen con los nuevos.
  const [congelados, setCongelados] = useState<EventoBitacora[] | null>(null);
  const [verTodos, setVerTodos] = useState(false);

  const datos = useDatosOperacion();
  const { eventos, reloj } = datos;
  const fuente = congelados ?? eventos;
  const recientes = fuente.filter((e) => reloj.getTime() - e.instanteMs <= VENTANA_RECIENTES_MS);
  const base = verTodos ? fuente : recientes;
  const visibles = filtro === 'TODOS' ? base : base.filter((e) => e.categoria === filtro);

  return (
    <>
      <div className="px-3 py-2.5 flex flex-col gap-2.5 border-b border-neutral-200">
        <div className="flex gap-1" role="group" aria-label="Filtrar eventos">
          {FILTROS.map(({ valor, etiqueta }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={filtro === valor}
              onClick={() => setFiltro(valor)}
              className={`px-2 py-1 rounded text-body-sm font-sans ${
                filtro === valor ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <div className="flex items-center text-body-sm">
          <p className="font-sans text-neutral-600">
            {visibles.length} {visibles.length === 1 ? 'evento' : 'eventos'} {verTodos ? 'registrados' : 'en los últimos 30 min simulados'}
            {congelados && ' · lista en pausa'}
          </p>
          <button
            type="button"
            aria-pressed={congelados !== null}
            onClick={() => setCongelados(congelados ? null : [...eventos])}
            className={`ml-auto rounded px-2 py-1 font-sans ${
              congelados ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            {congelados ? 'Reanudar lista' : 'Pausar lista'}
          </button>
        </div>
      </div>

      <ol className="flex-1 min-h-0 overflow-y-auto" aria-label="Eventos">
        {visibles.map((e, i) => {
          const referencia = referenciaDeEvento(e, datos);
          return (
          <li key={e.id} className={`border-b border-neutral-200 ${i === 0 && !congelados ? 'bg-neutral-50' : ''}`}>
            <FilaConBarra
              color={e.color}
              titulo={e.titulo}
              detalle={e.detalle}
              className="px-3 py-2 min-h-12"
              derecha={<time className="tabular-nums text-body-sm text-neutral-600 whitespace-nowrap">{e.hora}</time>}
              onClick={referencia ? () => onSeleccionar(referencia) : undefined}
            />
          </li>
          );
        })}
        {visibles.length === 0 && <li className="px-3 py-3.5 font-sans text-body-sm text-neutral-600">Sin eventos para este filtro.</li>}
      </ol>

      <div className="h-8 px-3 flex items-center text-body-sm border-t border-neutral-200 shrink-0">
        <button type="button" onClick={() => setVerTodos(!verTodos)} className="font-sans font-medium text-primary-600 hover:underline">
          {verTodos ? 'Ver solo los últimos 30 min' : 'Ver todos los eventos'}
        </button>
        <button type="button" onClick={() => exportarCsv(visibles)} className="ml-auto font-sans text-neutral-600 hover:text-neutral-900">
          Exportar CSV
        </button>
      </div>
    </>
  );
};
