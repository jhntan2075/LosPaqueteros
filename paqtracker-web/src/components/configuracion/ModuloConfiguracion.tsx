import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Save, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { ALMACENES, formatearDuracion } from '../../config/dominio';
import { useAnchoAngosto } from '../../hooks/useAnchoAngosto';
import { useAvisos } from '../../hooks/useAvisos';
import { decimalesDe, formatearNumero, leerDecimal } from '../../lib/formato';
import { proyectar } from '../../lib/malla';
import { validarParametros } from '../../lib/parametrosDominio';
import { ErrorDeApi, clienteApi } from '../../services/clienteApi';
import { cargarParametrosDominio, guardarParametrosDominio, restablecerParametrosDominio } from '../../services/servicioParametros';
import type { ParametrosAveriaApi, ParametrosDominioApi } from '../../types/api';
import { DialogoRangosSemaforo } from '../map/DialogoRangosSemaforo';
import { MiniMapaMalla } from '../map/MiniMapaMalla';
import { DialogoConfirmacion } from '../modals/DialogoConfirmacion';
import { AlmacenCentral, AlmacenIntermedio } from '../map/simbolos';
import { Aviso, Boton, Campo, EncabezadoPagina, EstadoCarga, EstadoError, Entrada, MenuAcciones, Tarjeta } from '../ui';
import type { EntradaProps } from '../ui/Campo';

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

/** Costo para el campo: dos decimales como mínimo y los que tenga de más (hasta 6), para no redondearlo en silencio. */
const formatearCosto = (valor: number) => formatearNumero(valor, Math.max(2, decimalesDe(valor)));

const aFormulario = (p: ParametrosDominioApi): Formulario => ({
  almacenes: p.almacenes.map((a) => ({ codigo: a.codigo, x: String(a.x), y: String(a.y), capacidad: a.capacidad === null ? '' : String(a.capacidad) })),
  unidades: p.unidades.map((u) => ({ tipo: u.tipo, capacidad: String(u.capacidad), velocidadKmH: String(u.velocidadKmH), costoPorKm: formatearCosto(u.costoPorKm) })),
  averias: {
    tipo1Minutos: String(p.averias.tipo1Minutos),
    permanenciaSitioMinutos: String(p.averias.permanenciaSitioMinutos),
    tipo3MinimoMinutos: String(p.averias.tipo3MinimoMinutos),
    trasvaseMinutos: String(p.averias.trasvaseMinutos),
  },
});

const numero = (texto: string) => (texto.trim() === '' ? Number.NaN : Number(texto.replace(',', '.')));

/** Los costos admiten coma o punto decimal (y el espacio de miles con que se muestran); texto inválido es NaN. */
const leerCosto = (texto: string) => leerDecimal(texto.replace(/\s/g, '')) ?? Number.NaN;

const aParametros = (f: Formulario): ParametrosDominioApi => ({
  almacenes: f.almacenes.map((a) => ({ codigo: a.codigo, x: numero(a.x), y: numero(a.y), capacidad: a.codigo === 'CENTRAL' ? null : numero(a.capacidad) })),
  unidades: f.unidades.map((u) => ({ tipo: u.tipo, capacidad: numero(u.capacidad), velocidadKmH: numero(u.velocidadKmH), costoPorKm: leerCosto(u.costoPorKm) })),
  averias: {
    tipo1Minutos: numero(f.averias.tipo1Minutos),
    permanenciaSitioMinutos: numero(f.averias.permanenciaSitioMinutos),
    tipo3MinimoMinutos: numero(f.averias.tipo3MinimoMinutos),
    trasvaseMinutos: numero(f.averias.trasvaseMinutos),
  },
});

interface CampoNumeroProps {
  id: string;
  etiqueta: string;
  valor: string;
  error?: string;
  visible: boolean;
  prefijo?: string;
  sufijo?: string;
  /** Ancho del input: w-24 para enteros, w-28 para montos. */
  ancho?: 'w-24' | 'w-28';
  ayuda?: string;
  onCambiar: (valor: string) => void;
  onSalir: () => void;
}

/**
 * Entrada con su unidad a la derecha. `Campo` pasa `aria-describedby` y `aria-invalid` a su hijo
 * directo: este envoltorio los reenvía al input para que la ayuda y el error sigan unidos a él.
 */
