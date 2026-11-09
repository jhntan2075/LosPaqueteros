import React, { useRef, useState } from 'react';
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import { UNIDADES, type TipoUnidad } from '../../config/dominio';
import { ESTADO_UNIDAD, NOMBRE_CARGA, RANGO_OCUPACION } from '../../config/glosario';
import { capitalizar, formatearDuracion, formatearHora, formatearMomento } from '../../lib/formato';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import {
  CRITERIOS_ORDEN,
  RANGOS_KM,
  dentroDe,
  enRangosKm,
  kmAlDestino,
  kmDesdeOrigen,
  minutosDesdeSalida,
  minutosParaLlegar,
  ordenarUnidades,
  type CriterioOrden,
  type IdRangoKm,
  type MagnitudBusqueda,
  type ReferenciaTiempo,
  type Sentido,
} from '../../lib/listaUnidades';
import { estadoFlota } from '../../lib/operacion';
import { MarcaSemaforo } from '../map/simbolos';
import { FONDO_SEMAFORO, NIVELES_CARGA, TEXTO_SEMAFORO, nivelDeOcupacion } from '../../lib/semaforo';
import type { EstadoUnidad, SeleccionPanel } from '../../types/operacion';
import type { Coordenada } from '../../types/domain';
import { useDesplazarAResaltado } from '../../hooks/useDesplazarAResaltado';
import type { SeleccionResaltable } from '../../lib/envios';
import { FilaConBarra, TituloSeccion } from './comunes';

import { iconoDeCarga, iconoDeUnidad } from '../map/iconosVehiculo';

// OP-07 · Estado de la flota (Figma 1:5813). Implementado sobre la captura del frame: el contexto de
// diseño no estuvo disponible (límite de llamadas de Figma), así que medidas y espaciados son aproximados.

const ETIQUETA: Record<TipoUnidad, string> = { AUTO: 'Auto', MOTO: 'Moto', BICICLETA: 'Bici' };

const unidades = (n: number) => `${n} ${n === 1 ? 'unidad' : 'unidades'}`;

type FiltroUnidad = 'TODAS' | EstadoUnidad;
const FILTROS_UNIDAD: { valor: FiltroUnidad; etiqueta: string }[] = [
  { valor: 'TODAS', etiqueta: 'Todas' },
  { valor: 'EN_RUTA', etiqueta: 'En ruta' },
  { valor: 'DISPONIBLE', etiqueta: 'Disponibles' },
  { valor: 'EN_REFRIGERIO', etiqueta: 'En refrigerio' },
  { valor: 'FUERA_DE_TURNO', etiqueta: 'Fuera de turno' },
  { valor: 'AVERIADA', etiqueta: 'Averiadas' },
];

/** Sentido con que arranca cada criterio: lo más útil primero (más ocupadas, salidas y llegadas más próximas). */
const SENTIDO_NATURAL: Record<CriterioOrden, Sentido> = {
  CODIGO: 'ASC',
  OCUPACION: 'DESC',
  SALIDA: 'ASC',
  LLEGADA: 'ASC',
  KM_POR_RECORRER: 'ASC',
  KM_RECORRIDOS: 'DESC',
};

/** "12 km", "3,5 km". */
const formatoKm = (km: number) => `${(Math.round(km * 10) / 10).toString().replace('.', ',')} km`;

