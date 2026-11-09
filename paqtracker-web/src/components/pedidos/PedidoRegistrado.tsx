import React from 'react';
import { CheckCircle2, Map as MapIcon, Plus, ArrowLeft, Truck, Clock, RefreshCw, User, ClipboardList } from 'lucide-react';
import { ALMACENES, UNIDADES } from '../../config/dominio';
import { ESTADO_EN_ESPERA, etiquetaPlazo } from '../../config/glosario';
import { capitalizar, formatearDiaMesHora, formatearHolgura } from '../../lib/formato';
import { cn } from '../../lib/clases';
import { proyectar, tramoOrtogonal, trazado } from '../../lib/malla';
import type { Coordenada } from '../../types/domain';
import type { PedidoRegistrado as Pedido, VehiculoAsignado } from '../../types/pedidos';
import { MiniMapaMalla } from '../map/MiniMapaMalla';
import { COLOR_SIN_DATO, colorDeUnidad, unidadVacia } from '../map/iconosVehiculo';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { Aviso, Boton, FilaDato, Indicador, Insignia, Tarjeta, TituloGrupo } from '../ui';
import { COLOR_HOLGURA, COLOR_PIN_HOLGURA, TONO_ESTADO } from './estilos';
import { PuntoHolgura, RotuloMapa, SimboloAlmacen, SimboloDestino, SimboloUnidad } from './iconos';

/**
 * Malla con la ruta de la unidad: tramo recorrido y tramo pendiente hasta el nuevo destino. Dibuja con los
 * símbolos del mapa de Operación (almacén, ícono de la unidad con su color de carga y pin con el color de
 * la holgura del pedido).
 */
const MiniMapaRuta: React.FC<{ pedido: Pedido; vehiculo: VehiculoAsignado; unidad: Coordenada }> = ({
  pedido,
  vehiculo,
  unidad,
}) => {
  const almacen = ALMACENES.find((a) => a.id === pedido.almacenOrigen) ?? ALMACENES[0];
  const { destino } = pedido.borrador;
  // Color en vivo de la unidad asignada (su carga actual), igual que en el mapa de Operación.
  const actual = useDatosOperacion().flota.find((u) => u.codigo === vehiculo.codigo);
  const color = actual ? colorDeUnidad(actual) : COLOR_SIN_DATO;
  const hueco = actual ? unidadVacia(actual) : false;
  return (
    <MiniMapaMalla
      alto={160}
      encuadrar={[almacen.ubicacion, unidad, destino]}
      etiqueta={`Ruta de ${vehiculo.codigo} desde ${almacen.nombre} hasta (${destino.x},${destino.y})`}
    >
      {(vista, { ancho }) => {
        const pOrigen = proyectar(vista, almacen.ubicacion);
        const pUnidad = proyectar(vista, unidad);
        const pDestino = proyectar(vista, destino);
        return (
          <>
            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
              <path d={trazado(vista, tramoOrtogonal(almacen.ubicacion, unidad))} fill="none" className="stroke-neutral-400" strokeWidth="2" />
              <path
                d={trazado(vista, tramoOrtogonal(unidad, destino))}
                fill="none"
                className="stroke-primary-600"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
              <SimboloAlmacen almacen={almacen.id} x={pOrigen.x} y={pOrigen.y} />
              <SimboloUnidad tipo={vehiculo.tipo} color={color} hueco={hueco} x={pUnidad.x} y={pUnidad.y} />
              <SimboloDestino
                color={COLOR_PIN_HOLGURA[pedido.nivelHolgura]}
                critico={pedido.nivelHolgura === 'ROJO'}
                x={pDestino.x}
                y={pDestino.y}
              />
            </svg>
            <RotuloMapa x={pOrigen.x} y={pOrigen.y + 16} anchoMapa={ancho} className="text-neutral-600">
              {almacen.nombreCorto}
            </RotuloMapa>
            <RotuloMapa x={pUnidad.x} y={pUnidad.y + 10} anchoMapa={ancho} className="tabular-nums text-neutral-900">
              {vehiculo.codigo}
            </RotuloMapa>
            <RotuloMapa x={pDestino.x} y={pDestino.y + 2} anchoMapa={ancho} className="tabular-nums text-neutral-900">
              ({destino.x},{destino.y})
            </RotuloMapa>
          </>
        );
      }}
    </MiniMapaMalla>
  );
};

interface PedidoRegistradoProps {
  pedido: Pedido;
  /** Sin valor, el pedido aún no figura en el estado en vivo y no se ofrece ubicarlo. */
  onVerEnLienzo?: () => void;
  onRegistrarOtro: () => void;
  onVerCola: () => void;
}

/** Cifra de un indicador a tamaño de título, para que quepan nombres y fechas en tres columnas. */
const ValorKpi: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <span className={cn('block truncate text-title-sm tabular-nums', className)}>{children}</span>
);

