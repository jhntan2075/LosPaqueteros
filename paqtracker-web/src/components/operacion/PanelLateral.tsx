import React, { useState } from 'react';
import { ALMACENES, CORTE_OCUPACION, UNIDADES } from '../../config/dominio';
import { NOMBRE_HOLGURA, SITUACION_UNIDAD, NOMBRE_INVENTARIO, RANGO_HOLGURA, etiquetaPlazo, nombreAveria } from '../../config/glosario';
import { admisionDeAverias, useAveriaPendiente, useAverias } from '../../hooks/useAverias';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { useTrazabilidadPedido } from '../../hooks/useTrazabilidadPedido';
import { capitalizar, formatearHora, formatearMomento } from '../../lib/formato';
import { distanciaDesdeOrigen, fueraDelAlmacen, nivelDeOcupacion, pedidosEnRiesgo, unidadPorCodigo } from '../../lib/operacion';
import { turnoVigente } from '../../lib/turnos';
import type { Coordenada } from '../../types/domain';
import type { HitoTrazabilidad, PedidoOperacion, UnidadOperacion } from '../../types/operacion';
import type { NivelHolgura } from '../../types/pedidos';
import { colorDeUnidad, iconoVehiculo } from '../map/iconosVehiculo';
import { COLOR_HOLGURA, FONDO_NIVEL } from '../pedidos/estilos';
import { PuntoHolgura } from '../pedidos/iconos';
import { BitacoraEventos } from './BitacoraEventos';
import { FilaConBarra, TituloSeccion } from './comunes';
import { useAvisos } from '../../hooks/useAvisos';
import { DialogoRegistrarAveria } from './DialogoRegistrarAveria';
import { EstadoFlota } from './EstadoFlota';

import trianguloAmbar from '../../assets/figma/pedidos/holgura-ambar-triangulo.svg';

// Panel derecho del mapa (Figma 1:4793 detalle de pedido, 1:5300 detalle de vehículo), el mismo en
// Operación y en la corrida: pestañas Incidencias, Flota y Bitácora, y el detalle del objeto
// seleccionado. Implementado sobre las capturas de los frames: el contexto de diseño no estuvo
// disponible (límite de llamadas de Figma).

export type SeleccionPanel =
  | { tipo: 'incidencias' }
  | { tipo: 'flota' }
  | { tipo: 'bitacora' }
  | { tipo: 'pedido'; codigo: string }
  | { tipo: 'vehiculo'; codigo: string }
  | { tipo: 'almacen'; codigo: string };

interface PanelLateralProps {
  seleccion: SeleccionPanel;
  onSeleccionar: (seleccion: SeleccionPanel) => void;
  onCerrar: () => void;
  onCentrar: (punto: Coordenada) => void;
}

const PESTANAS: { tipo: 'incidencias' | 'flota' | 'bitacora'; etiqueta: string }[] = [
  { tipo: 'incidencias', etiqueta: 'Incidencias' },
  { tipo: 'flota', etiqueta: 'Flota' },
  { tipo: 'bitacora', etiqueta: 'Bitácora' },
];

const BORDE_NIVEL: Record<NivelHolgura, string> = {
  ROJO: 'border-[#B91C1C]',
  AMBAR: 'border-[#B45309]',
  VERDE: 'border-[#15803D]',
  CERRADO: 'border-[#CBD5E1]',
};

const Semaforo: React.FC<{ nivel: NivelHolgura }> = ({ nivel }) =>
  nivel === 'AMBAR' ? <img src={trianguloAmbar} alt="" className="block" /> : <PuntoHolgura nivel={nivel} />;

const Dato: React.FC<{ etiqueta: string; valor: React.ReactNode }> = ({ etiqueta, valor }) => (
  <div className="h-[22px] px-[12px] flex items-center justify-between gap-[12px] text-[12px]">
    <span className="font-sans text-[#64748B] whitespace-nowrap">{etiqueta}</span>
    <span className="tabular-nums text-[#0F172A] whitespace-nowrap truncate">{valor}</span>
  </div>
);