// El filtro por rangos de km (E11) es permanente: se recuerda al cerrar el panel y al recargar, en este
// navegador. Si el almacenamiento no está disponible, dura mientras la página siga abierta.
const CLAVE_RANGOS_KM = 'paqtracker.flota.rangosKm';
let rangosKmEnMemoria: IdRangoKm[] = [];
const leerRangosKm = (): Set<IdRangoKm> => {
  try {
    const guardado = localStorage.getItem(CLAVE_RANGOS_KM);
    if (guardado !== null) {
      const ids = JSON.parse(guardado) as string[];
      return new Set(RANGOS_KM.map((r) => r.id).filter((id) => ids.includes(id)));
    }
  } catch {
    // Sin almacenamiento: se usa la copia en memoria.
  }
  return new Set(rangosKmEnMemoria);
};
const guardarRangosKm = (rangos: Set<IdRangoKm>) => {
  rangosKmEnMemoria = [...rangos];
  try {
    localStorage.setItem(CLAVE_RANGOS_KM, JSON.stringify(rangosKmEnMemoria));
  } catch {
    // Sin almacenamiento: queda la copia en memoria.
  }
};

const Leyenda: React.FC<{ color: string; etiqueta: string; valor: number }> = ({ color, etiqueta, valor }) => (
  <span className="flex items-center gap-1.5 text-body-sm whitespace-nowrap">
    <span className={`size-2 rounded-sm ${color}`} />
    <span className="font-sans text-neutral-600">{etiqueta}</span>
    <span className="tabular-nums font-medium text-neutral-900">{valor}</span>
  </span>
);

/** Pestaña "Flota" del panel lateral del mapa (Operación y corrida de simulación). */
interface EstadoFlotaProps {
  onSeleccionar: (seleccion: SeleccionPanel) => void;
  /** Objeto resaltado en el mapa; si es una unidad, su fila se marca y se lleva a la vista (F01). */
  resaltado?: SeleccionResaltable | null;
  /** Clic en una fila: la marca en la lista y en el mapa. Sin valor, la fila abre el detalle (como antes). */
  onResaltar?: (objeto: SeleccionResaltable) => void;
  onCentrar?: (punto: Coordenada) => void;
}

