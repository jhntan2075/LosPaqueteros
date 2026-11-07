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
  <span className="flex items-center gap-[5px] text-[12px] whitespace-nowrap">
    <span className={`size-[7px] rounded-[1px] ${color}`} />
    <span className="font-sans text-[#64748B]">{etiqueta}</span>
    <span className="tabular-nums font-medium text-[#0F172A]">{valor}</span>
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
    { clave: 'ruta', etiqueta: 'en ruta', valor: flota.enRuta, color: 'bg-[#1E40AF]' },
    { clave: 'refr', etiqueta: 'en refrigerio', valor: flota.enRefrigerio.length, color: 'bg-[#93C5FD]' },
    { clave: 'disp', etiqueta: 'disponibles', valor: flota.disponibles, color: 'bg-[#CBD5E1]' },
    { clave: 'turno', etiqueta: 'fuera de turno', valor: flota.fueraDeTurno, color: 'bg-[#E2E8F0]' },
    { clave: 'aver', etiqueta: 'averiadas', valor: flota.averiadas.length, color: 'bg-[#B91C1C]' },
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
        <section className="px-[12px] pt-[14px] pb-[12px] border-b border-[#E2E8F0] flex flex-col gap-[10px]">
          <TituloSeccion derecha={`${utilizacion} % en ruta`}>
            Estado de la flota · {flota.total} unidades
          </TituloSeccion>
          <div
            className="flex gap-[2px] h-[12px] w-full"
            role="img"
            aria-label={visibles.map((s) => `${s.valor} ${s.etiqueta}`).join(', ')}
          >
            {visibles.map((s) => (
              <span key={s.clave} className={`${s.color} rounded-[1px]`} style={{ flexGrow: s.valor, flexBasis: 0 }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-[16px] gap-y-[4px]">
            {visibles.map((s) => (
              <Leyenda key={s.clave} color={s.color} etiqueta={s.etiqueta} valor={s.valor} />
            ))}
          </div>
        </section>

        {/* Por tipo de unidad */}
        <section className="px-[12px] pt-[12px] pb-[14px] border-b border-[#E2E8F0] flex flex-col gap-[10px]">
          <TituloSeccion derecha="en ruta · carga a bordo">Por tipo de unidad</TituloSeccion>
          {flota.porTipo.map(({ tipo, enRuta, total, carga, capacidad, cargaABordo }) => {
            // La barra y el porcentaje miden lo mismo: la carga a bordo, con el semáforo de carga.
            const nivel = cargaABordo === null ? null : nivelDeOcupacion(carga, capacidad);
            return (
              <div key={tipo} className="flex flex-col gap-[5px]">
                <div className="flex items-center gap-[8px] text-[12px]">
                  <img src={iconoDeCarga(tipo, carga, capacidad).href} alt="" className="block -my-[4px]" />
                  <span className="font-sans font-semibold text-[#0F172A]">{ETIQUETA[tipo]}</span>
                  <span className="tabular-nums text-[#64748B]">
                    {enRuta} / {total} en ruta
                  </span>
                  <span
                    className={`ml-auto tabular-nums ${nivel ? TEXTO_SEMAFORO[nivel] : 'text-[#64748B]'}`}
                    title="Paquetes sin entregar sobre la capacidad de las unidades fuera del almacén. Baja a medida que entregan."
                  >
                    {cargaABordo === null ? 'sin unidades fuera' : `carga ${carga}/${capacidad} · ${Math.round(cargaABordo * 100)} %`}
                  </span>
                </div>
                <div
                  className="h-[4px] bg-[#E2E8F0] rounded-full overflow-hidden"
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
          <p className="text-[11px] text-[#64748B]">
            Carga: {NIVELES_CARGA.map((n) => `${NOMBRE_CARGA[n].toLowerCase()} ${RANGO_OCUPACION[n]}`).join(' · ')}
          </p>
        </section>

        {/* Requiere atención */}
        <section className="px-[12px] pt-[12px] pb-[14px] border-b border-[#E2E8F0] flex flex-col gap-[12px]">
          <TituloSeccion derecha={atencion.length}>Requiere atención</TituloSeccion>
          {atencion.length === 0 && <p className="font-sans text-[12px] text-[#64748B]">Ninguna unidad requiere atención.</p>}
          {atencion.map((item) => (
            <FilaConBarra key={item.titulo} color={item.color} titulo={item.titulo} detalle={item.detalle} detalleMono />
          ))}
        </section>

        {/* Todas las unidades: lista completa, clicable (abre su detalle), filtrable por estado y por rangos de
            km al destino (E11), ordenable (E13–E17) y con búsqueda por minutos o km al destino o desde el
            origen (E06–E09). */}
        <section className="px-[12px] pt-[12px] pb-[14px] flex flex-col gap-[8px]" aria-label="Todas las unidades">
          <TituloSeccion derecha={`${unidadesFiltradas.length} de ${flota.total}`}>Todas las unidades</TituloSeccion>
          <div className="flex items-center gap-[6px] text-[12px]">
            <label htmlFor="orden-unidades" className="font-sans text-[#64748B] whitespace-nowrap">
              Ordenar por
            </label>
            <select
              id="orden-unidades"
              value={orden}
              onChange={(e) => cambiarOrden(e.target.value as CriterioOrden)}
              className="h-[26px] px-[6px] rounded-[4px] border border-[#CBD5E1] bg-white text-[12px] text-[#0F172A]"
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
              className="h-[26px] px-[8px] rounded-[4px] border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] flex items-center gap-[4px]"
            >
              {sentido === 'ASC' ? <ArrowUpNarrowWide className="w-3.5 h-3.5" /> : <ArrowDownWideNarrow className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{sentido === 'ASC' ? 'Asc.' : 'Desc.'}</span>
            </button>
          </div>
          <fieldset className="flex flex-wrap items-center gap-[6px] text-[12px]">
            <legend className="sr-only">Buscar por tiempo o distancia del tramo en curso</legend>
            <label htmlFor="minutos-unidades" className="font-sans text-[#64748B] whitespace-nowrap">
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
              className="h-[26px] w-[56px] px-[6px] rounded-[4px] border border-[#CBD5E1] bg-white tabular-nums text-[12px] text-[#0F172A]"
            />
            <div role="radiogroup" aria-label="Magnitud de la búsqueda" className="flex rounded-[4px] border border-[#CBD5E1] overflow-hidden">
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
                  className={`h-[24px] px-[8px] text-[11px] font-sans ${
                    magnitud === valor ? 'bg-[#DBEAFE] text-[#1E40AF] font-medium' : 'bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
            <span className="font-sans text-[#64748B]">de la</span>
            <div role="radiogroup" aria-label="Referencia de tiempo" className="flex rounded-[4px] border border-[#CBD5E1] overflow-hidden">
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
                  className={`h-[24px] px-[8px] text-[11px] font-sans ${
                    referencia === valor ? 'bg-[#DBEAFE] text-[#1E40AF] font-medium' : 'bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
            {limite !== null && (
              <button type="button" onClick={() => setMinutos('')} className="text-[11px] text-[#1E40AF] hover:underline">
                Quitar
              </button>
            )}
          </fieldset>
          <div className="flex flex-wrap items-center gap-[4px] text-[12px]" role="group" aria-label="Distancia al destino">
            <span className="font-sans text-[#64748B] mr-[2px]">Al destino:</span>
            {RANGOS_KM.map(({ id, etiqueta }) => (
              <button
                key={id}
                type="button"
                aria-pressed={rangosKm.has(id)}
                onClick={() => alternarRangoKm(id)}
                className={`px-[7px] py-[3px] rounded-[4px] text-[12px] font-sans tabular-nums ${
                  rangosKm.has(id) ? 'bg-[#DBEAFE] text-[#1E40AF] font-medium' : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                }`}
              >
                {etiqueta}
              </button>
            ))}
            {rangosKm.size > 0 && (
              <button type="button" onClick={() => cambiarRangosKm(new Set())} className="text-[11px] text-[#1E40AF] hover:underline">
                Todas las distancias
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-[4px]" role="group" aria-label="Filtrar unidades">
            {FILTROS_UNIDAD.map(({ valor, etiqueta }) => (
              <button
                key={valor}
                type="button"
                aria-pressed={filtro === valor}
                onClick={() => setFiltro(valor)}
                className={`px-[7px] py-[3px] rounded-[4px] text-[12px] font-sans ${
                  filtro === valor ? 'bg-[#DBEAFE] text-[#1E40AF] font-medium' : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
          {unidadesFiltradas.length === 0 && (
            <p className="font-sans text-[12px] text-[#64748B]">
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
                  className={`flex items-stretch -mx-[4px] rounded ${seleccionada ? 'bg-[#EFF6FF] ring-1 ring-[#1E40AF]' : ''}`}
                >
                  <button
                    type="button"
                    onClick={elegir}
                    data-unidad={u.codigo}
                    className="flex-1 min-w-0 py-[5px] flex flex-col gap-[1px] text-left text-[12px] hover:bg-[#F8FAFC] px-[4px] rounded"
                  >
                    <span className="flex items-center gap-[8px] w-full">
                      <img src={iconoDeUnidad(u).href} alt="" className="block -my-[4px]" />
                      <span className="font-semibold text-[#0F172A]">{u.codigo}</span>
                      <span className="text-[#64748B] truncate">{ESTADO_UNIDAD[u.estado]}</span>
                      <span className={`ml-auto flex items-center gap-[5px] tabular-nums whitespace-nowrap ${TEXTO_SEMAFORO[nivel]}`}>
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
                    <span className="pl-[38px] text-[11px] text-[#64748B] tabular-nums truncate">
                      {u.tramo && paraLlegar !== null && desdeSalida !== null ? (
                        <>
                          → ({Math.round(u.tramo.destino.x)},{Math.round(u.tramo.destino.y)}) ·{' '}
                          <span className={referencia === 'SALIDA' ? 'text-[#0F172A] font-medium' : undefined}>
                            salió {formatearHora(u.tramo.salida)} · hace {formatearDuracion(desdeSalida)}
                            {desdeOrigen !== null && ` · ${formatoKm(desdeOrigen)}`}
                          </span>{' '}
                          ·{' '}
                          <span className={referencia === 'LLEGADA' ? 'text-[#0F172A] font-medium' : undefined}>
                            llega {formatearHora(u.tramo.llegada)} · en {formatearDuracion(paraLlegar)}
                            {alDestino !== null && ` · ${formatoKm(alDestino)}`}
                          </span>
                        </>
                      ) : (
                        'Sin tramo en curso'
                      )}
                    </span>
                    {(u.kmPorRecorrer > 0 || u.distanciaRecorridaKm > 0) && (
                      <span className="pl-[38px] text-[11px] text-[#64748B] tabular-nums truncate">
                        Ruta: <span className={orden === 'KM_RECORRIDOS' ? 'text-[#0F172A] font-medium' : undefined}>recorrió {formatoKm(u.distanciaRecorridaKm)}</span>
                        {' · '}
                        <span className={orden === 'KM_POR_RECORRER' ? 'text-[#0F172A] font-medium' : undefined}>faltan {formatoKm(u.kmPorRecorrer)}</span>
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSeleccionar(objeto)}
                    aria-label={`Ver detalle de ${u.codigo}`}
                    className="w-[24px] shrink-0 text-[#64748B] hover:text-[#0F172A]"
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
