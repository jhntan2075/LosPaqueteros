import React, { useMemo, useRef, useState } from 'react';
import { ALMACENES, type IdAlmacen } from '../../config/dominio';
import { alertaStockBajo, NOMBRE_CARGA, STOCK_CENTRAL } from '../../config/glosario';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { useDesplazarAResaltado } from '../../hooks/useDesplazarAResaltado';
import { buscarPedido, enviosDeAlmacen, VENTANA_PANEL_HORAS, type SeleccionResaltable } from '../../lib/envios';
import { formatearHora } from '../../lib/formato';
import { FONDO_SEMAFORO, TEXTO_SEMAFORO } from '../../lib/semaforo';
import type { Coordenada } from '../../types/domain';
import type { Fraccion, SeleccionPanel } from '../../types/operacion';
import { MarcaSemaforo } from '../map/simbolos';
import { TituloSeccion } from './comunes';
import { FilaFraccion, type ContextoFraccion } from './FilaFraccion';

// Pestaña "Almacenes" del panel (rúbrica 91.EvaSw E18, E19, F05) y las listas de envíos de cada almacén
// (E20 en camino, E21 por salir en las próximas 4 h, E22 entregados en las últimas 4 h).

interface ListaAlmacenesProps {
  resaltado: SeleccionResaltable | null;
  onResaltar: (objeto: SeleccionResaltable) => void;
  onSeleccionar: (seleccion: SeleccionPanel) => void;
  onCentrar: (punto: Coordenada) => void;
}

/** Contadores compactos de una fila: lo que va en camino, lo que sale pronto y lo entregado. */
const Contadores: React.FC<{ enCamino: number; porSalir: number; entregadas: number }> = ({ enCamino, porSalir, entregadas }) => (
  <span className="text-caption text-neutral-600 tabular-nums">
    ↗ {enCamino} en camino · ⏱ {porSalir} por salir · ✓ {entregadas} entregados
  </span>
);

