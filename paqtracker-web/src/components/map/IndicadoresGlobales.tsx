import React from 'react';
import { NOMBRE_CARGA } from '../../config/glosario';
import type { OcupacionGlobal } from '../../lib/operacion';
import { TEXTO_SEMAFORO } from '../../lib/semaforo';
import { MarcaSemaforo } from './simbolos';

// Indicadores globales sobre el mapa (G01–G04): ocupación de la flota y de los almacenes en conjunto, con
// el semáforo + vacío en color y forma. Van en una sola tarjeta, aparte de las píldoras de acción, y cada
// uno abre su detalle. No dependen de los filtros del mapa: miden el conjunto.

interface IndicadorProps {
  etiqueta: string;
  ocupacion: OcupacionGlobal;
  /** Qué mide, para el tooltip y el lector de pantalla. */
  descripcion: string;
  sinDatos: string;
  onAbrir?: () => void;
}

const Indicador: React.FC<IndicadorProps> = ({ etiqueta, ocupacion, descripcion, sinDatos, onAbrir }) => {
  const { nivel, fraccion } = ocupacion;
  const porcentaje = fraccion === null ? null : Math.round(fraccion * 100);
  const lectura =
    porcentaje === null || !nivel
      ? `${etiqueta}: ${sinDatos}`
      : `${etiqueta}: ${porcentaje} %, ${NOMBRE_CARGA[nivel].toLowerCase()} (${ocupacion.cantidad} de ${ocupacion.capacidad})`;
  const contenido = (
    <>
      <span className="text-caption text-neutral-600 font-sans">{etiqueta}</span>
      {porcentaje === null || !nivel ? (
        <span className="text-body-sm text-neutral-600">—</span>
      ) : (
        <span className="flex items-center gap-1">
          <MarcaSemaforo nivel={nivel} />
          <span className={`tabular-nums font-semibold text-body ${TEXTO_SEMAFORO[nivel]}`}>{porcentaje} %</span>
        </span>
      )}
    </>
  );
  const clase = 'h-full px-3 flex items-center gap-2';
  return onAbrir ? (
    <button type="button" onClick={onAbrir} aria-label={`${lectura}. ${descripcion}. Ver detalle`} title={descripcion} className={`${clase} hover:bg-neutral-50`}>
      {contenido}
    </button>
  ) : (
    <div role="group" aria-label={`${lectura}. ${descripcion}`} title={descripcion} className={clase}>
      {contenido}
    </div>
  );
};

interface IndicadoresGlobalesProps {
  flota: OcupacionGlobal;
  almacenes: OcupacionGlobal;
  onAbrirFlota?: () => void;
  onAbrirAlmacenes?: () => void;
}

export const IndicadoresGlobales: React.FC<IndicadoresGlobalesProps> = ({ flota, almacenes, onAbrirFlota, onAbrirAlmacenes }) => (
  <section
    aria-label="Ocupación global"
    className="h-8 bg-white shadow-xs rounded-full border border-neutral-200 flex items-center overflow-hidden"
  >
    <Indicador
      etiqueta="Flota"
      ocupacion={flota}
      descripcion="Paquetes a bordo sobre la capacidad de las unidades fuera del almacén"
      sinDatos="sin unidades fuera"
      onAbrir={onAbrirFlota}
    />
    <span className="w-px h-4 bg-neutral-200" aria-hidden="true" />
    <Indicador
      etiqueta="Almacenes"
      ocupacion={almacenes}
      descripcion="Stock total de los almacenes intermedios sobre su capacidad total"
      sinDatos="sin datos de stock"
      onAbrir={onAbrirAlmacenes}
    />
  </section>
);
