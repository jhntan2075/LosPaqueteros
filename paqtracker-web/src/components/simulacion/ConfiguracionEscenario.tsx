import React, { useRef, useState } from 'react';
import { ArrowRight, Play, RefreshCw } from 'lucide-react';
import { UNIDADES } from '../../config/dominio';
import { NOMBRE_HOLGURA, RANGO_HOLGURA } from '../../config/glosario';
import { mensajeDeError, useEjecuciones } from '../../hooks/useEjecuciones';
import { cn } from '../../lib/clases';
import { formatearFechaLarga, formatearMiles } from '../../lib/formato';
import { NOMBRE_REGISTRO, mesDeArchivo, subirArchivo } from '../../services/servicioArchivos';
import type { ComposicionFlotaApi, EjecucionApi, EstadoEjecucionApi } from '../../types/api';
import { IndicadorRadio } from '../layout/IndicadorRadio';
import { Aviso, Boton, Campo, EncabezadoPagina, Entrada, FilaDato, Insignia, Pestanas, Tarjeta, type Tono } from '../ui';
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

const FLOTA = [
  { clave: 'autos', etiqueta: 'Autos' },
  { clave: 'motos', etiqueta: 'Motos' },
  { clave: 'bicicletas', etiqueta: 'Bicicletas' },
] as const;

const ESTADO_EJECUCION: Record<EstadoEjecucionApi, { texto: string; tono: Tono; contorno?: boolean }> = {
  CONFIGURADA: { texto: 'Configurada', tono: 'neutral' },
  EN_CURSO: { texto: 'En curso', tono: 'primary' },
  PAUSADA: { texto: 'Pausada', tono: 'warn' },
  FINALIZADA: { texto: 'Finalizada', tono: 'ok' },
  COLAPSADA: { texto: 'Colapsada', tono: 'critical', contorno: true },
};

const Seccion: React.FC<{ numero?: string; titulo: string; resumen: React.ReactNode; resumenPendiente?: boolean; children: React.ReactNode }> = ({
  numero,
  titulo,
  resumen,
  resumenPendiente = false,
  children,
}) => (
  <Tarjeta
    titulo={
      <>
        {numero && (
          <span aria-hidden="true" className="mr-3 text-body-sm font-normal tabular-nums text-neutral-600">
            {numero}
          </span>
        )}
        {titulo}
      </>
    }
    acciones={
      resumen ? <span className={cn('text-body-sm tabular-nums', resumenPendiente ? 'text-neutral-600' : 'text-neutral-900')}>{resumen}</span> : undefined
    }
    cuerpoClassName="flex flex-col gap-3"
  >
    {children}
  </Tarjeta>
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
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-body-sm font-medium text-neutral-700">
        {etiqueta}
      </label>
      <div
        className={cn(
          'flex h-8 w-full max-w-md items-center gap-2.5 rounded-control pl-2.5 pr-0.5 text-body-sm',
          archivo ? 'border border-neutral-300 bg-white' : 'border border-dashed border-neutral-400 bg-neutral-50',
        )}
      >
        {subiendo ? (
          <span className="tabular-nums text-neutral-600">Validando en el servidor…</span>
        ) : archivo ? (
          <>
            <span className="truncate tabular-nums text-neutral-900">"{archivo.nombre}"</span>
            <span className="ml-auto whitespace-nowrap tabular-nums text-neutral-600">
              {formatearMiles(archivo.registros)} {archivo.registros === 1 ? nombres.singular : nombres.plural} · {archivo.mes}
            </span>
          </>
        ) : (
          <span className="tabular-nums text-neutral-600">Opcional · se usan los datos ya cargados</span>
        )}
        <Boton
          variante="fantasma"
          tamano="sm"
          disabled={subiendo}
          onClick={() => entrada.current?.click()}
          className={cn('text-primary-600 hover:text-primary-700', !archivo && !subiendo && 'ml-auto')}
        >
          {archivo ? 'Reemplazar' : 'Subir archivo'}
        </Boton>
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
        <Aviso tono="critical" compacto role="alert">
          {archivo.lineasInvalidas.length} {archivo.lineasInvalidas.length === 1 ? 'línea no respeta' : 'líneas no respetan'} el formato (línea{' '}
          {archivo.lineasInvalidas.slice(0, 5).join(', ')}
          {archivo.lineasInvalidas.length > 5 ? '…' : ''}): el archivo no se guardó. Corrígelo y vuelve a subirlo.
        </Aviso>
      )}
      {archivo && archivo.guardado && (
        <Aviso tono="ok" compacto>
          Guardado para el mes {archivo.mes}.
        </Aviso>
      )}
    </div>
  );
};

