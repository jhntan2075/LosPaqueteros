import React, { useState } from 'react';
import { ALMACENES, CORTE_OCUPACION, UNIDADES } from '../../config/dominio';
import { alertaStockBajo, NOMBRE_CARGA, SITUACION_UNIDAD, etiquetaPlazo, nombreAveria } from '../../config/glosario';
import { admisionDeAverias, useAveriaPendiente, useAverias } from '../../hooks/useAverias';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { useTrazabilidadPedido } from '../../hooks/useTrazabilidadPedido';
import { capitalizar, formatearHora, formatearMomento } from '../../lib/formato';
import { cantidadBloqueos, distanciaDesdeOrigen, fueraDelAlmacen, pedidosEnRiesgo, unidadPorCodigo } from '../../lib/operacion';
import { BORDE_SEMAFORO, FONDO_SEMAFORO, TEXTO_SEMAFORO, nivelDeOcupacion } from '../../lib/semaforo';
import { turnoVigente } from '../../lib/turnos';
import type { Coordenada } from '../../types/domain';
import type { PedidoOperacion, SeleccionPanel, UnidadOperacion } from '../../types/operacion';
import { TITULO_PESTANA } from '../../hooks/useNavegacionPanel';
import { buscarPedido, type SeleccionResaltable } from '../../lib/envios';
import { FilaFraccion } from './FilaFraccion';
import { EnviosAlmacen, ListaAlmacenes } from './ListaAlmacenes';
import { ListaPedidos } from './ListaPedidos';
import type { NivelHolgura } from '../../types/pedidos';
import { iconoDeUnidad } from '../map/iconosVehiculo';
import { MarcaSemaforo } from '../map/simbolos';
import { COLOR_HOLGURA } from '../pedidos/estilos';
import { PuntoHolgura } from '../pedidos/iconos';
import { BitacoraEventos } from './BitacoraEventos';
import { Trazabilidad } from './Trazabilidad';
import { RecuadroHolgura } from '../pedidos/RecuadroHolgura';
import { FilaConBarra, TituloSeccion } from './comunes';
import { useAvisos } from '../../hooks/useAvisos';
import { DialogoRegistrarAveria } from './DialogoRegistrarAveria';
import { EstadoFlota } from './EstadoFlota';
import { ResumenOperacion } from './ResumenOperacion';

// Panel derecho del mapa (Figma 1:4793 detalle de pedido, 1:5300 detalle de vehículo), el mismo en
// Operación y en la corrida: Resumen, Incidencias, Flota y Bitácora se eligen desde la barra vertical
// de paneles (fuera de este componente); aquí solo vive el contenido de la pestaña activa y el detalle
// del objeto seleccionado. Implementado sobre las capturas de los frames: el contexto de diseño no
// estuvo disponible (límite de llamadas de Figma).

export type { SeleccionPanel };

interface PanelLateralProps {
  seleccion: SeleccionPanel;
  onSeleccionar: (seleccion: SeleccionPanel) => void;
  onCerrar: () => void;
  onCentrar: (punto: Coordenada) => void;
  /** "‹ Volver" de un detalle (pedido, vehículo o almacén); sin valor, vuelve a Incidencias. */
  onVolver?: () => void;
  /** Adónde lleva "‹": la pestaña o el detalle anterior ("Flota", "Almacén Central"). */
  etiquetaVolver?: string;
  /** Objeto marcado en el mapa y en las listas (F01, F05). */
  resaltado?: SeleccionResaltable | null;
  /** Marca un objeto desde una fila de lista, sin salir de la lista. */
  onResaltar?: (objeto: SeleccionResaltable) => void;
}

/** Mismo punto de 7 px para los cuatro niveles: la forma del semáforo no cambia de una pantalla a otra. */
const Semaforo: React.FC<{ nivel: NivelHolgura }> = ({ nivel }) => <PuntoHolgura nivel={nivel} />;

const Dato: React.FC<{ etiqueta: string; valor: React.ReactNode }> = ({ etiqueta, valor }) => (
  <div className="h-6 px-3 flex items-center justify-between gap-3 text-body-sm">
    <span className="font-sans text-neutral-600 whitespace-nowrap">{etiqueta}</span>
    <span className="tabular-nums text-neutral-900 whitespace-nowrap truncate">{valor}</span>
  </div>
);

