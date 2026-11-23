import React, { useCallback, useId, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  AYUDA_RESUMEN_EN_ESPERA,
  AYUDA_RESUMEN_EN_PLAZO,
  AYUDA_RESUMEN_EN_RUTA,
  AYUDA_RESUMEN_EN_TRANSITO,
  MAS_DEL_RESUMEN,
  PANELES_DEL_MAPA,
  RESUMEN_EN_ESPERA,
  RESUMEN_EN_PLAZO,
  RESUMEN_EN_RUTA,
  RESUMEN_EN_TRANSITO,
  RESUMEN_OPERACION,
  SIN_DATO,
  VER_MAS_DEL_RESUMEN,
} from '../../config/glosario';
import { useCierreDePopover } from '../../hooks/useCierreDePopover';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { TITULO_PESTANA } from '../../hooks/useNavegacionPanel';
import { formatearNumero } from '../../lib/formato';
import { metricasResumen } from '../../lib/resumen';
import type { ConfiguracionCorrida } from '../../types/simulacion';
import { DetalleResumen } from '../resumen/DetalleResumen';
import {
  AIRE_FLOTANTE_PX,
  ALTO_PILA_CON_RESUMEN_PX,
  ALTO_RESUMEN_PX,
  ALTO_TARJETA_PX,
  TARJETA_FLOTANTE,
  type UbicacionResumen,
} from './estilosMapa';

// Franja de resumen sobre el mapa: cuatro métricas (en plazo, en tránsito, en espera y en ruta) siempre a la
// vista, y un desplegable debajo con el resto (entregados, flota, próxima llegada y, en una simulación, cómo
// corre). Va en el centro de arriba, entre la pila de la izquierda y las herramientas; donde no cabe, dentro
// de la pila. Con el mapa angosto lleva solo dos métricas.

interface ResumenMapaProps {
  ubicacion: UbicacionResumen;
  abierto: boolean;
  onAlternar: (abierto: boolean) => void;
  /** Alto del mapa y de la hoja inferior abierta (0 si no hay): el desplegable se detiene 12 px sobre ella. */
  altoMapaPx: number;
  altoHojaPx: number;
  /** La pila de la izquierda va reducida: dice dónde empieza el desplegable cuando la franja va dentro de ella. */
  reducida: boolean;
  /** Solo en una simulación: con qué configuración corre. */
  simulacion?: ConfiguracionCorrida;
  /** La ficha de unidades en ruta abre Flota. */
  onAbrirFlota?: () => void;
}

