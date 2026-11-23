import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { etiquetaEnRiesgo, textoAverias, textoBloqueos, textoEnRiesgo, titularAlertas, VER_EN_INCIDENCIAS } from '../../config/glosario';
import { COLOR_SEMAFORO, type NivelCarga } from '../../lib/semaforo';
import type { SeccionIncidencias } from '../../types/operacion';
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

export const AlertasMapaTarjeta: React.FC<AlertasMapaTarjetaProps> = ({ alertas, soloRiesgo, onAbrir }) => {
  const enRiesgo = alertas.riesgo.rojo + alertas.riesgo.ambar;
  const tarde = alertas.riesgo.tarde ?? 0;
  const titular = titularAlertas(tarde, enRiesgo);
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
    <section aria-label="Alertas" className="bg-superficie border border-neutral-200 rounded-card shadow-overlay overflow-hidden cursor-default">
      <button
        type="button"
        onClick={() => onAbrir()}
        aria-label={`${titular}. Ver Incidencias`}
        className="w-full min-h-11 px-3 flex items-center gap-2.5 text-left hover:bg-neutral-50"
      >
        <AlertTriangle className={`size-4 shrink-0 ${tarde > 0 ? 'text-critical-600' : 'text-neutral-600'}`} aria-hidden="true" />
        <span className={`text-body font-semibold ${tarde > 0 ? 'text-critical-700' : 'text-neutral-900'}`}>{titular}</span>
        <ChevronRight className="ml-auto size-4 shrink-0 text-neutral-600" aria-hidden="true" />
      </button>
      <div className="flex divide-x divide-neutral-200 border-t border-neutral-200">
        {cifras.map(({ seccion, ...cifra }) => (
          <CifraAlerta key={seccion} seccion={seccion} {...cifra} onClick={() => onAbrir(seccion)} />
        ))}
      </div>
    </section>
  );
};