const Subpestanas = <T extends string>({ opciones, activa, onCambiar, derecha }: {
  opciones: { valor: T; etiqueta: string }[];
  activa: T;
  onCambiar: (valor: T) => void;
  derecha?: React.ReactNode;
}) => (
  <div className="h-7 px-3 flex items-center gap-3.5 border-b border-neutral-200 text-body-sm" role="tablist">
    {opciones.map(({ valor, etiqueta }) => (
      <button
        key={valor}
        type="button"
        role="tab"
        aria-selected={activa === valor}
        onClick={() => onCambiar(valor)}
        className={`font-sans ${activa === valor ? 'font-semibold text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'}`}
      >
        {etiqueta}
      </button>
    ))}
    {derecha && <span className="ml-auto tabular-nums text-neutral-600">{derecha}</span>}
  </div>
);

const EncabezadoObjeto: React.FC<{ onVolver: () => void; onCerrar: () => void; titulo: React.ReactNode; estado: string; etiquetaVolver?: string }> = ({
  onVolver,
  onCerrar,
  titulo,
  estado,
  etiquetaVolver,
}) => (
  <div className="px-3 py-2.5 border-b border-neutral-200 flex flex-col gap-1.5">
    <div className="flex items-center justify-between">
      {/* Miga: dice adónde vuelve (la pestaña o el detalle anterior), no un "Volver" genérico. */}
      <button
        type="button"
        onClick={onVolver}
        aria-label={etiquetaVolver ? `Volver a ${etiquetaVolver}` : 'Volver'}
        className="font-sans text-body-sm text-primary-600 hover:underline"
      >
        ‹ {etiquetaVolver ?? 'Volver'}
      </button>
      <button type="button" onClick={onCerrar} aria-label="Cerrar panel" className="size-6 rounded-control text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
        ✕
      </button>
    </div>
    <div className="flex items-center gap-2">
      <h3 className="tabular-nums text-title-sm text-neutral-900 flex items-center gap-2">{titulo}</h3>
      <span className="ml-auto border border-neutral-200 rounded px-1.5 py-0.5 font-sans font-medium text-body-sm text-neutral-900">{estado}</span>
    </div>
  </div>
);

const Acciones: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="h-8 px-3 flex items-center justify-between border-t border-neutral-200 text-body-sm shrink-0">{children}</div>
);

