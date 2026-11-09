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
import { AlmacenCentral, AlmacenIntermedio } from '../map/simbolos';
import { Aviso, Boton, Campo, EncabezadoPagina, Entrada, Tarjeta } from '../ui';
import type { EntradaProps } from '../ui/Campo';
import { paleta } from '../../../tailwind.config.js';

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

interface CampoNumeroProps {
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

/**
 * Entrada con su unidad a la derecha. `Campo` pasa `aria-describedby` y `aria-invalid` a su hijo
 * directo: este envoltorio los reenvía al input para que la ayuda y el error sigan unidos a él.
 */
const EntradaConSufijo: React.FC<EntradaProps & { sufijo?: string }> = ({ sufijo, ...resto }) => (
  <div className="flex items-center gap-1.5">
    <Entrada {...resto} />
    {sufijo && <span className="shrink-0 text-caption text-neutral-600">{sufijo}</span>}
  </div>
);

/** Campo numérico con su error debajo (se muestra al salir del campo o al intentar guardar). */
const CampoNumero: React.FC<CampoNumeroProps> = ({ id, etiqueta, valor, error, visible, sufijo, ayuda, onCambiar, onSalir }) => (
  <Campo htmlFor={id} etiqueta={etiqueta} ayuda={ayuda} error={visible && error ? error : undefined}>
    <EntradaConSufijo
      id={id}
      inputMode="decimal"
      value={valor}
      onChange={(e) => onCambiar(e.target.value)}
      onBlur={onSalir}
      sufijo={sufijo}
      className="tabular-nums"
    />
  </Campo>
);

/** Rótulo de la fila (nombre del almacén o de la unidad), alineado con los inputs de su derecha. */
const RotuloFila: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="mt-5 flex h-8 items-center text-body font-semibold text-neutral-900">{children}</span>
);

const CAMPOS_AVERIA: { campo: keyof ParametrosAveriaApi; etiqueta: string; ayuda: string }[] = [
  { campo: 'tipo1Minutos', etiqueta: 'Tipo 1 · detención en el lugar', ayuda: 'Luego sigue su ruta.' },
  { campo: 'permanenciaSitioMinutos', etiqueta: 'Tipo 2 y 3 · tiempo en el lugar', ayuda: 'Luego pasa al almacén central.' },
  { campo: 'tipo3MinimoMinutos', etiqueta: 'Tipo 3 · fuera de servicio (mínimo)', ayuda: 'Vuelve en el siguiente turno de las 15:00.' },
  { campo: 'trasvaseMinutos', etiqueta: 'Trasvase de carga a otra unidad', ayuda: 'En el punto de la avería.' },
];

type Confirmacion = 'restablecer' | 'aplicar' | null;

const DESCRIPCION =
  'Los cambios rigen para las simulaciones que se creen después de guardar; las que están en curso conservan sus valores. La operación día a día los toma al aplicarlos.';

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

  const encabezado = <EncabezadoPagina titulo="Configuración" descripcion={DESCRIPCION} />;

  if (!formulario || !parametros) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        {encabezado}
        <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
          {errorCarga ? (
            <Aviso tono="critical" role="status">
              {errorCarga}
            </Aviso>
          ) : (
            <p className="text-body text-neutral-600" role="status">
              Cargando configuración…
            </p>
          )}
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
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
                  <div key={a.codigo} className="grid grid-cols-[110px_1fr_1fr_1.4fr] items-start gap-2">
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
                          <g key={u.codigo} transform={`translate(${x} ${y})`}>
                            {u.codigo === 'CENTRAL' ? <AlmacenCentral /> : <AlmacenIntermedio color={paleta.neutral[600]} />}
                            <text y={26} textAnchor="middle" fontSize={10} fontWeight={600} fill={paleta.neutral[900]}>
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
                <div key={u.tipo} className="grid grid-cols-[110px_1fr_1fr_1fr] items-start gap-2">
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

          <footer className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
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
            <Boton variante="secundario" onClick={() => guardados && tomarGuardados(guardados)} disabled={!hayCambios || enCurso} className="ml-auto">
              Descartar cambios
            </Boton>
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