const Subpestanas = <T extends string>({ opciones, activa, onCambiar, derecha }: {
  opciones: { valor: T; etiqueta: string }[];
  activa: T;
  onCambiar: (valor: T) => void;
  derecha?: React.ReactNode;
}) => (
  <div className="h-[29px] px-[12px] flex items-center gap-[14px] border-b border-[#E2E8F0] text-[12px]" role="tablist">
    {opciones.map(({ valor, etiqueta }) => (
      <button
        key={valor}
        type="button"
        role="tab"
        aria-selected={activa === valor}
        onClick={() => onCambiar(valor)}
        className={`font-sans ${activa === valor ? 'font-semibold text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'}`}
      >
        {etiqueta}
      </button>
    ))}
    {derecha && <span className="ml-auto tabular-nums text-[#64748B]">{derecha}</span>}
  </div>
);

const EncabezadoObjeto: React.FC<{ onVolver: () => void; titulo: React.ReactNode; estado: string }> = ({ onVolver, titulo, estado }) => (
  <div className="px-[12px] pt-[9px] pb-[9px] border-b border-[#E2E8F0] flex flex-col gap-[6px]">
    <button type="button" onClick={onVolver} className="self-start font-sans text-[12px] text-[#1E40AF] hover:underline">
      ‹ Volver
    </button>
    <div className="flex items-center gap-[8px]">
      <h3 className="tabular-nums font-semibold text-[14px] text-[#0F172A] flex items-center gap-[7px]">{titulo}</h3>
      <span className="ml-auto border border-[#E2E8F0] rounded-[4px] px-[6px] py-[2px] font-sans font-medium text-[12px] text-[#0F172A]">{estado}</span>
    </div>
  </div>
);

const Acciones: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="h-[32px] px-[12px] flex items-center justify-between border-t border-[#E2E8F0] text-[12px] shrink-0">{children}</div>
);

