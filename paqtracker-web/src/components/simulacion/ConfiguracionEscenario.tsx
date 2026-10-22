import React, { useRef, useState } from 'react';
import { UNIDADES } from '../../config/dominio';
import { NOMBRE_HOLGURA, RANGO_HOLGURA } from '../../config/glosario';
import { mensajeDeError, useEjecuciones } from '../../hooks/useEjecuciones';
import { formatearFechaLarga, formatearMiles } from '../../lib/formato';
import { NOMBRE_REGISTRO, mesDeArchivo, subirArchivo } from '../../services/servicioArchivos';
import type { ComposicionFlotaApi, EjecucionApi, EstadoEjecucionApi } from '../../types/api';
import { IndicadorRadio } from '../layout/IndicadorRadio';
import type { ArchivoCargado, EscenarioSimulacion, TipoArchivo } from '../../types/simulacion';

// Configuración de escenario (Figma "Configuración de escenario · vacío / completado"). Crea una
// simulación en paqtracker-api o abre una existente: cualquier dispositivo puede ver cualquier corrida.

const DIAS_PERIODO = 5;
const MAXIMO_POR_TIPO = 50;

const ESCENARIOS: { valor: EscenarioSimulacion; titulo: string; descripcion: string }[] = [
  { valor: 'SIMULACION_PERIODO', titulo: 'Simulación 5 días', descripcion: 'Comprime 5 días de operación en 30–60 min de ejecución.' },
  { valor: 'COLAPSO_LOGISTICO', titulo: 'Hasta el colapso', descripcion: 'Corre hasta el primer pedido imposible de entregar en plazo.' },
];

const ARCHIVOS: { tipo: TipoArchivo; etiqueta: string }[] = [
  { tipo: 'pedidos', etiqueta: 'Pedidos (ventas.AAAAMM.txt)' },
  { tipo: 'bloqueos', etiqueta: 'Bloqueos (bloqueo.AAMM.txt)' },
];

const ESTADO_EJECUCION: Record<EstadoEjecucionApi, { texto: string; clase: string }> = {
  CONFIGURADA: { texto: 'Configurada', clase: 'bg-[#F1F5F9] text-[#64748B]' },
  EN_CURSO: { texto: 'En curso', clase: 'bg-[#DBEAFE] text-[#1E40AF]' },
  PAUSADA: { texto: 'Pausada', clase: 'bg-[#FEF3E5] text-[#B45309]' },
  FINALIZADA: { texto: 'Finalizada', clase: 'bg-[#DCFCE7] text-[#15803D]' },
  COLAPSADA: { texto: 'Colapsada', clase: 'border border-[#B91C1C] text-[#B91C1C]' },
};

const Seccion: React.FC<{ numero?: string; titulo: string; resumen: React.ReactNode; resumenPendiente?: boolean; children: React.ReactNode }> = ({
  numero,
  titulo,
  resumen,
  resumenPendiente = false,
  children,
}) => {
  const [abierta, setAbierta] = useState(true);
  return (
    <section className="bg-white border border-[#E2E8F0] rounded-[10px]">
      <button
        type="button"
        onClick={() => setAbierta(!abierta)}
        aria-expanded={abierta}
        className="w-full h-[48px] px-[15px] flex items-center gap-[14px] text-left"
      >
        {numero && <span className="tabular-nums text-[12px] text-[#64748B]">{numero}</span>}
        <h2 className="font-sans font-semibold text-[14px] text-[#0F172A]">{titulo}</h2>
        <span className={`ml-auto tabular-nums text-[12px] ${resumenPendiente ? 'text-[#64748B]' : 'text-[#0F172A]'}`}>{resumen}</span>
        <span className={`text-[11px] text-[#64748B] transition-transform ${abierta ? '' : 'rotate-180'}`} aria-hidden="true">
          ▲
        </span>
      </button>
      {abierta && <div className="px-[15px] pb-[18px] flex flex-col gap-[8px]">{children}</div>}
    </section>
  );
};