export const ResumenMapa: React.FC<ResumenMapaProps> = ({ ubicacion, abierto, onAlternar, altoMapaPx, altoHojaPx, reducida, simulacion, onAbrirFlota }) => {
  const idDesplegable = useId();
  const raizRef = useRef<HTMLElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const m = metricasResumen(useDatosOperacion());

  // Escape cierra y devuelve el foco al botón; tocar fuera también (sin mover el foco). Un toque en el botón de
  // alguna herramienta cuenta como "fuera": abrir una herramienta cierra el desplegable.
  const esPropio = useCallback((destino: Element) => !!raizRef.current?.contains(destino), []);
  const alCerrar = useCallback(
    (motivo: 'escape' | 'fuera') => {
      onAlternar(false);
      if (motivo === 'escape') botonRef.current?.focus();
    },
    [onAlternar],
  );
  useCierreDePopover(abierto, esPropio, alCerrar);

  // La ficha de unidades en ruta abre Flota y el desplegable se cierra con el foco dentro: se lleva a la pestaña
  // Flota del panel (cuando ya se pintó) y, mientras tanto o si no hay panel, al botón de la franja.
  const abrirFlota = () => {
    onAlternar(false);
    onAbrirFlota?.();
    botonRef.current?.focus();
    queueMicrotask(() => {
      const pestanas = document.querySelectorAll<HTMLElement>(`[role="tablist"][aria-label="${PANELES_DEL_MAPA}"] [role="tab"]`);
      [...pestanas].find((p) => p.textContent?.startsWith(TITULO_PESTANA.flota))?.focus();
    });
  };

  const metricas = [
    { clave: 'plazo', etiqueta: RESUMEN_EN_PLAZO, valor: m.porcentajeEnPlazo === null ? SIN_DATO : `${formatearNumero(m.porcentajeEnPlazo, 1)} %`, ayuda: AYUDA_RESUMEN_EN_PLAZO, corta: true },
    { clave: 'transito', etiqueta: RESUMEN_EN_TRANSITO, valor: String(m.resumen.enRuta), ayuda: AYUDA_RESUMEN_EN_TRANSITO, corta: false },
    { clave: 'espera', etiqueta: RESUMEN_EN_ESPERA, valor: String(m.resumen.enEspera), ayuda: AYUDA_RESUMEN_EN_ESPERA, corta: false },
    { clave: 'ruta', etiqueta: RESUMEN_EN_RUTA, valor: `${m.flota.enRuta} de ${m.flota.total}`, ayuda: AYUDA_RESUMEN_EN_RUTA, corta: true },
  ].filter((metrica) => ubicacion.metricas === 4 || metrica.corta);

  const enCentro = ubicacion.donde === 'centro';
  // Dónde empieza el desplegable: bajo la franja o, dentro de la pila, bajo el buscador y las alertas.
  const inicioDesplegablePx = enCentro
    ? AIRE_FLOTANTE_PX + ALTO_RESUMEN_PX + 8
    : ALTO_PILA_CON_RESUMEN_PX + 8 + (reducida ? 0 : ALTO_TARJETA_PX);
  const alturaMaxima = Math.max(ALTO_TARJETA_PX * 3, altoMapaPx - inicioDesplegablePx - AIRE_FLOTANTE_PX - altoHojaPx);

  return (
    <section
      ref={raizRef}
      aria-label={RESUMEN_OPERACION}
      data-sin-zoom
      className={`cursor-default ${enCentro ? 'absolute top-3 z-10' : 'relative'}`}
      style={enCentro ? { left: ubicacion.izquierdaPx, width: ubicacion.anchoPx } : undefined}
    >
      <div className={`flex overflow-hidden ${TARJETA_FLOTANTE}`} style={{ height: ALTO_RESUMEN_PX }}>
        <dl className="flex flex-1 min-w-0 divide-x divide-neutral-200">
          {metricas.map(({ clave, etiqueta, valor, ayuda }) => (
            <div key={clave} title={ayuda} className="flex-1 min-w-0 px-2 flex flex-col items-center justify-center">
              <dt className="max-w-full truncate font-sans text-caption leading-4 text-neutral-600">{etiqueta}</dt>
              <dd className="max-w-full truncate text-title-sm tabular-nums leading-5 text-neutral-900">{valor}</dd>
            </div>
          ))}
        </dl>
        <button
          ref={botonRef}
          type="button"
          onClick={() => onAlternar(!abierto)}
          aria-label={VER_MAS_DEL_RESUMEN}
          title={VER_MAS_DEL_RESUMEN}
          aria-expanded={abierto}
          aria-controls={abierto ? idDesplegable : undefined}
          className="size-11 shrink-0 flex items-center justify-center border-l border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
        >
          <ChevronDown className={`size-4 transition-transform ${abierto ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {abierto && (
        <div
          id={idDesplegable}
          role="region"
          aria-label={MAS_DEL_RESUMEN}
          className={`absolute left-0 right-0 top-full mt-2 p-3 flex flex-col gap-2 overflow-y-auto ${TARJETA_FLOTANTE}`}
          style={{ maxHeight: alturaMaxima }}
        >
          <DetalleResumen
            simulacion={simulacion}
            onAbrirFlota={onAbrirFlota && abrirFlota}
          />
        </div>
      )}
    </section>
  );
};