const nombreUnidad = (u: UnidadOperacion) => `${capitalizar(UNIDADES[u.tipo].nombre)} ${u.codigo}`;
const formatoSoles = (monto: number) => `S/ ${monto.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;

// --- Detalle de pedido ---------------------------------------------------------------------------

const Trazabilidad: React.FC<{ hitos: HitoTrazabilidad[] }> = ({ hitos }) => {
  const reasignaciones = hitos.filter((h) => h.titulo.startsWith('Reasignación')).length;
  return (
    <section className="px-[12px] pt-[9px] pb-[6px] flex flex-col gap-[8px]">
      <TituloSeccion derecha={reasignaciones > 0 ? `${reasignaciones} reasignación${reasignaciones > 1 ? 'es' : ''}` : undefined}>Trazabilidad</TituloSeccion>
      {/* En orden cronológico: de arriba hacia abajo se lee cómo ocurrió; el último hito se resalta. */}
      <ol className="flex flex-col">
        {hitos.length === 0 && <li className="font-sans text-[12px] text-[#64748B]">Sin hitos registrados.</li>}
        {hitos.map((hito, i) => (
          <li key={`${hito.titulo}-${i}`} className="flex gap-[10px] text-[12px] leading-[normal]">
            <time className="w-[72px] tabular-nums text-[#64748B] whitespace-nowrap shrink-0">{hito.hora}</time>
            <span className="relative flex flex-col items-center shrink-0" aria-hidden="true">
              <span className={`mt-[4px] size-[7px] rounded-full ${hito.reciente ? 'bg-[#1E40AF]' : 'bg-[#94A3B8]'}`} />
              {i < hitos.length - 1 && <span className="w-px flex-1 bg-[#CBD5E1]" />}
            </span>
            <span className="flex flex-col min-w-0 pb-[10px]">
              <span className="font-sans font-semibold text-[#0F172A]">{hito.titulo}</span>
              <span className="font-sans text-[#64748B]">{hito.detalle}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
};

const DetallePedido: React.FC<{ pedido: PedidoOperacion } & Omit<PanelLateralProps, 'seleccion' | 'onCerrar'>> = ({
  pedido,
  onSeleccionar,
  onCentrar,
}) => {
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
  const fraccion = pedido.holguraMinutos / (pedido.plazoHoras * 60);
  return (
    <>
      <EncabezadoObjeto onVolver={() => onSeleccionar({ tipo: 'incidencias' })} titulo={`Pedido ${pedido.codigo}`} estado={pedido.estado} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-[12px] border-b border-[#E2E8F0]">
          <div className={`border rounded-[4px] px-[12px] py-[8px] flex items-center justify-between ${BORDE_NIVEL[pedido.nivel]}`}>
            <div className="flex flex-col">
              <span className="flex items-center gap-[8px] font-sans text-[12px] text-[#64748B]">
                <Semaforo nivel={pedido.nivel} /> holgura restante
              </span>
              <span className={`tabular-nums font-semibold text-[22px] ${COLOR_HOLGURA[pedido.nivel]}`}>{pedido.holgura}</span>
            </div>
            <div className="flex flex-col items-end text-[12px]">
              <span className={`tabular-nums ${COLOR_HOLGURA[pedido.nivel]}`}>{Math.round(fraccion * 100)} % del plazo total</span>
              <span className="font-sans text-[#64748B]">
                {NOMBRE_HOLGURA[pedido.nivel]}
                {pedido.nivel !== 'CERRADO' && ` · ${RANGO_HOLGURA[pedido.nivel]}`}
              </span>
            </div>
          </div>
        </div>
        <div className="py-[4px] border-b border-[#E2E8F0]">
          <Dato etiqueta="Cliente" valor={pedido.cliente} />
          <Dato etiqueta="Cantidad" valor={`${pedido.cantidad} unidades de P`} />
          <Dato etiqueta="Tipo de entrega" valor={etiquetaPlazo(pedido.plazoHoras)} />
          <Dato etiqueta="Registrado" valor={pedido.registrado} />
          <Dato etiqueta="Hora límite" valor={pedido.horaLimite} />
          <Dato etiqueta="Llegada estimada" valor={pedido.eta} />
          <Dato etiqueta="Destino" valor={`(${pedido.destino.x},${pedido.destino.y})`} />
          {portadoras.length > 1 ? (
            <div className="px-[12px] py-[3px] flex flex-col gap-[2px] text-[12px]">
              <span className="font-sans text-[#64748B]">Vehículos asignados · pedido fraccionado en {portadoras.length}</span>
              <ul aria-label="Vehículos asignados" className="flex flex-col">
                {portadoras.map(({ unidad: u, parada }) => (
                  <li key={u.codigo}>
                    <button
                      type="button"
                      onClick={() => onSeleccionar({ tipo: 'vehiculo', codigo: u.codigo })}
                      className="w-full h-[22px] flex items-center gap-[8px] tabular-nums text-[#0F172A] hover:underline"
                    >
                      <span>{nombreUnidad(u)}</span>
                      <span className="text-[#64748B]">
                        {parada.cantidad} de {pedido.cantidad} paq.
                      </span>
                      <span className="ml-auto text-[#64748B]">llega {parada.eta}</span>
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
        <button type="button" onClick={() => onCentrar(pedido.destino)} className="font-sans font-medium text-[#1E40AF] hover:underline">
          Centrar en el mapa
        </button>
      </Acciones>
    </>
  );
};

// --- Detalle de vehículo -------------------------------------------------------------------------


const Paradas: React.FC<{ unidad: UnidadOperacion; onSeleccionar: PanelLateralProps['onSeleccionar'] }> = ({ unidad, onSeleccionar }) => (
  <section className="px-[12px] pt-[9px] pb-[6px] flex flex-col gap-[6px]">
    <TituloSeccion derecha={unidad.totalParadas > 0 ? `parada ${unidad.paradaActual} de ${unidad.totalParadas}` : undefined}>Próximas paradas</TituloSeccion>
    {unidad.paradas.length === 0 && <p className="font-sans text-[12px] text-[#64748B]">Sin paradas asignadas.</p>}
    {unidad.paradas.map((p) => (
      <button
        key={p.pedido}
        type="button"
        onClick={() => onSeleccionar({ tipo: 'pedido', codigo: p.pedido })}
        className="h-[24px] flex items-center gap-[8px] text-[12px] hover:bg-[#F8FAFC] -mx-[4px] px-[4px] rounded"
      >
        <Semaforo nivel={p.nivel} />
        <span className="tabular-nums font-semibold text-[#0F172A]">{p.pedido}</span>
        <span className="tabular-nums text-[#64748B]">
          ({p.destino.x},{p.destino.y})
        </span>
        <span className="ml-auto tabular-nums text-[#64748B]">llega {p.eta}</span>
        <span className={`tabular-nums font-medium ${COLOR_HOLGURA[p.nivel]}`}>{p.holgura}</span>
      </button>
    ))}
  </section>
);

/** Abre el diálogo de registro de avería; con unidad, ya elegida. */
type AbrirRegistroAveria = (unidad?: string) => void;

/** Recuadro de la avería vigente, con el mismo formato que los recuadros de holgura y ocupación. */
const RecuadroAveria: React.FC<{ unidad: UnidadOperacion; reloj: Date }> = ({ unidad, reloj }) => (
  <div className="border border-[#B91C1C] bg-[#FEF2F2] rounded-[4px] px-[12px] py-[8px] flex flex-col gap-[3px] text-[12px]">
    <span className="flex items-center gap-[6px] font-semibold text-[13px] text-[#B91C1C]">
      <span aria-hidden="true">✕</span> Averiada{unidad.averia && ` · ${nombreAveria(unidad.averia.tipo)}`}
    </span>
    {unidad.averia ? (
      <>
        <span className="text-[#0F172A] tabular-nums">
          Desde {formatearMomento(unidad.averia.desde, reloj)} · vuelve a operar {formatearMomento(unidad.averia.vuelve, reloj)}
        </span>
        {unidad.averia.trasladoCentral && (
          <span className="text-[#64748B] tabular-nums">Traslado al almacén central: {formatearMomento(unidad.averia.trasladoCentral, reloj)}</span>
        )}
      </>
    ) : (
      <span className="text-[#64748B]">Fuera de servicio hasta su reincorporación.</span>
    )}
  </div>
);

const DetalleVehiculo: React.FC<
  { unidad: UnidadOperacion; onRegistrarAveria: AbrirRegistroAveria; onDeshacerAveria: (unidad: string) => void } & Omit<
    PanelLateralProps,
    'seleccion' | 'onCerrar'
  >
> = ({ unidad, onSeleccionar, onCentrar, onRegistrarAveria, onDeshacerAveria }) => {
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
        onVolver={() => onSeleccionar({ tipo: 'incidencias' })}
        titulo={
          <>
            <img src={iconoVehiculo(unidad.tipo, colorDeUnidad(unidad)).href} alt="" className="block -my-[6px] -ml-[4px]" />
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
            <div className="p-[12px] border-b border-[#E2E8F0] flex flex-col gap-[8px]">
              {averiada && <RecuadroAveria unidad={unidad} reloj={reloj} />}
              {pendiente && (
                <div className="border border-[#BFDBFE] bg-[#EFF6FF] rounded-[4px] px-[12px] py-[8px] flex items-center gap-[8px] text-[12px] text-[#1E40AF]">
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
              <div className={`border rounded-[4px] px-[12px] pt-[8px] pb-[10px] flex flex-col gap-[8px] ${BORDE_NIVEL[nivel]}`}>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-[8px] font-sans text-[12px] text-[#64748B]">
                      <Semaforo nivel={nivel} /> ocupación
                    </span>
                    <span className={`tabular-nums font-semibold text-[22px] ${COLOR_HOLGURA[nivel]}`}>
                      {unidad.carga}/{unidad.capacidad}
                    </span>
                  </div>
                  <div className="flex flex-col items-end text-[12px]">
                    <span className={`tabular-nums ${COLOR_HOLGURA[nivel]}`}>{Math.round(fraccion * 100)} % de capacidad</span>
                    <span className="font-sans text-[#64748B]">
                      ámbar desde {CORTE_OCUPACION.ambar * 100} %, rojo desde {CORTE_OCUPACION.rojo * 100} %
                    </span>
                  </div>
                </div>
                <div className="h-[4px] bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${FONDO_NIVEL[nivel]}`} style={{ width: `${Math.min(100, fraccion * 100)}%` }} />
                </div>
              </div>
            </div>
            <div className="py-[4px] border-b border-[#E2E8F0]">
              <Dato etiqueta="Tipo / velocidad" valor={`${capitalizar(parametros.nombre)} · ${parametros.velocidadKmH} km/h`} />

              <Dato etiqueta="Conductor" valor={unidad.conductor} />
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
          <p className="px-[12px] py-[6px] tabular-nums text-[12px] text-[#64748B]">
            {unidad.ruta.map((p) => `(${p.x},${p.y})`).join(' → ')}
          </p>
        )}
      </div>
      <Acciones>
        <button type="button" onClick={() => onCentrar(unidad.posicion)} className="font-sans font-medium text-[#1E40AF] hover:underline">
          Centrar en el mapa
        </button>
        {!averiada &&
          !pendiente &&
          (admision.admite ? (
            <button type="button" onClick={() => onRegistrarAveria(unidad.codigo)} className="font-medium text-[#B91C1C] hover:underline">
              Registrar avería
            </button>
          ) : (
            <span className="text-[#64748B]">{admision.motivo}</span>
          ))}
      </Acciones>
    </>
  );
};