const Etiqueta: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="font-sans text-[12px] text-[#334155]">
    {children}
  </label>
);

const RanuraArchivo: React.FC<{
  tipo: TipoArchivo;
  etiqueta: string;
  archivo?: ArchivoCargado;
  subiendo: boolean;
  onCargar: (archivo: File) => void;
}> = ({ tipo, etiqueta, archivo, subiendo, onCargar }) => {
  const entrada = useRef<HTMLInputElement>(null);
  const nombres = NOMBRE_REGISTRO[tipo];
  const id = `archivo-${tipo}`;
  return (
    <div className="flex flex-col gap-[8px] mb-[6px]">
      <Etiqueta htmlFor={id}>{etiqueta}</Etiqueta>
      <div
        className={`w-full max-w-[420px] h-[32px] px-[10px] rounded-[6px] flex items-center gap-[10px] text-[12px] ${
          archivo ? 'border border-[#CBD5E1] bg-white' : 'border border-dashed border-[#94A3B8] bg-[#F8FAFC]'
        }`}
      >
        {subiendo ? (
          <span className="tabular-nums text-[#64748B]">Validando en el servidor…</span>
        ) : archivo ? (
          <>
            <span className="tabular-nums text-[#0F172A] truncate">"{archivo.nombre}"</span>
            <span className="ml-auto tabular-nums text-[#64748B] whitespace-nowrap">
              {formatearMiles(archivo.registros)} {archivo.registros === 1 ? nombres.singular : nombres.plural} · {archivo.mes}
            </span>
          </>
        ) : (
          <span className="tabular-nums text-[#64748B]">Opcional · se usan los datos ya cargados</span>
        )}
        <button
          type="button"
          disabled={subiendo}
          onClick={() => entrada.current?.click()}
          className={`font-sans font-medium text-[#1E40AF] hover:underline whitespace-nowrap disabled:text-[#94A3B8] ${archivo || subiendo ? '' : 'ml-auto'}`}
        >
          {archivo ? 'Reemplazar' : 'Subir archivo'}
        </button>
        <input
          ref={entrada}
          id={id}
          type="file"
          accept=".txt"
          className="sr-only"
          onChange={(evento) => {
            const elegido = evento.target.files?.[0];
            if (elegido) onCargar(elegido);
            evento.target.value = '';
          }}
        />
      </div>
      {archivo && archivo.lineasInvalidas.length > 0 && (
        <p className="font-sans text-[12px] text-[#B91C1C]">
          {archivo.lineasInvalidas.length} {archivo.lineasInvalidas.length === 1 ? 'línea no respeta' : 'líneas no respetan'} el formato (línea{' '}
          {archivo.lineasInvalidas.slice(0, 5).join(', ')}
          {archivo.lineasInvalidas.length > 5 ? '…' : ''}): el archivo no se guardó. Corrígelo y vuelve a subirlo.
        </p>
      )}
      {archivo && archivo.guardado && <p className="font-sans text-[12px] text-[#15803D]">Guardado para el mes {archivo.mes}.</p>}
    </div>
  );
};

const FilaResumen: React.FC<{ etiqueta: string; valor?: string }> = ({ etiqueta, valor }) => (
  <div className="h-[33px] flex items-center justify-between border-b border-dashed border-[#E2E8F0] text-[12px]">
    <span className="font-sans text-[#64748B]">{etiqueta}</span>
    <span className={`tabular-nums ${valor ? 'text-[#0F172A]' : 'text-[#64748B]'} truncate pl-[12px]`}>{valor ?? '—'}</span>
  </div>
);

