import React, { useState } from 'react';
import { User, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ALMACENES, MALLA_ALTO_KM, MALLA_ANCHO_KM, PLAZOS_HORAS, UNIDADES, esPlazoRegular, type PlazoHoras } from '../../config/dominio';
import { tipoDeEntrega } from '../../config/glosario';
import { coordenadaValida, evaluarFactibilidad, type EvaluacionFactibilidad, type NivelFactibilidad } from '../../lib/factibilidad';
import { diasDeDiferencia, formatearDiaMes, formatearDuracion, formatearHora, sumarMinutos } from '../../lib/formato';
import { nodoEn, proyectar, tramoOrtogonal, trazado, type Vista } from '../../lib/malla';
import { cn } from '../../lib/clases';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { useColaPedidos } from '../../hooks/usePedidos';
import { ErrorDeApi } from '../../services/clienteApi';
import { registrarPedido } from '../../services/servicioPedidos';
import type { Coordenada } from '../../types/domain';
import type { NivelHolgura, PedidoRegistrado } from '../../types/pedidos';
import { IndicadorRadio } from '../layout/IndicadorRadio';
import { MiniMapaMalla } from '../map/MiniMapaMalla';
import { COLOR_SIN_DATO } from '../map/iconosVehiculo';
import { Aviso, Boton, Campo, Entrada, FilaDato, Indicador, Insignia, Tarjeta, TituloGrupo, type TonoAviso } from '../ui';
import { COLOR_PIN_HOLGURA } from './estilos';
import { RotuloMapa, SimboloAlmacen, SimboloDestino } from './iconos';

const SIN_SPINNER = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const CANTIDAD_MAXIMA = 999;

/** "bicicleta 4, moto 8 y auto 24", desde la configuración del dominio. */
const CAPACIDADES = [UNIDADES.BICICLETA, UNIDADES.MOTO, UNIDADES.AUTO]
  .map((u) => `${u.nombre} ${u.capacidad}`)
  .join(', ')
  .replace(/, ([^,]*)$/, ' y $1');

const ESTILO_FACTIBILIDAD: Record<NivelFactibilidad, { titulo: string; tono: TonoAviso; holgura: NivelHolgura }> = {
  FACTIBLE: { titulo: 'Factible dentro del plazo', tono: 'ok', holgura: 'VERDE' },
  AJUSTADA: { titulo: 'Factible con poco margen', tono: 'warn', holgura: 'AMBAR' },
  NO_FACTIBLE: { titulo: 'No factible con la velocidad de la flota', tono: 'critical', holgura: 'ROJO' },
};

/** Caja con el estilo de `Entrada` para controles compuestos (prefijo X/Y, botones − y +). */
const CAJA_CONTROL =
  'flex h-10 items-center rounded-control border border-neutral-300 bg-white transition-colors focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-600/20';

const InputCoordenada: React.FC<{ id?: string; eje: 'X' | 'Y'; valor: string; maximo: number; ayuda?: string; onCambiar: (valor: string) => void }> = ({
  id,
  eje,
  valor,
  maximo,
  ayuda,
  onCambiar,
}) => (
  <label className={cn(CAJA_CONTROL, 'w-28 gap-2 px-3')}>
    <span className="text-body-sm font-semibold text-neutral-600">{eje}:</span>
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={0}
      max={maximo}
      value={valor}
      onChange={(e) => onCambiar(e.target.value)}
      aria-label={`Coordenada ${eje} del nodo de destino (0 a ${maximo})`}
      aria-describedby={ayuda}
      className={`w-full min-w-0 bg-transparent text-body font-medium tabular-nums text-neutral-900 outline-none ${SIN_SPINNER}`}
    />
  </label>
);

/**
 * Malla completa con el almacén de origen (si ya se conoce), el destino y el recorrido ortogonal
 * estimado entre ambos. Tocar la malla fija el destino ahí, sin esperar a escribir las coordenadas.
 * Dibuja con los símbolos del mapa de Operación; el pin toma el color de la factibilidad.
 */
