import React, { useEffect, useRef, useState } from 'react';
import { NOMBRE_RANGO, RANGOS_POR_DEFECTO, validarRangos } from '../../config/rangosSemaforo';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { useFocoAtrapado } from '../../hooks/useFocoAtrapado';
import { useGuardarRangosSemaforo, useRangosSemaforo } from '../../hooks/useRangosSemaforo';
import type { RangosSemaforoApi } from '../../types/api';

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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 leading-[normal]">
      <form
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-rangos-titulo"
        onSubmit={manejarEnvio}
        noValidate
        className="bg-white rounded-[10px] shadow-2xl border border-[#E2E8F0] w-full max-w-[520px] max-h-[90vh] overflow-y-auto p-[20px] flex flex-col gap-[12px] font-sans"
      >
        <div>
          <h2 id="dialogo-rangos-titulo" className="font-semibold text-[16px] text-[#0F172A]">
            Rangos del semáforo
          </h2>
          <p className="text-[12px] text-[#64748B]">
            En porcentaje. Se guardan en el servidor y rigen de inmediato para todos, sin reiniciar.
          </p>
        </div>

        {GRUPOS.map(({ grupo, mide, campos }, indiceGrupo) => (
          <fieldset key={grupo} className="border border-[#E2E8F0] rounded-[8px] px-[12px] pt-[6px] pb-[10px]">
            <legend className="px-[4px] font-semibold text-[13px] text-[#0F172A]">{NOMBRE_RANGO[grupo]}</legend>
            <p className="text-[11px] text-[#64748B] mb-[6px]">{mide}</p>
            <div className="grid grid-cols-3 gap-[8px]">
              {campos.map(({ umbral, etiqueta }, indiceCampo) => (
                <label key={umbral} className="flex flex-col gap-[2px] text-[12px] text-[#334155]">
                  {etiqueta}
                  <span className="flex items-center gap-[4px]">
                    <input
                      ref={indiceGrupo === 0 && indiceCampo === 0 ? primerCampo : undefined}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="any"
                      value={formulario[grupo][umbral] ?? ''}
                      onChange={(evento) => manejarCambio(grupo, umbral, evento.target.value)}
                      aria-label={`${NOMBRE_RANGO[grupo]}: ${etiqueta.toLowerCase()} (%)`}
                      className="w-full h-[30px] px-[8px] rounded-[6px] border border-[#CBD5E1] tabular-nums text-[13px] text-[#0F172A]"
                    />
                    <span aria-hidden="true">%</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {mostrarErrores && (
          <ul role="alert" className="border-l-[3px] border-[#B91C1C] pl-[9px] text-[12px] text-[#B91C1C] list-none">
            {errores.map((mensaje) => (
              <li key={mensaje}>{mensaje}</li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="border-l-[3px] border-[#B91C1C] pl-[9px] text-[12px] text-[#B91C1C]">
            {error}
          </p>
        )}

        <div className="mt-[4px] flex flex-wrap justify-between gap-[8px]">
          <button
            type="button"
            onClick={() => setFormulario(aFormulario(RANGOS_POR_DEFECTO))}
            disabled={enCurso}
            className="h-[34px] px-[12px] rounded-[6px] text-[13px] text-[#334155] underline hover:text-[#0F172A] disabled:opacity-50"
          >
            Valores por defecto
          </button>
          <div className="flex gap-[8px]">
            <button
              type="button"
              onClick={onCerrar}
              disabled={enCurso}
              className="h-[34px] px-[14px] rounded-[6px] border border-[#CBD5E1] font-medium text-[13px] text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enCurso}
              className="h-[34px] px-[14px] rounded-[6px] bg-[#0F172A] hover:bg-[#1E293B] font-semibold text-[13px] text-white disabled:opacity-60"
            >
              {enCurso ? 'Guardando…' : 'Guardar rangos'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
