import React, { useMemo, useRef, useState } from 'react';
import { ALMACENES } from '../../config/dominio';
import { NOMBRE_HOLGURA, vaEnUnidades } from '../../config/glosario';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { useDesplazarAResaltado } from '../../hooks/useDesplazarAResaltado';
import {
  fraccionesVigentes,
  listarPedidos,
  llegadaDePedido,
  pedidosConocidos,
  salidaDePedido,
  VENTANA_PANEL_HORAS,
  type FiltroPedidos,
  type OrdenPedidos,
  type SeleccionResaltable,
} from '../../lib/envios';
import { formatearHora } from '../../lib/formato';
import type { Coordenada } from '../../types/domain';
import type { Fraccion, PedidoOperacion, SeleccionPanel } from '../../types/operacion';
import { PuntoHolgura } from '../pedidos/iconos';
import { TituloSeccion } from './comunes';
import { FilaFraccion } from './FilaFraccion';

// Pestaña "Pedidos" del panel (rúbrica 91.EvaSw E31): cada pedido con su destino, cantidad, unidades, ruta y
// horarios; si va fraccionado, una fila por fracción con su unidad, origen, salida y llegada (el "producto"
// de la rúbrica, F02). Filtros con ventanas de 4 h del reloj simulado (E32, E33).

const FILTROS: { valor: FiltroPedidos; etiqueta: string }[] = [
  { valor: 'TODOS', etiqueta: 'Todos' },
  { valor: 'EN_CAMINO', etiqueta: 'En camino' },
  { valor: 'EN_ESPERA', etiqueta: 'En espera' },
  { valor: 'POR_ENTREGAR_4H', etiqueta: `Por entregar · ${VENTANA_PANEL_HORAS} h` },
  { valor: 'ENTREGADOS_4H', etiqueta: `Entregados · ${VENTANA_PANEL_HORAS} h` },
];

const ORDENES: { valor: OrdenPedidos; etiqueta: string }[] = [
  { valor: 'HORA_LIMITE', etiqueta: 'Hora límite' },
  { valor: 'LLEGADA', etiqueta: 'Llegada' },
  { valor: 'SALIDA', etiqueta: 'Salida' },
];

const VACIO: Record<FiltroPedidos, string> = {
  TODOS: 'No hay pedidos activos ni entregados en las últimas 4 h.',
  EN_CAMINO: 'Ningún pedido va en camino ahora.',
  EN_ESPERA: 'Ningún pedido espera unidad.',
  POR_ENTREGAR_4H: `Ningún pedido llega a su destino en las próximas ${VENTANA_PANEL_HORAS} h.`,
  ENTREGADOS_4H: `Ningún pedido se entregó en las últimas ${VENTANA_PANEL_HORAS} h.`,
};

const nombreAlmacen = (id: Fraccion['origen']) => ALMACENES.find((a) => a.id === id)?.nombre ?? id;

/** Segunda línea del pedido: ruta (origen → unidad) y horarios, o en qué espera. */
function resumenRuta(p: PedidoOperacion): string {
  const vigentes = fraccionesVigentes(p);
  if (vigentes.length === 0) return p.estado === 'Entregado' ? `entregado ${p.entrega ? formatearHora(p.entrega) : ''}`.trim() : `En espera de unidad · límite ${formatearHora(p.horaLimiteFecha)}`;
  const salida = salidaDePedido(p);
  const llegada = llegadaDePedido(p);
  const verbo = p.estado === 'Entregado' ? 'entregado' : 'llega';
  if (vigentes.length === 1) {
    const f = vigentes[0];
    return `${nombreAlmacen(f.origen)} → ${f.unidad} · sale ${formatearHora(f.salida)} · ${verbo} ${llegada ? formatearHora(llegada) : '—'}`;
  }
  const primera = Math.min(...vigentes.map((f) => f.llegada.getTime()));
  return `${vaEnUnidades(vigentes.length)} · sale ${salida ? formatearHora(salida) : '—'} · ${verbo} ${formatearHora(new Date(primera))}–${
    llegada ? formatearHora(llegada) : '—'
  }`;
}

interface ListaPedidosProps {
  resaltado: SeleccionResaltable | null;
  onResaltar: (objeto: SeleccionResaltable) => void;
  onSeleccionar: (seleccion: SeleccionPanel) => void;
  onCentrar: (punto: Coordenada) => void;
}

