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
import { iconoDeUnidad } from '../map/iconosVehiculo';
import { SelectorUnidad } from './SelectorUnidad';
import { Aviso, Boton, Entrada } from '../ui';

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

/** Valor de un <input type="datetime-local"> (hora local, al minuto). */
const aValorFechaHora = (fecha: Date) => {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
};

/** Por defecto, una avería programada ocurre una hora después del reloj, al minuto. */
const MINUTOS_PROGRAMADA_POR_DEFECTO = 60;
const instantePorDefecto = (reloj: Date) => {
  const fecha = new Date(reloj.getTime() + MINUTOS_PROGRAMADA_POR_DEFECTO * 60_000);
  fecha.setSeconds(0, 0);
  return aValorFechaHora(fecha);
};

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
  // Instante (B07-B09): ahora o un instante futuro del reloj de la ejecución, al minuto.
  const [cuando, setCuando] = useState<'ahora' | 'programar'>('ahora');
  const [instanteTexto, setInstanteTexto] = useState(() => instantePorDefecto(datos.reloj));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimaciones, setEstimaciones] = useState<Partial<Record<1 | 2 | 3, EstimacionAveriaApi>>>({});
  const dialogo = useRef<HTMLDivElement>(null);
  const primerCampo = useRef<HTMLInputElement | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
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
  const instanteMs = cuando === 'programar' ? new Date(instanteTexto).getTime() : undefined;
  const errorInstante =
    instanteMs === undefined
      ? null
      : Number.isNaN(instanteMs)
        ? 'Ingresa la fecha y la hora.'
        : instanteMs <= datos.reloj.getTime()
          ? `Debe ser posterior a la hora del reloj (${formatearHora(datos.reloj)}).`
          : null;
  const faltantes = [!unidad && 'la unidad', tipo === null && 'el tipo de avería', errorInstante && 'un instante futuro'].filter(Boolean) as string[];
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
      onRegistrada(await registrar(datos.ejecucionId, unidad.codigo, tipo, instanteMs));
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
    <div className="fixed inset-0 z-50 bg-velo/40 flex items-center justify-center p-4" data-sin-zoom>
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="registrar-averia-titulo"
        className="bg-superficie rounded-card shadow-overlay border border-neutral-200 w-full max-w-[540px] flex flex-col max-h-full"
      >
        <header className="h-12 px-5 flex items-center border-b border-neutral-200 shrink-0">
          <h2 id="registrar-averia-titulo" className="text-title text-neutral-900">
            Registrar avería
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            aria-label="Cerrar"
            className="ml-auto size-7 flex items-center justify-center rounded-control text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto text-body">
          {enSimulacion && corriendo && (
            <p className="text-body-sm text-primary-600 bg-primary-50 border border-primary-100 rounded-control px-2.5 py-1.5">
              La simulación sigue corriendo mientras eliges: la carga y las horas se actualizan solas.
            </p>
          )}

          {/* Unidad */}
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-body-sm text-neutral-700">Unidad</span>
            {unidadInicial && unidad ? (
              <div className="flex items-center gap-2.5 border border-neutral-200 rounded-control bg-neutral-50 px-2.5 py-2">
                <img src={iconoDeUnidad(unidad).href} alt="" className="block -my-1" />
                <span className="font-semibold text-neutral-900">
                  {capitalizar(UNIDADES[unidad.tipo].nombre)} {unidad.codigo}
                </span>
                <span className="text-neutral-600 tabular-nums">
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
          <fieldset className="flex flex-col gap-1.5">
            <legend className="font-medium text-body-sm text-neutral-700 mb-1.5">Tipo de avería</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TIPOS.map((t, i) => {
                const elegido = tipo === t;
                const estimacion = estimaciones[t];
                return (
                  <label
                    key={t}
                    className={`rounded-card p-2.5 flex flex-col gap-1 cursor-pointer transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-600/40 ${
                      elegido ? 'bg-primary-50 border-2 border-primary-600' : 'bg-superficie border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
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
                    <span className="flex items-center gap-1.5 text-overline uppercase text-neutral-600">
                      <IndicadorRadio marcado={elegido} />
                      Tipo {t}
                    </span>
                    <span className={`text-title-sm ${elegido ? 'text-primary-600' : 'text-neutral-900'}`}>{TIPO_AVERIA[t].nombre}</span>
                    <span className="text-body-sm text-neutral-600">Ej.: {TIPO_AVERIA[t].ejemplo}</span>
                    <span className="text-body-sm text-neutral-900">{TIPO_AVERIA[t].duracion}</span>
                    {estimacion && (
                      <span className="mt-0.5 text-body-sm font-medium text-neutral-900 tabular-nums">
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
            <div className="border-l-2 border-neutral-300 pl-2.5 flex flex-col gap-0.5" aria-live="polite">
              <p className="text-body text-neutral-700" title={pedidos.length > PEDIDOS_NOMBRADOS ? pedidos.join(' ') : undefined}>
                {impacto()}
              </p>
              {cambiaronPedidos && (
                <p className="text-body-sm text-warn-700">Sus pedidos cambiaron desde que la elegiste: revisa antes de confirmar.</p>
              )}
            </div>
          )}

          {/* Instante de la avería: ahora (por defecto) o programada para más tarde */}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="font-medium text-body-sm text-neutral-700 mb-1.5">Cuándo ocurre</legend>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {(['ahora', 'programar'] as const).map((opcion) => (
                <label key={opcion} className="flex items-center gap-1.5 cursor-pointer text-body text-neutral-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-600/40 rounded">
                  <input type="radio" name="cuando-averia" value={opcion} checked={cuando === opcion} onChange={() => setCuando(opcion)} className="sr-only" />
                  <IndicadorRadio marcado={cuando === opcion} />
                  {opcion === 'ahora' ? 'Ahora' : 'Programar para'}
                </label>
              ))}
              {cuando === 'programar' && (
                <Entrada
                  type="datetime-local"
                  aria-label="Fecha y hora de la avería"
                  value={instanteTexto}
                  min={aValorFechaHora(datos.reloj)}
                  onChange={(e) => setInstanteTexto(e.target.value)}
                  aria-invalid={errorInstante ? true : undefined}
                  aria-describedby={errorInstante ? 'instante-averia-error' : undefined}
                  className="w-auto px-2 tabular-nums"
                />
              )}
            </div>
            {errorInstante && (
              <span id="instante-averia-error" className="text-body-sm text-critical-600">
                {errorInstante}
              </span>
            )}
          </fieldset>

          <p className="text-body-sm text-neutral-600">
            {instanteMs !== undefined && !errorInstante ? (
              <>
                Ocurrirá {formatearMomento(new Date(instanteMs), datos.reloj)} del reloj {enSimulacion ? 'de la simulación' : 'de la operación'}. Hasta entonces se
                puede deshacer desde Incidencias.
              </>
            ) : (
              <>
                Se registra a las <span className="tabular-nums">{formatearHora(datos.reloj)}</span>
                {enSimulacion ? ' del reloj de la simulación y se aplica en unos segundos.' : ' y se aplica en los próximos minutos.'}
              </>
            )}
          </p>
        </div>

        <footer className="px-5 py-3 border-t border-neutral-200 flex flex-col gap-2 shrink-0">
          {error && (
            <div ref={errorRef} role="alert" tabIndex={-1} className="outline-none">
              <Aviso tono="critical" compacto>
                {error}
              </Aviso>
            </div>
          )}
          <div className="flex items-center gap-2">
            {!listo && !enviando && <span className="text-body-sm text-neutral-600">Elige {faltantes.join(' y ')}.</span>}
            <Boton variante="secundario" onClick={onCerrar} disabled={enviando} className="ml-auto">
              Cancelar
            </Boton>
            <Boton variante="peligro" onClick={confirmar} disabled={!listo}>
              {enviando ? 'Registrando…' : 'Registrar avería'}
            </Boton>
          </div>
        </footer>
      </div>
    </div>
  );
};
