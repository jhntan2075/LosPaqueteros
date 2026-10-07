import React, { useState } from 'react';
import { ALMACENES, MALLA_ALTO_KM, MALLA_ANCHO_KM, PLAZOS_HORAS, esPlazoRegular, type PlazoHoras } from '../../config/dominio';
import { coordenadaValida, evaluarFactibilidad, type EvaluacionFactibilidad, type NivelFactibilidad } from '../../lib/factibilidad';
import { diasDeDiferencia, formatearDiaMes, formatearDuracion, formatearHora, formatearHoraRelativa, sumarMinutos } from '../../lib/formato';
import { proyectar, tramoOrtogonal, trazado } from '../../lib/malla';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { useColaPedidos } from '../../hooks/usePedidos';
import { ErrorDeApi } from '../../services/clienteApi';
import { registrarPedido } from '../../services/servicioPedidos';
import type { Coordenada } from '../../types/domain';
import type { PedidoRegistrado } from '../../types/pedidos';
import { MiniMapaMalla } from '../map/MiniMapaMalla';
import { MarcadorAlmacen, PinDestino, PuntoHolgura, RotuloMapa } from './iconos';

import semaforoAmbar from '../../assets/figma/pedidos/sem-ambar.svg';

// PE-01 · Registrar pedido (Figma 1:12553).

const SIN_SPINNER = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const CANTIDAD_MAXIMA = 999;

const ESTILO_FACTIBILIDAD: Record<NivelFactibilidad, { titulo: string; caja: string; texto: string }> = {
  FACTIBLE: { titulo: 'Factible', caja: 'bg-[#F0FDF4] border-[#BBF7D0]', texto: 'text-[#15803D]' },
  AJUSTADA: { titulo: 'Factibilidad ajustada', caja: 'bg-[#FEF3E5] border-[#F2CC8C]', texto: 'text-[#B45309]' },
  NO_FACTIBLE: { titulo: 'No factible en el plazo', caja: 'bg-[#FEF2F2] border-[#FECACA]', texto: 'text-[#B91C1C]' },
};

const Campo: React.FC<{ etiqueta: string; htmlFor?: string; ayuda?: React.ReactNode; children: React.ReactNode }> = ({
  etiqueta,
  htmlFor,
  ayuda,
  children,
}) => (
  <div className="flex flex-col gap-[8px] w-full">
    <label htmlFor={htmlFor} className="font-sans font-medium text-[12px] text-[#334155]">
      {etiqueta}
    </label>
    {children}
    {ayuda && <p className="font-sans text-[12px] text-[#64748B] whitespace-pre-wrap">{ayuda}</p>}
  </div>
);

const InputCoordenada: React.FC<{ eje: 'x' | 'y'; valor: string; maximo: number; onCambiar: (valor: string) => void }> = ({
  eje,
  valor,
  maximo,
  onCambiar,
}) => (
  <label className="bg-white border border-[#CBD5E1] rounded-[8px] h-[40px] w-[110px] px-[12px] flex items-center gap-[6px] focus-within:border-[#1E40AF]">
    <span className="font-sans font-medium text-[12px] text-[#64748B]">{eje}</span>
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={maximo}
      value={valor}
      onChange={(evento) => onCambiar(evento.target.value)}
      aria-label={`Coordenada ${eje} del nodo de destino (0 a ${maximo})`}
      className={`w-full min-w-0 bg-transparent outline-none font-mono font-medium text-[14px] text-[#0F172A] ${SIN_SPINNER}`}
    />
  </label>
);

