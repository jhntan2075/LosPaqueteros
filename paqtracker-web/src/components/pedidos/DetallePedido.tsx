import React, { useEffect, useRef } from 'react';
import { Map as MapIcon, Package, X } from 'lucide-react';
import { ALMACENES, UNIDADES } from '../../config/dominio';
import { NOMBRE_ESTADO_FRACCION, etiquetaPlazo } from '../../config/glosario';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { useFocoAtrapado } from '../../hooks/useFocoAtrapado';
import { useTrazabilidadPedido } from '../../hooks/useTrazabilidadPedido';
import { cn } from '../../lib/clases';
import { capitalizar, formatearHora } from '../../lib/formato';
import { vehiculoDeCodigo } from '../../services/servicioPedidos';
import type { EstadoFraccion, Fraccion, HitoTrazabilidad } from '../../types/operacion';
import type { PedidoEnCola } from '../../types/pedidos';
import { COLOR_SIN_DATO, iconoVehiculo } from '../map/iconosVehiculo';
import { Boton, FilaDato, Insignia, Tarjeta, TituloGrupo, type Tono } from '../ui';
import { RecuadroHolgura } from './RecuadroHolgura';

// Detalle del pedido en Pedidos (panel que entra por la derecha). Arquitectura de información, de lo más
// urgente a lo de consulta:
//   1. Identidad: código, estado y cliente (qué pedido es y en qué va).
//   2. Plazo: ¿llega a tiempo? La holgura y las horas que la explican (tipo de entrega, límite, llegada).
//   3. Pedido: qué se entrega y dónde.
//   4. Reparto: quién lo lleva. Una fila por vehículo con su parte, origen y horarios; no se repite una
//      "salida" general porque cada vehículo tiene la suya.
//   5. Trazabilidad: el historial, al final, para consulta.
// Íconos solo donde aportan información: la silueta del vehículo (la misma de Flota, el mapa y su leyenda;
// en gris porque aquí no se codifica la carga) y las acciones. Los datos se rotulan con texto.

const nombreUnidad = (codigo: string) => {
  const vehiculo = vehiculoDeCodigo(codigo);
  return vehiculo ? `${capitalizar(UNIDADES[vehiculo.tipo].nombre)} ${vehiculo.codigo}` : codigo;
};

const nombreAlmacen = (id: Fraccion['origen']) => ALMACENES.find((a) => a.id === id)?.nombre ?? id;

const TONO_FRACCION: Record<EstadoFraccion, Tono> = {
  PROGRAMADA: 'neutral',
  EN_CAMINO: 'primary',
  ENTREGADA: 'ok',
  LIBERADA: 'warn',
};

/** Silueta del tipo de unidad (auto, moto o bicicleta), igual a la de Flota, el mapa y su leyenda. */
const SiluetaUnidad: React.FC<{ codigo: string }> = ({ codigo }) => {
  const vehiculo = vehiculoDeCodigo(codigo);
  if (!vehiculo) return null;
  const icono = iconoVehiculo(vehiculo.tipo, COLOR_SIN_DATO);
  return <img src={icono.href} alt="" width={icono.ancho} height={icono.alto} className="-my-1 block max-w-none shrink-0" />;
};

/** Un vehículo que lleva parte del pedido: cuánto lleva, desde dónde y sus horarios. */
const FilaVehiculo: React.FC<{ fraccion: Fraccion; cantidadPedido: number }> = ({ fraccion: f, cantidadPedido }) => (
  <li className="flex flex-col gap-0.5 py-2">
    <div className="flex items-center gap-2">
      <SiluetaUnidad codigo={f.unidad} />
      <span className="font-semibold tabular-nums text-neutral-900">{nombreUnidad(f.unidad)}</span>
      <span className="tabular-nums text-neutral-600">
        {f.cantidad} de {cantidadPedido} paq.
      </span>
      <Insignia tono={TONO_FRACCION[f.estado]} className="ml-auto">
        {NOMBRE_ESTADO_FRACCION[f.estado]}
      </Insignia>
    </div>
    <p className="pl-9 text-caption tabular-nums text-neutral-600">
      Desde {nombreAlmacen(f.origen)} · sale {formatearHora(f.salida)} · {f.estado === 'ENTREGADA' ? 'entregó' : 'llega'}{' '}
      {formatearHora(f.llegada)}
    </p>
  </li>
);

