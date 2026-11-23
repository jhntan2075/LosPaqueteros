import React, { useState } from 'react';
import { FILTRO_ULTIMOS_30_MIN, SIN_ACTIVIDAD, SIN_EVENTOS_CON_FILTROS, VER_TODOS } from '../../config/glosario';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { agruparActividad } from '../../lib/eventos';
import type { CategoriaEvento, DatosOperacion, EventoBitacora, SeleccionPanel } from '../../types/operacion';
import { BotonReporteCierre } from '../reporte/BotonReporteCierre';
import { FilaConBarra } from './comunes';

// OP-09 · Actividad: historial de eventos (Figma 1:4555). Implementado sobre la captura del frame: el contexto de
// diseño no estuvo disponible (límite de llamadas de Figma), así que medidas y espaciados son aproximados.

type Filtro = 'TODOS' | Exclude<CategoriaEvento, 'OPERACION'>;

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: 'TODOS', etiqueta: 'Todos' },
  { valor: 'INCIDENCIA', etiqueta: 'Incidencias' },
  { valor: 'PLANIFICADOR', etiqueta: 'Planificador' },
  { valor: 'ENTREGA', etiqueta: 'Entregas' },
];

/** Ventana del filtro opcional "Últimos 30 min", contada desde el reloj simulado de la ejecución. */
const VENTANA_RECIENTES_MS = 30 * 60_000;

function exportarCsv(eventos: EventoBitacora[]) {
  const filas = [['Hora', 'Evento', 'Detalle', 'Categoría'], ...eventos.map((e) => [e.hora, e.titulo, e.detalle, e.categoria])];
  const csv = filas.map((fila) => fila.map((celda) => `"${celda.replace(/"/g, '""')}"`).join(',')).join('\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  enlace.download = 'actividad-eventos.csv';
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

const CLASES_CHIP_ACTIVO = 'bg-primary-100 text-primary-700 font-medium';
const CLASES_CHIP_INACTIVO = 'bg-superficie border border-neutral-200 text-neutral-600 hover:border-neutral-300';

/** Pestaña "Actividad" del panel lateral del mapa (Operación y corrida de simulación). */
export const BitacoraEventos: React.FC<{ onSeleccionar: (seleccion: SeleccionPanel) => void }> = ({ onSeleccionar }) => {
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  // "Pausar lista" fija los eventos visibles para leerlos sin que se desplacen con los nuevos.
  const [congelados, setCongelados] = useState<EventoBitacora[] | null>(null);
  // Por defecto se ve todo el historial; la ventana de 30 min es un filtro opcional.
  const [soloRecientes, setSoloRecientes] = useState(false);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  const datos = useDatosOperacion();
  const { eventos, reloj } = datos;
  const fuente = congelados ?? eventos;
  const porVentana = soloRecientes ? fuente.filter((e) => reloj.getTime() - e.instanteMs <= VENTANA_RECIENTES_MS) : fuente;
  const visibles = filtro === 'TODOS' ? porVentana : porVentana.filter((e) => e.categoria === filtro);
  // `visibles` es un arreglo nuevo en cada render, así que memoizar sobre él no ahorraría nada: agrupar es barato.
  const filas = agruparActividad(visibles);
  const hayFiltros = filtro !== 'TODOS' || soloRecientes;

  const alternar = (clave: string) =>
    setAbiertos((previo) => {
      const nuevo = new Set(previo);
      if (!nuevo.delete(clave)) nuevo.add(clave);
      return nuevo;
    });
  const verTodos = () => {
    setFiltro('TODOS');
    setSoloRecientes(false);
  };

  const fila = (e: EventoBitacora, resaltada: boolean) => {
    const referencia = referenciaDeEvento(e, datos);
    return (
      <li key={e.id} className={`border-b border-neutral-200 ${resaltada ? 'bg-neutral-50' : ''}`}>
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
  };

  return (
    <>
      <div className="px-3 py-2.5 flex flex-col gap-2.5 border-b border-neutral-200">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar eventos">
          {FILTROS.map(({ valor, etiqueta }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={filtro === valor}
              onClick={() => setFiltro(valor)}
              className={`px-2 py-1 max-md:min-h-11 rounded text-body-sm font-sans ${filtro === valor ? CLASES_CHIP_ACTIVO : CLASES_CHIP_INACTIVO}`}
            >
              {etiqueta}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={soloRecientes}
            onClick={() => setSoloRecientes(!soloRecientes)}
            className={`px-2 py-1 max-md:min-h-11 rounded text-body-sm font-sans ${soloRecientes ? CLASES_CHIP_ACTIVO : CLASES_CHIP_INACTIVO}`}
          >
            {FILTRO_ULTIMOS_30_MIN}
          </button>
        </div>
        <div className="flex items-center text-body-sm">
          <p className="font-sans text-neutral-600">
            {visibles.length} {visibles.length === 1 ? 'evento' : 'eventos'}
            {congelados && ' · lista en pausa'}
          </p>
          <button
            type="button"
            aria-pressed={congelados !== null}
            onClick={() => setCongelados(congelados ? null : [...eventos])}
            className={`ml-auto rounded px-2 py-1 font-sans ${
              congelados ? CLASES_CHIP_ACTIVO : 'bg-superficie border border-neutral-200 text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            {congelados ? 'Reanudar lista' : 'Pausar lista'}
          </button>
        </div>
      </div>

      <ol className="flex-1 min-h-0 overflow-y-auto" aria-label="Eventos">
        {filas.map((f, i) => {
          if (f.clase === 'evento') return fila(f.evento, i === 0 && !congelados);
          const abierto = abiertos.has(f.clave);
          return (
            <li key={f.clave} className="border-b border-neutral-200">
              <button
                type="button"
                aria-expanded={abierto}
                onClick={() => alternar(f.clave)}
                className="w-full flex items-center gap-2 px-3 py-2 min-h-10 max-md:min-h-11 text-left font-sans text-body-sm text-neutral-600 hover:bg-neutral-50"
              >
                <span className="flex-1 min-w-0 truncate">{f.titulo}</span>
                <span aria-hidden="true">{abierto ? '▾' : '▸'}</span>
              </button>
              {abierto && <ol aria-label={f.titulo}>{f.eventos.map((e) => fila(e, false))}</ol>}
            </li>
          );
        })}
        {visibles.length === 0 && (
          <li className="px-3 py-3.5 font-sans text-body-sm text-neutral-600">
            {fuente.length === 0 ? (
              SIN_ACTIVIDAD
            ) : (
              <>
                <p>{SIN_EVENTOS_CON_FILTROS}</p>
                {hayFiltros && (
                  <button type="button" onClick={verTodos} className="mt-1 max-md:min-h-11 font-medium text-primary-600 hover:underline">
                    {VER_TODOS}
                  </button>
                )}
              </>
            )}
          </li>
        )}
      </ol>

      {/* G09: la última planificación estable como reporte de cierre; no detiene la operación. */}
      <BotonReporteCierre className="px-3 py-2 border-t border-neutral-200 shrink-0" />

      <div className="h-8 px-3 flex items-center text-body-sm border-t border-neutral-200 shrink-0">
        <button type="button" onClick={() => exportarCsv(visibles)} className="ml-auto font-sans text-neutral-600 hover:text-neutral-900">
          Exportar CSV
        </button>
      </div>
    </>
  );
};