const FilaResumen: React.FC<{ etiqueta: string; valor?: string }> = ({ etiqueta, valor }) => (
  <FilaDato separador etiqueta={etiqueta} valor={valor ?? <span className="font-normal text-neutral-600">—</span>} />
);

/** Simulaciones de la API, para abrir una ya creada (por este u otro dispositivo). */
const ListaEjecuciones: React.FC<{
  simulaciones: EjecucionApi[];
  cargando: boolean;
  error: string | null;
  onRecargar: () => void;
  onAbrir: (ejecucion: EjecucionApi) => void;
}> = ({ simulaciones, cargando, error, onRecargar, onAbrir }) => (
  <Seccion titulo="Simulaciones existentes" resumen={`${simulaciones.length} en el servidor`} resumenPendiente={simulaciones.length === 0}>
    <div className="flex items-center gap-3 text-body-sm">
      <span className="text-neutral-600">Ábrelas desde cualquier dispositivo; todos ven la misma corrida.</span>
      <Boton variante="fantasma" tamano="sm" icono={RefreshCw} onClick={onRecargar} className="ml-auto">
        Actualizar
      </Boton>
    </div>
    {error && (
      <Aviso tono="critical" role="alert">
        {error}
      </Aviso>
    )}
    {!error && !cargando && simulaciones.length === 0 && <p className="text-body-sm text-neutral-600">Aún no hay simulaciones.</p>}
    {simulaciones.length > 0 && (
      <div className="flex flex-col">
        {simulaciones.map((e) => (
          <div key={e.id} className="flex h-10 items-center gap-2.5 border-b border-dashed border-neutral-200 text-body-sm last:border-0">
            <Insignia tono={ESTADO_EJECUCION[e.estado].tono} contorno={ESTADO_EJECUCION[e.estado].contorno}>
              {ESTADO_EJECUCION[e.estado].texto}
            </Insignia>
            <span className="truncate text-neutral-900">{e.nombre}</span>
            <span className="whitespace-nowrap tabular-nums text-neutral-600">{e.relojSimulado ?? ''}</span>
            <Boton variante="secundario" tamano="sm" iconoDerecha={ArrowRight} onClick={() => onAbrir(e)} className="ml-auto">
              Ver corrida
            </Boton>
          </div>
        ))}
      </div>
    )}
  </Seccion>
);

interface ConfiguracionEscenarioProps {
  onAbrir: (ejecucion: EjecucionApi) => void;
}