const nombreUnidad = (u: UnidadOperacion) => `${capitalizar(UNIDADES[u.tipo].nombre)} ${u.codigo}`;
const formatoSoles = (monto: number) => `S/ ${monto.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;

// --- Detalle de pedido ---------------------------------------------------------------------------

const DetallePedido: React.FC<{ pedido: PedidoOperacion; fraccionResaltada?: string } & Omit<PanelLateralProps, 'seleccion'>> = ({
  pedido,
  fraccionResaltada,
  onSeleccionar,
  onCentrar,
  onCerrar,
  onVolver,
  etiquetaVolver,
}) => {
  const volver = onVolver ?? (() => onSeleccionar({ tipo: 'incidencias' }));
  const datos = useDatosOperacion();
  const hitos = useTrazabilidadPedido(datos.ejecucionId, pedido.codigo, pedido.estado);
  const unidad = unidadPorCodigo(datos, pedido.unidad);
  // Un pedido fraccionado va repartido en varias unidades: se listan todas las que lo llevan a bordo.
  const portadoras = datos.flota.flatMap((u) => {
    const parada = u.paradas.find((p) => p.pedido === pedido.codigo);
    return parada ? [{ unidad: u, parada }] : [];
  });
  const origen = unidad ? ALMACENES.find((a) => a.id === unidad.origen) : undefined;
  const km = distanciaDesdeOrigen(datos, pedido);
  return (
    <>
      <EncabezadoObjeto onVolver={volver} onCerrar={onCerrar} titulo={`Pedido ${pedido.codigo}`} estado={pedido.estado} etiquetaVolver={etiquetaVolver} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-3 border-b border-neutral-200">
          <RecuadroHolgura nivel={pedido.nivel} holgura={pedido.holgura} holguraMinutos={pedido.holguraMinutos} plazoHoras={pedido.plazoHoras} />
        </div>
        <div className="py-1 border-b border-neutral-200">
          <Dato etiqueta="Cliente" valor={pedido.cliente} />
          <Dato etiqueta="Cantidad" valor={`${pedido.cantidad} unidades de P`} />
          <Dato etiqueta="Tipo de entrega" valor={etiquetaPlazo(pedido.plazoHoras)} />
          <Dato etiqueta="Registrado" valor={pedido.registrado} />
          <Dato etiqueta="Hora límite" valor={pedido.horaLimite} />
          <Dato etiqueta="Llegada estimada" valor={pedido.eta} />
          <Dato etiqueta="Destino" valor={`(${pedido.destino.x},${pedido.destino.y})`} />
          {pedido.fracciones.length > 0 ? (
            <FraccionesDelPedido pedido={pedido} resaltada={fraccionResaltada} onSeleccionar={onSeleccionar} />
          ) : portadoras.length > 1 ? (
            <div className="px-3 py-1 flex flex-col gap-0.5 text-body-sm">
              <span className="font-sans text-neutral-600">Vehículos asignados · pedido fraccionado en {portadoras.length}</span>
              <ul aria-label="Vehículos asignados" className="flex flex-col">
                {portadoras.map(({ unidad: u, parada }) => (
                  <li key={u.codigo}>
                    <button
                      type="button"
                      onClick={() => onSeleccionar({ tipo: 'vehiculo', codigo: u.codigo })}
                      className="w-full h-6 flex items-center gap-2 tabular-nums text-neutral-900 hover:underline"
                    >
                      <span>{nombreUnidad(u)}</span>
                      <span className="text-neutral-600">
                        {parada.cantidad} de {pedido.cantidad} paq.
                      </span>
                      <span className="ml-auto text-neutral-600">llega {parada.eta}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Dato
              etiqueta="Vehículo asignado"
              valor={
                unidad ? (
                  <button type="button" onClick={() => onSeleccionar({ tipo: 'vehiculo', codigo: unidad.codigo })} className="hover:underline">
                    {nombreUnidad(unidad)} · {unidad.carga}/{unidad.capacidad}
                  </button>
                ) : (
                  'Sin asignar'
                )
              }
            />
          )}
          {unidad && origen && km !== null && (
            <Dato etiqueta="Origen / distancia" valor={`${origen.nombre} · ${km} km · ${formatoSoles(km * UNIDADES[unidad.tipo].costoKm)}`} />
          )}
        </div>
        <Trazabilidad hitos={hitos} />
      </div>
      <Acciones>
        <button type="button" onClick={() => onCentrar(pedido.destino)} className="font-sans font-medium text-primary-600 hover:underline">
          Centrar en el mapa
        </button>
      </Acciones>
    </>
  );
};

/**
 * Fracciones del pedido (E31): una fila por unidad con su almacén de origen, salida, llegada y estado. Elegir
 * una resalta en el mapa solo la ruta de su unidad (F02); la que ya está elegida se marca.
 */
const FraccionesDelPedido: React.FC<{ pedido: PedidoOperacion; resaltada?: string; onSeleccionar: PanelLateralProps['onSeleccionar'] }> = ({
  pedido,
  resaltada,
  onSeleccionar,
}) => {
  const { reloj } = useDatosOperacion();
  const total = pedido.fracciones.length;
  return (
    <div className="px-3 py-1 flex flex-col gap-0.5 text-body-sm">
      <span className="font-sans text-neutral-600">
        {total > 1 ? `Fracciones · el pedido va en ${new Set(pedido.fracciones.map((f) => f.unidad)).size} unidades` : 'Unidad y horarios'}
      </span>
      <ul aria-label="Fracciones del pedido" className="flex flex-col">
        {pedido.fracciones.map((f) => (
          <FilaFraccion
            key={f.codigo}
            fraccion={f}
            total={total}
            contexto="ruta"
            ahora={reloj}
            resaltada={resaltada === f.codigo}
            onElegir={(fraccion) => onSeleccionar({ tipo: 'fraccion', codigo: fraccion.codigo, pedido: fraccion.pedido, unidad: fraccion.unidad })}
          />
        ))}
      </ul>
      {resaltada && <p className="text-caption text-primary-600">En el mapa se resalta solo la ruta de la fracción {resaltada}.</p>}
    </div>
  );
};

// --- Detalle de vehículo -------------------------------------------------------------------------


const Paradas: React.FC<{ unidad: UnidadOperacion; onSeleccionar: PanelLateralProps['onSeleccionar'] }> = ({ unidad, onSeleccionar }) => (
  <section className="px-3 pt-2.5 pb-1.5 flex flex-col gap-1.5">
    <TituloSeccion derecha={unidad.totalParadas > 0 ? `${unidad.totalParadas} ${unidad.totalParadas === 1 ? 'parada' : 'paradas'}` : undefined}>
      Próximas paradas
    </TituloSeccion>
    {unidad.paradas.length === 0 && <p className="font-sans text-body-sm text-neutral-600">Sin paradas asignadas.</p>}
    {unidad.paradas.map((p) => (
      <button
        key={p.pedido}
        type="button"
        onClick={() => onSeleccionar({ tipo: 'pedido', codigo: p.pedido })}
        className="h-6 flex items-center gap-2 text-body-sm hover:bg-neutral-50 -mx-1 px-1 rounded"
      >
        <Semaforo nivel={p.nivel} />
        <span className="tabular-nums font-semibold text-neutral-900">{p.pedido}</span>
        <span className="tabular-nums text-neutral-600">
          ({p.destino.x},{p.destino.y})
        </span>
        <span className="tabular-nums text-neutral-900">{p.cantidad} paq.</span>
        <span className="ml-auto tabular-nums text-neutral-600">llega {p.eta}</span>
        <span className={`tabular-nums font-medium ${COLOR_HOLGURA[p.nivel]}`}>{p.holgura}</span>
      </button>
    ))}
  </section>
);

/** Abre el diálogo de registro de avería; con unidad, ya elegida. */
type AbrirRegistroAveria = (unidad?: string) => void;

/** Recuadro de la avería vigente, con el mismo formato que los recuadros de holgura y ocupación. */
const RecuadroAveria: React.FC<{ unidad: UnidadOperacion; reloj: Date }> = ({ unidad, reloj }) => (
  <div className="border border-critical-600 bg-critical-50 rounded-control px-3 py-2 flex flex-col gap-1 text-body-sm">
    <span className="flex items-center gap-1.5 font-semibold text-body text-critical-600">
      <span aria-hidden="true">✕</span> Averiada{unidad.averia && ` · ${nombreAveria(unidad.averia.tipo)}`}
    </span>
    {unidad.averia ? (
      <>
        <span className="text-neutral-900 tabular-nums">
          Desde {formatearMomento(unidad.averia.desde, reloj)} · vuelve a operar {formatearMomento(unidad.averia.vuelve, reloj)}
        </span>
        {unidad.averia.trasladoCentral && (
          <span className="text-neutral-600 tabular-nums">Traslado al almacén central: {formatearMomento(unidad.averia.trasladoCentral, reloj)}</span>
        )}
      </>
    ) : (
      <span className="text-neutral-600">Fuera de servicio hasta su reincorporación.</span>
    )}
  </div>
);

const DetalleVehiculo: React.FC<
  { unidad: UnidadOperacion; onRegistrarAveria: AbrirRegistroAveria; onDeshacerAveria: (unidad: string) => void } & Omit<PanelLateralProps, 'seleccion'>
> = ({ unidad, onSeleccionar, onCentrar, onCerrar, onRegistrarAveria, onDeshacerAveria, onVolver, etiquetaVolver }) => {
  const volver = onVolver ?? (() => onSeleccionar({ tipo: 'incidencias' }));
  const [pestana, setPestana] = useState<'resumen' | 'ruta'>('resumen');
  const parametros = UNIDADES[unidad.tipo];
  const datos = useDatosOperacion();
  const { reloj } = datos;
  const pendiente = useAveriaPendiente(datos, unidad.codigo);
  const admision = admisionDeAverias(datos);
  const averiada = unidad.estado === 'AVERIADA';
  const turno = turnoVigente(reloj);
  const nivel = nivelDeOcupacion(unidad.carga, unidad.capacidad);
  const fraccion = unidad.capacidad === 0 ? 0 : unidad.carga / unidad.capacidad;
  const enRojo = unidad.paradas.filter((p) => p.nivel === 'ROJO').length;
  // El servidor solo informa si la unidad está en refrigerio ahora; no hay hora programada que mostrar.
  const alimentacion = unidad.alimentacion.cumplida ? 'No' : 'En curso';
  return (
    <>
      <EncabezadoObjeto
        onVolver={volver}
        onCerrar={onCerrar}
        etiquetaVolver={etiquetaVolver}
        titulo={
          <>
            <img src={iconoDeUnidad(unidad).href} alt="" className="block -my-1.5 -ml-1" />
            {nombreUnidad(unidad)}
          </>
        }
        estado={SITUACION_UNIDAD[unidad.situacion]}
      />
      <Subpestanas
        opciones={[
          { valor: 'resumen', etiqueta: 'Resumen' },
          { valor: 'ruta', etiqueta: 'Ruta' },
        ]}
        activa={pestana}
        onCambiar={setPestana}
        derecha={`nodo (${Math.round(unidad.posicion.x)},${Math.round(unidad.posicion.y)})`}
      />
      <div className="flex-1 min-h-0 overflow-y-auto">
        {pestana === 'resumen' && (
          <>
            <div className="p-3 border-b border-neutral-200 flex flex-col gap-2">
              {averiada && <RecuadroAveria unidad={unidad} reloj={reloj} />}
              {pendiente && (
                <div className="border border-primary-100 bg-primary-50 rounded-control px-3 py-2 flex items-center gap-2 text-body-sm text-primary-700">
                  <p role="status">
                    Avería registrada ({nombreAveria(pendiente.tipo).toLowerCase()}) · se aplica a las{' '}
                    <span className="tabular-nums">{formatearHora(new Date(pendiente.instanteMs))}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => onDeshacerAveria(unidad.codigo)}
                    className="ml-auto font-medium whitespace-nowrap hover:underline"
                  >
                    Cancelar avería
                  </button>
                </div>
              )}
              <div className={`border rounded-control px-3 pt-2 pb-2.5 flex flex-col gap-2 ${BORDE_SEMAFORO[nivel]}`}>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2 font-sans text-body-sm text-neutral-600">
                      <MarcaSemaforo nivel={nivel} /> ocupación · {NOMBRE_CARGA[nivel].toLowerCase()}
                    </span>
                    <span className={`tabular-nums text-kpi ${TEXTO_SEMAFORO[nivel]}`}>
                      {unidad.carga}/{unidad.capacidad}
                    </span>
                  </div>
                  <div className="flex flex-col items-end text-body-sm">
                    <span className={`tabular-nums ${TEXTO_SEMAFORO[nivel]}`}>{Math.round(fraccion * 100)} % de capacidad</span>
                    <span className="font-sans text-neutral-600">
                      ámbar desde {Math.round(CORTE_OCUPACION.ambar * 1000) / 10} %, rojo desde{' '}
                      {Math.round(CORTE_OCUPACION.rojo * 1000) / 10} %
                    </span>
                  </div>
                </div>
                <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${FONDO_SEMAFORO[nivel]}`} style={{ width: `${Math.min(100, fraccion * 100)}%` }} />
                </div>
              </div>
            </div>
            <div className="py-1 border-b border-neutral-200">
              <Dato etiqueta="Tipo / velocidad" valor={`${capitalizar(parametros.nombre)} · ${parametros.velocidadKmH} km/h`} />
              <Dato etiqueta="Turno vigente" valor={turno.actual} />
              <Dato etiqueta="Próximo turno" valor={turno.siguiente} />
              <Dato etiqueta="En refrigerio" valor={alimentacion} />
              {unidad.pedidoEnEntrega && <Dato etiqueta="Entregando ahora" valor={unidad.pedidoEnEntrega} />}
              <Dato etiqueta="Pedidos a bordo" valor={`${unidad.paradas.length}${enRojo > 0 ? ` · ${enRojo} en rojo` : ''}`} />
              <Dato etiqueta="Origen de carga" valor={ALMACENES.find((a) => a.id === unidad.origen)!.nombre} />
            </div>
          </>
        )}
        {(pestana === 'resumen' || pestana === 'ruta') && <Paradas unidad={unidad} onSeleccionar={onSeleccionar} />}
        {pestana === 'ruta' && unidad.ruta.length > 0 && (
          <p className="px-3 py-1.5 tabular-nums text-body-sm text-neutral-600">
            {unidad.ruta.map((p) => `(${p.x},${p.y})`).join(' → ')}
          </p>
        )}
      </div>
      <Acciones>
        <button type="button" onClick={() => onCentrar(unidad.posicion)} className="font-sans font-medium text-primary-600 hover:underline">
          Centrar en el mapa
        </button>
        {!averiada &&
          !pendiente &&
          (admision.admite ? (
            <button type="button" onClick={() => onRegistrarAveria(unidad.codigo)} className="font-medium text-critical-600 hover:underline">
              Registrar avería
            </button>
          ) : (
            <span className="text-neutral-600">{admision.motivo}</span>
          ))}
      </Acciones>
    </>
  );
};

