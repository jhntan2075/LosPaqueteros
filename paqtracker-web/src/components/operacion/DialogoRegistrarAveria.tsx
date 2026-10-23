import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ESTADO_UNIDAD, TIPO_AVERIA } from '../../config/glosario';
import { UNIDADES } from '../../config/dominio';
import { averiaPendiente, useAverias } from '../../hooks/useAverias';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { useFocoAtrapado } from '../../hooks/useFocoAtrapado';
import { capitalizar, formatearHora, formatearMomento } from '../../lib/formato';
import { clienteApi } from '../../services/clienteApi';
import type { EstimacionAveriaApi, RespuestaRegistroAveriaApi } from '../../types/api';
import type { UnidadOperacion } from '../../types/operacion';
import { IndicadorRadio } from '../layout/IndicadorRadio';
import { colorDeUnidad, iconoVehiculo } from '../map/iconosVehiculo';
import { SelectorUnidad } from './SelectorUnidad';
import { Boton } from '../ui/Boton';

// CU-13 Registrar avería. Diálogo modal: la acción saca la unidad de servicio y replanifica sus pedidos,
// así que pide elegir el tipo a conciencia (sin valor por defecto), muestra cuándo volvería a operar la
// unidad con cada tipo y el impacto sobre sus pedidos antes de confirmar.

const TIPOS = [1, 2, 3] as const;
/** Cada cuánto se renueva la estimación de reincorporación mientras el diálogo está abierto. */
const REFRESCO_ESTIMACION_MS = 5000;
/** Pedidos que se nombran en el texto de impacto; el resto se resume en "y N más". */
const PEDIDOS_NOMBRADOS = 3;

interface DialogoRegistrarAveriaProps {
  /** Unidad ya elegida (desde su detalle); sin valor, el diálogo pide elegirla. */
  unidadInicial?: string;
  onCerrar: () => void;
  onRegistrada: (respuesta: RespuestaRegistroAveriaApi) => void;
}

/** "P-01 P-02 P-03 y 7 más". */
const listarPedidos = (pedidos: string[]) =>
  pedidos.length <= PEDIDOS_NOMBRADOS
    ? pedidos.join(' ')
    : `${pedidos.slice(0, PEDIDOS_NOMBRADOS).join(' ')} y ${pedidos.length - PEDIDOS_NOMBRADOS} más`;