export const PedidoRegistrado: React.FC<PedidoRegistradoProps> = ({
  pedido,
  onVerEnLienzo,
  onRegistrarOtro,
  onVerCola,
}) => {
  const { borrador, replanificacion, vehiculo } = pedido;
  const almacen = ALMACENES.find((a) => a.id === pedido.almacenOrigen);
  const nombreVehiculo = vehiculo ? `${capitalizar(UNIDADES[vehiculo.tipo].nombre)} ${vehiculo.codigo}` : 'Sin asignar';

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 lg:p-6">
        {/* Confirmación */}
        <Tarjeta className="border-ok-600/25" cuerpoClassName="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ok-50 text-ok-700">
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-title-sm text-neutral-900">Pedido {pedido.codigo} registrado</h2>
                <Insignia tono={TONO_ESTADO[vehiculo ? 'PLANIFICADO' : 'REGISTRADO']} punto>
                  {vehiculo ? 'Planificado' : ESTADO_EN_ESPERA}
                </Insignia>
              </div>
              <p className="text-body-sm text-neutral-600">
                {vehiculo
                  ? `Asignado automáticamente a ${nombreVehiculo} e incorporado a la ruta vigente.`
                  : 'No había una unidad libre al registrarlo: queda en espera y entra en la próxima planificación.'}
              </p>
            </div>
          </div>

          {onVerEnLienzo && (
            <Boton variante="primario" icono={MapIcon} onClick={onVerEnLienzo}>
              Ubicar en el mapa en vivo
            </Boton>
          )}
        </Tarjeta>

        {/* Doble columna: resumen del pedido y planificación */}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
          <Tarjeta cuerpoClassName="flex flex-col gap-3">
            <TituloGrupo icono={User} className="border-b border-neutral-200 pb-3">
              Resumen del pedido
            </TituloGrupo>
            <div className="flex flex-col">
              <FilaDato separador etiqueta="Cliente" valor={borrador.cliente} texto />
              <FilaDato
                separador
                etiqueta="Nodo de destino"
                valor={
                  <span className="rounded bg-primary-50 px-1.5 py-0.5 text-primary-700">
                    X: {borrador.destino.x} · Y: {borrador.destino.y}
                  </span>
                }
              />
              <FilaDato separador etiqueta="Cantidad" valor={`${borrador.cantidad} unidades de P`} />
              <FilaDato separador etiqueta="Tipo de entrega" valor={etiquetaPlazo(borrador.plazoHoras)} texto />
              <FilaDato
                separador
                etiqueta="Hora límite"
                valor={<span className="font-semibold">{formatearDiaMesHora(pedido.horaLimite)}</span>}
              />
              <FilaDato separador etiqueta="Almacén de despacho" valor={almacen?.nombre ?? '—'} texto />
            </div>
          </Tarjeta>

          <Tarjeta cuerpoClassName="flex flex-col gap-4">
            <TituloGrupo icono={ClipboardList} className="border-b border-neutral-200 pb-3">
              Resultado de la planificación
            </TituloGrupo>

            <div className="grid grid-cols-3 gap-2.5">
              <Indicador className="min-w-0" etiqueta="Vehículo" icono={Truck} valor={<ValorKpi>{nombreVehiculo}</ValorKpi>} />
              <Indicador
                className="min-w-0"
                etiqueta="Llegada estimada"
                icono={Clock}
                valor={<ValorKpi>{pedido.eta ? formatearDiaMesHora(pedido.eta) : '—'}</ValorKpi>}
              />
              <Indicador
                className="min-w-0"
                etiqueta="Holgura"
                valor={
                  <span className="flex items-center gap-1.5">
                    <PuntoHolgura nivel={pedido.nivelHolgura} />
                    <ValorKpi className={COLOR_HOLGURA[pedido.nivelHolgura]}>{formatearHolgura(pedido.holguraMinutos)}</ValorKpi>
                  </span>
                }
              />
            </div>

            {/* Minimapa de la ruta */}
            {vehiculo && pedido.posicionVehiculo && (
              <figure className="mt-1 flex flex-col gap-1.5">
                <MiniMapaRuta pedido={pedido} vehiculo={vehiculo} unidad={pedido.posicionVehiculo} />
                <figcaption className="text-center text-caption text-neutral-600">
                  El destino se agregó a la ruta de {vehiculo.codigo}.
                </figcaption>
              </figure>
            )}

            {/* Replanificación en vivo */}
            <Aviso tono="info" icono={RefreshCw}>
              {replanificacion.replanifico
                ? `Planificado en ${replanificacion.milisegundos} ms · ${replanificacion.unidadesDespachadas} ${
                    replanificacion.unidadesDespachadas === 1 ? 'unidad en reparto' : 'unidades en reparto'
                  }.`
                : 'El pedido entra en la próxima planificación.'}
            </Aviso>
          </Tarjeta>
        </div>

        {/* Acciones finales */}
        <Tarjeta cuerpoClassName="flex flex-wrap items-center justify-between gap-3 p-4">
          <Boton icono={Plus} onClick={onRegistrarOtro}>
            Registrar otro pedido
          </Boton>
          <Boton variante="fantasma" icono={ArrowLeft} onClick={onVerCola}>
            Volver a la cola de pedidos
          </Boton>
        </Tarjeta>
      </div>
    </div>
  );
};