/** Malla completa con el almacén de origen, el destino y el recorrido ortogonal estimado entre ambos. */
const MiniMapaDestino: React.FC<{ evaluacion: EvaluacionFactibilidad; destino: Coordenada }> = ({ evaluacion, destino }) => {
  const { almacen } = evaluacion.origen;
  const stock = useDatosOperacion().almacenes.find((a) => a.id === almacen.id)?.porcentajeStock ?? undefined;
  return (
    <MiniMapaMalla
      alto={200}
      encuadrar={[almacen.ubicacion, destino]}
      etiqueta={`Malla de 70 por 50 km: destino (${destino.x},${destino.y}) a ${evaluacion.origen.km} km del ${almacen.nombre}`}
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
                  className="absolute size-[8px] rounded-[1px] bg-[#94A3B8] border border-white"
                  style={{ left: p.x - 4, top: p.y - 4 }}
                />
              );
            })}
            <MarcadorAlmacen almacen={almacen.id} cx={pOrigen.x} cy={pOrigen.y} />
            <RotuloMapa x={pOrigen.x} y={pOrigen.y + 20} anchoMapa={ancho} className="font-sans font-medium text-[#64748B]">
              {almacen.nombreCorto}
              {stock !== undefined && ` · ${stock}%`}
            </RotuloMapa>
            <PinDestino variante="riesgo" x={pDestino.x} y={pDestino.y} />
            <RotuloMapa x={pDestino.x} y={pDestino.y + 4} anchoMapa={ancho} className="font-mono font-medium text-[#0F172A]">
              ({destino.x},{destino.y})
            </RotuloMapa>
          </>
        );
      }}
    </MiniMapaMalla>
  );
};

