import React, { useState } from 'react';
import { ALMACENES, CORTE_HOLGURA, CORTE_OCUPACION, UNIDADES } from '../../config/dominio';
import { capitalizar } from '../../lib/formato';
import { BLOQUEOS, FLOTA, PEDIDOS_OPERACION, distanciaDesdeOrigen, nivelDeOcupacion, pedidosEnRiesgo, unidadPorCodigo } from '../../mocks/operacion';
import type { Coordenada } from '../../types/domain';
import type { PedidoOperacion, UnidadOperacion } from '../../types/operacion';
import type { NivelHolgura } from '../../types/pedidos';
import { COLOR_HOLGURA } from '../pedidos/estilos';
import { PuntoHolgura } from '../pedidos/iconos';
import { BitacoraEventos } from './BitacoraEventos';
import { FilaConBarra, TituloSeccion } from './comunes';
import { EstadoFlota } from './EstadoFlota';

import trianguloAmbar from '../../assets/figma/pedidos/holgura-ambar-triangulo.svg';

// Panel derecho del lienzo en vivo (Figma 1:4793 detalle de pedido, 1:5300 detalle de vehículo):
// lista de incidencias y detalle del objeto seleccionado. Implementado sobre las capturas de los
// frames: el contexto de diseño no estuvo disponible (límite de llamadas de Figma).

export type SeleccionPanel =
  | { tipo: 'incidencias' }
  | { tipo: 'flota' }
  | { tipo: 'bitacora' }
  | { tipo: 'pedido'; codigo: string }
  | { tipo: 'vehiculo'; codigo: string };

interface PanelLateralProps {
  seleccion: SeleccionPanel;
  diaReloj: string; // "25 ago"
  onSeleccionar: (seleccion: SeleccionPanel) => void;
  onCerrar: () => void;
  onCentrar: (punto: Coordenada) => void;
  /**
   * En la corrida de simulación el panel agrupa Incidencias, Flota y Bitácora en pestañas
   * (en Operación, Flota y Bitácora reemplazan al lienzo).
   */
  pestanasCorrida?: boolean;
  onVerBitacoraCompleta?: () => void;
}

const BORDE_NIVEL: Record<NivelHolgura, string> = {
  ROJO: 'border-[#B91C1C]',
  AMBAR: 'border-[#B45309]',
  VERDE: 'border-[#15803D]',
  CERRADO: 'border-[#CBD5E1]',
};
const FONDO_NIVEL: Record<NivelHolgura, string> = {
  ROJO: 'bg-[#B91C1C]',
  AMBAR: 'bg-[#B45309]',
  VERDE: 'bg-[#15803D]',
  CERRADO: 'bg-[#94A3B8]',
};
const NOMBRE_NIVEL: Record<NivelHolgura, string> = { ROJO: 'rojo', AMBAR: 'ámbar', VERDE: 'verde', CERRADO: 'cerrado' };

const Semaforo: React.FC<{ nivel: NivelHolgura }> = ({ nivel }) =>
  nivel === 'AMBAR' ? <img src={trianguloAmbar} alt="" className="block" /> : <PuntoHolgura nivel={nivel} />;

const Dato: React.FC<{ etiqueta: string; valor: React.ReactNode }> = ({ etiqueta, valor }) => (
  <div className="h-[22px] px-[12px] flex items-center justify-between gap-[12px] text-[12px]">
    <span className="font-sans text-[#64748B] whitespace-nowrap">{etiqueta}</span>
    <span className="font-mono text-[#0F172A] whitespace-nowrap truncate">{valor}</span>
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
    {derecha && <span className="ml-auto font-mono text-[#94A3B8]">{derecha}</span>}
  </div>
);