/** Simulaciones de la API, para abrir una ya creada (por este u otro dispositivo). */
const ListaEjecuciones: React.FC<{ onAbrir: (ejecucion: EjecucionApi) => void }> = ({ onAbrir }) => {
  const { ejecuciones, cargando, error, recargar } = useEjecuciones();
  const simulaciones = ejecuciones.filter((e) => e.tipoEscenario !== 'DIA_A_DIA').reverse();
  return (
    <Seccion titulo="Abrir una simulación existente" resumen={`${simulaciones.length} en el servidor`} resumenPendiente={simulaciones.length === 0}>
      <div className="flex items-center text-[12px]">
        <span className="font-sans text-[#64748B]">Ábrelas desde cualquier dispositivo; todos ven la misma corrida.</span>
        <button type="button" onClick={recargar} className="ml-auto font-sans font-medium text-[#1E40AF] hover:underline">
          Actualizar
        </button>
      </div>
      {error && <p className="font-sans text-[12px] text-[#B91C1C]">{error}</p>}
      {!error && !cargando && simulaciones.length === 0 && <p className="font-sans text-[12px] text-[#64748B]">Aún no hay simulaciones.</p>}
      {simulaciones.map((e) => (
        <div key={e.id} className="h-[36px] flex items-center gap-[10px] border-b border-dashed border-[#E2E8F0] text-[12px]">
          <span className={`rounded-[4px] px-[6px] py-[2px] font-sans font-medium ${ESTADO_EJECUCION[e.estado].clase}`}>{ESTADO_EJECUCION[e.estado].texto}</span>
          <span className="font-sans text-[#0F172A] truncate">{e.nombre}</span>
          <span className="tabular-nums text-[#64748B] whitespace-nowrap">{e.relojSimulado ?? ''}</span>
          <button type="button" onClick={() => onAbrir(e)} className="ml-auto font-sans font-medium text-[#1E40AF] hover:underline whitespace-nowrap">
            Ver corrida ›
          </button>
        </div>
      ))}
    </Seccion>
  );
};

interface ConfiguracionEscenarioProps {
  onAbrir: (ejecucion: EjecucionApi) => void;
}