const MiniMapaDestino: React.FC<{
  evaluacion: EvaluacionFactibilidad | null;
  destino: Coordenada | null;
  onElegirDestino: (nodo: Coordenada) => void;
}> = ({ evaluacion, destino, onElegirDestino }) => {
  const almacen = evaluacion?.origen.almacen;
  const stock = useDatosOperacion().almacenes.find((a) => a.id === almacen?.id)?.porcentajeStock ?? undefined;
  const encuadrar = destino ? (almacen ? [almacen.ubicacion, destino] : [destino]) : undefined;
  const nivel = evaluacion ? ESTILO_FACTIBILIDAD[evaluacion.nivel].holgura : null;
  return (
    <MiniMapaMalla
      alto={180}
      encuadrar={encuadrar}
      etiqueta={
        almacen && destino
          ? `Malla de ${MALLA_ANCHO_KM} por ${MALLA_ALTO_KM} km: destino (${destino.x},${destino.y}) a ${evaluacion!.origen.km} km del ${almacen.nombre}`
          : `Malla de ${MALLA_ANCHO_KM} por ${MALLA_ALTO_KM} km, para elegir el nodo de destino con un clic`
      }
    >
      {(vista, { ancho }) => {
        const elegirDesdeClic = (vistaActual: Vista) => (e: React.MouseEvent<HTMLDivElement>) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const nodo = nodoEn(vistaActual, e.clientX - rect.left, e.clientY - rect.top);
          if (nodo) onElegirDestino(nodo);
        };
        const pOrigen = almacen ? proyectar(vista, almacen.ubicacion) : null;
        const pDestino = destino ? proyectar(vista, destino) : null;
        return (
          <>
            <div
              className="absolute inset-0 h-full w-full cursor-crosshair"
              onClick={elegirDesdeClic(vista)}
              title="Clic para fijar el destino en este nodo"
              aria-hidden="true"
            />
            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
              {almacen && destino && (
                <path
                  d={trazado(vista, tramoOrtogonal(almacen.ubicacion, destino))}
                  fill="none"
                  className="stroke-primary-600"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />
              )}
              {/* Los otros almacenes, en pequeño y atenuados: dan contexto sin competir con el de origen. */}
              {almacen &&
                ALMACENES.filter((otro) => otro.id !== almacen.id).map((otro) => {
                  const p = proyectar(vista, otro.ubicacion);
                  return <SimboloAlmacen key={otro.id} almacen={otro.id} x={p.x} y={p.y} escala={0.5} opacidad={0.6} />;
                })}
              {almacen && pOrigen && <SimboloAlmacen almacen={almacen.id} x={pOrigen.x} y={pOrigen.y} />}
              {pDestino && (
                <SimboloDestino color={nivel ? COLOR_PIN_HOLGURA[nivel] : COLOR_SIN_DATO} critico={nivel === 'ROJO'} x={pDestino.x} y={pDestino.y} />
              )}
            </svg>
            {almacen && pOrigen && (
              <RotuloMapa x={pOrigen.x} y={pOrigen.y + 16} anchoMapa={ancho} className="text-neutral-600">
                {almacen.nombreCorto}
                {stock !== undefined && ` · ${stock}%`}
              </RotuloMapa>
            )}
            {destino && pDestino && (
              <RotuloMapa x={pDestino.x} y={pDestino.y + 4} anchoMapa={ancho} className="tabular-nums text-neutral-900">
                ({destino.x},{destino.y})
              </RotuloMapa>
            )}
          </>
        );
      }}
    </MiniMapaMalla>
  );
};

interface RegistrarPedidoProps {
  onCancelar: () => void;
  onRegistrado: (pedido: PedidoRegistrado) => void;
}

