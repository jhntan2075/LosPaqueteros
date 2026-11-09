import React, { useEffect, useRef, useState } from 'react';
import { NOMBRE_RANGO, RANGOS_POR_DEFECTO, validarRangos } from '../../config/rangosSemaforo';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { useFocoAtrapado } from '../../hooks/useFocoAtrapado';
import { useGuardarRangosSemaforo, useRangosSemaforo } from '../../hooks/useRangosSemaforo';
import type { RangosSemaforoApi } from '../../types/api';
import { Aviso, Boton, Entrada } from '../ui';

// Configuración de los rangos del semáforo (punto 6 de la evaluación). El operador los escribe en
// porcentaje; la API los guarda como fracciones y, al aceptarlos, rigen de inmediato en el mapa, los
// paneles y la leyenda, sin reiniciar.

type Grupo = keyof RangosSemaforoApi;
type Umbral = 'vacio' | 'ambar' | 'rojo';

/** Un campo de texto por umbral, en porcentaje: "15" es 15 %. */
type Formulario = Record<Grupo, Partial<Record<Umbral, string>>>;

interface CampoUmbral {
  umbral: Umbral;
  etiqueta: string;
}

interface DefinicionGrupo {
  grupo: Grupo;
  mide: string;
  campos: CampoUmbral[];
}

const POR_DEBAJO: CampoUmbral[] = [
  { umbral: 'rojo', etiqueta: 'Rojo por debajo de' },
  { umbral: 'ambar', etiqueta: 'Ámbar por debajo de' },
];

const CARGA: CampoUmbral[] = [
  { umbral: 'vacio', etiqueta: 'Vacío hasta' },
  { umbral: 'ambar', etiqueta: 'Ámbar desde' },
  { umbral: 'rojo', etiqueta: 'Rojo desde' },
];

const GRUPOS: DefinicionGrupo[] = [
  { grupo: 'holgura', mide: 'Holgura restante sobre el plazo del pedido. Sobre el ámbar es verde.', campos: POR_DEBAJO },
  { grupo: 'inventario', mide: 'Stock de un intermedio sobre su capacidad: alerta de stock bajo.', campos: POR_DEBAJO },
  { grupo: 'ocupacionUnidad', mide: 'Carga de la unidad sobre su capacidad. 0 en vacío = solo sin carga.', campos: CARGA },
  { grupo: 'ocupacionAlmacen', mide: 'Stock de un intermedio sobre su capacidad (rojo = lleno).', campos: CARGA },
];

const aTexto = (fraccion: number) => String(Math.round(fraccion * 1000) / 10);
const aFraccion = (texto: string | undefined) =>
  texto === undefined || texto.trim() === '' ? Number.NaN : Number(texto.replace(',', '.')) / 100;

function aFormulario(rangos: RangosSemaforoApi): Formulario {
  const formulario = {} as Formulario;
  for (const { grupo, campos } of GRUPOS) {
    const cortes = rangos[grupo] as Partial<Record<Umbral, number>>;
    formulario[grupo] = Object.fromEntries(campos.map(({ umbral }) => [umbral, aTexto(cortes[umbral] ?? 0)]));
  }
  return formulario;
}

function aRangos(formulario: Formulario): RangosSemaforoApi {
  const porDebajo = (grupo: 'holgura' | 'inventario') => ({
    rojo: aFraccion(formulario[grupo].rojo),
    ambar: aFraccion(formulario[grupo].ambar),
  });
  const carga = (grupo: 'ocupacionUnidad' | 'ocupacionAlmacen') => ({
    vacio: aFraccion(formulario[grupo].vacio),
    ambar: aFraccion(formulario[grupo].ambar),
    rojo: aFraccion(formulario[grupo].rojo),
  });
  return {
    holgura: porDebajo('holgura'),
    inventario: porDebajo('inventario'),
    ocupacionUnidad: carga('ocupacionUnidad'),
    ocupacionAlmacen: carga('ocupacionAlmacen'),
  };
}

interface DialogoRangosSemaforoProps {
  onCerrar: () => void;
}