const EncabezadoObjeto: React.FC<{ onVolver: () => void; titulo: React.ReactNode; estado: string }> = ({ onVolver, titulo, estado }) => (
  <div className="px-[12px] pt-[9px] pb-[9px] border-b border-[#E2E8F0] flex flex-col gap-[6px]">
    <button type="button" onClick={onVolver} className="self-start font-sans text-[12px] text-[#1E40AF] hover:underline">
      ‹ Volver
    </button>
    <div className="flex items-center gap-[8px]">
      <h3 className="font-mono font-semibold text-[14px] text-[#0F172A] flex items-center gap-[7px]">{titulo}</h3>
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

const Trazabilidad: React.FC<{ pedido: PedidoOperacion }> = ({ pedido }) => {
  const reasignaciones = pedido.trazabilidad.filter((h) => h.titulo.startsWith('Reasignación')).length;
  return (
    <section className="px-[12px] pt-[9px] pb-[6px] flex flex-col gap-[8px]">
      <TituloSeccion derecha={reasignaciones > 0 ? `${reasignaciones} reasignación${reasignaciones > 1 ? 'es' : ''}` : undefined}>Trazabilidad</TituloSeccion>
      <ol className="flex flex-col gap-[8px]">
        {pedido.trazabilidad.map((hito) => (
          <li key={hito.titulo} className="flex gap-[10px] text-[12px] leading-[normal]">
            <time className="w-[34px] font-mono text-[#94A3B8] shrink-0">{hito.hora}</time>
            <span className={`mt-[4px] size-[6px] rounded-full shrink-0 ${hito.reciente ? 'bg-[#1E40AF]' : 'bg-[#94A3B8]'}`} />
            <span className="flex flex-col min-w-0">
              <span className="font-sans font-semibold text-[#0F172A]">{hito.titulo}</span>
              <span className="font-sans text-[#64748B] truncate">{hito.detalle}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
};

const DetallePedido: React.FC<{ pedido: PedidoOperacion; dia: string } & Omit<PanelLateralProps, 'seleccion' | 'diaReloj' | 'onCerrar'>> = ({
  pedido,
  dia,
  onSeleccionar,
  onCentrar,
}) => {
  const [pestana, setPestana] = useState<'resumen' | 'trazabilidad'>('resumen');
  const unidad = unidadPorCodigo(pedido.unidad)!;
  const origen = ALMACENES.find((a) => a.id === unidad.origen)!;
  const km = distanciaDesdeOrigen(pedido);
  const fraccion = pedido.holguraMinutos / (pedido.plazoHoras * 60);
  return (
    <>
      <EncabezadoObjeto onVolver={() => onSeleccionar({ tipo: 'incidencias' })} titulo={`Pedido ${pedido.codigo}`} estado={pedido.estado} />
      <Subpestanas
        opciones={[{ valor: 'resumen', etiqueta: 'Resumen' }, { valor: 'trazabilidad', etiqueta: 'Trazabilidad' }]}
        activa={pestana}
        onCambiar={setPestana}
      />
      <div className="flex-1 min-h-0 overflow-y-auto">
        {pestana === 'resumen' && (
          <>
            <div className="p-[12px] border-b border-[#E2E8F0]">
              <div className={`border rounded-[4px] px-[12px] py-[8px] flex items-center justify-between ${BORDE_NIVEL[pedido.nivel]}`}>
                <div className="flex flex-col">
                  <span className="flex items-center gap-[8px] font-sans text-[12px] text-[#64748B]">
                    <Semaforo nivel={pedido.nivel} /> holgura restante
                  </span>
                  <span className={`font-mono font-semibold text-[22px] ${COLOR_HOLGURA[pedido.nivel]}`}>{pedido.holgura}</span>
                </div>
                <div className="flex flex-col items-end text-[12px]">
                  <span className={`font-mono ${COLOR_HOLGURA[pedido.nivel]}`}>{Math.round(fraccion * 100)} % del plazo total</span>
                  <span className="font-sans text-[#64748B]">
                    {NOMBRE_NIVEL[pedido.nivel]} · corte &lt; {CORTE_HOLGURA.rojo * 100} % (CF-02)
                  </span>
                </div>
              </div>
            </div>
            <div className="py-[4px] border-b border-[#E2E8F0]">
              <Dato etiqueta="Cliente" valor={pedido.cliente} />
              <Dato etiqueta="Cantidad" valor={`${pedido.cantidad} unidades de P`} />
              <Dato etiqueta="Tipo de entrega" valor={`${pedido.plazoHoras === 36 ? 'Regular' : 'Priorizado'} ${pedido.plazoHoras} h`} />
              <Dato etiqueta="Registrado" valor={`${dia} · ${pedido.registrado}`} />
              <Dato etiqueta="Hora límite" valor={`${dia} · ${pedido.horaLimite}`} />
              <Dato etiqueta="ETA actual" valor={`${dia} · ${pedido.eta}`} />
              <Dato etiqueta="Destino" valor={`(${pedido.destino.x},${pedido.destino.y})`} />
              <Dato
                etiqueta="Vehículo asignado"
                valor={
                  <button type="button" onClick={() => onSeleccionar({ tipo: 'vehiculo', codigo: unidad.codigo })} className="hover:underline">
                    {nombreUnidad(unidad)} · {unidad.carga}/{UNIDADES[unidad.tipo].capacidad}
                  </button>
                }
              />
              <Dato etiqueta="Origen / distancia" valor={`${origen.nombre} · ${km} km · ${formatoSoles(km * UNIDADES[unidad.tipo].costoKm)}`} />
            </div>
          </>
        )}
        <Trazabilidad pedido={pedido} />
      </div>
      <Acciones>
        <button type="button" onClick={() => onCentrar(pedido.destino)} className="font-sans font-medium text-[#1E40AF] hover:underline">
          Centrar en el lienzo
        </button>
      </Acciones>
    </>
  );
};

// --- Detalle de vehículo -------------------------------------------------------------------------

const ESTADO_UNIDAD = { EN_RUTA: 'En ruta', DISPONIBLE: 'Disponible', AVERIADA: 'Averiada' } as const;

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
        <span className="font-mono font-semibold text-[#0F172A]">{p.pedido}</span>
        <span className="font-mono text-[#64748B]">
          ({p.destino.x},{p.destino.y})
        </span>
        <span className="ml-auto font-mono text-[#64748B]">ETA {p.eta}</span>
        <span className={`font-mono font-medium ${COLOR_HOLGURA[p.nivel]}`}>{p.holgura}</span>
      </button>
    ))}
  </section>
);

const DetalleVehiculo: React.FC<{ unidad: UnidadOperacion } & Omit<PanelLateralProps, 'seleccion' | 'diaReloj' | 'onCerrar'>> = ({
  unidad,
  onSeleccionar,
  onCentrar,
}) => {
  const [pestana, setPestana] = useState<'resumen' | 'ruta' | 'turno'>('resumen');
  const parametros = UNIDADES[unidad.tipo];
  const nivel = nivelDeOcupacion(unidad.carga, parametros.capacidad);
  const fraccion = unidad.carga / parametros.capacidad;
  const enRojo = unidad.paradas.filter((p) => p.nivel === 'ROJO').length;
  const alimentacion = `${unidad.alimentacion.hora} ${unidad.alimentacion.cumplida ? '√ cumplida' : '· pendiente'}`;
  return (
    <>
      <EncabezadoObjeto
        onVolver={() => onSeleccionar({ tipo: 'incidencias' })}
        titulo={
          <>
            <span className={`size-[9px] rounded-[1px] ${unidad.estado === 'AVERIADA' ? 'bg-[#B91C1C]' : 'bg-[#0F172A]'}`} />
            {nombreUnidad(unidad)}
          </>
        }
        estado={ESTADO_UNIDAD[unidad.estado]}
      />
      <Subpestanas
        opciones={[
          { valor: 'resumen', etiqueta: 'Resumen' },
          { valor: 'ruta', etiqueta: 'Ruta' },
          { valor: 'turno', etiqueta: 'Turno' },
        ]}
        activa={pestana}
        onCambiar={setPestana}
        derecha={`nodo (${unidad.posicion.x},${unidad.posicion.y})`}
      />
      <div className="flex-1 min-h-0 overflow-y-auto">
        {pestana === 'resumen' && (
          <>
            <div className="p-[12px] border-b border-[#E2E8F0]">
              <div className={`border rounded-[4px] px-[12px] pt-[8px] pb-[10px] flex flex-col gap-[8px] ${BORDE_NIVEL[nivel]}`}>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-[8px] font-sans text-[12px] text-[#64748B]">
                      <Semaforo nivel={nivel} /> ocupación
                    </span>
                    <span className={`font-mono font-semibold text-[22px] ${COLOR_HOLGURA[nivel]}`}>
                      {unidad.carga}/{parametros.capacidad}
                    </span>
                  </div>
                  <div className="flex flex-col items-end text-[12px]">
                    <span className={`font-mono ${COLOR_HOLGURA[nivel]}`}>{Math.round(fraccion * 100)} % de capacidad</span>
                    <span className="font-sans text-[#64748B]">
                      corte {CORTE_OCUPACION.ambar * 100}–{CORTE_OCUPACION.rojo * 100} % (CF-02)
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
              <Dato etiqueta="Distancia recorrida" valor={`${unidad.distanciaRecorridaKm} km`} />
              <Dato etiqueta="Costo acumulado" valor={formatoSoles(unidad.distanciaRecorridaKm * parametros.costoKm)} />
              {unidad.averia && <Dato etiqueta="Avería" valor={`tipo ${unidad.averia.tipo} · fuera ${unidad.averia.fueraDeServicio}`} />}
              <Dato etiqueta="Conductor" valor={unidad.conductor} />
              <Dato etiqueta="Turno vigente" valor="07:00 – 15:00" />
              <Dato etiqueta="Hora de alimentación" valor={alimentacion} />
              <Dato etiqueta="Pedidos a bordo" valor={`${unidad.paradas.length}${enRojo > 0 ? ` · ${enRojo} en rojo` : ''}`} />
              <Dato etiqueta="Origen de carga" valor={ALMACENES.find((a) => a.id === unidad.origen)!.nombre} />
            </div>
          </>
        )}
        {pestana === 'turno' && (
          <div className="py-[4px] border-b border-[#E2E8F0]">
            <Dato etiqueta="Conductor" valor={unidad.conductor} />
            <Dato etiqueta="Turno vigente" valor="07:00 – 15:00" />
            <Dato etiqueta="Hora de alimentación" valor={alimentacion} />
            <Dato etiqueta="Próximo turno" valor="15:00 – 23:00" />
          </div>
        )}
        {(pestana === 'resumen' || pestana === 'ruta') && <Paradas unidad={unidad} onSeleccionar={onSeleccionar} />}
        {pestana === 'ruta' && unidad.ruta.length > 0 && (
          <p className="px-[12px] py-[6px] font-mono text-[12px] text-[#64748B]">
            {unidad.ruta.map((p) => `(${p.x},${p.y})`).join(' → ')}
          </p>
        )}
      </div>
      <Acciones>
        <button type="button" onClick={() => onCentrar(unidad.posicion)} className="font-sans font-medium text-[#1E40AF] hover:underline">
          Seguir en el lienzo
        </button>
        {pestana !== 'ruta' && unidad.ruta.length > 0 && (
          <button type="button" onClick={() => setPestana('ruta')} className="font-sans font-medium text-[#1E40AF] hover:underline">
            ver ruta completa ›
          </button>
        )}
      </Acciones>
    </>
  );
};

// --- Incidencias ---------------------------------------------------------------------------------

const ListaIncidencias: React.FC<Pick<PanelLateralProps, 'onSeleccionar' | 'onCentrar'>> = ({ onSeleccionar, onCentrar }) => {
  const riesgo = pedidosEnRiesgo();
  const averiadas = FLOTA.filter((u) => u.estado === 'AVERIADA');
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <section className="px-[12px] pt-[10px] pb-[8px] flex flex-col gap-[4px] border-b border-[#E2E8F0]">
        <TituloSeccion derecha={riesgo.length}>Pedidos en riesgo · menor holgura</TituloSeccion>
        {riesgo.map((p) => (
          <FilaConBarra
            key={p.codigo}
            color={p.nivel === 'ROJO' ? 'rojo' : 'ambar'}
            titulo={`${p.codigo} · ${p.unidad}`}
            detalle={`holgura ${p.holgura} · ETA ${p.eta}`}
            detalleMono
            onClick={() => onSeleccionar({ tipo: 'pedido', codigo: p.codigo })}
            className="py-[5px] rounded"
          />
        ))}
      </section>
      <section className="px-[12px] pt-[10px] pb-[8px] flex flex-col gap-[4px] border-b border-[#E2E8F0]">
        <TituloSeccion derecha={averiadas.length}>Averías activas</TituloSeccion>
        {averiadas.map((u) => (
          <FilaConBarra
            key={u.codigo}
            color="rojo"
            titulo={nombreUnidad(u)}
            detalle={`tipo ${u.averia?.tipo} · fuera de servicio ${u.averia?.fueraDeServicio}`}
            detalleMono
            onClick={() => onSeleccionar({ tipo: 'vehiculo', codigo: u.codigo })}
            className="py-[5px] rounded"
          />
        ))}
      </section>
      <section className="px-[12px] pt-[10px] pb-[8px] flex flex-col gap-[4px]">
        <TituloSeccion derecha={BLOQUEOS.length}>Bloqueos activos</TituloSeccion>
        {BLOQUEOS.map((b) => (
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
  diaReloj,
  onSeleccionar,
  onCerrar,
  onCentrar,
  pestanasCorrida = false,
  onVerBitacoraCompleta,
}) => {
  const pestanas: { tipo: 'incidencias' | 'flota' | 'bitacora'; etiqueta: string }[] = pestanasCorrida
    ? [
        { tipo: 'incidencias', etiqueta: 'Incidencias' },
        { tipo: 'flota', etiqueta: 'Flota' },
        { tipo: 'bitacora', etiqueta: 'Bitácora' },
      ]
    : [{ tipo: 'incidencias', etiqueta: 'Incidencias' }];
  const esDetalle = seleccion.tipo === 'pedido' || seleccion.tipo === 'vehiculo';
  const pedido = seleccion.tipo === 'pedido' ? PEDIDOS_OPERACION[seleccion.codigo] : undefined;
  const unidad = seleccion.tipo === 'vehiculo' ? unidadPorCodigo(seleccion.codigo) : undefined;
  return (
    <aside
      aria-label="Incidencias y detalle"
      className="absolute right-[12px] top-0 bottom-0 z-20 w-[340px] bg-white border border-[#E2E8F0] rounded-[10px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.16)] flex flex-col overflow-hidden leading-[normal]"
      data-sin-zoom
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="h-[36px] px-[12px] flex items-center gap-[16px] border-b border-[#E2E8F0] text-[12px] shrink-0" role="tablist">
        {pestanas.map(({ tipo, etiqueta }) => (
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
        {esDetalle && !pestanasCorrida && (
          <span role="tab" aria-selected className="h-full flex items-center font-sans font-medium text-[#0F172A] border-b-2 border-[#1E40AF]">
            Detalle
          </span>
        )}
        <button type="button" onClick={onCerrar} aria-label="Cerrar panel" className="ml-auto size-[22px] rounded text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]">
          ✕
        </button>
      </div>
      {pedido && <DetallePedido key={pedido.codigo} pedido={pedido} dia={diaReloj} onSeleccionar={onSeleccionar} onCentrar={onCentrar} />}
      {unidad && <DetalleVehiculo key={unidad.codigo} unidad={unidad} onSeleccionar={onSeleccionar} onCentrar={onCentrar} />}
      {seleccion.tipo === 'incidencias' && <ListaIncidencias onSeleccionar={onSeleccionar} onCentrar={onCentrar} />}
      {seleccion.tipo === 'flota' && <EstadoFlota compacto />}
      {seleccion.tipo === 'bitacora' && <BitacoraEventos compacto onVerCompleta={onVerBitacoraCompleta} />}
    </aside>
  );
};
