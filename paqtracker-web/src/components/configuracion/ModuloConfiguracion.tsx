import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Save, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { ALMACENES, formatearDuracion } from '../../config/dominio';
import { useAvisos } from '../../hooks/useAvisos';
import { proyectar } from '../../lib/malla';
import { validarParametros } from '../../lib/parametrosDominio';
import { ErrorDeApi, clienteApi } from '../../services/clienteApi';
import { cargarParametrosDominio, guardarParametrosDominio, restablecerParametrosDominio } from '../../services/servicioParametros';
import type { ParametrosAveriaApi, ParametrosDominioApi } from '../../types/api';
import { DialogoRangosSemaforo } from '../map/DialogoRangosSemaforo';
import { MiniMapaMalla } from '../map/MiniMapaMalla';
import { DialogoConfirmacion } from '../modals/DialogoConfirmacion';

// Configuración del dominio (rúbrica B02, B04, B06, B07-B09): ubicación y capacidad de los almacenes,
// capacidad, velocidad y costo de cada tipo de unidad, duraciones de las averías y rangos del semáforo.
// Los cambios se guardan en paqtracker-api y rigen para las simulaciones nuevas; la operación día a día
// los toma al aplicarlos (se reinicia desde ahora y replanifica sus pedidos).

const NOMBRE_UNIDAD = { AUTO: 'Auto', MOTO: 'Moto', BICICLETA: 'Bicicleta' } as const;

/** Formulario como texto: el operador puede dejar un campo vacío mientras escribe. */
type Formulario = {
  almacenes: { codigo: ParametrosDominioApi['almacenes'][number]['codigo']; x: string; y: string; capacidad: string }[];
  unidades: { tipo: ParametrosDominioApi['unidades'][number]['tipo']; capacidad: string; velocidadKmH: string; costoPorKm: string }[];
  averias: Record<keyof ParametrosAveriaApi, string>;
};

const aFormulario = (p: ParametrosDominioApi): Formulario => ({
  almacenes: p.almacenes.map((a) => ({ codigo: a.codigo, x: String(a.x), y: String(a.y), capacidad: a.capacidad === null ? '' : String(a.capacidad) })),
  unidades: p.unidades.map((u) => ({ tipo: u.tipo, capacidad: String(u.capacidad), velocidadKmH: String(u.velocidadKmH), costoPorKm: String(u.costoPorKm) })),
  averias: {
    tipo1Minutos: String(p.averias.tipo1Minutos),
    permanenciaSitioMinutos: String(p.averias.permanenciaSitioMinutos),
    tipo3MinimoMinutos: String(p.averias.tipo3MinimoMinutos),
    trasvaseMinutos: String(p.averias.trasvaseMinutos),
  },
});

const numero = (texto: string) => (texto.trim() === '' ? Number.NaN : Number(texto.replace(',', '.')));

const aParametros = (f: Formulario): ParametrosDominioApi => ({
  almacenes: f.almacenes.map((a) => ({ codigo: a.codigo, x: numero(a.x), y: numero(a.y), capacidad: a.codigo === 'CENTRAL' ? null : numero(a.capacidad) })),
  unidades: f.unidades.map((u) => ({ tipo: u.tipo, capacidad: numero(u.capacidad), velocidadKmH: numero(u.velocidadKmH), costoPorKm: numero(u.costoPorKm) })),
  averias: {
    tipo1Minutos: numero(f.averias.tipo1Minutos),
    permanenciaSitioMinutos: numero(f.averias.permanenciaSitioMinutos),
    tipo3MinimoMinutos: numero(f.averias.tipo3MinimoMinutos),
    trasvaseMinutos: numero(f.averias.trasvaseMinutos),
  },
});