export const ListaPedidos: React.FC<ListaPedidosProps> = ({ resaltado, onResaltar, onSeleccionar, onCentrar }) => {
  const datos = useDatosOperacion();
  const [filtro, setFiltro] = useState<FiltroPedidos>('TODOS');
  const [orden, setOrden] = useState<OrdenPedidos>('HORA_LIMITE');
  const [termino, setTermino] = useState('');
  const listaRef = useRef<HTMLUListElement>(null);
  const pedidos = useMemo(() => listarPedidos(pedidosConocidos(datos), filtro, termino, orden, datos.reloj), [datos, filtro, termino, orden]);
  const pedidoResaltado = resaltado?.tipo === 'pedido' ? resaltado.codigo : resaltado?.tipo === 'fraccion' ? resaltado.pedido : null;
  useDesplazarAResaltado(listaRef, pedidoResaltado ? `[data-pedido="${pedidoResaltado}"]` : null);

  const resaltarFraccion = (f: Fraccion, destino: Coordenada) => {
    onResaltar({ tipo: 'fraccion', codigo: f.codigo, pedido: f.pedido, unidad: f.unidad });
    onCentrar(destino);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <section aria-label="Lista de pedidos" className="px-[12px] pt-[9px] pb-[6px] flex flex-col gap-[6px]">
        <TituloSeccion derecha={`${pedidos.length}`}>Pedidos</TituloSeccion>
        <input
          type="search"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Buscar por pedido, cliente o unidad"
          aria-label="Buscar en la lista de pedidos"
          className="h-[28px] px-[8px] rounded-[4px] border border-[#E2E8F0] text-[12px] focus:outline-none focus:ring-1 focus:ring-[#1E40AF]"
        />
        <div className="flex flex-wrap gap-[4px]" role="group" aria-label="Filtrar pedidos">
          {FILTROS.map(({ valor, etiqueta }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={filtro === valor}
              onClick={() => setFiltro(valor)}
              className={`px-[7px] py-[3px] rounded-[4px] text-[12px] font-sans ${
                filtro === valor ? 'bg-[#DBEAFE] text-[#1E40AF] font-medium' : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-[6px] text-[12px] text-[#64748B]">
          Ordenar por
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as OrdenPedidos)}
            className="h-[24px] px-[4px] rounded-[4px] border border-[#E2E8F0] text-[12px] text-[#0F172A] bg-white"
          >
            {ORDENES.map(({ valor, etiqueta }) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </label>
        {pedidos.length === 0 && <p className="text-[12px] text-[#64748B]">{termino.trim() ? 'Ningún pedido coincide con la búsqueda.' : VACIO[filtro]}</p>}
        <ul ref={listaRef} className="flex flex-col">
          {pedidos.map((p) => {
            const seleccionado = pedidoResaltado === p.codigo && resaltado?.tipo === 'pedido';
            const fracciones = p.fracciones;
            const objeto: SeleccionResaltable = { tipo: 'pedido', codigo: p.codigo };
            return (
              <li key={p.codigo} data-pedido={p.codigo} aria-current={seleccionado ? 'true' : undefined} className="border-b border-[#F1F5F9] last:border-b-0">
                <div className={`flex items-stretch rounded ${seleccionado ? 'bg-[#EFF6FF] ring-1 ring-[#1E40AF]' : ''}`}>
                  <button
                    type="button"
                    // Primer clic: resalta todas sus rutas (F03) y centra el destino; con el pedido ya marcado, abre su detalle.
                    onClick={() => {
                      if (seleccionado) onSeleccionar(objeto);
                      else {
                        onResaltar(objeto);
                        onCentrar(p.destino);
                      }
                    }}
                    className="flex-1 min-w-0 py-[5px] px-[4px] flex flex-col gap-[1px] text-left text-[12px] hover:bg-[#F8FAFC] rounded"
                  >
                    <span className="flex items-center gap-[7px] w-full">
                      <PuntoHolgura nivel={p.nivel} />
                      <span className="sr-only">{NOMBRE_HOLGURA[p.nivel]}</span>
                      <span className="tabular-nums font-semibold text-[#0F172A]">{p.codigo}</span>
                      <span className="tabular-nums text-[#64748B] truncate">
                        → ({p.destino.x},{p.destino.y}) · {p.cantidad} paq.
                      </span>
                      <span className="ml-auto text-[#64748B] whitespace-nowrap">{p.estado}</span>
                    </span>
                    <span className="pl-[14px] text-[11px] text-[#64748B] tabular-nums truncate">{resumenRuta(p)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSeleccionar(objeto)}
                    aria-label={`Ver detalle del pedido ${p.codigo}`}
                    className="w-[24px] shrink-0 text-[#64748B] hover:text-[#0F172A]"
                  >
                    ›
                  </button>
                </div>
                {fracciones.length > 1 && (
                  <ul aria-label={`Fracciones del pedido ${p.codigo}`} className="pl-[14px] pb-[4px] flex flex-col">
                    {fracciones.map((f) => (
                      <FilaFraccion
                        key={f.codigo}
                        fraccion={f}
                        total={fracciones.length}
                        contexto="ruta"
                        ahora={datos.reloj}
                        resaltada={resaltado?.tipo === 'fraccion' && resaltado.codigo === f.codigo}
                        onElegir={(fraccion) => resaltarFraccion(fraccion, p.destino)}
                      />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-[11px] text-[#64748B]">
          Un clic resalta en el mapa las rutas del pedido; en un pedido fraccionado, cada fracción resalta solo la ruta de su unidad. Otro clic, o ›,
          abre el detalle.
        </p>
      </section>
    </div>
  );
};