/** Se monta solo mientras está abierto, para tomar el foco al abrir y devolverlo al cerrar. */
export const DialogoRangosSemaforo: React.FC<DialogoRangosSemaforoProps> = ({ onCerrar }) => {
  const vigentes = useRangosSemaforo();
  const { guardar, enCurso, error } = useGuardarRangosSemaforo();
  const [formulario, setFormulario] = useState<Formulario>(() => aFormulario(vigentes));
  const [intentado, setIntentado] = useState(false);
  const dialogo = useRef<HTMLFormElement>(null);
  const primerCampo = useRef<HTMLInputElement>(null);
  useCerrarConEscape(!enCurso, onCerrar);
  useFocoAtrapado(dialogo);
  useEffect(() => {
    primerCampo.current?.focus();
  }, []);

  const errores = validarRangos(aRangos(formulario));
  const mostrarErrores = intentado && errores.length > 0;

  const manejarCambio = (grupo: Grupo, umbral: Umbral, valor: string) =>
    setFormulario((actual) => ({ ...actual, [grupo]: { ...actual[grupo], [umbral]: valor } }));

  const manejarEnvio = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setIntentado(true);
    if (errores.length > 0) return;
    if (await guardar(aRangos(formulario))) onCerrar();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-4">
      <form
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-rangos-titulo"
        onSubmit={manejarEnvio}
        noValidate
        className="bg-white rounded-card shadow-overlay border border-neutral-200 w-full max-w-[520px] max-h-[90vh] overflow-y-auto p-5 flex flex-col gap-3 font-sans"
      >
        <div>
          <h2 id="dialogo-rangos-titulo" className="text-title text-neutral-900">
            Rangos del semáforo
          </h2>
          <p className="text-body-sm text-neutral-600">
            En porcentaje. Se guardan en el servidor y rigen de inmediato para todos, sin reiniciar.
          </p>
        </div>

        {GRUPOS.map(({ grupo, mide, campos }, indiceGrupo) => (
          <fieldset key={grupo} className="border border-neutral-200 rounded-card px-3 pt-1.5 pb-2.5">
            <legend className="px-1 font-semibold text-body text-neutral-900">{NOMBRE_RANGO[grupo]}</legend>
            <p className="text-caption text-neutral-600 mb-1.5">{mide}</p>
            <div className="grid grid-cols-3 gap-2">
              {campos.map(({ umbral, etiqueta }, indiceCampo) => (
                <label key={umbral} className="flex flex-col gap-0.5 text-body-sm font-medium text-neutral-700">
                  {etiqueta}
                  <span className="flex items-center gap-1">
                    <Entrada
                      ref={indiceGrupo === 0 && indiceCampo === 0 ? primerCampo : undefined}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="any"
                      value={formulario[grupo][umbral] ?? ''}
                      onChange={(evento) => manejarCambio(grupo, umbral, evento.target.value)}
                      aria-label={`${NOMBRE_RANGO[grupo]}: ${etiqueta.toLowerCase()} (%)`}
                      className="tabular-nums font-normal"
                    />
                    <span aria-hidden="true">%</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {mostrarErrores && (
          <Aviso tono="critical" role="alert">
            <ul className="list-none">
              {errores.map((mensaje) => (
                <li key={mensaje}>{mensaje}</li>
              ))}
            </ul>
          </Aviso>
        )}
        {error && (
          <Aviso tono="critical" role="alert">
            {error}
          </Aviso>
        )}

        <div className="mt-1 flex flex-wrap justify-between gap-2">
          <Boton variante="fantasma" onClick={() => setFormulario(aFormulario(RANGOS_POR_DEFECTO))} disabled={enCurso} className="underline">
            Valores por defecto
          </Boton>
          <div className="flex gap-2">
            <Boton variante="secundario" onClick={onCerrar} disabled={enCurso}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" cargando={enCurso} textoCargando="Guardando…">
              Guardar rangos
            </Boton>
          </div>
        </div>
      </form>
    </div>
  );
};