const FilaDato: React.FC<{ etiqueta: string; valor: string }> = ({ etiqueta, valor }) => (
  <div className="flex items-center justify-between w-full text-[12px] whitespace-nowrap">
    <span className="font-sans text-[#64748B]">{etiqueta}</span>
    <span className="font-sans font-medium text-[#0F172A]">{valor}</span>
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
  const [cliente, setCliente] = useState('');
  const [x, setX] = useState('43');
  const [y, setY] = useState('18');
  const [cantidad, setCantidad] = useState(10);
  const [plazoHoras, setPlazoHoras] = useState<PlazoHoras>(4);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destino = { x: Number(x), y: Number(y) };
  const destinoValido = x !== '' && y !== '' && coordenadaValida(destino);
  const evaluacion = destinoValido ? evaluarFactibilidad(destino, cantidad, plazoHoras) : null;

  const horaLimite = sumarMinutos(reloj, plazoHoras * 60);
  const diasLimite = diasDeDiferencia(reloj, horaLimite);
  const prefijoDia = diasLimite === 0 ? 'hoy ' : diasLimite === 1 ? 'mañana ' : '';
  const formularioValido = cliente.trim() !== '' && destinoValido && cantidad >= 1;

  const cambiarCantidad = (valor: number) => setCantidad(Math.min(CANTIDAD_MAXIMA, Math.max(1, Math.round(valor) || 1)));

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!formularioValido || enviando) return;
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
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="flex gap-[24px] px-[32px] pt-[24px] pb-[18px] min-w-[1100px] leading-[normal]">
        {/* Formulario */}
        <form
          onSubmit={enviar}
          className="flex-1 min-w-0 h-[620px] bg-white border border-[#E2E8F0] rounded-[12px] px-[28px] py-[26px] flex flex-col gap-[22px]"
        >
          <Campo etiqueta="Cliente" htmlFor="pedido-cliente" ayuda="Autocompletado — escribe para buscar o crear un cliente nuevo">
            <input
              id="pedido-cliente"
              list="pedido-clientes"
              value={cliente}
              onChange={(evento) => setCliente(evento.target.value)}
              placeholder="Nombre del cliente"
              autoComplete="off"
              className="bg-white border border-[#CBD5E1] rounded-[8px] h-[40px] px-[12px] w-full font-sans font-medium text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#1E40AF] [&::-webkit-calendar-picker-indicator]:!hidden"
            />
            <datalist id="pedido-clientes">
              {clientes.map((nombre) => (
                <option key={nombre} value={nombre} />
              ))}
            </datalist>
          </Campo>

          <Campo
            etiqueta="Nodo de destino"
            ayuda={
              !destinoValido ? (
                <span className="text-[#B91C1C]">
                  Coordenadas fuera de la malla: x de 0 a {MALLA_ANCHO_KM}, y de 0 a {MALLA_ALTO_KM}.
                </span>
              ) : (
                evaluacion &&
                `${evaluacion.origen.km} km al ${evaluacion.origen.almacen.nombre} (más cercano)` +
                  (segundoAlmacen ? `  ·  ${segundoAlmacen.km} km al ${segundoAlmacen.almacen.nombre}` : '')
              )
            }
          >
            <div className="flex items-center gap-[10px]">
              <InputCoordenada eje="x" valor={x} maximo={MALLA_ANCHO_KM} onCambiar={setX} />
              <InputCoordenada eje="y" valor={y} maximo={MALLA_ALTO_KM} onCambiar={setY} />
              <button
                type="button"
                disabled
                title="Disponible cuando el lienzo de operación admita selección de nodos"
                className="border border-[#E2E8F0] rounded-[8px] h-[40px] px-[14px] font-sans font-medium text-[12px] text-[#1E40AF] whitespace-pre disabled:cursor-not-allowed"
              >
                {'＋  Seleccionar en el lienzo'}
              </button>
            </div>
          </Campo>

          <Campo etiqueta="Cantidad de unidades de P" ayuda="unidades de P">
            <div className="bg-white border border-[#CBD5E1] rounded-[8px] h-[40px] w-[150px] flex items-center focus-within:border-[#1E40AF]">
              <button
                type="button"
                onClick={() => cambiarCantidad(cantidad - 1)}
                disabled={cantidad <= 1}
                aria-label="Disminuir cantidad"
                className="w-[44px] h-full font-sans font-medium text-[18px] text-[#64748B] disabled:opacity-40"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={CANTIDAD_MAXIMA}
                value={cantidad}
                onChange={(evento) => cambiarCantidad(Number(evento.target.value))}
                aria-label="Cantidad de unidades de P"
                className={`flex-1 min-w-0 h-full bg-transparent text-center outline-none font-mono font-semibold text-[15px] text-[#0F172A] ${SIN_SPINNER}`}
              />
              <button
                type="button"
                onClick={() => cambiarCantidad(cantidad + 1)}
                disabled={cantidad >= CANTIDAD_MAXIMA}
                aria-label="Aumentar cantidad"
                className="w-[44px] h-full font-sans font-medium text-[18px] text-[#64748B] disabled:opacity-40"
              >
                +
              </button>
            </div>
          </Campo>

          <fieldset className="flex flex-col gap-[8px] w-full">
            <legend className="font-sans font-medium text-[12px] text-[#334155] mb-[8px]">Tipo de entrega</legend>
            <div className="flex gap-[10px] h-[88px]" role="radiogroup" aria-label="Tipo de entrega">
              {PLAZOS_HORAS.map((plazo) => {
                const seleccionado = plazo === plazoHoras;
                return (
                  <button
                    key={plazo}
                    type="button"
                    role="radio"
                    aria-checked={seleccionado}
                    onClick={() => setPlazoHoras(plazo)}
                    className={`flex-1 min-w-0 h-[88px] rounded-[8px] p-[10px] flex flex-col items-start gap-[3px] whitespace-nowrap text-left transition ${
                      seleccionado ? 'bg-[#ECF1FE] border-2 border-[#1E40AF]' : 'bg-white border border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <span className={`font-sans font-medium text-[12px] ${seleccionado ? 'text-[#1E40AF]' : 'text-[#64748B]'}`}>
                      {esPlazoRegular(plazo) ? 'Regular' : 'Priorizada'}
                    </span>
                    <span className={`font-mono font-semibold text-[16px] ${seleccionado ? 'text-[#1E40AF]' : 'text-[#0F172A]'}`}>
                      {plazo} h
                    </span>
                    <span className="font-sans text-[12px] text-[#64748B]">límite</span>
                    <span className={`font-mono font-medium text-[12px] ${seleccionado ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>
                      {formatearHoraRelativa(sumarMinutos(reloj, plazo * 60), reloj)}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex items-center gap-[12px] pt-[6px]">
            <button
              type="submit"
              disabled={!formularioValido || enviando}
              className="bg-[#1E40AF] rounded-[8px] h-[44px] px-[20px] font-sans font-semibold text-[13px] text-white hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {enviando ? 'Registrando…' : 'Registrar y planificar'}
            </button>
            <button
              type="button"
              onClick={onCancelar}
              className="border border-[#E2E8F0] rounded-[8px] h-[44px] px-[20px] font-sans font-medium text-[13px] text-[#64748B] hover:bg-[#F8FAFC] transition"
            >
              Cancelar
            </button>
            {error && <p className="font-sans text-[12px] text-[#B91C1C]">{error}</p>}
          </div>
        </form>

        {/* Panel de factibilidad */}
        <aside
          aria-live="polite"
          className="w-[478px] shrink-0 h-[620px] bg-white border border-[#E2E8F0] rounded-[12px] px-[24px] py-[22px] flex flex-col gap-[16px] overflow-hidden"
        >
          <h2 className="font-sans font-semibold text-[12px] text-[#64748B] tracking-[0.7px]">FACTIBILIDAD EN VIVO</h2>

          {evaluacion ? (
            <>
              <MiniMapaDestino evaluacion={evaluacion} destino={destino} />
              <p className="font-sans text-[12px] text-[#64748B]">Nodo de destino y almacén de origen más cercano</p>
            </>
          ) : (
            <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-[8px] h-[200px] flex items-center justify-center px-6 text-center font-sans text-[12px] text-[#64748B]">
              Ingresa un nodo de destino válido para estimar la factibilidad.
            </div>
          )}

          <div className="bg-[#E2E8F0] h-px w-full shrink-0" />

          <div className="flex flex-col gap-[2px]">
            <p className="font-sans font-medium text-[12px] text-[#64748B]">Hora límite resultante</p>
            <div className="flex items-center gap-[10px]">
              <p className="font-mono font-semibold text-[30px] text-[#0F172A]">{formatearHora(horaLimite)}</p>
              <span className="bg-[#EDF2FA] rounded-[6px] px-[8px] py-[3px] font-sans font-medium text-[12px] text-[#404D61] whitespace-nowrap">
                {prefijoDia}
                {formatearDiaMes(horaLimite)} · en {formatearDuracion(plazoHoras * 60)}
              </span>
            </div>
          </div>

          {evaluacion && (
            <>
              <div className={`border rounded-[8px] px-[12px] py-[11px] flex flex-col gap-[6px] ${ESTILO_FACTIBILIDAD[evaluacion.nivel].caja}`}>
                <div className="flex items-center gap-[8px]">
                  {evaluacion.nivel === 'AJUSTADA' ? (
                    <img src={semaforoAmbar} alt="" className="block" />
                  ) : (
                    <PuntoHolgura nivel={evaluacion.nivel === 'FACTIBLE' ? 'VERDE' : 'ROJO'} />
                  )}
                  <p className={`font-sans font-semibold text-[12px] ${ESTILO_FACTIBILIDAD[evaluacion.nivel].texto}`}>
                    {ESTILO_FACTIBILIDAD[evaluacion.nivel].titulo}
                  </p>
                </div>
                <p className="font-sans text-[12px] text-[#404D61]">{evaluacion.mensaje}</p>
              </div>

              <FilaDato etiqueta="Almacén de origen probable" valor={evaluacion.origen.almacen.nombre} />
              <FilaDato etiqueta="Vehículo sugerido" valor={evaluacion.vehiculoSugerido} />
              <FilaDato
                etiqueta="Distancia estimada"
                valor={`${evaluacion.origen.km} km` + (evaluacion.minutosViaje !== null ? ` · ~${evaluacion.minutosViaje} min` : '')}
              />

              <div className="bg-[#E2E8F0] h-px w-full shrink-0" />

              <div className="flex gap-[8px] items-center text-[12px]">
                {evaluacion.unidadesNecesarias <= 1 ? (
                  <>
                    <span className="font-sans font-medium text-[#15803D]">✓</span>
                    <p className="flex-1 font-sans text-[#64748B]">
                      Sin fraccionamiento — {cantidad} unidades caben en una sola unidad de transporte.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="font-sans font-medium text-[#B45309]">!</span>
                    <p className="flex-1 font-sans text-[#64748B]">
                      Se fracciona en {evaluacion.unidadesNecesarias} entregas — {cantidad} unidades superan la capacidad de
                      una sola unidad de transporte.
                    </p>
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
