import React from 'react';
import { NOMBRE_CARGA, NOMBRE_STOCK } from '../../config/glosario';
import type { NivelCarga } from '../../lib/semaforo';
import type { OcupacionGlobal } from '../../lib/operacion';
import { TEXTO_SEMAFORO } from '../../lib/semaforo';
import { TARJETA_FLOTANTE } from './estilosMapa';
import { MarcaSemaforo } from './simbolos';

// Indicadores globales del mapa (G01–G04): carga de la flota y stock de los almacenes en conjunto, con el
// semáforo + vacío en color y forma. Van en una fila compacta sobre el mapa, bajo las alertas, y cada uno
// abre su detalle. No dependen de los filtros del mapa: miden el conjunto.

interface IndicadorProps {
  etiqueta: string;
  ocupacion: OcupacionGlobal;
  /** Qué mide, para el tooltip y el lector de pantalla. */
  descripcion: string;
  sinDatos: string;
  /** Nombre de cada nivel: la carga y el stock leen el color al revés. */
  nombres: Record<NivelCarga, string>;
  onAbrir?: () => void;
}

const Indicador: React.FC<IndicadorProps> = ({ etiqueta, ocupacion, descripcion, sinDatos, nombres, onAbrir }) => {
  const { nivel, fraccion } = ocupacion;
  const porcentaje = fraccion === null ? null : Math.round(fraccion * 100);
  const lectura =
    porcentaje === null || !nivel
      ? `${etiqueta}: ${sinDatos}`
      : `${etiqueta}: ${porcentaje} %, ${nombres[nivel].toLowerCase()} (${ocupacion.cantidad} de ${ocupacion.capacidad})`;
  const contenido = (
    <>
      <span className="text-caption text-neutral-600 font-sans leading-4">{etiqueta}</span>
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
  const clase = 'w-full min-h-11 px-3 py-1 flex flex-col items-start justify-center text-left';
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
    className={`grid grid-cols-2 divide-x divide-neutral-200 overflow-hidden cursor-default ${TARJETA_FLOTANTE}`}
  >
    <Indicador
      etiqueta="Carga de flota"
      ocupacion={flota}
      descripcion="Paquetes a bordo sobre la capacidad de las unidades fuera del almacén"
      sinDatos="sin unidades fuera"
      nombres={NOMBRE_CARGA}
      onAbrir={onAbrirFlota}
    />
    <Indicador
      etiqueta="Stock de almacenes"
      ocupacion={almacenes}
      descripcion="Stock total de los almacenes intermedios sobre su capacidad total"
      sinDatos="sin datos de stock"
      nombres={NOMBRE_STOCK}
      onAbrir={onAbrirAlmacenes}
    />
  </section>
);