const Tarjeta: React.FC<{ titulo: string; codigo: string; descripcion: string; children: React.ReactNode }> = ({ titulo, codigo, descripcion, children }) => (
  <section className="bg-white p-5 rounded-xl border border-[#CBD5E1] shadow-xs" aria-labelledby={`config-${codigo}`}>
    <h2 id={`config-${codigo}`} className="text-sm font-bold text-slate-800">
      {titulo}
    </h2>
    <p className="text-xs text-slate-600 mt-0.5 mb-4">{descripcion}</p>
    {children}
  </section>
);

interface CampoProps {
  id: string;
  etiqueta: string;
  valor: string;
  error?: string;
  visible: boolean;
  sufijo?: string;
  ayuda?: string;
  onCambiar: (valor: string) => void;
  onSalir: () => void;
}

/** Campo numérico con su error debajo (se muestra al salir del campo o al intentar guardar). */
const Campo: React.FC<CampoProps> = ({ id, etiqueta, valor, error, visible, sufijo, ayuda, onCambiar, onSalir }) => {
  const mostrar = visible && error;
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label htmlFor={id} className="text-[11px] font-medium text-slate-600">
        {etiqueta}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          inputMode="decimal"
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
          onBlur={onSalir}
          aria-invalid={mostrar ? true : undefined}
          aria-describedby={mostrar ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined}
          className={`h-8 w-full min-w-0 rounded-[6px] border px-2 text-[13px] tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 ${
            mostrar ? 'border-[#B91C1C]' : 'border-[#CBD5E1]'
          }`}
        />
        {sufijo && <span className="text-[11px] text-slate-500 shrink-0">{sufijo}</span>}
      </div>
      {mostrar ? (
        <span id={`${id}-error`} className="text-[11px] text-[#B91C1C]">
          {error}
        </span>
      ) : (
        ayuda && (
          <span id={`${id}-ayuda`} className="text-[11px] text-slate-500">
            {ayuda}
          </span>
        )
      )}
    </div>
  );
};

const CAMPOS_AVERIA: { campo: keyof ParametrosAveriaApi; etiqueta: string; ayuda: string }[] = [
  { campo: 'tipo1Minutos', etiqueta: 'Tipo 1 · detención en el lugar', ayuda: 'Luego sigue su ruta.' },
  { campo: 'permanenciaSitioMinutos', etiqueta: 'Tipo 2 y 3 · tiempo en el lugar', ayuda: 'Luego pasa al almacén central.' },
  { campo: 'tipo3MinimoMinutos', etiqueta: 'Tipo 3 · fuera de servicio (mínimo)', ayuda: 'Vuelve en el siguiente turno de las 15:00.' },
  { campo: 'trasvaseMinutos', etiqueta: 'Trasvase de carga a otra unidad', ayuda: 'En el punto de la avería.' },
];

type Confirmacion = 'restablecer' | 'aplicar' | null;

