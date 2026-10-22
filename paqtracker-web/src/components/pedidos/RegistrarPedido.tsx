import React, { useState } from 'react';
import {
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { ALMACENES, MALLA_ALTO_KM, MALLA_ANCHO_KM, PLAZOS_HORAS, UNIDADES, esPlazoRegular, type PlazoHoras } from '../../config/dominio';
import { tipoDeEntrega } from '../../config/glosario';
import { coordenadaValida, evaluarFactibilidad, type EvaluacionFactibilidad, type NivelFactibilidad } from '../../lib/factibilidad';
import { diasDeDiferencia, formatearDiaMes, formatearDuracion, formatearHora, sumarMinutos } from '../../lib/formato';
import { proyectar, tramoOrtogonal, trazado } from '../../lib/malla';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { useColaPedidos } from '../../hooks/usePedidos';
import { ErrorDeApi } from '../../services/clienteApi';
import { registrarPedido } from '../../services/servicioPedidos';
import type { Coordenada } from '../../types/domain';
import type { PedidoRegistrado } from '../../types/pedidos';
import { MiniMapaMalla } from '../map/MiniMapaMalla';
import { MarcadorAlmacen, PinDestino, RotuloMapa } from './iconos';

const SIN_SPINNER = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const CANTIDAD_MAXIMA = 999;

/** "bicicleta 4, moto 8 y auto 24", desde la configuración del dominio. */
const CAPACIDADES = [UNIDADES.BICICLETA, UNIDADES.MOTO, UNIDADES.AUTO]
  .map((u) => `${u.nombre} ${u.capacidad}`)
  .join(', ')
  .replace(/, ([^,]*)$/, ' y $1');

const ESTILO_FACTIBILIDAD: Record<
  NivelFactibilidad,
  { titulo: string; caja: string; texto: string; icono: React.ReactNode }
> = {
  FACTIBLE: {
    titulo: 'Factible dentro del plazo',
    caja: 'bg-emerald-50/70 border-emerald-200',
    texto: 'text-emerald-800',
    icono: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
  },
  AJUSTADA: {
    titulo: 'Factible con poco margen',
    caja: 'bg-amber-50/70 border-amber-200',
    texto: 'text-amber-800',
    icono: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
  },
  NO_FACTIBLE: {
    titulo: 'No factible con la velocidad de la flota',
    caja: 'bg-rose-50/70 border-rose-200',
    texto: 'text-rose-800',
    icono: <XCircle className="w-4 h-4 text-rose-600 shrink-0" />,
  },
};

const Campo: React.FC<{ etiqueta: string; htmlFor?: string; ayuda?: React.ReactNode; children: React.ReactNode }> = ({
  etiqueta,
  htmlFor,
  ayuda,
  children,
}) => (
  <div className="flex flex-col gap-2 w-full">
    <label htmlFor={htmlFor} className="font-sans font-medium text-xs text-slate-700">
      {etiqueta}
    </label>
    {children}
    {ayuda && <p className="font-sans text-[11px] text-slate-500">{ayuda}</p>}
  </div>
);

const InputCoordenada: React.FC<{ eje: 'X' | 'Y'; valor: string; maximo: number; onCambiar: (valor: string) => void }> = ({
  eje,
  valor,
  maximo,
  onCambiar,
}) => (
  <label className="bg-white border border-slate-200 rounded-lg h-10 w-28 px-3 flex items-center gap-2 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600/30 transition">
    <span className="font-sans font-semibold text-xs text-slate-500">{eje}:</span>
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={maximo}
      value={valor}
      onChange={(e) => onCambiar(e.target.value)}
      aria-label={`Coordenada ${eje} del nodo de destino (0 a ${maximo})`}
      className={`w-full min-w-0 bg-transparent outline-none tabular-nums font-medium text-sm text-slate-800 ${SIN_SPINNER}`}
    />
  </label>
);

/** Malla completa con el almacén de origen, el destino y el recorrido ortogonal estimado entre ambos */
const MiniMapaDestino: React.FC<{ evaluacion: EvaluacionFactibilidad; destino: Coordenada }> = ({ evaluacion, destino }) => {
  const { almacen } = evaluacion.origen;
  const stock = useDatosOperacion().almacenes.find((a) => a.id === almacen.id)?.porcentajeStock ?? undefined;
  return (
    <MiniMapaMalla
      alto={180}
      encuadrar={[almacen.ubicacion, destino]}
      etiqueta={`Malla de ${MALLA_ANCHO_KM} por ${MALLA_ALTO_KM} km: destino (${destino.x},${destino.y}) a ${evaluacion.origen.km} km del ${almacen.nombre}`}
    >
      {(vista, { ancho }) => {
        const pOrigen = proyectar(vista, almacen.ubicacion);
        const pDestino = proyectar(vista, destino);
        return (
          <>
            <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
              <path
                d={trazado(vista, tramoOrtogonal(almacen.ubicacion, destino))}
                fill="none"
                stroke="#1E40AF"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
            </svg>
            {ALMACENES.filter((otro) => otro.id !== almacen.id).map((otro) => {
              const p = proyectar(vista, otro.ubicacion);
              return (
                <span
                  key={otro.id}
                  title={otro.nombre}
                  className="absolute size-2 rounded-xs bg-slate-400 border border-white"
                  style={{ left: p.x - 4, top: p.y - 4 }}
                />
              );
            })}
            <MarcadorAlmacen almacen={almacen.id} cx={pOrigen.x} cy={pOrigen.y} />
            <RotuloMapa x={pOrigen.x} y={pOrigen.y + 20} anchoMapa={ancho} className="font-sans font-medium text-slate-500">
              {almacen.nombreCorto}
              {stock !== undefined && ` · ${stock}%`}
            </RotuloMapa>
            <PinDestino variante="riesgo" x={pDestino.x} y={pDestino.y} />
            <RotuloMapa x={pDestino.x} y={pDestino.y + 4} anchoMapa={ancho} className="tabular-nums font-medium text-slate-900">
              ({destino.x},{destino.y})
            </RotuloMapa>
          </>
        );
      }}
    </MiniMapaMalla>
  );
};

const FilaDato: React.FC<{ etiqueta: string; valor: string }> = ({ etiqueta, valor }) => (
  <div className="flex items-center justify-between w-full text-xs">
    <span className="font-sans text-slate-500">{etiqueta}</span>
    <span className="font-sans font-medium text-slate-800 text-right">{valor}</span>
  </div>
);

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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulario de registro (Columna 7/12) */}
        <form
          onSubmit={enviar}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-[10px] p-6 shadow-xs flex flex-col gap-6"
        >
          <div>
            <h2 className="font-sans font-bold text-base text-slate-800">Datos del pedido</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Completa los detalles del pedido para que el planificador asigne la mejor unidad disponible.
            </p>
          </div>

          {/* Cliente */}
          <Campo
            etiqueta="Cliente *"
            htmlFor="pedido-cliente"
            ayuda="Escribe el nombre del cliente o selecciona uno de los clientes frecuentes registrados."
          >
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="pedido-cliente"
                list="pedido-clientes"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Ej. Distribuidora Santa Anita S.A.C."
                autoComplete="off"
                className="bg-white border border-slate-200 rounded-lg h-10 pl-9 pr-3 w-full font-sans font-medium text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition [&::-webkit-calendar-picker-indicator]:!hidden"
              />
            </div>
            <datalist id="pedido-clientes">
              {clientes.map((nombre) => (
                <option key={nombre} value={nombre} />
              ))}
            </datalist>
          </Campo>

          {/* Coordenadas */}
          <Campo
            etiqueta="Nodo de destino en la ciudad (X, Y) *"
            ayuda={
              !destinoCompleto ? (
                `Ingresa X de 0 a ${MALLA_ANCHO_KM} e Y de 0 a ${MALLA_ALTO_KM} (km desde la esquina de la malla).`
              ) : !destinoValido ? (
                <span className="text-rose-600 font-medium">
                  El destino está fuera de la malla: X debe ir de 0 a {MALLA_ANCHO_KM} e Y de 0 a {MALLA_ALTO_KM}.
                </span>
              ) : (
                evaluacion &&
                `Ruta directa: ${evaluacion.origen.km} km desde ${evaluacion.origen.almacen.nombre} (almacén más próximo)` +
                  (segundoAlmacen ? ` · ${segundoAlmacen.km} km desde ${segundoAlmacen.almacen.nombre}` : '')
              )
            }
          >
            <div className="flex items-center gap-3">
              <InputCoordenada eje="X" valor={x} maximo={MALLA_ANCHO_KM} onCambiar={setX} />
              <InputCoordenada eje="Y" valor={y} maximo={MALLA_ALTO_KM} onCambiar={setY} />
            </div>
          </Campo>

          {/* Cantidad de unidades */}
          <Campo
            etiqueta="Cantidad a transportar (unidades de P) *"
            ayuda={`Capacidad por unidad: ${CAPACIDADES}. Si no cabe en una, se reparte en varios viajes.`}
          >
            <div className="bg-white border border-slate-200 rounded-lg h-10 w-44 flex items-center focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600/30 transition">
              <button
                type="button"
                onClick={() => cambiarCantidad(base - 1)}
                disabled={base <= 1}
                aria-label="Disminuir cantidad"
                className="w-11 h-full font-sans font-medium text-base text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition rounded-l-lg"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={CANTIDAD_MAXIMA}
                value={cantidadTexto}
                onChange={(e) => setCantidadTexto(e.target.value)}
                onBlur={() => cantidadTexto !== '' && !cantidadValida && cambiarCantidad(cantidad)}
                aria-label="Cantidad de unidades de P"
                className={`flex-1 min-w-0 h-full bg-transparent text-center outline-none tabular-nums font-bold text-sm text-slate-900 ${SIN_SPINNER}`}
              />
              <button
                type="button"
                onClick={() => cambiarCantidad(base + 1)}
                disabled={base >= CANTIDAD_MAXIMA}
                aria-label="Aumentar cantidad"
                className="w-11 h-full font-sans font-medium text-base text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition rounded-r-lg"
              >
                +
              </button>
            </div>
          </Campo>

          {/* Tipo de entrega / Plazo */}
          <fieldset className="flex flex-col gap-2 w-full">
            <legend className="font-sans font-medium text-xs text-slate-700 mb-1">
              Plazo de entrega acordado *
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {PLAZOS_HORAS.map((plazo) => {
                const seleccionado = plazo === plazoHoras;
                const regular = esPlazoRegular(plazo);
                return (
                  <label
                    key={plazo}
                    className={`rounded-[10px] p-3 flex flex-col items-start gap-1 text-left transition cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600/40 ${
                      seleccionado
                        ? 'bg-blue-50/80 border-2 border-blue-600 shadow-xs'
                        : 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plazo-entrega"
                      value={plazo}
                      checked={seleccionado}
                      onChange={() => setPlazoHoras(plazo)}
                      className="sr-only"
                    />
                    <span
                      className={`text-[11px] font-sans font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        regular
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100/80 text-amber-800'
                      }`}
                    >
                      {tipoDeEntrega(plazo)}
                    </span>
                    <span
                      className={`tabular-nums font-bold text-base mt-1 ${
                        seleccionado ? 'text-blue-900' : 'text-slate-800'
                      }`}
                    >
                      {plazo} h
                    </span>
                    <span className="text-[11px] font-sans text-slate-500">
                      Límite {formatearHora(sumarMinutos(reloj, plazo * 60))}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Acciones */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="submit"
              disabled={!formularioValido || enviando}
              className="h-11 px-6 rounded-[6px] bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-sans font-medium text-xs flex items-center justify-center gap-2 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {enviando ? (
                <span>Registrando y planificando…</span>
              ) : (
                <span>Registrar y planificar pedido</span>
              )}
            </button>
            <button
              type="button"
              onClick={onCancelar}
              className="h-11 px-5 rounded-[6px] border border-slate-200 hover:bg-slate-50 text-slate-600 font-sans font-medium text-xs transition text-center"
            >
              Cancelar
            </button>
          </div>

          {!formularioValido && !enviando && faltantes.length > 0 && (
            <p className="text-xs text-slate-500 font-sans">
              Completa {faltantes.join(', ').replace(/, ([^,]*)$/, ' y $1')} para registrar el pedido.
            </p>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Panel de factibilidad en vivo (Columna 5/12) */}
        <aside
          aria-live="polite"
          className="lg:col-span-5 bg-white border border-slate-200 rounded-[10px] p-6 shadow-xs flex flex-col gap-4 sticky top-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-sans font-bold text-xs text-slate-700 tracking-wider uppercase">
                Factibilidad
              </h3>
            </div>
            <span className="text-[11px] font-sans text-slate-500">Estimación antes de registrar</span>
          </div>

          {evaluacion ? (
            <>
              <MiniMapaDestino evaluacion={evaluacion} destino={destino} />
              <p className="text-[11px] font-sans text-slate-500">
                Ruta ortogonal proyectada entre almacén y destino.
              </p>
            </>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg h-44 flex items-center justify-center px-6 text-center text-xs text-slate-500">
              Ingresa un destino válido y elige un plazo para calcular la factibilidad de entrega.
            </div>
          )}

          {/* Hora límite resultante */}
          <div className="p-3.5 bg-slate-50/80 rounded-[10px] border border-slate-200 flex flex-col gap-1">
            <span className="text-[11px] font-sans text-slate-500">Hora límite estimada de entrega:</span>
            {horaLimite && plazoHoras !== null ? (
              <div className="flex items-baseline gap-2">
                <span className="tabular-nums font-bold text-2xl text-slate-900">{formatearHora(horaLimite)}</span>
                <span className="text-xs text-slate-600 font-sans">
                  ({prefijoDia}
                  {formatearDiaMes(horaLimite)} · en {formatearDuracion(plazoHoras * 60)})
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-sans">Elige un plazo de entrega para calcularla.</span>
            )}
          </div>

          {evaluacion && (
            <>
              {/* Diagnóstico de factibilidad */}
              <div className={`border rounded-[10px] p-3.5 flex items-start gap-3 ${ESTILO_FACTIBILIDAD[evaluacion.nivel].caja}`}>
                {ESTILO_FACTIBILIDAD[evaluacion.nivel].icono}
                <div className="space-y-1">
                  <p className={`font-sans font-bold text-xs ${ESTILO_FACTIBILIDAD[evaluacion.nivel].texto}`}>
                    {ESTILO_FACTIBILIDAD[evaluacion.nivel].titulo}
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">{evaluacion.mensaje}</p>
                </div>
              </div>

              {/* Parámetros clave */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <FilaDato etiqueta="Almacén de origen probable" valor={evaluacion.origen.almacen.nombre} />
                <FilaDato etiqueta="Vehículo recomendado" valor={evaluacion.vehiculoSugerido} />
                <FilaDato
                  etiqueta="Distancia de recorrido"
                  valor={`${evaluacion.origen.km} km` + (evaluacion.minutosViaje !== null ? ` (~${evaluacion.minutosViaje} min)` : '')}
                />
              </div>

              {/* Fraccionamiento */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5 text-xs text-slate-600">
                {evaluacion.unidadesNecesarias <= 1 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Las {cantidad} u. caben en una sola unidad: un solo viaje.</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Las {cantidad} u. no caben en una sola unidad: se repartirán en {evaluacion.unidadesNecesarias} viajes.
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};