// --- Detalle de almacén --------------------------------------------------------------------------

const DetalleAlmacen: React.FC<{ codigo: string } & Omit<PanelLateralProps, 'seleccion' | 'onCerrar'>> = ({
  codigo,
  onSeleccionar,
  onCentrar,
}) => {
  const datos = useDatosOperacion();
  const almacen = ALMACENES.find((a) => a.id === codigo);
  if (!almacen) return null;
  const estado = datos.almacenes.find((a) => a.id === almacen.id);
  const central = almacen.id === 'CENTRAL';
  // Los intermedios tienen tope y semáforo; el central no se agota.
  const nivel = estado?.nivel && estado.nivel !== 'CERRADO' ? estado.nivel : null;
  const conStock = !central && estado?.stock != null && estado.capacidad != null && nivel !== null;
  const fraccion = conStock ? (estado.stock as number) / (estado.capacidad as number) : 0;
  const salieron = datos.flota.filter((u) => u.origen === almacen.id && fueraDelAlmacen(u));
  return (
    <>
      <EncabezadoObjeto
        onVolver={() => onSeleccionar({ tipo: 'incidencias' })}
        titulo={`Almacén ${almacen.nombre}`}
        estado={central ? 'Central' : 'Intermedio'}
      />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-[12px] border-b border-[#E2E8F0]">
          {conStock && nivel ? (
            <div className={`border rounded-[4px] px-[12px] pt-[8px] pb-[10px] flex flex-col gap-[8px] ${BORDE_NIVEL[nivel]}`}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="flex items-center gap-[8px] text-[12px] text-[#64748B]">
                    <Semaforo nivel={nivel} /> stock
                  </span>
                  <span className={`tabular-nums font-semibold text-[22px] ${COLOR_HOLGURA[nivel]}`}>
                    {estado.stock}/{estado.capacidad}
                  </span>
                </div>
                <div className="flex flex-col items-end text-[12px]">
                  <span className={`tabular-nums ${COLOR_HOLGURA[nivel]}`}>{Math.round(fraccion * 100)} % de capacidad</span>
                  <span className="text-[#64748B]">{NOMBRE_INVENTARIO[nivel]}</span>
                </div>
              </div>
              <div className="h-[4px] bg-[#E2E8F0] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${FONDO_NIVEL[nivel]}`} style={{ width: `${Math.min(100, fraccion * 100)}%` }} />
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-[#64748B]">
              {central ? 'Stock ilimitado: abastece a toda la red y no se agota.' : 'Sin datos de stock en este momento.'}
            </p>
          )}
        </div>
        <div className="py-[4px] border-b border-[#E2E8F0]">
          <Dato etiqueta="Ubicación" valor={`(${almacen.ubicacion.x},${almacen.ubicacion.y})`} />
          {!central && <Dato etiqueta="Recarga" valor="a su capacidad, cada día a las 23:59" />}
          <Dato etiqueta="Unidades en ruta desde aquí" valor={salieron.length} />
        </div>
        <section className="px-[12px] pt-[9px] pb-[6px] flex flex-col gap-[6px]">
          <TituloSeccion derecha={salieron.length > 0 ? salieron.length : undefined}>Unidades que salieron de aquí</TituloSeccion>
          {salieron.length === 0 && <p className="text-[12px] text-[#64748B]">Ninguna unidad en ruta salió de este almacén.</p>}
          {salieron.map((u) => (
            <button
              key={u.codigo}
              type="button"
              onClick={() => onSeleccionar({ tipo: 'vehiculo', codigo: u.codigo })}
              className="h-[24px] flex items-center gap-[8px] text-[12px] hover:bg-[#F8FAFC] -mx-[4px] px-[4px] rounded"
            >
              <span className="font-semibold text-[#0F172A]">{nombreUnidad(u)}</span>
              {u.estado === 'AVERIADA' ? (
                <span className="text-[#B91C1C]">averiada</span>
              ) : (
                <span className="tabular-nums text-[#64748B]">
                  {u.carga}/{u.capacidad} · {u.paradas.length} {u.paradas.length === 1 ? 'parada' : 'paradas'}
                </span>
              )}
              <span className="ml-auto text-[#64748B]" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </section>
      </div>
      <Acciones>
        <button type="button" onClick={() => onCentrar(almacen.ubicacion)} className="font-medium text-[#1E40AF] hover:underline">
          Centrar en el mapa
        </button>
      </Acciones>
    </>
  );
};

// --- Incidencias ---------------------------------------------------------------------------------

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
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <section className="px-[12px] pt-[10px] pb-[8px] flex flex-col gap-[4px] border-b border-[#E2E8F0]">
        <TituloSeccion derecha={riesgo.length}>Pedidos en riesgo · menor holgura</TituloSeccion>
        {riesgo.map((p) => (
          <FilaConBarra
            key={p.codigo}
            color={p.nivel === 'ROJO' ? 'rojo' : 'ambar'}
            titulo={`${p.codigo} · ${p.unidad}`}
            detalle={`holgura ${p.holgura} · llega ${p.eta}`}
            detalleMono
            onClick={() => onSeleccionar({ tipo: 'pedido', codigo: p.codigo })}
            className="py-[5px] rounded"
          />
        ))}
      </section>
      <section className="px-[12px] pt-[10px] pb-[8px] flex flex-col gap-[4px] border-b border-[#E2E8F0]">
        <TituloSeccion
          derecha={
            <span className="flex items-center gap-[10px]">
              {averiadas.length}
              {admision.admite && (
                <button type="button" onClick={() => onRegistrarAveria()} className="font-sans font-medium text-[#B91C1C] hover:underline">
                  + Registrar avería
                </button>
              )}
            </span>
          }
        >
          Averías activas
        </TituloSeccion>
        {!admision.admite && <p className="text-[12px] text-[#64748B]">{admision.motivo}</p>}
        {averiadas.length === 0 && <p className="text-[12px] text-[#64748B]">Ninguna unidad averiada.</p>}
        {averiadas.map((u) => (
          <FilaConBarra
            key={u.codigo}
            color="rojo"
            titulo={nombreUnidad(u)}
            detalle={`${
              u.averia ? `${nombreAveria(u.averia.tipo)} · vuelve ${formatearMomento(u.averia.vuelve, datos.reloj)}` : 'Fuera de servicio'
            } · (${Math.round(u.posicion.x)},${Math.round(u.posicion.y)})`}
            onClick={() => onSeleccionar({ tipo: 'vehiculo', codigo: u.codigo })}
            className="py-[5px] rounded"
          />
        ))}
      </section>
      <section className="px-[12px] pt-[10px] pb-[8px] flex flex-col gap-[4px]">
        <TituloSeccion derecha={bloqueos.length}>Bloqueos activos</TituloSeccion>
        {bloqueos.map((b) => (
          <FilaConBarra
            key={b.id}
            color="ambar"
            titulo={`(${b.desde.x},${b.desde.y})–(${b.hasta.x},${b.hasta.y})`}
            detalle={`hasta ${b.fin} · ${b.rutasAfectadas === 0 ? 'sin rutas afectadas' : `${b.rutasAfectadas} ruta${b.rutasAfectadas > 1 ? 's' : ''} afectada${b.rutasAfectadas > 1 ? 's' : ''}`}`}
            onClick={() => onCentrar({ x: (b.desde.x + b.hasta.x) / 2, y: (b.desde.y + b.hasta.y) / 2 })}
            className="py-[5px] rounded"
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
  const esDetalle = seleccion.tipo === 'pedido' || seleccion.tipo === 'vehiculo' || seleccion.tipo === 'almacen';
  const pedido = seleccion.tipo === 'pedido' ? datos.pedidos[seleccion.codigo] : undefined;
  const unidad = seleccion.tipo === 'vehiculo' ? unidadPorCodigo(datos, seleccion.codigo) : undefined;
  return (
    <aside
      aria-label="Incidencias, flota y bitácora"
      className="absolute right-[12px] top-0 bottom-0 z-20 w-[340px] bg-white border border-[#E2E8F0] rounded-[10px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.16)] flex flex-col overflow-hidden leading-[normal]"
      data-sin-zoom
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="h-[36px] px-[12px] flex items-center gap-[16px] border-b border-[#E2E8F0] text-[12px] shrink-0" role="tablist">
        {PESTANAS.map(({ tipo, etiqueta }) => (
          <button
            key={tipo}
            type="button"
            role="tab"
            aria-selected={seleccion.tipo === tipo}
            onClick={() => onSeleccionar({ tipo })}
            className={`h-full font-sans border-b-2 ${seleccion.tipo === tipo ? 'border-[#1E40AF] text-[#1E40AF] font-medium' : 'border-transparent text-[#64748B] hover:text-[#0F172A]'}`}
          >
            {etiqueta}
          </button>
        ))}
        {esDetalle && (
          <span className="h-full flex items-center font-sans font-medium text-[#0F172A] border-b-2 border-[#1E40AF]">
            Detalle
          </span>
        )}
        <button type="button" onClick={onCerrar} aria-label="Cerrar panel" className="ml-auto size-[22px] rounded text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]">
          ✕
        </button>
      </div>
      {pedido && <DetallePedido key={pedido.codigo} pedido={pedido} onSeleccionar={onSeleccionar} onCentrar={onCentrar} />}
      {unidad && (
        <DetalleVehiculo
          key={unidad.codigo}
          unidad={unidad}
          onSeleccionar={onSeleccionar}
          onCentrar={onCentrar}
          onRegistrarAveria={abrirRegistro}
          onDeshacerAveria={deshacerAveria}
        />
      )}
      {seleccion.tipo === 'almacen' && (
        <DetalleAlmacen key={seleccion.codigo} codigo={seleccion.codigo} onSeleccionar={onSeleccionar} onCentrar={onCentrar} />
      )}
      {seleccion.tipo === 'incidencias' && <ListaIncidencias onSeleccionar={onSeleccionar} onCentrar={onCentrar} onRegistrarAveria={abrirRegistro} />}
      {seleccion.tipo === 'flota' && <EstadoFlota />}
      {seleccion.tipo === 'bitacora' && <BitacoraEventos />}
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