export const ModuloConfiguracion: React.FC = () => {
  const avisar = useAvisos();
  const [guardados, setGuardados] = useState<ParametrosDominioApi | null>(null);
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [enCurso, setEnCurso] = useState(false);
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null);
  const [errorConfirmacion, setErrorConfirmacion] = useState<string | null>(null);
  const [semaforoAbierto, setSemaforoAbierto] = useState(false);
  /** Hubo un guardado desde que se abrió: la operación día a día sigue con los parámetros anteriores. */
  const [pendienteDiaADia, setPendienteDiaADia] = useState(false);

  useEffect(() => {
    let vigente = true;
    void cargarParametrosDominio().then((p) => {
      if (!vigente) return;
      if (p) {
        setGuardados(p);
        setFormulario(aFormulario(p));
      } else {
        setErrorCarga('No se pudieron cargar los parámetros. Revisa la conexión con el servidor.');
      }
    });
    return () => {
      vigente = false;
    };
  }, []);

  const parametros = useMemo(() => (formulario ? aParametros(formulario) : null), [formulario]);
  const errores = useMemo(() => (parametros ? validarParametros(parametros) : {}), [parametros]);
  const hayErrores = Object.keys(errores).length > 0;
  const hayCambios = !!guardados && !!formulario && JSON.stringify(aFormulario(guardados)) !== JSON.stringify(formulario);

  if (!formulario || !parametros) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-600" role="status">
        {errorCarga ?? 'Cargando configuración…'}
      </div>
    );
  }

  const visible = (clave: string) => intentoGuardar || tocados.has(clave);
  const tocar = (clave: string) => setTocados((previos) => new Set(previos).add(clave));
  const fijar = (cambio: (f: Formulario) => Formulario) => setFormulario((f) => (f ? cambio(structuredClone(f)) : f));

  const tomarGuardados = (p: ParametrosDominioApi) => {
    setGuardados(p);
    setFormulario(aFormulario(p));
    setTocados(new Set());
    setIntentoGuardar(false);
  };

  const guardar = async () => {
    setIntentoGuardar(true);
    if (hayErrores) return;
    setEnCurso(true);
    setErrorApi(null);
    try {
      tomarGuardados(await guardarParametrosDominio(parametros));
      setPendienteDiaADia(true);
      avisar({ texto: 'Parámetros guardados: rigen para las simulaciones nuevas.' });
    } catch (e) {
      setErrorApi(e instanceof ErrorDeApi ? e.message : 'No se pudieron guardar los parámetros.');
    } finally {
      setEnCurso(false);
    }
  };

  const confirmar = async () => {
    setEnCurso(true);
    setErrorConfirmacion(null);
    try {
      if (confirmacion === 'restablecer') {
        tomarGuardados(await restablecerParametrosDominio());
        setPendienteDiaADia(true);
        avisar({ texto: 'Se restablecieron los valores por defecto.' });
      } else {
        await clienteApi.reiniciarDiaADia();
        setPendienteDiaADia(false);
        avisar({ texto: 'La operación día a día se reinició con los parámetros vigentes.' });
      }
      setConfirmacion(null);
    } catch (e) {
      setErrorConfirmacion(e instanceof ErrorDeApi ? e.message : 'No se pudo completar la acción. Inténtalo de nuevo.');
    } finally {
      setEnCurso(false);
    }
  };

  const ubicaciones = parametros.almacenes.map((a, i) => ({
    codigo: a.codigo,
    nombre: ALMACENES[i]?.nombreCorto ?? a.codigo,
    valida: !errores[`almacenes.${i}.x`] && !errores[`almacenes.${i}.y`],
    punto: { x: a.x, y: a.y },
  }));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 flex flex-col gap-4">
        <header>
          <h1 className="text-base font-bold text-slate-800">Configuración</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Los cambios rigen para las simulaciones que se creen después de guardar; las que están en curso conservan sus valores. La operación día a día los
            toma al aplicarlos.
          </p>
        </header>

        {pendienteDiaADia && (
          <div className="flex flex-wrap items-center gap-3 rounded-[8px] border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs text-[#1E40AF]" role="status">
            <span className="flex-1 min-w-[200px]">La operación día a día sigue con los parámetros anteriores hasta que los apliques.</span>
            <button
              type="button"
              onClick={() => setConfirmacion('aplicar')}
              className="h-8 px-3 rounded-[6px] bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Aplicar a la operación día a día
            </button>
          </div>
        )}

        <Tarjeta titulo="Almacenes" codigo="almacenes" descripcion="Ubicación en la malla de 70 × 50 km y capacidad diaria de los intermedios. El central no tiene tope.">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            <div className="flex flex-col gap-3">
              {parametros.almacenes.map((a, i) => (
                <div key={a.codigo} className="grid grid-cols-[110px_1fr_1fr_1.4fr] gap-2 items-start">
                  <span className="text-[13px] font-semibold text-slate-800 pt-6">{ALMACENES[i]?.nombre ?? a.codigo}</span>
                  {(['x', 'y'] as const).map((eje) => (
                    <Campo
                      key={eje}
                      id={`almacen-${i}-${eje}`}
                      etiqueta={eje.toUpperCase()}
                      sufijo="km"
                      valor={formulario.almacenes[i][eje]}
                      error={errores[`almacenes.${i}.${eje}`]}
                      visible={visible(`almacenes.${i}.${eje}`)}
                      onCambiar={(v) => fijar((f) => ((f.almacenes[i][eje] = v), f))}
                      onSalir={() => tocar(`almacenes.${i}.${eje}`)}
                    />
                  ))}
                  {a.codigo === 'CENTRAL' ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-slate-600">Capacidad</span>
                      <span className="h-8 flex items-center text-[13px] text-slate-600">Ilimitada</span>
                    </div>
                  ) : (
                    <Campo
                      id={`almacen-${i}-capacidad`}
                      etiqueta="Capacidad"
                      sufijo="paquetes"
                      valor={formulario.almacenes[i].capacidad}
                      error={errores[`almacenes.${i}.capacidad`]}
                      visible={visible(`almacenes.${i}.capacidad`)}
                      onCambiar={(v) => fijar((f) => ((f.almacenes[i].capacidad = v), f))}
                      onSalir={() => tocar(`almacenes.${i}.capacidad`)}
                    />
                  )}
                </div>
              ))}
            </div>
            <MiniMapaMalla alto={200} margen={24} etiqueta="Vista previa de la ubicación de los almacenes en la malla">
              {(vista) => (
                <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
                  {ubicaciones
                    .filter((u) => u.valida)
                    .map((u) => {
                      const { x, y } = proyectar(vista, u.punto);
                      return (
                        <g key={u.codigo}>
                          <rect x={x - 6} y={y - 6} width={12} height={12} rx={2} fill={u.codigo === 'CENTRAL' ? '#1E40AF' : '#0F766E'} stroke="#fff" strokeWidth={1.5} />
                          <text x={x} y={y + 18} textAnchor="middle" fontSize={10} fontWeight={600} fill="#0F172A">
                            {u.nombre}
                          </text>
                        </g>
                      );
                    })}
                </svg>
              )}
            </MiniMapaMalla>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Unidades de transporte" codigo="unidades" descripcion="Capacidad, velocidad y costo por km de cada tipo. La cantidad de cada tipo se elige al crear la simulación.">
          <div className="flex flex-col gap-3">
            {parametros.unidades.map((u, i) => (
              <div key={u.tipo} className="grid grid-cols-[110px_1fr_1fr_1fr] gap-2 items-start">
                <span className="text-[13px] font-semibold text-slate-800 pt-6">{NOMBRE_UNIDAD[u.tipo]}</span>
                <Campo
                  id={`unidad-${i}-capacidad`}
                  etiqueta="Capacidad"
                  sufijo="paq."
                  valor={formulario.unidades[i].capacidad}
                  error={errores[`unidades.${i}.capacidad`]}
                  visible={visible(`unidades.${i}.capacidad`)}
                  onCambiar={(v) => fijar((f) => ((f.unidades[i].capacidad = v), f))}
                  onSalir={() => tocar(`unidades.${i}.capacidad`)}
                />
                <Campo
                  id={`unidad-${i}-velocidad`}
                  etiqueta="Velocidad"
                  sufijo="km/h"
                  valor={formulario.unidades[i].velocidadKmH}
                  error={errores[`unidades.${i}.velocidadKmH`]}
                  visible={visible(`unidades.${i}.velocidadKmH`)}
                  onCambiar={(v) => fijar((f) => ((f.unidades[i].velocidadKmH = v), f))}
                  onSalir={() => tocar(`unidades.${i}.velocidadKmH`)}
                />
                <Campo
                  id={`unidad-${i}-costo`}
                  etiqueta="Costo por km"
                  sufijo="S/"
                  valor={formulario.unidades[i].costoPorKm}
                  error={errores[`unidades.${i}.costoPorKm`]}
                  visible={visible(`unidades.${i}.costoPorKm`)}
                  onCambiar={(v) => fijar((f) => ((f.unidades[i].costoPorKm = v), f))}
                  onSalir={() => tocar(`unidades.${i}.costoPorKm`)}
                />
              </div>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta
          titulo="Averías"
          codigo="averias"
          descripcion="Duraciones en minutos. El tipo 2 vuelve al terminar el turno siguiente al de la avería; el instante de cada avería se elige al registrarla."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CAMPOS_AVERIA.map(({ campo, etiqueta, ayuda }) => {
              const minutos = parametros.averias[campo];
              const legible = Number.isInteger(minutos) && minutos > 0 ? ` (${formatearDuracion(minutos)})` : '';
              return (
                <Campo
                  key={campo}
                  id={`averia-${campo}`}
                  etiqueta={etiqueta}
                  sufijo="min"
                  ayuda={`${ayuda}${legible}`}
                  valor={formulario.averias[campo]}
                  error={errores[`averias.${campo}`]}
                  visible={visible(`averias.${campo}`)}
                  onCambiar={(v) => fijar((f) => ((f.averias[campo] = v), f))}
                  onSalir={() => tocar(`averias.${campo}`)}
                />
              );
            })}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Semáforo" codigo="semaforo" descripcion="Rangos de vacío, verde, ámbar y rojo de unidades y almacenes, y los de holgura y stock bajo. Rigen al instante en todas las pantallas.">
          <button
            type="button"
            onClick={() => setSemaforoAbierto(true)}
            className="h-8 px-3 rounded-[6px] border border-[#CBD5E1] text-[13px] font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            Configurar rangos
          </button>
        </Tarjeta>

        <footer className="sticky bottom-0 bg-[#F8FAFC]/95 backdrop-blur border-t border-[#E2E8F0] -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2">
          {errorApi && (
            <p role="alert" className="basis-full border-l-[3px] border-[#B91C1C] pl-2 text-xs text-[#B91C1C]">
              {errorApi}
            </p>
          )}
          {intentoGuardar && hayErrores && (
            <p role="alert" className="text-xs text-[#B91C1C]">
              Corrige los campos marcados antes de guardar.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setConfirmacion('restablecer');
              setErrorConfirmacion(null);
            }}
            disabled={enCurso}
            className="h-8 px-3 rounded-[6px] text-[13px] font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Restablecer valores por defecto
          </button>
          <button
            type="button"
            onClick={() => guardados && tomarGuardados(guardados)}
            disabled={!hayCambios || enCurso}
            className="ml-auto h-8 px-3 rounded-[6px] border border-[#CBD5E1] text-[13px] font-medium text-slate-800 hover:bg-white disabled:opacity-50"
          >
            Descartar cambios
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={!hayCambios || enCurso}
            className="h-8 px-3 rounded-[6px] bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-[13px] font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            {enCurso && !confirmacion ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </footer>
      </div>

      <DialogoConfirmacion
        abierto={confirmacion !== null}
        titulo={confirmacion === 'aplicar' ? '¿Aplicar a la operación día a día?' : '¿Restablecer los valores por defecto?'}
        descripcion={
          confirmacion === 'aplicar'
            ? 'La operación se reinicia desde el minuto actual con los parámetros vigentes: todas las unidades parten del almacén central y los pedidos registrados se replanifican.'
            : 'Se descartan los almacenes, unidades y averías configurados y rigen otra vez los valores originales para las simulaciones nuevas.'
        }
        textoConfirmar={confirmacion === 'aplicar' ? 'Aplicar y reiniciar' : 'Restablecer'}
        textoEnCurso={confirmacion === 'aplicar' ? 'Reiniciando…' : 'Restableciendo…'}
        enCurso={enCurso}
        error={errorConfirmacion}
        onConfirmar={confirmar}
        onCancelar={() => setConfirmacion(null)}
      />
      {semaforoAbierto && <DialogoRangosSemaforo onCerrar={() => setSemaforoAbierto(false)} />}
    </div>
  );
};