export const ListaAlmacenes: React.FC<ListaAlmacenesProps> = ({ resaltado, onResaltar, onSeleccionar, onCentrar }) => {
  const datos = useDatosOperacion();
  const listaRef = useRef<HTMLUListElement>(null);
  const codigoResaltado = resaltado?.tipo === 'almacen' ? resaltado.codigo : null;
  useDesplazarAResaltado(listaRef, codigoResaltado ? `[data-almacen="${codigoResaltado}"]` : null);
  const envios = useMemo(
    () => Object.fromEntries(ALMACENES.map((a) => [a.id, enviosDeAlmacen(datos, a.id, datos.reloj)])) as Record<IdAlmacen, ReturnType<typeof enviosDeAlmacen>>,
    [datos],
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <section aria-label="Lista de almacenes" className="px-3 pt-2.5 pb-1.5 flex flex-col gap-1.5">
        <TituloSeccion derecha={`envíos · ${VENTANA_PANEL_HORAS} h`}>Stock y envíos</TituloSeccion>
        <ul ref={listaRef} className="flex flex-col gap-1">
          {ALMACENES.map((almacen) => {
            const estado = datos.almacenes.find((a) => a.id === almacen.id);
            const central = almacen.id === 'CENTRAL';
            const nivel = estado?.nivelStock ?? null;
            const conStock = !central && estado?.stock != null && estado.capacidad != null && nivel !== null;
            const porcentaje = conStock ? Math.round(((estado.stock as number) / (estado.capacidad as number)) * 100) : null;
            const seleccionado = codigoResaltado === almacen.id;
            const { enCamino, porSalir, entregadas } = envios[almacen.id];
            const objeto: SeleccionResaltable = { tipo: 'almacen', codigo: almacen.id };
            return (
              <li
                key={almacen.id}
                data-almacen={almacen.id}
                aria-current={seleccionado ? 'true' : undefined}
                className={`flex items-stretch rounded-control border ${seleccionado ? 'border-primary-600 bg-primary-50' : 'border-neutral-200'}`}
              >
                <button
                  type="button"
                  // Primer clic: lo marca y lo centra en el mapa; con la fila ya marcada, abre su detalle.
                  onClick={() => {
                    if (seleccionado) onSeleccionar(objeto);
                    else {
                      onResaltar(objeto);
                      onCentrar(almacen.ubicacion);
                    }
                  }}
                  className="flex-1 min-w-0 px-2.5 py-2 flex flex-col gap-1 text-left text-body-sm rounded-l-control hover:bg-neutral-50"
                >
                  <span className="flex items-center gap-2 w-full">
                    {conStock && nivel ? (
                      <MarcaSemaforo nivel={nivel} titulo={NOMBRE_CARGA[nivel]} />
                    ) : (
                      <span aria-hidden="true" className="size-2 rounded-sm bg-neutral-900 shrink-0" />
                    )}
                    <span className="font-semibold text-neutral-900">{almacen.nombre}</span>
                    <span className="text-neutral-600">{central ? 'Central' : 'Intermedio'}</span>
                    <span className={`ml-auto tabular-nums whitespace-nowrap ${conStock && nivel ? TEXTO_SEMAFORO[nivel] : 'text-neutral-600'}`}>
                      {conStock ? `${estado.stock}/${estado.capacidad} · ${porcentaje} %` : central ? 'Sin tope' : '—'}
                    </span>
                  </span>
                  {conStock && nivel ? (
                    <span className="h-1 bg-neutral-200 rounded-full overflow-hidden" aria-hidden="true">
                      <span className={`block h-full rounded-full ${FONDO_SEMAFORO[nivel]}`} style={{ width: `${Math.min(100, porcentaje ?? 0)}%` }} />
                    </span>
                  ) : (
                    central && <span className="text-caption text-neutral-600">{STOCK_CENTRAL}</span>
                  )}
                  <span className="flex items-center gap-2">
                    <Contadores enCamino={enCamino.length} porSalir={porSalir.length} entregadas={entregadas.length} />
                    {estado?.stockBajo && <span className="ml-auto text-caption font-medium text-neutral-900">! {alertaStockBajo()}</span>}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSeleccionar(objeto)}
                  aria-label={`Ver detalle del almacén ${almacen.nombre}`}
                  className="w-7 shrink-0 flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-r-control border-l border-neutral-200"
                >
                  ›
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-caption text-neutral-600">Un clic marca el almacén en el mapa; otro clic, o ›, abre su detalle.</p>
      </section>
    </div>
  );
};

// --- Envíos de un almacén (detalle) --------------------------------------------------------------

type Vista = 'enCamino' | 'porSalir' | 'entregadas';

const VACIO: Record<Vista, (desde: string) => string> = {
  enCamino: () => 'Ningún envío de este almacén va en camino ahora.',
  porSalir: () => `Ninguna unidad sale de este almacén en las próximas ${VENTANA_PANEL_HORAS} h.`,
  entregadas: (desde) => `Nada entregado desde este almacén en las últimas ${VENTANA_PANEL_HORAS} h (desde las ${desde}).`,
};

const CONTEXTO: Record<Vista, ContextoFraccion> = { enCamino: 'llegada', porSalir: 'salida', entregadas: 'entrega' };

/**
 * Subpestañas del detalle de un almacén con sus envíos: en camino (E20), por salir en las próximas 4 h (E21)
 * y entregados en las últimas 4 h (E22). Las ventanas usan el reloj simulado de la ejecución.
 */
export const EnviosAlmacen: React.FC<{ almacen: IdAlmacen; onSeleccionar: (seleccion: SeleccionPanel) => void }> = ({ almacen, onSeleccionar }) => {
  const datos = useDatosOperacion();
  const [vista, setVista] = useState<Vista>('enCamino');
  const envios = useMemo(() => enviosDeAlmacen(datos, almacen, datos.reloj), [datos, almacen]);
  const lista = envios[vista];
  const desde = formatearHora(new Date(datos.reloj.getTime() - VENTANA_PANEL_HORAS * 3_600_000));
  const elegir = (f: Fraccion) => onSeleccionar({ tipo: 'fraccion', codigo: f.codigo, pedido: f.pedido, unidad: f.unidad });
  const opciones: { valor: Vista; etiqueta: string }[] = [
    { valor: 'enCamino', etiqueta: `En camino (${envios.enCamino.length})` },
    { valor: 'porSalir', etiqueta: `Por salir · ${VENTANA_PANEL_HORAS} h (${envios.porSalir.length})` },
    { valor: 'entregadas', etiqueta: `Entregados · ${VENTANA_PANEL_HORAS} h (${envios.entregadas.length})` },
  ];
  return (
    <section aria-label="Envíos del almacén" className="border-b border-neutral-200">
      <div className="h-7 px-3 flex items-center gap-3 border-b border-neutral-200 text-body-sm overflow-x-auto" role="tablist" aria-label="Envíos del almacén">
        {opciones.map(({ valor, etiqueta }) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={vista === valor}
            onClick={() => setVista(valor)}
            className={`font-sans whitespace-nowrap ${vista === valor ? 'font-semibold text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'}`}
          >
            {etiqueta}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="px-3 py-1.5">
        {lista.length === 0 ? (
          <p className="text-body-sm text-neutral-600">{VACIO[vista](desde)}</p>
        ) : (
          <ul className="flex flex-col">
            {lista.map((f) => {
              const pedido = buscarPedido(datos, f.pedido);
              return (
                <FilaFraccion
                  key={f.codigo}
                  fraccion={f}
                  total={pedido?.fracciones.length ?? 1}
                  contexto={CONTEXTO[vista]}
                  ahora={datos.reloj}
                  destino={pedido?.destino}
                  onElegir={elegir}
                />
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