const EntradaConSufijo: React.FC<EntradaProps & { prefijo?: string; sufijo?: string }> = ({ prefijo, sufijo, ...resto }) => (
  <div className="flex items-center gap-1.5">
    {prefijo && <span className="shrink-0 text-caption text-neutral-600">{prefijo}</span>}
    <Entrada {...resto} />
    {sufijo && <span className="shrink-0 text-caption text-neutral-600">{sufijo}</span>}
  </div>
);

/** Campo numérico con su error debajo (se muestra al salir del campo o al intentar guardar). */
const CampoNumero: React.FC<CampoNumeroProps> = ({ id, etiqueta, valor, error, visible, prefijo, sufijo, ancho = 'w-24', ayuda, onCambiar, onSalir }) => (
  <Campo htmlFor={id} etiqueta={etiqueta} ayuda={ayuda} error={visible && error ? error : undefined}>
    <EntradaConSufijo
      id={id}
      inputMode="decimal"
      value={valor}
      onChange={(e) => onCambiar(e.target.value)}
      onBlur={onSalir}
      prefijo={prefijo}
      sufijo={sufijo}
      className={`${ancho} tabular-nums`}
    />
  </Campo>
);

/** Rótulo de la fila (nombre del almacén o de la unidad), alineado con los inputs de su derecha. */
const RotuloFila: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="col-span-2 flex h-8 items-center md:col-span-1 md:mt-5 text-body font-semibold text-neutral-900">{children}</span>
);

const CAMPOS_AVERIA: { campo: keyof ParametrosAveriaApi; etiqueta: string; ayuda: string }[] = [
  { campo: 'tipo1Minutos', etiqueta: 'Tipo 1 · detención en el lugar', ayuda: 'Luego sigue su ruta.' },
  { campo: 'permanenciaSitioMinutos', etiqueta: 'Tipo 2 y 3 · tiempo en el lugar', ayuda: 'Luego pasa al almacén central.' },
  { campo: 'tipo3MinimoMinutos', etiqueta: 'Tipo 3 · fuera de servicio (mínimo)', ayuda: 'Vuelve en el siguiente turno de las 15:00.' },
  { campo: 'trasvaseMinutos', etiqueta: 'Trasvase de carga a otra unidad', ayuda: 'En el punto de la avería.' },
];

type Confirmacion = 'restablecer' | 'aplicar' | 'descartar' | null;

const TEXTOS_CONFIRMACION = {
  aplicar: {
    titulo: '¿Aplicar a la operación día a día?',
    descripcion:
      'La operación se reinicia desde el minuto actual con los parámetros vigentes: todas las unidades parten del almacén central y los pedidos registrados se replanifican.',
    textoConfirmar: 'Aplicar y reiniciar',
  },
  restablecer: {
    titulo: '¿Restablecer los valores por defecto?',
    descripcion: 'Se descartan los almacenes, unidades y averías configurados y rigen otra vez los valores originales para las simulaciones nuevas.',
    textoConfirmar: 'Restablecer',
  },
  descartar: {
    titulo: '¿Descartar los cambios?',
    descripcion: 'Se perderán los cambios que no guardaste.',
    textoConfirmar: 'Descartar cambios',
  },
} as const;

const DESCRIPCION =
  'Los cambios rigen para las simulaciones que se creen después de guardar; las que están en curso conservan sus valores. La operación día a día los toma al aplicarlos.';