/** Historial del pedido en orden cronológico; el hito más reciente se resalta. */
const LineaDeTiempo: React.FC<{ hitos: HitoTrazabilidad[] }> = ({ hitos }) => (
  <ol className="flex flex-col">
    {hitos.map((hito, i) => (
      <li key={`${hito.titulo}-${i}`} className="flex gap-3">
        <span className="flex w-2.5 shrink-0 flex-col items-center" aria-hidden="true">
          <span className={cn('mt-1.5 size-2.5 rounded-full', hito.reciente ? 'bg-primary-600 ring-4 ring-primary-50' : 'bg-neutral-300')} />
          {i < hitos.length - 1 && <span className="mt-1 w-px flex-1 bg-neutral-200" />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className={cn('font-semibold', hito.reciente ? 'text-primary-700' : 'text-neutral-900')}>{hito.titulo}</span>
            <time className="shrink-0 text-caption tabular-nums text-neutral-600">{hito.hora}</time>
          </div>
          <p className="text-neutral-600">{hito.detalle}</p>
        </div>
      </li>
    ))}
  </ol>
);

interface DetallePedidoProps {
  pedido: PedidoEnCola;
  ejecucionId: string;
  /** Insignia del estado del pedido, la misma de la tabla. */
  estado: React.ReactNode;
  onCerrar: () => void;
  onVerEnLienzo?: () => void;
}

/** Panel lateral con el detalle y la trazabilidad del pedido; se cierra con Esc o tocando fuera. */
export const DetallePedido: React.FC<DetallePedidoProps> = ({ pedido, ejecucionId, estado, onCerrar, onVerEnLienzo }) => {
  const hitos = useTrazabilidadPedido(ejecucionId, pedido.codigo, pedido.estado);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const dialogo = useRef<HTMLElement>(null);
  useCerrarConEscape(true, onCerrar);
  useFocoAtrapado(dialogo);
  useEffect(() => {
    cerrarRef.current?.focus();
  }, []);

  const { fracciones } = pedido;
  const unidadesDistintas = new Set(fracciones.map((f) => f.unidad)).size;
  const entregado = pedido.estado === 'ENTREGADO' || pedido.estado === 'INCUMPLIDO';

  return (
    <>
      <div className="fixed inset-0 z-30 bg-neutral-900/20" onClick={onCerrar} aria-hidden="true" />
      <aside
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalle-pedido-titulo"
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-overlay motion-safe:animate-entrar-derecha"
      >
        {/* 1. Identidad */}
        <div className="flex min-h-16 shrink-0 items-center gap-3 border-b border-neutral-200 px-5 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-600">
            <Package className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 id="detalle-pedido-titulo" className="text-title-sm tabular-nums text-neutral-900">
                Pedido {pedido.codigo}
              </h2>
              {estado}
            </div>
            <p className="truncate text-body-sm text-neutral-600" title={pedido.cliente}>
              {pedido.cliente}
            </p>
          </div>
          <Boton ref={cerrarRef} variante="fantasma" icono={X} onClick={onCerrar} title="Cerrar" aria-label="Cerrar detalle del pedido" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-white p-4 text-body-sm">
          {/* 2. Plazo: lo primero que se decide al abrir un pedido es si llega a tiempo. */}
          <Tarjeta cuerpoClassName="flex flex-col gap-2 p-4">
            <TituloGrupo>Plazo</TituloGrupo>
            <RecuadroHolgura
              nivel={pedido.nivelHolgura}
              holgura={pedido.holgura}
              holguraMinutos={pedido.holguraMinutos}
              plazoHoras={pedido.plazoHoras}
            />
            <div className="flex flex-col">
              <FilaDato separador etiqueta="Tipo de entrega" valor={etiquetaPlazo(pedido.plazoHoras)} texto />
              <FilaDato separador etiqueta="Hora límite" valor={pedido.horaLimite} />
              <FilaDato
                separador
                etiqueta={entregado ? 'Entrega' : 'Llegada estimada'}
                valor={pedido.eta ?? 'Aún sin calcular'}
                tono={pedido.estado === 'INCUMPLIDO' ? 'critical' : 'neutral'}
              />
            </div>
          </Tarjeta>

          {/* 3. Pedido: qué y dónde. */}
          <Tarjeta cuerpoClassName="flex flex-col gap-1 p-4">
            <TituloGrupo>Pedido</TituloGrupo>
            <div className="flex flex-col">
              <FilaDato separador etiqueta="Cantidad" valor={`${pedido.cantidad} unidades de P`} />
              {pedido.destino && <FilaDato separador etiqueta="Destino (malla)" valor={`(${pedido.destino.x}, ${pedido.destino.y})`} />}
            </div>
          </Tarjeta>

          {/* 4. Reparto: todos los vehículos que llevan el pedido. */}
          <Tarjeta cuerpoClassName="flex flex-col gap-1 p-4">
            <TituloGrupo derecha={unidadesDistintas > 1 ? `pedido fraccionado en ${unidadesDistintas}` : undefined}>
              {unidadesDistintas > 1 ? 'Vehículos asignados' : 'Vehículo asignado'}
            </TituloGrupo>
            {fracciones.length > 0 ? (
              <ul aria-label="Vehículos asignados" className="flex flex-col divide-y divide-dashed divide-neutral-200">
                {fracciones.map((f) => (
                  <FilaVehiculo key={f.codigo} fraccion={f} cantidadPedido={pedido.cantidad} />
                ))}
              </ul>
            ) : pedido.vehiculo ? (
              <p className="flex items-center gap-2 py-2 font-semibold text-neutral-900">
                <SiluetaUnidad codigo={pedido.vehiculo.codigo} />
                {nombreUnidad(pedido.vehiculo.codigo)}
              </p>
            ) : (
              <p className="py-2 text-neutral-600">Sin asignar: se asignará en la próxima planificación.</p>
            )}
          </Tarjeta>

          {/* 5. Trazabilidad: historial, para consulta. */}
          <Tarjeta cuerpoClassName="flex flex-col gap-3 p-4">
            <TituloGrupo>Trazabilidad</TituloGrupo>
            {hitos.length > 0 ? (
              <LineaDeTiempo hitos={hitos} />
            ) : (
              <p className="text-neutral-600">Los hitos aparecerán cuando el pedido salga a reparto.</p>
            )}
          </Tarjeta>
        </div>

        {/* Acciones */}
        {onVerEnLienzo && (
          <div className="flex shrink-0 items-center border-t border-neutral-200 px-4 py-3">
            <Boton
              variante="primario"
              icono={MapIcon}
              className="flex-1"
              onClick={() => {
                onCerrar();
                onVerEnLienzo();
              }}
            >
              Ubicar en el mapa en vivo
            </Boton>
          </div>
        )}
      </aside>
    </>
  );
};