export const RegistrarPedido: React.FC<RegistrarPedidoProps> = ({ onCancelar, onRegistrado }) => {
  const datos = useDatosOperacion();
  const { reloj } = datos;
  const { clientes } = useColaPedidos();
  // Sin valores de ejemplo en destino ni plazo: un pedido no debe registrarse con datos que nadie escribió.
  const [cliente, setCliente] = useState('');
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  // Texto del campo: se puede vaciar mientras se escribe; el número válido se deriva de él.
  const [cantidadTexto, setCantidadTexto] = useState('1');
  const [plazoHoras, setPlazoHoras] = useState<PlazoHoras | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cantidad = Number(cantidadTexto);
  const cantidadValida = cantidadTexto !== '' && Number.isInteger(cantidad) && cantidad >= 1 && cantidad <= CANTIDAD_MAXIMA;
  const destino = { x: Number(x), y: Number(y) };
  const destinoCompleto = x !== '' && y !== '';
  const destinoValido = destinoCompleto && coordenadaValida(destino);
  const evaluacion = destinoValido && cantidadValida && plazoHoras !== null ? evaluarFactibilidad(destino, cantidad, plazoHoras) : null;

  const horaLimite = plazoHoras === null ? null : sumarMinutos(reloj, plazoHoras * 60);
  const diasLimite = horaLimite === null ? null : diasDeDiferencia(reloj, horaLimite);
  const prefijoDia = diasLimite === 0 ? 'hoy ' : diasLimite === 1 ? 'mañana ' : '';
  const formularioValido = cliente.trim() !== '' && destinoValido && cantidadValida && plazoHoras !== null;
  const faltantes = [
    cliente.trim() === '' && 'el cliente',
    !destinoValido && 'un destino dentro de la malla',
    !cantidadValida && `una cantidad de 1 a ${CANTIDAD_MAXIMA}`,
    plazoHoras === null && 'el plazo de entrega',
  ].filter(Boolean) as string[];

  const cambiarCantidad = (valor: number) =>
    setCantidadTexto(String(Math.min(CANTIDAD_MAXIMA, Math.max(1, Math.round(valor) || 1))));
  const base = cantidadValida ? cantidad : 1;

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!formularioValido || plazoHoras === null || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      onRegistrado(await registrarPedido({ cliente: cliente.trim(), destino, cantidad, plazoHoras }, datos));
    } catch (e) {
      setError(e instanceof ErrorDeApi ? e.message : 'No se pudo registrar el pedido. Inténtalo de nuevo.');
      setEnviando(false);
    }
  };

  const segundoAlmacen = evaluacion?.distancias[1];
  const ayudaDestino = !destinoCompleto
    ? `Ingresa X de 0 a ${MALLA_ANCHO_KM} e Y de 0 a ${MALLA_ALTO_KM} (km desde la esquina de la malla).`
    : destinoValido && evaluacion
      ? `Ruta directa: ${evaluacion.origen.km} km desde ${evaluacion.origen.almacen.nombre} (almacén más próximo)` +
        (segundoAlmacen ? ` · ${segundoAlmacen.km} km desde ${segundoAlmacen.almacen.nombre}` : '')
      : undefined;
  const errorDestino =
    destinoCompleto && !destinoValido
      ? `El destino está fuera de la malla: X debe ir de 0 a ${MALLA_ANCHO_KM} e Y de 0 a ${MALLA_ALTO_KM}.`
      : undefined;
  // Campo pone aria-describedby en su hijo directo; en los controles compuestos se repite en cada input.
  const descripcionDestino = errorDestino ? 'pedido-destino-x-error' : ayudaDestino ? 'pedido-destino-x-ayuda' : undefined;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-6 p-4 lg:grid-cols-12 lg:p-6">
        {/* Formulario de registro (columna 7/12) */}
        <form onSubmit={enviar} className="lg:col-span-7">
          <Tarjeta
            titulo="Datos del pedido"
            descripcion="Completa los detalles del pedido para que el planificador asigne la mejor unidad disponible."
            cuerpoClassName="flex flex-col gap-6"
          >
            {/* Cliente */}
            <Campo
              htmlFor="pedido-cliente"
              etiqueta="Cliente"
              obligatorio
              ayuda="Escribe el nombre del cliente o selecciona uno de los clientes frecuentes registrados."
            >
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
                <Entrada
                  id="pedido-cliente"
                  tamano="lg"
                  list="pedido-clientes"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Ej. Distribuidora Santa Anita S.A.C."
                  autoComplete="off"
                  aria-describedby="pedido-cliente-ayuda"
                  className="pl-9 font-medium [&::-webkit-calendar-picker-indicator]:!hidden"
                />
              </div>
            </Campo>
            <datalist id="pedido-clientes">
              {clientes.map((nombre) => (
                <option key={nombre} value={nombre} />
              ))}
            </datalist>

            {/* Coordenadas */}
            <Campo
              htmlFor="pedido-destino-x"
              etiqueta="Nodo de destino en la ciudad (X, Y)"
              obligatorio
              ayuda={ayudaDestino}
              error={errorDestino}
            >
              <div className="flex items-center gap-3">
                <InputCoordenada id="pedido-destino-x" eje="X" valor={x} maximo={MALLA_ANCHO_KM} ayuda={descripcionDestino} onCambiar={setX} />
                <InputCoordenada eje="Y" valor={y} maximo={MALLA_ALTO_KM} ayuda={descripcionDestino} onCambiar={setY} />
              </div>
            </Campo>

            {/* Cantidad de unidades */}
            <Campo
              htmlFor="pedido-cantidad"
              etiqueta="Cantidad a transportar (unidades de P)"
              obligatorio
              ayuda={`Capacidad por unidad: ${CAPACIDADES}. Si no cabe en una, se reparte en varios viajes.`}
            >
              <div className={cn(CAJA_CONTROL, 'w-44')}>
                <button
                  type="button"
                  onClick={() => cambiarCantidad(base - 1)}
                  disabled={base <= 1}
                  aria-label="Disminuir cantidad"
                  className="h-full w-11 cursor-pointer rounded-l-control text-title-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <input
                  id="pedido-cantidad"
                  type="number"
                  min={1}
                  max={CANTIDAD_MAXIMA}
                  value={cantidadTexto}
                  onChange={(e) => setCantidadTexto(e.target.value)}
                  onBlur={() => cantidadTexto !== '' && !cantidadValida && cambiarCantidad(cantidad)}
                  aria-label="Cantidad de unidades de P"
                  aria-describedby="pedido-cantidad-ayuda"
                  className={`h-full min-w-0 flex-1 bg-transparent text-center text-title-sm tabular-nums text-neutral-900 outline-none ${SIN_SPINNER}`}
                />
                <button
                  type="button"
                  onClick={() => cambiarCantidad(base + 1)}
                  disabled={base >= CANTIDAD_MAXIMA}
                  aria-label="Aumentar cantidad"
                  className="h-full w-11 cursor-pointer rounded-r-control text-title-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </Campo>

            {/* Tipo de entrega / plazo */}
            <fieldset className="flex w-full flex-col gap-1">
              <legend className="mb-1 text-body-sm font-medium text-neutral-700">
                Plazo de entrega acordado<span className="text-critical-600" aria-hidden="true"> *</span>
              </legend>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                {PLAZOS_HORAS.map((plazo) => {
                  const seleccionado = plazo === plazoHoras;
                  const regular = esPlazoRegular(plazo);
                  const limiteCard = sumarMinutos(reloj, plazo * 60);
                  const diasLimiteCard = diasDeDiferencia(reloj, limiteCard);
                  const prefijoDiaCard = diasLimiteCard === 0 ? 'hoy ' : diasLimiteCard === 1 ? 'mañana ' : `${formatearDiaMes(limiteCard)} `;
                  return (
                    <label
                      key={plazo}
                      className={cn(
                        'flex cursor-pointer flex-col items-start gap-1 rounded-card border p-3 text-left transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-600/40',
                        seleccionado
                          ? 'border-primary-600 bg-primary-50 shadow-xs ring-1 ring-primary-600'
                          : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50',
                      )}
                    >
                      <input
                        type="radio"
                        name="plazo-entrega"
                        value={plazo}
                        checked={seleccionado}
                        onChange={() => setPlazoHoras(plazo)}
                        className="sr-only"
                      />
                      <span className="flex items-center gap-1.5">
                        <IndicadorRadio marcado={seleccionado} />
                        <Insignia tono={regular ? 'neutral' : 'warn'}>{tipoDeEntrega(plazo)}</Insignia>
                      </span>
                      <span className={cn('mt-1 text-title tabular-nums', seleccionado ? 'text-primary-700' : 'text-neutral-900')}>
                        {plazo} h
                      </span>
                      <span className="text-caption text-neutral-600">
                        Límite {prefijoDiaCard}
                        {formatearHora(limiteCard)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Acciones */}
            <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center">
              <Boton
                type="submit"
                variante="primario"
                tamano="lg"
                disabled={!formularioValido}
                cargando={enviando}
                textoCargando="Registrando y planificando…"
              >
                Registrar y planificar pedido
              </Boton>
              <Boton variante="secundario" tamano="lg" onClick={onCancelar}>
                Cancelar
              </Boton>
            </div>

            {!formularioValido && !enviando && faltantes.length > 0 && (
              <p className="text-body-sm text-neutral-600">
                Completa {faltantes.join(', ').replace(/, ([^,]*)$/, ' y $1')} para registrar el pedido.
              </p>
            )}

            {error && (
              <Aviso tono="critical" role="alert">
                {error}
              </Aviso>
            )}
          </Tarjeta>
        </form>

        {/* Panel de factibilidad en vivo (columna 5/12) */}
        <aside aria-live="polite" className="sticky top-6 lg:col-span-5">
          <Tarjeta cuerpoClassName="flex flex-col gap-4">
            <TituloGrupo derecha="Estimación antes de registrar" className="border-b border-neutral-200 pb-3">
              Factibilidad
            </TituloGrupo>

            <MiniMapaDestino
              evaluacion={evaluacion}
              destino={destinoValido ? destino : null}
              onElegirDestino={(nodo) => {
                setX(String(nodo.x));
                setY(String(nodo.y));
              }}
            />
            <p className="text-caption text-neutral-600">
              {evaluacion
                ? 'Ruta ortogonal proyectada entre almacén y destino.'
                : 'Haz clic en la malla para fijar el destino, o escribe sus coordenadas.'}
            </p>
            {!evaluacion && (
              <Aviso tono="neutral" icono={null} className="justify-center text-center">
                {destinoValido ? 'Elige un plazo de entrega para calcular la factibilidad.' : 'Elige un destino y un plazo de entrega para calcular la factibilidad.'}
              </Aviso>
            )}

            {/* Hora límite resultante */}
            <Indicador
              etiqueta="Hora límite estimada de entrega:"
              valor={
                horaLimite && plazoHoras !== null ? (
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    {formatearHora(horaLimite)}
                    <span className="text-body-sm font-normal text-neutral-600">
                      ({prefijoDia}
                      {formatearDiaMes(horaLimite)} · en {formatearDuracion(plazoHoras * 60)})
                    </span>
                  </span>
                ) : (
                  <span className="block text-body-sm font-normal text-neutral-600">Elige un plazo de entrega para calcularla.</span>
                )
              }
            />

            {evaluacion && (
              <>
                {/* Diagnóstico de factibilidad */}
                <Aviso tono={ESTILO_FACTIBILIDAD[evaluacion.nivel].tono} titulo={ESTILO_FACTIBILIDAD[evaluacion.nivel].titulo}>
                  {evaluacion.mensaje}
                </Aviso>

                {/* Parámetros clave */}
                <div className="flex flex-col border-t border-neutral-200 pt-2">
                  <FilaDato etiqueta="Almacén de origen probable" valor={evaluacion.origen.almacen.nombre} texto />
                  <FilaDato etiqueta="Vehículo recomendado" valor={evaluacion.vehiculoSugerido} texto />
                  <FilaDato
                    etiqueta="Distancia de recorrido"
                    valor={`${evaluacion.origen.km} km` + (evaluacion.minutosViaje !== null ? ` (~${evaluacion.minutosViaje} min)` : '')}
                  />
                </div>

                {/* Fraccionamiento */}
                {evaluacion.unidadesNecesarias <= 1 ? (
                  <Aviso tono="ok" icono={CheckCircle2}>
                    Las {cantidad} u. caben en una sola unidad: un solo viaje.
                  </Aviso>
                ) : (
                  <Aviso tono="warn" icono={AlertTriangle}>
                    Las {cantidad} u. no caben en una sola unidad: se repartirán en {evaluacion.unidadesNecesarias} viajes.
                  </Aviso>
                )}
              </>
            )}
          </Tarjeta>
        </aside>
      </div>
    </div>
  );
};