export const DialogoRegistrarAveria: React.FC<DialogoRegistrarAveriaProps> = ({ unidadInicial, onCerrar, onRegistrada }) => {
  const datos = useDatosOperacion();
  const { registrar, pendientes } = useAverias();
  const [codigo, setCodigo] = useState(unidadInicial ?? '');
  const [tipo, setTipo] = useState<1 | 2 | 3 | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimaciones, setEstimaciones] = useState<Partial<Record<1 | 2 | 3, EstimacionAveriaApi>>>({});
  const dialogo = useRef<HTMLDivElement>(null);
  const primerCampo = useRef<HTMLInputElement | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  // Pedidos que llevaba la unidad al elegirla: si cambian mientras se decide, se avisa.
  const [pedidosAlElegir, setPedidosAlElegir] = useState<{ codigo: string; pedidos: string } | null>(null);

  useCerrarConEscape(!enviando, onCerrar);
  useFocoAtrapado(dialogo);
  useEffect(() => {
    primerCampo.current?.focus();
  }, []);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  // Estimación del servidor: con las reglas reales de turnos, sin duplicarlas en el front.
  const { ejecucionId } = datos;
  useEffect(() => {
    let vigente = true;
    const pedir = () =>
      clienteApi
        .estimarAverias(ejecucionId)
        .then((lista) => {
          if (vigente) setEstimaciones(Object.fromEntries(lista.map((e) => [e.tipo, e])));
        })
        .catch(() => {
          // Sin estimación, cada tarjeta muestra la regla de duración: el registro sigue siendo posible.
        });
    pedir();
    const intervalo = setInterval(pedir, REFRESCO_ESTIMACION_MS);
    return () => {
      vigente = false;
      clearInterval(intervalo);
    };
  }, [ejecucionId]);

  const unidad = datos.flota.find((u) => u.codigo === codigo);
  const esBloqueada = (u: UnidadOperacion) => u.estado === 'AVERIADA' || averiaPendiente(datos, pendientes, u.codigo) !== null;
  const enSimulacion = datos.tipoEscenario !== 'DIA_A_DIA';
  const corriendo = datos.estadoEjecucion === 'EN_CURSO';
  const faltantes = [!unidad && 'la unidad', tipo === null && 'el tipo de avería'].filter(Boolean) as string[];
  const listo = faltantes.length === 0 && !enviando;
  const pedidos = unidad?.paradas.map((p) => p.pedido) ?? [];
  const firmaPedidos = pedidos.join(' ');

  // Al elegir otra unidad se toma su carga como referencia.
  if (unidad && pedidosAlElegir?.codigo !== unidad.codigo) {
    setPedidosAlElegir({ codigo: unidad.codigo, pedidos: firmaPedidos });
  }
  const cambiaronPedidos = unidad !== undefined && pedidosAlElegir?.codigo === unidad.codigo && pedidosAlElegir.pedidos !== firmaPedidos;

  const confirmar = async () => {
    if (!unidad || tipo === null) return;
    setEnviando(true);
    setError(null);
    try {
      onRegistrada(await registrar(datos.ejecucionId, unidad.codigo, tipo));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la avería. Inténtalo de nuevo.');
      setEnviando(false);
    }
  };

  const impacto = () => {
    if (pedidos.length === 0) return 'No lleva pedidos: solo deja de estar disponible.';
    const nombrados = `(${listarPedidos(pedidos)})`;
    if (tipo === null) return `Lleva ${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'} ${nombrados}. Elige el tipo para ver qué pasará con ellos.`;
    return `${pedidos.length === 1 ? 'Su pedido' : `Sus ${pedidos.length} pedidos`} ${nombrados} ${TIPO_AVERIA[tipo].impacto(pedidos.length > 1)}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 leading-[normal]" data-sin-zoom>
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="registrar-averia-titulo"
        className="bg-white rounded-[10px] shadow-2xl border border-neutral-200 w-full max-w-[540px] flex flex-col max-h-[calc(100vh-32px)]"
      >
        <header className="h-[48px] px-[20px] flex items-center border-b border-neutral-200 shrink-0">
          <h2 id="registrar-averia-titulo" className="font-semibold text-title text-neutral-900">
            Registrar avería
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            aria-label="Cerrar"
            className="ml-auto size-[28px] flex items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-[20px] py-[16px] flex flex-col gap-[16px] overflow-y-auto text-body-lg">
          {enSimulacion && corriendo && (
            <p className="text-body text-primary-600 bg-primary-50 border border-primary-100 rounded-[6px] px-[10px] py-[6px]">
              La simulación sigue corriendo mientras eliges: la carga y las horas se actualizan solas.
            </p>
          )}

          {/* Unidad */}
          <div className="flex flex-col gap-[6px]">
            <span className="font-medium text-body text-neutral-700">Unidad</span>
            {unidadInicial && unidad ? (
              <div className="flex items-center gap-[10px] border border-neutral-200 rounded-[6px] bg-neutral-50 px-[10px] py-[8px]">
                <img src={iconoVehiculo(unidad.tipo, colorDeUnidad(unidad)).href} alt="" className="block -my-[4px]" />
                <span className="font-semibold text-neutral-900">
                  {capitalizar(UNIDADES[unidad.tipo].nombre)} {unidad.codigo}
                </span>
                <span className="text-neutral-500 tabular-nums">
                  {ESTADO_UNIDAD[unidad.estado]} · carga {unidad.carga}/{unidad.capacidad} · {pedidos.length}{' '}
                  {pedidos.length === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>
            ) : (
              <SelectorUnidad
                ref={primerCampo}
                unidades={datos.flota}
                valor={codigo}
                onCambiar={setCodigo}
                esBloqueada={esBloqueada}
                reloj={datos.reloj}
              />
            )}
          </div>

          {/* Tipo de avería: radios nativos en tarjetas, sin valor por defecto */}
          <fieldset className="flex flex-col gap-[6px]">
            <legend className="font-medium text-body text-neutral-700 mb-[6px]">Tipo de avería</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[8px]">
              {TIPOS.map((t, i) => {
                const elegido = tipo === t;
                const estimacion = estimaciones[t];
                return (
                  <label
                    key={t}
                    className={`rounded-[10px] p-[10px] flex flex-col gap-[4px] cursor-pointer transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-600/40 ${
                      elegido ? 'bg-primary-50 border-2 border-primary-600' : 'bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo-averia"
                      value={t}
                      checked={elegido}
                      onChange={() => setTipo(t)}
                      ref={i === 0 && unidadInicial ? primerCampo : undefined}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-[6px] text-caption font-semibold uppercase tracking-wider text-neutral-500">
                      <IndicadorRadio marcado={elegido} />
                      Tipo {t}
                    </span>
                    <span className={`font-semibold text-body-lg ${elegido ? 'text-primary-600' : 'text-neutral-900'}`}>{TIPO_AVERIA[t].nombre}</span>
                    <span className="text-body text-neutral-500">Ej.: {TIPO_AVERIA[t].ejemplo}</span>
                    <span className="text-body text-neutral-900">{TIPO_AVERIA[t].duracion}</span>
                    {estimacion && (
                      <span className="mt-[2px] text-body font-medium text-neutral-900 tabular-nums">
                        Volvería {formatearMomento(new Date(estimacion.reincorporacionMs), datos.reloj)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Impacto antes de confirmar */}
          {unidad && (
            <div className="border-l-[3px] border-neutral-400 pl-[10px] flex flex-col gap-[2px]" aria-live="polite">
              <p className="text-body-lg text-neutral-700" title={pedidos.length > PEDIDOS_NOMBRADOS ? pedidos.join(' ') : undefined}>
                {impacto()}
              </p>
              {cambiaronPedidos && (
                <p className="text-body text-warn-700">Sus pedidos cambiaron desde que la elegiste: revisa antes de confirmar.</p>
              )}
            </div>
          )}

          <p className="text-body text-neutral-500">
            Se registra a las <span className="tabular-nums">{formatearHora(datos.reloj)}</span>
            {enSimulacion ? ' del reloj de la simulación y se aplica en unos segundos.' : ' y se aplica en los próximos minutos.'}
          </p>
        </div>

        <footer className="px-[20px] py-[12px] border-t border-neutral-200 flex flex-col gap-[8px] shrink-0">
          {error && (
            <p
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="border-l-[3px] border-critical-600 pl-[10px] text-body text-critical-600 outline-none"
            >
              {error}
            </p>
          )}
          <div className="flex items-center gap-[8px]">
            {!listo && !enviando && <span className="text-body text-neutral-500">Elige {faltantes.join(' y ')}.</span>}
            <Boton variante="secundario" tamano="md" className="ml-auto"
              onClick={onCerrar}
              disabled={enviando}
            >
              Cancelar
            </Boton>
            <Boton variante="peligro" tamano="md"
              onClick={confirmar}
              disabled={!listo}
            >
              {enviando ? 'Registrando…' : 'Registrar avería'}
            </Boton>
          </div>
        </footer>
      </div>
    </div>
  );
};