export const ConfiguracionEscenario: React.FC<ConfiguracionEscenarioProps> = ({ onAbrir }) => {
  const { crearEIniciar } = useEjecuciones();
  const [escenario, setEscenario] = useState<EscenarioSimulacion>('SIMULACION_PERIODO');
  const [fecha, setFecha] = useState('');
  const [archivos, setArchivos] = useState<Partial<Record<TipoArchivo, ArchivoCargado>>>({});
  const [subiendo, setSubiendo] = useState<TipoArchivo | null>(null);
  const [flota, setFlota] = useState<ComposicionFlotaApi>({ autos: UNIDADES.AUTO.cantidad, motos: UNIDADES.MOTO.cantidad, bicicletas: UNIDADES.BICICLETA.cantidad });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inicio = fecha ? new Date(`${fecha}T00:00`) : null;
  const inicioValido = inicio !== null && !Number.isNaN(inicio.getTime());
  const totalFlota = flota.autos + flota.motos + flota.bicicletas;
  const flotaValida = totalFlota > 0 && [flota.autos, flota.motos, flota.bicicletas].every((n) => n >= 0 && n <= MAXIMO_POR_TIPO);
  const archivosValidos = Object.values(archivos).every((a) => a.guardado);
  const listo = inicioValido && flotaValida && archivosValidos && subiendo === null && !enviando;

  const faltantes = [
    !inicioValido && 'la fecha de inicio',
    !flotaValida && `una flota de 1 a ${MAXIMO_POR_TIPO} unidades por tipo`,
    !archivosValidos && 'archivos sin errores',
  ].filter(Boolean) as string[];

  const cargar = async (tipo: TipoArchivo, archivo: File) => {
    const mes = mesDeArchivo(archivo.name, fecha ? fecha.slice(0, 7).replace('-', '') : null);
    if (!mes) {
      setError(`Elige primero la fecha de inicio: "${archivo.name}" no indica su mes en el nombre.`);
      return;
    }
    setError(null);
    setSubiendo(tipo);
    try {
      const resultado = await subirArchivo(tipo, archivo, mes);
      setArchivos((previos) => ({ ...previos, [tipo]: resultado }));
    } catch (e) {
      setError(mensajeDeError(e, `No se pudo subir ${archivo.name}`));
    } finally {
      setSubiendo(null);
    }
  };

  const ejecutar = async () => {
    if (!listo || !fecha) return;
    setEnviando(true);
    setError(null);
    try {
      const ejecucion = await crearEIniciar({
        tipoEscenario: escenario,
        fechaInicio: fecha,
        dias: escenario === 'SIMULACION_PERIODO' ? DIAS_PERIODO : undefined,
        flota,
      });
      onAbrir(ejecucion);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo crear la simulación'));
      setEnviando(false);
    }
  };

  const cambiarFlota = (clave: keyof ComposicionFlotaApi, valor: string) =>
    setFlota((previa) => ({ ...previa, [clave]: Math.max(0, Math.round(Number(valor)) || 0) }));

  const resumenArchivo = (tipo: TipoArchivo) => {
    const a = archivos[tipo];
    return a ? `${a.registros} · ${a.nombre}` : 'datos del servidor';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 leading-[normal]">
      <header className="h-[80px] bg-white border-b border-[#E2E8F0] px-[24px] flex flex-col justify-center gap-[6px] shrink-0">
        <h1 className="font-sans font-semibold text-[18px] text-[#0F172A]">Configuración de escenario</h1>
        <p className="font-sans text-[12px] text-[#64748B]">Abre una simulación que ya esté en el servidor o configura una nueva.</p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col lg:flex-row gap-[24px] items-stretch lg:items-start p-[24px]">
          <div className="flex-1 min-w-0 flex flex-col gap-[12px]">
            <ListaEjecuciones onAbrir={onAbrir} />

            <h2 className="mt-[12px] font-sans font-semibold text-[14px] text-[#0F172A]">Nueva simulación</h2>

            <Seccion numero="01" titulo="Escenario" resumen="">
              <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
                <legend className="sr-only">Escenario</legend>
                {ESCENARIOS.map((opcion) => {
                  const activo = opcion.valor === escenario;
                  return (
                    <label
                      key={opcion.valor}
                      className={`min-h-[69px] px-[13px] py-[10px] rounded-[6px] text-left flex flex-col justify-center gap-[6px] transition cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#1E40AF]/40 ${
                        activo ? 'bg-[#EAF1FD] border-2 border-[#1E40AF]' : 'bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="escenario"
                        value={opcion.valor}
                        checked={activo}
                        onChange={() => setEscenario(opcion.valor)}
                        className="sr-only"
                      />
                      <span className={`flex items-center gap-[8px] font-sans font-semibold text-[14px] ${activo ? 'text-[#1E40AF]' : 'text-[#0F172A]'}`}>
                        <IndicadorRadio marcado={activo} />
                        {opcion.titulo}
                      </span>
                      <span className="font-sans text-[12px] text-[#64748B]">{opcion.descripcion}</span>
                    </label>
                  );
                })}
              </fieldset>
            </Seccion>

            <Seccion numero="02" titulo="Periodo" resumen={inicioValido ? formatearFechaLarga(inicio, false) : 'Sin definir'} resumenPendiente={!inicioValido}>
              <Etiqueta htmlFor="inicio-fecha">Fecha de inicio (la simulación arranca a las 00:00)</Etiqueta>
              <input
                id="inicio-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-[180px] h-[32px] px-[10px] border border-[#CBD5E1] rounded-[6px] tabular-nums text-[12px] text-[#0F172A] outline-none focus:border-[#1E40AF]"
              />
            </Seccion>

            <Seccion numero="03" titulo="Datos de la simulación" resumen={`${Object.keys(archivos).length}/2 archivos nuevos`} resumenPendiente={Object.keys(archivos).length === 0}>
              {ARCHIVOS.map(({ tipo, etiqueta }) => (
                <RanuraArchivo key={tipo} tipo={tipo} etiqueta={etiqueta} archivo={archivos[tipo]} subiendo={subiendo === tipo} onCargar={(a) => cargar(tipo, a)} />
              ))}
              <p className="border-l-[3px] border-[#94A3B8] pl-[9px] font-sans text-[12px] text-[#64748B]">
                El servidor valida cada línea con el mismo lector del planificador y guarda el archivo para su mes. Las averías se incorporan en una entrega
                posterior.
              </p>
            </Seccion>

            <Seccion numero="04" titulo="Flota" resumen={`${totalFlota} unidades`}>
              <div className="flex gap-[24px]">
                {(
                  [
                    { clave: 'autos', etiqueta: 'Autos' },
                    { clave: 'motos', etiqueta: 'Motos' },
                    { clave: 'bicicletas', etiqueta: 'Bicicletas' },
                  ] as const
                ).map(({ clave, etiqueta }) => (
                  <div key={clave} className="flex flex-col gap-[8px]">
                    <Etiqueta htmlFor={`flota-${clave}`}>{etiqueta}</Etiqueta>
                    <input
                      id={`flota-${clave}`}
                      type="number"
                      min={0}
                      max={MAXIMO_POR_TIPO}
                      value={flota[clave]}
                      onChange={(e) => cambiarFlota(clave, e.target.value)}
                      className="w-[100px] h-[32px] px-[10px] border border-[#CBD5E1] rounded-[6px] tabular-nums text-[12px] text-[#0F172A] outline-none focus:border-[#1E40AF]"
                    />
                  </div>
                ))}
              </div>
            </Seccion>

          </div>

          <aside className="w-full lg:w-[360px] shrink-0 lg:sticky lg:top-0 bg-white border border-[#E2E8F0] rounded-[10px]">
            <h2 className="h-[48px] px-[15px] flex items-center border-b border-[#E2E8F0] font-sans font-semibold text-[14px] text-[#0F172A]">Resumen de la corrida</h2>
            <div className="px-[15px] pt-[8px] pb-[16px] flex flex-col">
              <FilaResumen etiqueta="Escenario" valor={ESCENARIOS.find((e) => e.valor === escenario)!.titulo} />
              <FilaResumen etiqueta="Inicio" valor={inicioValido ? formatearFechaLarga(inicio, false) : undefined} />
              <FilaResumen etiqueta="Pedidos" valor={resumenArchivo('pedidos')} />
              <FilaResumen etiqueta="Bloqueos" valor={resumenArchivo('bloqueos')} />
              <FilaResumen etiqueta="Flota" valor={`${flota.autos} autos · ${flota.motos} motos · ${flota.bicicletas} bicis`} />
              <FilaResumen
                etiqueta="Semáforo de holgura"
                valor={`${NOMBRE_HOLGURA.ROJO} ${RANGO_HOLGURA.ROJO} · ${NOMBRE_HOLGURA.AMBAR} ${RANGO_HOLGURA.AMBAR}`}
              />
              <button
                type="button"
                onClick={ejecutar}
                disabled={!listo}
                className="mt-[24px] h-[44px] rounded-[6px] bg-[#1E40AF] hover:bg-[#1E3A8A] disabled:bg-[#94A3B8] disabled:cursor-not-allowed text-white font-sans font-semibold text-[14px] transition"
              >
                {enviando ? 'Creando simulación…' : 'Ejecutar simulación'}
              </button>
              {error && <p className="mt-[10px] border-l-[3px] border-[#B91C1C] pl-[9px] font-sans text-[12px] text-[#B91C1C]">{error}</p>}
              {!listo && !enviando && faltantes.length > 0 && (
                <p className="mt-[10px] border-l-[3px] border-[#94A3B8] pl-[9px] font-sans text-[12px] text-[#64748B]">
                  Define {faltantes.join(', ').replace(/, ([^,]*)$/, ' y $1')} para continuar.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