export const ModuloConfiguracion: React.FC = () => {
  const avisar = useAvisos();
  const angosto = useAnchoAngosto();
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

  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    setErrorCarga(null);
    const p = await cargarParametrosDominio();
    if (!montado.current) return;
    if (p) {
      setGuardados(p);
      setFormulario(aFormulario(p));
    } else {
      setErrorCarga('No se pudieron cargar los parámetros. Revisa la conexión con el servidor.');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const parametros = useMemo(() => (formulario ? aParametros(formulario) : null), [formulario]);
  const errores = useMemo(() => (parametros ? validarParametros(parametros) : {}), [parametros]);
  const hayErrores = Object.keys(errores).length > 0;
  const hayCambios = !!guardados && !!formulario && JSON.stringify(aFormulario(guardados)) !== JSON.stringify(formulario);

  const encabezado = <EncabezadoPagina titulo="Configuración" descripcion={DESCRIPCION} />;

  if (!formulario || !parametros) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-superficie">
        {encabezado}
        <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
          {errorCarga ? <EstadoError titulo={errorCarga} onReintentar={() => void cargar()} /> : <EstadoCarga texto="Cargando configuración…" />}
        </div>
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
    if (confirmacion === 'descartar') {
      if (guardados) tomarGuardados(guardados);
      setConfirmacion(null);
      return;
    }
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-superficie">
      {encabezado}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
          {pendienteDiaADia && (
            <Aviso
              tono="info"
              role="status"
              accion={
                <Boton variante="primario" icono={RefreshCw} onClick={() => setConfirmacion('aplicar')}>
                  Aplicar a la operación día a día
                </Boton>
              }
            >
              La operación día a día sigue con los parámetros anteriores hasta que los apliques.
            </Aviso>
          )}

          <Tarjeta
            id="config-almacenes"
            titulo="Almacenes"
            descripcion="Ubicación en la malla de 70 × 50 km y capacidad diaria de los intermedios. El central no tiene tope."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
              <div className="flex flex-col gap-3">
                {parametros.almacenes.map((a, i) => (
                  <div key={a.codigo} className="grid grid-cols-2 items-start gap-2 md:grid-cols-[110px_repeat(3,auto)] md:justify-start md:gap-x-4">
                    <RotuloFila>{ALMACENES[i]?.nombre ?? a.codigo}</RotuloFila>
                    {(['x', 'y'] as const).map((eje) => (
                      <CampoNumero
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
                        <span className="text-body-sm font-medium text-neutral-700">Capacidad</span>
                        <span className="flex h-8 items-center text-body text-neutral-600">Ilimitada</span>
                      </div>
                    ) : (
                      <CampoNumero
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
              <MiniMapaMalla margen={1} etiqueta="Vista previa de la ubicación de los almacenes en la malla">
                {(vista) => (
                  <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                    {ubicaciones
                      .filter((u) => u.valida)
                      .map((u) => {
                        const { x, y } = proyectar(vista, u.punto);
                        return (
                          <g key={u.codigo} transform={`translate(${x} ${y})`} className="text-neutral-600">
                            {u.codigo === 'CENTRAL' ? <AlmacenCentral /> : <AlmacenIntermedio color="currentColor" />}
                            <text y={26} textAnchor="middle" fontSize={10} fontWeight={600} className="fill-neutral-900">
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

          <Tarjeta
            id="config-unidades"
            titulo="Unidades de transporte"
            descripcion="Capacidad, velocidad y costo por km de cada tipo. La cantidad de cada tipo se elige al crear la simulación."
          >
            <div className="flex flex-col gap-3">
              {parametros.unidades.map((u, i) => (
                <div key={u.tipo} className="grid grid-cols-2 items-start gap-2 md:grid-cols-[110px_repeat(3,auto)] md:justify-start md:gap-x-4">
                  <RotuloFila>{NOMBRE_UNIDAD[u.tipo]}</RotuloFila>
                  <CampoNumero
                    id={`unidad-${i}-capacidad`}
                    etiqueta="Capacidad"
                    sufijo="paq."
                    valor={formulario.unidades[i].capacidad}
                    error={errores[`unidades.${i}.capacidad`]}
                    visible={visible(`unidades.${i}.capacidad`)}
                    onCambiar={(v) => fijar((f) => ((f.unidades[i].capacidad = v), f))}
                    onSalir={() => tocar(`unidades.${i}.capacidad`)}
                  />
                  <CampoNumero
                    id={`unidad-${i}-velocidad`}
                    etiqueta="Velocidad"
                    sufijo="km/h"
                    valor={formulario.unidades[i].velocidadKmH}
                    error={errores[`unidades.${i}.velocidadKmH`]}
                    visible={visible(`unidades.${i}.velocidadKmH`)}
                    onCambiar={(v) => fijar((f) => ((f.unidades[i].velocidadKmH = v), f))}
                    onSalir={() => tocar(`unidades.${i}.velocidadKmH`)}
                  />
                  <CampoNumero
                    id={`unidad-${i}-costo`}
                    etiqueta="Costo por km"
                    prefijo="S/"
                    ancho="w-28"
                    valor={formulario.unidades[i].costoPorKm}
                    error={errores[`unidades.${i}.costoPorKm`]}
                    visible={visible(`unidades.${i}.costoPorKm`)}
                    onCambiar={(v) => fijar((f) => ((f.unidades[i].costoPorKm = v), f))}
                    onSalir={() => {
                      tocar(`unidades.${i}.costoPorKm`);
                      const valor = leerCosto(formulario.unidades[i].costoPorKm);
                      if (!Number.isNaN(valor)) fijar((f) => ((f.unidades[i].costoPorKm = formatearCosto(valor)), f));
                    }}
                  />
                </div>
              ))}
            </div>
          </Tarjeta>

          <Tarjeta
            id="config-averias"
            titulo="Averías"
            descripcion="Duraciones en minutos. El tipo 2 vuelve al terminar el turno siguiente al de la avería; el instante de cada avería se elige al registrarla."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CAMPOS_AVERIA.map(({ campo, etiqueta, ayuda }) => {
                const minutos = parametros.averias[campo];
                const legible = Number.isInteger(minutos) && minutos > 0 ? ` (${formatearDuracion(minutos)})` : '';
                return (
                  <CampoNumero
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

          <Tarjeta
            id="config-semaforo"
            titulo="Semáforo"
            descripcion="Rangos de vacío, verde, ámbar y rojo de unidades y almacenes, y los de holgura y stock bajo. Rigen al instante en todas las pantallas."
          >
            <Boton variante="secundario" icono={SlidersHorizontal} onClick={() => setSemaforoAbierto(true)}>
              Configurar rangos
            </Boton>
          </Tarjeta>

          <footer className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t border-neutral-200 bg-superficie/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            {errorApi && (
              <Aviso tono="critical" role="alert" className="basis-full">
                {errorApi}
              </Aviso>
            )}
            {intentoGuardar && hayErrores && (
              <Aviso tono="critical" role="alert" compacto>
                Corrige los campos marcados antes de guardar.
              </Aviso>
            )}
            {angosto ? (
              <div className="ml-auto">
                <MenuAcciones
                  etiqueta="Más acciones"
                  direccion="arriba"
                  items={[
                    {
                      clave: 'descartar',
                      etiqueta: 'Descartar cambios',
                      disabled: !hayCambios || enCurso,
                      onSelect: () => setConfirmacion('descartar'),
                    },
                    {
                      clave: 'restablecer',
                      etiqueta: 'Restablecer valores por defecto',
                      icono: RotateCcw,
                      disabled: enCurso,
                      onSelect: () => {
                        setConfirmacion('restablecer');
                        setErrorConfirmacion(null);
                      },
                    },
                  ]}
                />
              </div>
            ) : (
              <>
                <Boton
                  variante="fantasma"
                  icono={RotateCcw}
                  onClick={() => {
                    setConfirmacion('restablecer');
                    setErrorConfirmacion(null);
                  }}
                  disabled={enCurso}
                >
                  Restablecer valores por defecto
                </Boton>
                <Boton variante="secundario" onClick={() => setConfirmacion('descartar')} disabled={!hayCambios || enCurso} className="ml-auto">
                  Descartar cambios
                </Boton>
              </>
            )}
            <Boton
              variante="primario"
              icono={Save}
              onClick={guardar}
              disabled={!hayCambios || enCurso}
              cargando={enCurso && !confirmacion}
              textoCargando="Guardando…"
            >
              Guardar cambios
            </Boton>
          </footer>
        </div>
      </div>

      <DialogoConfirmacion
        abierto={confirmacion !== null}
        titulo={TEXTOS_CONFIRMACION[confirmacion ?? 'restablecer'].titulo}
        descripcion={TEXTOS_CONFIRMACION[confirmacion ?? 'restablecer'].descripcion}
        textoConfirmar={TEXTOS_CONFIRMACION[confirmacion ?? 'restablecer'].textoConfirmar}
        tono={confirmacion === 'aplicar' ? 'normal' : 'peligro'}
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