export const EstadoFlota: React.FC<EstadoFlotaProps> = ({ onSeleccionar, resaltado = null, onResaltar, onCentrar }) => {
  const datos = useDatosOperacion();
  const listaRef = useRef<HTMLUListElement>(null);
  const unidadResaltada = resaltado?.tipo === 'vehiculo' ? resaltado.codigo : null;
  useDesplazarAResaltado(listaRef, unidadResaltada ? `[data-fila-unidad="${unidadResaltada}"]` : null);
  const { reloj } = datos;
  const flota = estadoFlota(datos);
  const utilizacion = flota.total === 0 ? 0 : Math.round((flota.enRuta / flota.total) * 100);
  // Cada unidad cae en un solo segmento; los que valen 0 no se dibujan ni aparecen en la leyenda.
  const segmentos = [
    { clave: 'ruta', etiqueta: 'en ruta', valor: flota.enRuta, color: 'bg-primary-600' },
    { clave: 'refr', etiqueta: 'en refrigerio', valor: flota.enRefrigerio.length, color: 'bg-primary-600/40' },
    { clave: 'disp', etiqueta: 'disponibles', valor: flota.disponibles, color: 'bg-neutral-300' },
    { clave: 'turno', etiqueta: 'fuera de turno', valor: flota.fueraDeTurno, color: 'bg-neutral-200' },
    { clave: 'aver', etiqueta: 'averiadas', valor: flota.averiadas.length, color: 'bg-critical-600' },
  ];
  const visibles = segmentos.filter((s) => s.valor > 0 || s.clave === 'ruta' || s.clave === 'disp');

  const atencion = [
    flota.averiadas.length > 0 && {
      color: 'rojo' as const,
      titulo: `${unidades(flota.averiadas.length)} ${flota.averiadas.length === 1 ? 'averiada' : 'averiadas'}`,
      detalle: flota.averiadas
        .map((u) => `${capitalizar(UNIDADES[u.tipo].nombre)} ${u.codigo}${u.averia ? ` (tipo ${u.averia.tipo}, vuelve ${formatearMomento(u.averia.vuelve, reloj)})` : ''}`)
        .join(' · '),
    },
    flota.llenas.length > 0 && {
      color: 'ambar' as const,
      titulo: `${unidades(flota.llenas.length)} al 100 % de carga`,
      detalle: `${flota.llenas.map((u) => u.codigo).join(' ')} · no admiten reasignación`,
    },
    flota.enRefrigerio.length > 0 && {
      color: 'ambar' as const,
      titulo: `${unidades(flota.enRefrigerio.length)} en refrigerio`,
      detalle: flota.enRefrigerio.map((u) => `${capitalizar(UNIDADES[u.tipo].nombre)} ${u.codigo}`).join(' · '),
    },
  ].filter(Boolean) as { color: 'rojo' | 'ambar'; titulo: string; detalle: string }[];

  const [filtro, setFiltro] = useState<FiltroUnidad>('TODAS');
  const [orden, setOrden] = useState<CriterioOrden>('CODIGO');
  const [sentido, setSentido] = useState<Sentido>('ASC');
  const [minutos, setMinutos] = useState('');
  const [referencia, setReferencia] = useState<ReferenciaTiempo>('LLEGADA');
  const [magnitud, setMagnitud] = useState<MagnitudBusqueda>('MIN');
  const [rangosKm, setRangosKm] = useState<Set<IdRangoKm>>(leerRangosKm);
  const cambiarRangosKm = (rangos: Set<IdRangoKm>) => {
    setRangosKm(rangos);
    guardarRangosKm(rangos);
  };
  const alternarRangoKm = (id: IdRangoKm) => {
    const siguientes = new Set(rangosKm);
    if (siguientes.has(id)) siguientes.delete(id);
    else siguientes.add(id);
    cambiarRangosKm(siguientes);
  };
  const limite = minutos.trim() === '' || Number.isNaN(Number(minutos)) ? null : Number(minutos);
  const porEstado = filtro === 'TODAS' ? datos.flota : datos.flota.filter((u) => u.estado === filtro);
  // Filtro permanente por rangos de km (E11) y, sobre su resultado, la búsqueda por minutos o km (E06–E09).
  const porRango = porEstado.filter((u) => enRangosKm(u, rangosKm));
  const buscadas = limite === null ? porRango : porRango.filter((u) => dentroDe(u, limite, magnitud, referencia, reloj));
  const unidadesFiltradas = ordenarUnidades(buscadas, orden, sentido);
  const cambiarOrden = (criterio: CriterioOrden) => {
    setOrden(criterio);
    setSentido(SENTIDO_NATURAL[criterio]);
  };

  return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Resumen */}
        <section className="px-3 pt-3.5 pb-3 border-b border-neutral-200 flex flex-col gap-2.5">
          <TituloSeccion derecha={`${utilizacion} % en ruta`}>
            Estado de la flota · {flota.total} unidades
          </TituloSeccion>
          <div
            className="flex gap-0.5 h-3 w-full"
            role="img"
            aria-label={visibles.map((s) => `${s.valor} ${s.etiqueta}`).join(', ')}
          >
            {visibles.map((s) => (
              <span key={s.clave} className={`${s.color} rounded-sm`} style={{ flexGrow: s.valor, flexBasis: 0 }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {visibles.map((s) => (
              <Leyenda key={s.clave} color={s.color} etiqueta={s.etiqueta} valor={s.valor} />
            ))}
          </div>
        </section>

        {/* Por tipo de unidad */}
        <section className="px-3 pt-3 pb-3.5 border-b border-neutral-200 flex flex-col gap-2.5">
          <TituloSeccion derecha="en ruta · carga a bordo">Por tipo de unidad</TituloSeccion>
          {flota.porTipo.map(({ tipo, enRuta, total, carga, capacidad, cargaABordo }) => {
            // La barra y el porcentaje miden lo mismo: la carga a bordo, con el semáforo de carga.
            const nivel = cargaABordo === null ? null : nivelDeOcupacion(carga, capacidad);
            return (
              <div key={tipo} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-body-sm">
                  <img src={iconoDeCarga(tipo, carga, capacidad).href} alt="" className="block -my-1" />
                  <span className="font-sans font-semibold text-neutral-900">{ETIQUETA[tipo]}</span>
                  <span className="tabular-nums text-neutral-600">
                    {enRuta} / {total} en ruta
                  </span>
                  <span
                    className={`ml-auto tabular-nums ${nivel ? TEXTO_SEMAFORO[nivel] : 'text-neutral-600'}`}
                    title="Paquetes sin entregar sobre la capacidad de las unidades fuera del almacén. Baja a medida que entregan."
                  >
                    {cargaABordo === null ? 'sin unidades fuera' : `carga ${carga}/${capacidad} · ${Math.round(cargaABordo * 100)} %`}
                  </span>
                </div>
                <div
                  className="h-1 bg-neutral-200 rounded-full overflow-hidden"
                  role="meter"
                  aria-label={`Carga a bordo de ${ETIQUETA[tipo].toLowerCase()}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={cargaABordo === null ? 0 : Math.round(cargaABordo * 100)}
                >
                  {nivel && (
                    <div className={`h-full rounded-full ${FONDO_SEMAFORO[nivel]}`} style={{ width: `${Math.min(100, (cargaABordo ?? 0) * 100)}%` }} />
                  )}
                </div>
              </div>
            );
          })}
          <p className="text-caption text-neutral-600">
            Carga: {NIVELES_CARGA.map((n) => `${NOMBRE_CARGA[n].toLowerCase()} ${RANGO_OCUPACION[n]}`).join(' · ')}
          </p>
        </section>

        {/* Requiere atención */}
        <section className="px-3 pt-3 pb-3.5 border-b border-neutral-200 flex flex-col gap-3">
          <TituloSeccion derecha={atencion.length}>Requiere atención</TituloSeccion>
          {atencion.length === 0 && <p className="font-sans text-body-sm text-neutral-600">Ninguna unidad requiere atención.</p>}
          {atencion.map((item) => (
            <FilaConBarra key={item.titulo} color={item.color} titulo={item.titulo} detalle={item.detalle} detalleMono />
          ))}
        </section>

        {/* Todas las unidades: lista completa, clicable (abre su detalle), filtrable por estado y por rangos de
            km al destino (E11), ordenable (E13–E17) y con búsqueda por minutos o km al destino o desde el
            origen (E06–E09). */}
        <section className="px-3 pt-3 pb-3.5 flex flex-col gap-2" aria-label="Todas las unidades">
          <TituloSeccion derecha={`${unidadesFiltradas.length} de ${flota.total}`}>Todas las unidades</TituloSeccion>
          <div className="flex items-center gap-1.5 text-body-sm">
            <label htmlFor="orden-unidades" className="font-sans text-neutral-600 whitespace-nowrap">
              Ordenar por
            </label>
            <select
              id="orden-unidades"
              value={orden}
              onChange={(e) => cambiarOrden(e.target.value as CriterioOrden)}
              className="h-7 px-1.5 rounded-control border border-neutral-300 bg-white text-body-sm text-neutral-900"
            >
              {CRITERIOS_ORDEN.map(({ valor, etiqueta }) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSentido(sentido === 'ASC' ? 'DESC' : 'ASC')}
              aria-label={sentido === 'ASC' ? 'Orden ascendente; cambiar a descendente' : 'Orden descendente; cambiar a ascendente'}
              title={sentido === 'ASC' ? 'Ascendente' : 'Descendente'}
              className="h-7 px-2 rounded-control border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 flex items-center gap-1"
            >
              {sentido === 'ASC' ? <ArrowUpNarrowWide className="size-3.5" /> : <ArrowDownWideNarrow className="size-3.5" />}
              <span className="text-caption">{sentido === 'ASC' ? 'Asc.' : 'Desc.'}</span>
            </button>
          </div>
          <fieldset className="flex flex-wrap items-center gap-1.5 text-body-sm">
            <legend className="sr-only">Buscar por tiempo o distancia del tramo en curso</legend>
            <label htmlFor="minutos-unidades" className="font-sans text-neutral-600 whitespace-nowrap">
              A ≤
            </label>
            <input
              id="minutos-unidades"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="—"
              value={minutos}
              onChange={(e) => setMinutos(e.target.value)}
              step={magnitud === 'KM' ? 'any' : 1}
              aria-label={magnitud === 'KM' ? 'Kilómetros como máximo' : 'Minutos como máximo'}
              className="h-7 w-14 px-1.5 rounded-control border border-neutral-300 bg-white tabular-nums text-body-sm text-neutral-900"
            />
            <div role="radiogroup" aria-label="Magnitud de la búsqueda" className="flex rounded-control border border-neutral-300 overflow-hidden">
              {(
                [
                  ['MIN', 'min'],
                  ['KM', 'km'],
                ] as const
              ).map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={magnitud === valor}
                  aria-label={valor === 'MIN' ? 'Minutos' : 'Kilómetros'}
                  onClick={() => setMagnitud(valor)}
                  className={`h-6 px-2 text-caption font-sans ${
                    magnitud === valor ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
            <span className="font-sans text-neutral-600">de la</span>
            <div role="radiogroup" aria-label="Referencia de tiempo" className="flex rounded-control border border-neutral-300 overflow-hidden">
              {(
                [
                  ['LLEGADA', 'Llegada al destino'],
                  ['SALIDA', 'Salida del origen'],
                ] as const
              ).map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={referencia === valor}
                  onClick={() => setReferencia(valor)}
                  className={`h-6 px-2 text-caption font-sans ${
                    referencia === valor ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
            {limite !== null && (
              <button type="button" onClick={() => setMinutos('')} className="text-caption text-primary-600 hover:underline">
                Quitar
              </button>
            )}
          </fieldset>
          <div className="flex flex-wrap items-center gap-1 text-body-sm" role="group" aria-label="Distancia al destino">
            <span className="font-sans text-neutral-600 mr-0.5">Al destino:</span>
            {RANGOS_KM.map(({ id, etiqueta }) => (
              <button
                key={id}
                type="button"
                aria-pressed={rangosKm.has(id)}
                onClick={() => alternarRangoKm(id)}
                className={`px-2 py-1 rounded text-body-sm font-sans tabular-nums ${
                  rangosKm.has(id) ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              >
                {etiqueta}
              </button>
            ))}
            {rangosKm.size > 0 && (
              <button type="button" onClick={() => cambiarRangosKm(new Set())} className="text-caption text-primary-600 hover:underline">
                Todas las distancias
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar unidades">
            {FILTROS_UNIDAD.map(({ valor, etiqueta }) => (
              <button
                key={valor}
                type="button"
                aria-pressed={filtro === valor}
                onClick={() => setFiltro(valor)}
                className={`px-2 py-1 rounded text-body-sm font-sans ${
                  filtro === valor ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
          {unidadesFiltradas.length === 0 && (
            <p className="font-sans text-body-sm text-neutral-600">
              {limite !== null
                ? magnitud === 'KM'
                  ? 'Ninguna unidad dentro de esa distancia.'
                  : 'Ninguna unidad dentro de ese tiempo.'
                : rangosKm.size > 0
                  ? 'Ninguna unidad en esos rangos de distancia.'
                  : 'Ninguna unidad en este estado.'}
            </p>
          )}
          <ul ref={listaRef} className="flex flex-col">
            {unidadesFiltradas.map((u) => {
              const nivel = nivelDeOcupacion(u.carga, u.capacidad);
              const porcentaje = u.capacidad > 0 ? Math.round((u.carga / u.capacidad) * 100) : null;
              const paraLlegar = minutosParaLlegar(u, reloj);
              const desdeSalida = minutosDesdeSalida(u, reloj);
              const alDestino = kmAlDestino(u);
              const desdeOrigen = kmDesdeOrigen(u);
              const seleccionada = unidadResaltada === u.codigo;
              const objeto: SeleccionResaltable = { tipo: 'vehiculo', codigo: u.codigo };
              // Primer clic: la marca en la lista y en el mapa, y la centra; con la fila ya marcada, abre su detalle.
              const elegir = () => {
                if (!onResaltar || seleccionada) {
                  onSeleccionar(objeto);
                  return;
                }
                onResaltar(objeto);
                onCentrar?.(u.posicion);
              };
              return (
                <li
                  key={u.codigo}
                  data-fila-unidad={u.codigo}
                  aria-current={seleccionada ? 'true' : undefined}
                  className={`flex items-stretch -mx-1 rounded ${seleccionada ? 'bg-primary-50 ring-1 ring-primary-600' : ''}`}
                >
                  <button
                    type="button"
                    onClick={elegir}
                    data-unidad={u.codigo}
                    className="flex-1 min-w-0 py-1.5 flex flex-col gap-px text-left text-body-sm hover:bg-neutral-50 px-1 rounded"
                  >
                    <span className="flex items-center gap-2 w-full">
                      <img src={iconoDeUnidad(u).href} alt="" className="block -my-1" />
                      <span className="font-semibold text-neutral-900">{u.codigo}</span>
                      <span className="text-neutral-600 truncate">{ESTADO_UNIDAD[u.estado]}</span>
                      <span className={`ml-auto flex items-center gap-1.5 tabular-nums whitespace-nowrap ${TEXTO_SEMAFORO[nivel]}`}>
                        {porcentaje === null ? (
                          '—'
                        ) : (
                          <>
                            <MarcaSemaforo nivel={nivel} titulo={NOMBRE_CARGA[nivel]} />
                            {u.carga}/{u.capacidad} · {porcentaje} %
                          </>
                        )}
                      </span>
                    </span>
                    <span className="pl-10 text-caption text-neutral-600 tabular-nums truncate">
                      {u.tramo && paraLlegar !== null && desdeSalida !== null ? (
                        <>
                          → ({Math.round(u.tramo.destino.x)},{Math.round(u.tramo.destino.y)}) ·{' '}
                          <span className={referencia === 'SALIDA' ? 'text-neutral-900 font-medium' : undefined}>
                            salió {formatearHora(u.tramo.salida)} · hace {formatearDuracion(desdeSalida)}
                            {desdeOrigen !== null && ` · ${formatoKm(desdeOrigen)}`}
                          </span>{' '}
                          ·{' '}
                          <span className={referencia === 'LLEGADA' ? 'text-neutral-900 font-medium' : undefined}>
                            llega {formatearHora(u.tramo.llegada)} · en {formatearDuracion(paraLlegar)}
                            {alDestino !== null && ` · ${formatoKm(alDestino)}`}
                          </span>
                        </>
                      ) : (
                        'Sin tramo en curso'
                      )}
                    </span>
                    {(u.kmPorRecorrer > 0 || u.distanciaRecorridaKm > 0) && (
                      <span className="pl-10 text-caption text-neutral-600 tabular-nums truncate">
                        Ruta: <span className={orden === 'KM_RECORRIDOS' ? 'text-neutral-900 font-medium' : undefined}>recorrió {formatoKm(u.distanciaRecorridaKm)}</span>
                        {' · '}
                        <span className={orden === 'KM_POR_RECORRER' ? 'text-neutral-900 font-medium' : undefined}>faltan {formatoKm(u.kmPorRecorrer)}</span>
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSeleccionar(objeto)}
                    aria-label={`Ver detalle de ${u.codigo}`}
                    className="w-6 shrink-0 text-neutral-600 hover:text-neutral-900"
                  >
                    ›
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
  );
};
