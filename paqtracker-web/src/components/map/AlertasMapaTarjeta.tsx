import React, { useId } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { ALERTAS, etiquetaEnRiesgo, textoAverias, textoBloqueos, textoEnRiesgo, titularAlertas, VER_DETALLE, VER_EN_INCIDENCIAS, VER_INCIDENCIAS } from '../../config/glosario';
import { COLOR_SEMAFORO, type NivelCarga } from '../../lib/semaforo';
import type { SeccionIncidencias } from '../../types/operacion';
import { TARJETA_FLOTANTE } from './estilosMapa';
import { COLOR_BLOQUEO, MarcaSemaforo } from './simbolos';

// Tarjeta de alertas sobre el mapa: lo que exige actuar, de un vistazo. El titular lleva a Incidencias; cada
// cifra de abajo lleva a su sección. Ordenada por urgencia: lo que ya llegará tarde, luego el riesgo.

export interface AlertasMapa {
  /** `tarde`: pedidos con holgura negativa (cuentan dentro del riesgo). */
  riesgo: { rojo: number; ambar: number; tarde?: number };
  bloqueos: number;
  averias: number;
}

interface AlertasMapaTarjetaProps {
  alertas: AlertasMapa;
  /** En Simulación solo se alerta del riesgo. */
  soloRiesgo: boolean;
  /** Abre Incidencias, en la sección tocada si se indica. */
  onAbrir: (seccion?: SeccionIncidencias) => void;
  /** Reducida: una sola fila (el titular); las cifras se despliegan con el botón "Ver detalle". */
  reducida?: boolean;
  detalleAbierto?: boolean;
  onAlternarDetalle?: () => void;
}

interface Cifra {
  seccion: SeccionIncidencias;
  numero: number;
  texto: string;
  etiqueta: string;
  color: string;
  nivel?: NivelCarga;
}

const CifraAlerta: React.FC<Cifra & { onClick: () => void }> = ({ numero, texto, etiqueta, color, nivel, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`${etiqueta}. ${VER_EN_INCIDENCIAS}`}
    className="flex-1 min-w-0 min-h-11 px-2 flex items-center justify-center gap-1.5 hover:bg-neutral-50 text-body-sm"
  >
    {nivel && numero > 0 ? (
      <MarcaSemaforo nivel={nivel} />
    ) : (
      <span className="size-2 rounded-full shrink-0" style={{ background: numero > 0 ? color : 'rgb(var(--color-neutral-300))' }} />
    )}
    <span className={`truncate tabular-nums ${numero > 0 ? 'font-semibold text-neutral-900' : 'text-neutral-600'}`}>{texto}</span>
  </button>
);

export const AlertasMapaTarjeta: React.FC<AlertasMapaTarjetaProps> = ({ alertas, soloRiesgo, onAbrir, reducida = false, detalleAbierto = false, onAlternarDetalle }) => {
  const idCifras = useId();
  const enRiesgo = alertas.riesgo.rojo + alertas.riesgo.ambar;
  const tarde = alertas.riesgo.tarde ?? 0;
  const titular = titularAlertas(tarde, enRiesgo, soloRiesgo ? 0 : alertas.bloqueos + alertas.averias);
  const cifras: Cifra[] = [
    {
      seccion: 'riesgo',
      numero: enRiesgo,
      texto: textoEnRiesgo(enRiesgo),
      etiqueta: etiquetaEnRiesgo(enRiesgo, alertas.riesgo.rojo, alertas.riesgo.ambar),
      color: COLOR_SEMAFORO.ROJO,
      nivel: 'ROJO',
    },
    ...(soloRiesgo
      ? []
      : [
          { seccion: 'bloqueos' as const, numero: alertas.bloqueos, texto: textoBloqueos(alertas.bloqueos), etiqueta: textoBloqueos(alertas.bloqueos), color: COLOR_BLOQUEO },
          { seccion: 'averias' as const, numero: alertas.averias, texto: textoAverias(alertas.averias), etiqueta: textoAverias(alertas.averias), color: COLOR_SEMAFORO.ROJO },
        ]),
  ];
  return (
    <section aria-label={ALERTAS} data-sin-zoom className={`${TARJETA_FLOTANTE} overflow-hidden cursor-default`}>
      <div className="flex">
        <button
          type="button"
          onClick={() => onAbrir()}
          aria-label={`${titular}. ${VER_INCIDENCIAS}`}
          className="flex-1 min-w-0 min-h-11 px-3 flex items-center gap-2.5 text-left hover:bg-neutral-50"
        >
          <AlertTriangle className={`size-4 shrink-0 ${tarde > 0 ? 'text-critical-600' : 'text-neutral-600'}`} aria-hidden="true" />
          <span className={`truncate text-body font-semibold ${tarde > 0 ? 'text-critical-700' : 'text-neutral-900'}`}>{titular}</span>
          {!reducida && <ChevronRight className="ml-auto size-4 shrink-0 text-neutral-600" aria-hidden="true" />}
        </button>
        {reducida && (
          <button
            type="button"
            onClick={onAlternarDetalle}
            aria-label={VER_DETALLE}
            title={VER_DETALLE}
            aria-expanded={detalleAbierto}
            aria-controls={detalleAbierto ? idCifras : undefined}
            className="size-11 shrink-0 flex items-center justify-center border-l border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          >
            <ChevronDown className={`size-4 transition-transform ${detalleAbierto ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        )}
      </div>
      {(!reducida || detalleAbierto) && (
        <div id={idCifras} className="flex divide-x divide-neutral-200 border-t border-neutral-200">
          {cifras.map(({ seccion, ...cifra }) => (
            <CifraAlerta key={seccion} seccion={seccion} {...cifra} onClick={() => onAbrir(seccion)} />
          ))}
        </div>
      )}
    </section>
  );
};