// --- Detalle de almacén --------------------------------------------------------------------------

const DetalleAlmacen: React.FC<{ codigo: string } & Omit<PanelLateralProps, 'seleccion'>> = ({
  codigo,
  onSeleccionar,
  onCentrar,
  onCerrar,
  onVolver,
  etiquetaVolver,
}) => {
  const volver = onVolver ?? (() => onSeleccionar({ tipo: 'incidencias' }));
  const datos = useDatosOperacion();
  const almacen = ALMACENES.find((a) => a.id === codigo);
  if (!almacen) return null;
  const estado = datos.almacenes.find((a) => a.id === almacen.id);
  const central = almacen.id === 'CENTRAL';
  // Los intermedios tienen tope y semáforo + vacío de ocupación; el central no se agota.
  const nivel = estado?.nivelStock ?? null;
  const conStock = !central && estado?.stock != null && estado.capacidad != null && nivel !== null;
  const fraccion = conStock ? (estado.stock as number) / (estado.capacidad as number) : 0;
  const salieron = datos.flota.filter((u) => u.origen === almacen.id && fueraDelAlmacen(u));
  return (
    <>
      <EncabezadoObjeto
        onVolver={volver}
        onCerrar={onCerrar}
        titulo={`Almacén ${almacen.nombre}`}
        estado={central ? 'Central' : 'Intermedio'}
        etiquetaVolver={etiquetaVolver}
      />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-3 border-b border-neutral-200">
          {conStock && nivel ? (
            <div className={`border rounded-control px-3 pt-2 pb-2.5 flex flex-col gap-2 ${BORDE_SEMAFORO[nivel]}`}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="flex items-center gap-2 text-body-sm text-neutral-600">
                    <MarcaSemaforo nivel={nivel} /> stock
                  </span>
                  <span className={`tabular-nums text-kpi ${TEXTO_SEMAFORO[nivel]}`}>
                    {estado.stock}/{estado.capacidad}
                  </span>
                </div>
                <div className="flex flex-col items-end text-body-sm">
                  <span className={`tabular-nums ${TEXTO_SEMAFORO[nivel]}`}>{Math.round(fraccion * 100)} % de capacidad</span>
                  <span className="text-neutral-600">{NOMBRE_CARGA[nivel]}</span>
                </div>
              </div>
              <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${FONDO_SEMAFORO[nivel]}`} style={{ width: `${Math.min(100, fraccion * 100)}%` }} />
              </div>
              {estado.stockBajo && (
                <p role="status" className="text-body-sm font-medium text-neutral-900">
                  ! {alertaStockBajo()}: se repone a las 23:59.
                </p>
              )}
            </div>
          ) : (
            <p className="text-body-sm text-neutral-600">
              {central ? 'Stock ilimitado: abastece a toda la red y no se agota.' : 'Sin datos de stock en este momento.'}
            </p>
          )}
        </div>
        <div className="py-1 border-b border-neutral-200">
          <Dato etiqueta="Ubicación" valor={`(${almacen.ubicacion.x},${almacen.ubicacion.y})`} />
          {!central && <Dato etiqueta="Recarga" valor="a su capacidad, cada día a las 23:59" />}
          <Dato etiqueta="Unidades en ruta desde aquí" valor={salieron.length} />
        </div>
        <EnviosAlmacen almacen={almacen.id} onSeleccionar={onSeleccionar} />
        <section className="px-3 pt-2.5 pb-1.5 flex flex-col gap-1.5">
          <TituloSeccion derecha={salieron.length > 0 ? salieron.length : undefined}>Unidades que salieron de aquí</TituloSeccion>
          {salieron.length === 0 && <p className="text-body-sm text-neutral-600">Ninguna unidad en ruta salió de este almacén.</p>}
          {salieron.map((u) => (
            <button
              key={u.codigo}
              type="button"
              onClick={() => onSeleccionar({ tipo: 'vehiculo', codigo: u.codigo })}
              className="h-6 flex items-center gap-2 text-body-sm hover:bg-neutral-50 -mx-1 px-1 rounded"
            >
              <span className="font-semibold text-neutral-900">{nombreUnidad(u)}</span>
              {u.estado === 'AVERIADA' ? (
                <span className="text-critical-600">averiada</span>
              ) : (
                <span className="tabular-nums text-neutral-600">
                  {u.carga}/{u.capacidad} · {u.paradas.length} {u.paradas.length === 1 ? 'parada' : 'paradas'}
                </span>
              )}
              <span className="ml-auto text-neutral-600" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </section>
      </div>
      <Acciones>
        <button type="button" onClick={() => onCentrar(almacen.ubicacion)} className="font-medium text-primary-600 hover:underline">
          Centrar en el mapa
        </button>
      </Acciones>
    </>
  );
};

// --- Incidencias ---------------------------------------------------------------------------------

/** Filas de "Pedidos en riesgo" que se muestran antes de ofrecer "ver más": con 26 en riesgo no tenía sentido listarlos todos de una. */
const LIMITE_RIESGO_VISIBLE = 8;

const ListaIncidencias: React.FC<Pick<PanelLateralProps, 'onSeleccionar' | 'onCentrar'> & { onRegistrarAveria: AbrirRegistroAveria }> = ({
  onSeleccionar,
  onCentrar,
  onRegistrarAveria,
}) => {
  const datos = useDatosOperacion();
  const riesgo = pedidosEnRiesgo(datos);
  const averiadas = datos.flota.filter((u) => u.estado === 'AVERIADA');
  const admision = admisionDeAverias(datos);
  const bloqueos = datos.bloqueos;
  const [verTodoElRiesgo, setVerTodoElRiesgo] = useState(false);
  const riesgoVisible = verTodoElRiesgo ? riesgo : riesgo.slice(0, LIMITE_RIESGO_VISIBLE);
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <section className="px-3 pt-2.5 pb-2 flex flex-col gap-1 border-b border-neutral-200">
        <TituloSeccion derecha={riesgo.length}>Pedidos en riesgo · menor holgura</TituloSeccion>
        {riesgoVisible.map((p) => (
          <FilaConBarra
            key={p.codigo}
            color={p.nivel === 'ROJO' ? 'rojo' : 'ambar'}
            titulo={`${p.codigo} · ${p.unidad}`}
            detalle={`holgura ${p.holgura} · llega ${p.eta}`}
            detalleMono
            onClick={() => onSeleccionar({ tipo: 'pedido', codigo: p.codigo })}
            className="py-1.5 rounded"
          />
        ))}
        {riesgo.length > LIMITE_RIESGO_VISIBLE && (
          <button
            type="button"
            onClick={() => setVerTodoElRiesgo(!verTodoElRiesgo)}
            className="self-start font-sans text-body-sm font-medium text-primary-600 hover:underline"
          >
            {verTodoElRiesgo ? 'Ver menos' : `Ver los ${riesgo.length - LIMITE_RIESGO_VISIBLE} restantes`}
          </button>
        )}
      </section>
      <section className="px-3 pt-2.5 pb-2 flex flex-col gap-1 border-b border-neutral-200">
        <TituloSeccion
          derecha={
            <span className="flex items-center gap-2.5">
              {averiadas.length}
              {admision.admite && (
                <button type="button" onClick={() => onRegistrarAveria()} className="font-sans font-medium text-critical-600 hover:underline">
                  + Registrar avería
                </button>
              )}
            </span>
          }
        >
          Averías activas
        </TituloSeccion>
        {!admision.admite && <p className="text-body-sm text-neutral-600">{admision.motivo}</p>}
        {averiadas.length === 0 && <p className="text-body-sm text-neutral-600">Ninguna unidad averiada.</p>}
        {averiadas.map((u) => (
          <FilaConBarra
            key={u.codigo}
            color="rojo"
            titulo={nombreUnidad(u)}
            detalle={`${
              u.averia ? `${nombreAveria(u.averia.tipo)} · vuelve ${formatearMomento(u.averia.vuelve, datos.reloj)}` : 'Fuera de servicio'
            } · (${Math.round(u.posicion.x)},${Math.round(u.posicion.y)})`}
            onClick={() => onSeleccionar({ tipo: 'vehiculo', codigo: u.codigo })}
            className="py-1.5 rounded"
          />
        ))}
      </section>
      <section className="px-3 pt-2.5 pb-2 flex flex-col gap-1">
        <TituloSeccion derecha={cantidadBloqueos(datos)}>Bloqueos activos</TituloSeccion>
        {bloqueos.map((b) => (
          <FilaConBarra
            key={b.id}
            color="rojo"
            titulo={`(${b.desde.x},${b.desde.y})–(${b.hasta.x},${b.hasta.y})`}
            detalle={`hasta ${b.fin}${b.rutasAfectadas > 0 ? ` · ${b.rutasAfectadas} ruta${b.rutasAfectadas > 1 ? 's' : ''} afectada${b.rutasAfectadas > 1 ? 's' : ''}` : ''}`}
            onClick={() => onCentrar({ x: (b.desde.x + b.hasta.x) / 2, y: (b.desde.y + b.hasta.y) / 2 })}
            className="py-1.5 rounded"
          />
        ))}
      </section>
    </div>
  );
};

export const PanelLateral: React.FC<PanelLateralProps> = ({
  seleccion,
  onSeleccionar,
  onCerrar,
  onCentrar,
  onVolver,
  etiquetaVolver,
  resaltado = null,
  onResaltar,
}) => {
  const datos = useDatosOperacion();
  const mostrarAviso = useAvisos();
  const { cancelar } = useAverias();
  const deshacerAveria = async (codigoUnidad: string) => {
    try {
      await cancelar(datos.ejecucionId, codigoUnidad);
      mostrarAviso({ texto: `Avería de ${codigoUnidad} cancelada: sigue en servicio.` });
    } catch (e) {
      mostrarAviso({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo deshacer la avería.' });
    }
  };
  // Diálogo de registro de avería: null cerrado; con unidad, abierto desde su detalle.
  const [registro, setRegistro] = useState<{ unidad?: string } | null>(null);
  const abrirRegistro: AbrirRegistroAveria = (codigo) => setRegistro({ unidad: codigo });
  const esDetalle = seleccion.tipo === 'pedido' || seleccion.tipo === 'fraccion' || seleccion.tipo === 'vehiculo' || seleccion.tipo === 'almacen';
  // Un pedido recién entregado ya no está entre los activos: se busca también entre los entregados recientes.
  const pedido =
    seleccion.tipo === 'pedido' ? buscarPedido(datos, seleccion.codigo) : seleccion.tipo === 'fraccion' ? buscarPedido(datos, seleccion.pedido) : undefined;
  // Sin onResaltar (pruebas de un componente suelto), una fila de lista abre el detalle directamente.
  const resaltar = onResaltar ?? ((objeto: SeleccionResaltable) => onSeleccionar(objeto));
  const unidad = seleccion.tipo === 'vehiculo' ? unidadPorCodigo(datos, seleccion.codigo) : undefined;
  return (
    <aside
      aria-label="Incidencias, flota y bitácora"
      className="absolute right-3 top-0 bottom-0 z-20 w-[340px] bg-white border border-neutral-200 rounded-card shadow-overlay flex flex-col overflow-hidden"
      data-sin-zoom
      onPointerDown={(e) => e.stopPropagation()}
    >
      {!esDetalle && (
        <div className="h-9 px-3 flex items-center border-b border-neutral-200 shrink-0">
          <h2 className="font-sans text-title-sm text-neutral-900">{TITULO_PESTANA[seleccion.tipo]}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar panel" className="ml-auto size-6 rounded-control text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
            ✕
          </button>
        </div>
      )}
      {pedido && (
        <DetallePedido
          key={pedido.codigo}
          pedido={pedido}
          fraccionResaltada={seleccion.tipo === 'fraccion' ? seleccion.codigo : undefined}
          onSeleccionar={onSeleccionar}
          onCentrar={onCentrar}
          onCerrar={onCerrar}
          onVolver={onVolver}
          etiquetaVolver={etiquetaVolver}
        />
      )}
      {unidad && (
        <DetalleVehiculo
          key={unidad.codigo}
          unidad={unidad}
          onSeleccionar={onSeleccionar}
          onCentrar={onCentrar}
          onCerrar={onCerrar}
          onRegistrarAveria={abrirRegistro}
          onDeshacerAveria={deshacerAveria}
          onVolver={onVolver}
          etiquetaVolver={etiquetaVolver}
        />
      )}
      {seleccion.tipo === 'almacen' && (
        <DetalleAlmacen
          key={seleccion.codigo}
          codigo={seleccion.codigo}
          onSeleccionar={onSeleccionar}
          onCentrar={onCentrar}
          onCerrar={onCerrar}
          onVolver={onVolver}
          etiquetaVolver={etiquetaVolver}
        />
      )}
      {seleccion.tipo === 'resumen' && <ResumenOperacion onSeleccionar={onSeleccionar} />}
      {seleccion.tipo === 'incidencias' && <ListaIncidencias onSeleccionar={onSeleccionar} onCentrar={onCentrar} onRegistrarAveria={abrirRegistro} />}
      {seleccion.tipo === 'pedidos' && <ListaPedidos resaltado={resaltado} onResaltar={resaltar} onSeleccionar={onSeleccionar} onCentrar={onCentrar} />}
      {seleccion.tipo === 'flota' && <EstadoFlota onSeleccionar={onSeleccionar} resaltado={resaltado} onResaltar={resaltar} onCentrar={onCentrar} />}
      {seleccion.tipo === 'almacenes' && <ListaAlmacenes resaltado={resaltado} onResaltar={resaltar} onSeleccionar={onSeleccionar} onCentrar={onCentrar} />}
      {seleccion.tipo === 'bitacora' && <BitacoraEventos onSeleccionar={onSeleccionar} />}
      {registro && (
        <DialogoRegistrarAveria
          unidadInicial={registro.unidad}
          onCerrar={() => setRegistro(null)}
          onRegistrada={(respuesta) => {
            setRegistro(null);
            onSeleccionar({ tipo: 'vehiculo', codigo: respuesta.unidad });
            mostrarAviso({
              texto: `Avería registrada en ${respuesta.unidad} · vuelve a operar ${formatearMomento(new Date(respuesta.reincorporacionMs), datos.reloj)}`,
              // Deshacer es la acción más valiosa justo después de registrar; la bitácora está a una pestaña.
              accion: { etiqueta: 'Deshacer', alHacer: () => deshacerAveria(respuesta.unidad) },
            });
          }}
        />
      )}
    </aside>
  );
};