export const ConfiguracionEscenario: React.FC<ConfiguracionEscenarioProps> = ({ onAbrir }) => {
  const { ejecuciones, cargando: cargandoLista, error: errorLista, recargar, crearEIniciar } = useEjecuciones();
  const simulaciones = ejecuciones.filter((e) => e.tipoEscenario !== 'DIA_A_DIA').reverse();
  const [modo, setModo] = useState<'nueva' | 'lista'>('nueva');
  const [escenario, setEscenario] = useState<EscenarioSimulacion>('SIMULACION_PERIODO');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('00:00');
  const [archivos, setArchivos] = useState<Partial<Record<TipoArchivo, ArchivoCargado>>>({});
  const [subiendo, setSubiendo] = useState<TipoArchivo | null>(null);
  const [flota, setFlota] = useState<ComposicionFlotaApi>({ autos: UNIDADES.AUTO.cantidad, motos: UNIDADES.MOTO.cantidad, bicicletas: UNIDADES.BICICLETA.cantidad });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inicio = fecha && hora ? new Date(`${fecha}T${hora}`) : null;
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
        horaInicio: hora,
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
    <div className="flex min-h-0 flex-1 flex-col">
      <EncabezadoPagina titulo="Configuración de escenario" descripcion="Abre una simulación que ya esté en el servidor o configura una nueva." />

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-stretch gap-4 p-4 sm:p-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Pestanas
              variante="segmentado"
              etiqueta="Simulaciones"
              activa={modo}
              onCambiar={setModo}
              className="self-start"
              opciones={[
                { id: 'nueva', etiqueta: 'Nueva simulación' },
                { id: 'lista', etiqueta: `Simulaciones existentes (${simulaciones.length})` },
              ]}
            />

            {modo === 'lista' ? (
              <ListaEjecuciones simulaciones={simulaciones} cargando={cargandoLista} error={errorLista} onRecargar={recargar} onAbrir={onAbrir} />
            ) : (
              <>
                <Seccion numero="01" titulo="Escenario" resumen="">
                  <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <legend className="sr-only">Escenario</legend>
                    {ESCENARIOS.map((opcion) => {
                      const activo = opcion.valor === escenario;
                      return (
                        <label
                          key={opcion.valor}
                          className={cn(
                            'flex min-h-16 cursor-pointer flex-col justify-center gap-1.5 rounded-control px-3 py-2.5 text-left transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-600/40',
                            activo ? 'border-2 border-primary-600 bg-primary-50' : 'border border-neutral-200 bg-neutral-50 hover:border-neutral-300',
                          )}
                        >
                          <input
                            type="radio"
                            name="escenario"
                            value={opcion.valor}
                            checked={activo}
                            onChange={() => setEscenario(opcion.valor)}
                            className="sr-only"
                          />
                          <span className={cn('flex items-center gap-2 text-title-sm', activo ? 'text-primary-700' : 'text-neutral-900')}>
                            <IndicadorRadio marcado={activo} />
                            {opcion.titulo}
                          </span>
                          <span className="text-body-sm text-neutral-600">{opcion.descripcion}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                </Seccion>

                <Seccion
                  numero="02"
                  titulo="Periodo"
                  resumen={inicioValido ? formatearFechaLarga(inicio, false) : 'Sin definir'}
                  resumenPendiente={!inicioValido}
                >
                  <div className="flex flex-wrap gap-4">
                    <Campo htmlFor="inicio-fecha" etiqueta="Fecha de inicio">
                      <Entrada id="inicio-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-44 tabular-nums" />
                    </Campo>
                    <Campo htmlFor="inicio-hora" etiqueta="Hora de inicio">
                      <Entrada id="inicio-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-32 tabular-nums" />
                    </Campo>
                  </div>
                </Seccion>

                <Seccion
                  numero="03"
                  titulo="Datos de la simulación"
                  resumen={`${Object.keys(archivos).length}/2 archivos nuevos`}
                  resumenPendiente={Object.keys(archivos).length === 0}
                >
                  {ARCHIVOS.map(({ tipo, etiqueta }) => (
                    <RanuraArchivo
                      key={tipo}
                      tipo={tipo}
                      etiqueta={etiqueta}
                      archivo={archivos[tipo]}
                      subiendo={subiendo === tipo}
                      onCargar={(a) => cargar(tipo, a)}
                    />
                  ))}
                  <Aviso tono="neutral">
                    El servidor valida cada línea con el mismo lector del planificador y guarda el archivo para su mes. Las averías se incorporan en una entrega
                    posterior.
                  </Aviso>
                </Seccion>

                <Seccion numero="04" titulo="Flota" resumen={`${totalFlota} unidades`}>
                  <div className="flex flex-wrap gap-6">
                    {FLOTA.map(({ clave, etiqueta }) => (
                      <Campo key={clave} htmlFor={`flota-${clave}`} etiqueta={etiqueta}>
                        <Entrada
                          id={`flota-${clave}`}
                          type="number"
                          min={0}
                          max={MAXIMO_POR_TIPO}
                          value={flota[clave]}
                          onChange={(e) => cambiarFlota(clave, e.target.value)}
                          className="w-24 tabular-nums"
                        />
                      </Campo>
                    ))}
                  </div>
                </Seccion>
              </>
            )}
          </div>

          {modo === 'nueva' && (
            <aside className="w-full shrink-0 lg:sticky lg:top-0 lg:w-96">
              <Tarjeta titulo="Resumen de la corrida" divisor cuerpoClassName="flex flex-col px-5 pb-5 pt-2">
                <FilaResumen etiqueta="Escenario" valor={ESCENARIOS.find((e) => e.valor === escenario)!.titulo} />
                <FilaResumen etiqueta="Inicio" valor={inicioValido ? formatearFechaLarga(inicio, false) : undefined} />
                <FilaResumen etiqueta="Pedidos" valor={resumenArchivo('pedidos')} />
                <FilaResumen etiqueta="Bloqueos" valor={resumenArchivo('bloqueos')} />
                <FilaResumen etiqueta="Flota" valor={`${flota.autos} autos · ${flota.motos} motos · ${flota.bicicletas} bicis`} />
                <FilaResumen
                  etiqueta="Semáforo de holgura"
                  valor={`${NOMBRE_HOLGURA.ROJO} ${RANGO_HOLGURA.ROJO} · ${NOMBRE_HOLGURA.AMBAR} ${RANGO_HOLGURA.AMBAR}`}
                />
                <Boton
                  variante="primario"
                  tamano="lg"
                  icono={Play}
                  onClick={ejecutar}
                  disabled={!listo}
                  cargando={enviando}
                  textoCargando="Creando simulación…"
                  className="mt-6 w-full"
                >
                  Ejecutar simulación
                </Boton>
                {error && (
                  <Aviso tono="critical" role="alert" className="mt-3">
                    {error}
                  </Aviso>
                )}
                {!listo && !enviando && faltantes.length > 0 && (
                  <Aviso tono="neutral" className="mt-3">
                    Define {faltantes.join(', ').replace(/, ([^,]*)$/, ' y $1')} para continuar.
                  </Aviso>
                )}
              </Tarjeta>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};
