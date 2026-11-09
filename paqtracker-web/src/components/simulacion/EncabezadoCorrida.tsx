import React, { useState } from 'react';
import { ArrowLeft, Square } from 'lucide-react';
import { RelojReal } from '../layout/RelojReal';
import { DialogoConfirmacion } from '../modals/DialogoConfirmacion';
import { Boton, Insignia } from '../ui';
import { cn } from '../../lib/clases';
import { ESTADO_CORRIDA } from './estadoCorrida';
import { formatearCronometro, formatearDiasHoras, formatearFechaLarga, formatearHora } from '../../lib/formato';
import type { EscenarioSimulacion, EstadoCorrida, MarcaAvance } from '../../types/simulacion';

// Franjas superiores de la corrida (Figma "Corrida de Simulación" y "· Hasta el colapso"):
// banda de modo (24 px), encabezado de corrida (56 px) y avance de la corrida (44 px).
// No hay controles de velocidad: el factor k lo fija el servidor para todos los que observan.

const DIA_MS = 24 * 3600 * 1000;
/** La simulación de periodo debe correr en 30–60 min reales (DA-08). */
const VENTANA_EJECUCION_MIN = { minima: 30, maxima: 60 };
/** Rótulos de día como máximo en el eje; con más días se rotula uno de cada varios. */
const ROTULOS_MAXIMOS = 10;

interface EncabezadoCorridaProps {
  escenario: EscenarioSimulacion;
  estado: EstadoCorrida;
  inicio: Date;
  relojSimulado: Date;
  simuladoMs: number;
  diasTotales: number;
  transcurridoRealMs: number;
  factorAceleracion: number;
  marcas: MarcaAvance[];
  /** Detiene la corrida en el servidor; devuelve si lo aceptó. */
  onDetener: () => Promise<boolean>;
  /** Motivo por el que el servidor rechazó detenerla. */
  errorDetener?: string | null;
  onSalir: () => void;
  onVerInforme: () => void;
  /** Sin conexión con el servidor, detener la corrida no tiene efecto: el botón se deshabilita. */
  conectado?: boolean;
}

// Jerarquía de los tiempos (C16, la verifica rubrica.tiempos-flota.test.tsx por clase): etiquetas 11 px <
// transcurridos 14 px < fecha-hora real 16 px < fecha-hora simulada 20 px. Los 11 y 14 px coinciden con
// `text-caption` y `text-title-sm`; 16 y 20 px no existen en la escala (es el único reloj de ese tamaño).
const ETIQUETA_TIEMPO = 'text-[11px] leading-4 font-medium text-neutral-600';
const VALOR_TRANSCURRIDO = 'tabular-nums font-medium text-[14px] leading-5 text-neutral-900';

const Bloque: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({ etiqueta, children }) => (
  <div className="flex flex-col gap-px whitespace-nowrap">
    <span className={ETIQUETA_TIEMPO}>{etiqueta}</span>
    {children}
  </div>
);

const Separador = () => <div className="h-9 w-px shrink-0 bg-neutral-200" />;

/**
 * Par de tiempos (C12–C16): fecha-hora y transcurrido juntos, del momento simulado o del real. Las dos
 * tarjetas tienen la misma estructura para leerse como pares; la simulada va más destacada.
 */
const TarjetaTiempo: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <section aria-label={titulo} className="flex items-center gap-x-4 rounded-control border border-neutral-200 bg-neutral-50 px-3 py-1">
    {children}
  </section>
);

export const EncabezadoCorrida: React.FC<EncabezadoCorridaProps> = ({
  escenario,
  estado,
  inicio,
  relojSimulado,
  simuladoMs,
  diasTotales,
  transcurridoRealMs,
  factorAceleracion,
  marcas,
  onDetener,
  errorDetener,
  onSalir,
  onVerInforme,
  conectado = true,
}) => {
  const [confirmandoDetener, setConfirmandoDetener] = useState(false);
  const [deteniendo, setDeteniendo] = useState(false);
  const colapso = estado === 'COLAPSO';
  /** Completada o detenida: la corrida ya no avanza. */
  const terminada = estado === 'COMPLETADA' || estado === 'DETENIDA';
  /** "Hasta el colapso" no tiene una duración fijada de antemano: un % de avance sobre ella no tendría sentido. */
  const sinHorizonteFijo = escenario === 'COLAPSO_LOGISTICO';
  const duracionMs = diasTotales * DIA_MS;
  const fin = new Date(inicio.getTime() + duracionMs);
  const progreso = duracionMs === 0 ? 0 : Math.min(1, simuladoMs / duracionMs);
  const estimadoTotalRealMs = duracionMs / factorAceleracion;
  const restanteRealMs = Math.max(0, (duracionMs - simuladoMs) / factorAceleracion);
  const estimadoMin = estimadoTotalRealMs / 60_000;
  const enVentana = estimadoMin >= VENTANA_EJECUCION_MIN.minima && estimadoMin <= VENTANA_EJECUCION_MIN.maxima;
  const porcentaje = Math.round(progreso * 100);
  const dia = Math.min(diasTotales, Math.floor(simuladoMs / DIA_MS) + 1);
  const pasoRotulo = Math.max(1, Math.ceil(diasTotales / ROTULOS_MAXIMOS));
  const titulo = colapso ? 'Simulación — colapso' : escenario === 'COLAPSO_LOGISTICO' ? 'Simulación — hasta el colapso' : `Simulación ${diasTotales} días`;
  const estadoCorrida = ESTADO_CORRIDA[estado];
  /** Color del avance: primario en curso, crítico en el colapso. */
  const rellenoAvance = colapso ? 'bg-critical-600' : 'bg-primary-600';

  return (
    <div className="shrink-0">
      {/* Banda de modo */}
      <div className={cn('flex h-6 items-center gap-2 px-4 text-body-sm text-sobre-color', colapso ? 'bg-critical-600' : 'bg-primary-600')}>
        <span aria-hidden="true" className="size-1.5 rounded-full bg-sobre-color" />
        <span className="font-semibold">{titulo}</span>
        <span className="tabular-nums opacity-80">
          · {formatearFechaLarga(inicio, false)} → {colapso ? `Colapso ${formatearFechaLarga(relojSimulado, false)}` : formatearFechaLarga(fin, false)}
        </span>
        <span className="ml-auto opacity-90">
          {colapso
            ? 'Simulación finalizada por colapso logístico'
            : estado === 'COMPLETADA'
              ? 'Simulación completada'
              : estado === 'DETENIDA'
                ? 'Simulación detenida antes de terminar'
                : `Reloj acelerado ×${factorAceleracion}`}
        </span>
      </div>

      {/* Encabezado de corrida. flex-wrap: a lo ancho justo (~1366 px con "Detener simulación" visible)
          pasa a una segunda línea en vez de cortar los botones de la derecha. */}
      <header className="flex min-h-14 flex-wrap items-center gap-x-5 gap-y-2.5 border-b border-neutral-200 bg-superficie px-4 py-2.5">
        <TarjetaTiempo titulo="Simulado">
          <Bloque etiqueta={colapso ? 'Instante del colapso' : 'Fecha y hora simulada'}>
            <span className="flex items-center gap-2">
              <span className={cn('text-[20px] font-semibold leading-6 tabular-nums', colapso ? 'text-critical-600' : 'text-neutral-900')}>
                {formatearFechaLarga(relojSimulado)}
              </span>
              <Insignia tono={colapso ? 'critical' : 'primary'} contorno={colapso} className="tabular-nums">
                {colapso ? `Día simulado ${dia}` : `Día ${dia} de ${diasTotales}`}
              </Insignia>
            </span>
          </Bloque>
          <Bloque etiqueta="Tiempo simulado transcurrido">
            <span className={VALOR_TRANSCURRIDO}>{formatearDiasHoras(simuladoMs, true)}</span>
          </Bloque>
        </TarjetaTiempo>
        <TarjetaTiempo titulo="Real">
          <Bloque etiqueta="Fecha y hora real">
            <RelojReal className="text-[16px] font-semibold leading-6 tabular-nums text-neutral-900" />
          </Bloque>
          <Bloque etiqueta={colapso || terminada ? 'Tiempo real / Estado' : 'Tiempo real transcurrido / Restante'}>
            <span className={VALOR_TRANSCURRIDO}>
              {formatearCronometro(transcurridoRealMs)}
              <span className="font-normal text-neutral-600"> · {colapso || terminada ? 'terminada' : `~${formatearCronometro(restanteRealMs)} restante`}</span>
            </span>
          </Bloque>
        </TarjetaTiempo>
        {escenario === 'SIMULACION_PERIODO' && !colapso && (
          <>
            <Separador />
            <Bloque etiqueta={`Ventana de ejecución ${VENTANA_EJECUCION_MIN.minima}–${VENTANA_EJECUCION_MIN.maxima} min`}>
              <span className={cn('text-body-sm tabular-nums', enVentana ? 'text-ok-700' : 'text-warn-700')}>
                {formatearCronometro(estimadoTotalRealMs)} estimado {enVentana ? '✓' : '· fuera de la ventana'}
              </span>
            </Bloque>
          </>
        )}
        <div className="flex-1" />
        <Boton variante="fantasma" tamano="sm" icono={ArrowLeft} onClick={onSalir} className="text-neutral-600">
          Otras simulaciones
        </Boton>
        {estado === 'EJECUCION' && (
          <>
            {/* Separado de la navegación y con confirmación: detener afecta a todos los que observan. */}
            <Separador />
            <Boton
              variante="peligro-secundario"
              tamano="sm"
              icono={Square}
              onClick={() => setConfirmandoDetener(true)}
              disabled={!conectado}
              title={conectado ? undefined : 'Sin conexión con el servidor: espera a reconectar'}
            >
              Detener simulación
            </Boton>
          </>
        )}
        <Insignia tamano="md" tono={estadoCorrida.tono} punto={estadoCorrida.punto} contorno={estadoCorrida.contorno}>
          {estadoCorrida.texto}
        </Insignia>
        {estado !== 'EJECUCION' && (
          <Boton variante="primario" onClick={onVerInforme}>
            Ver informe de la corrida
          </Boton>
        )}
      </header>

      <DialogoConfirmacion
        abierto={confirmandoDetener}
        titulo="¿Detener la simulación?"
        descripcion={
          <>
            <p>La corrida se detendrá para todas las personas que la están viendo y no se podrá reanudar.</p>
            <p>El informe conservará los resultados hasta este momento.</p>
          </>
        }
        textoConfirmar="Detener simulación"
        textoEnCurso="Deteniendo…"
        enCurso={deteniendo}
        error={errorDetener}
        onCancelar={() => setConfirmandoDetener(false)}
        onConfirmar={async () => {
          setDeteniendo(true);
          const detenida = await onDetener();
          setDeteniendo(false);
          if (detenida) setConfirmandoDetener(false);
        }}
      />

      {/* Avance de la corrida */}
      <div className="flex h-11 items-center gap-4 border-b border-neutral-200 bg-superficie px-4 text-body-sm">
        <span className="w-28 shrink-0 whitespace-nowrap text-neutral-600">Avance de la corrida</span>
        {sinHorizonteFijo ? (
          <>
            <div className="relative flex h-full flex-1 items-center" role="status" aria-label="Avance de la corrida: sin horizonte fijo, corre hasta el colapso">
              <div className="absolute inset-x-0 h-1 rounded-full bg-neutral-200" />
              <div
                className={cn(
                  'absolute h-1 rounded-full',
                  colapso ? 'inset-x-0 bg-critical-600' : terminada ? 'inset-x-0 bg-neutral-400' : 'left-0 w-1/3 bg-primary-600 motion-safe:animate-pulse',
                )}
              />
            </div>
            <span className="whitespace-nowrap font-medium tabular-nums text-neutral-900">
              {colapso ? `Colapsó en el día simulado ${dia}` : estado === 'DETENIDA' ? `Detenida en el día simulado ${dia}` : `Día simulado ${dia} · sin horizonte fijo`}
            </span>
          </>
        ) : (
          <>
            {/* Geometría del eje (44 px de alto): pista a 20 px, rótulos de día debajo y marcas encima. */}
            <div className="relative h-full flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje} aria-label="Avance de la corrida">
              <div className="absolute inset-x-0 top-5 h-0.5 bg-neutral-300" />
              <div className={cn('absolute left-0 top-5 h-1 -translate-y-px', rellenoAvance)} style={{ width: `${progreso * 100}%` }} />
              {Array.from({ length: diasTotales }, (_, i) => i)
                .filter((i) => i % pasoRotulo === 0)
                .map((i) => (
                  <div key={i} className="absolute top-4" style={{ left: `${(i / diasTotales) * 100}%` }}>
                    <div className="h-2.5 w-px bg-neutral-400" />
                    <span className="absolute left-0.5 top-3 text-caption tabular-nums text-neutral-600">D{i + 1}</span>
                  </div>
                ))}
              {/* Marcas de incidencias y del planificador ya ocurridas */}
              {marcas
                .filter((m) => m.minuto * 60_000 <= simuladoMs)
                .map((m) => (
                  <span
                    key={m.id}
                    title={m.tipo === 'INCIDENCIA' ? 'Incidencia' : 'Planificador'}
                    className={cn('absolute top-1.5', m.tipo === 'INCIDENCIA' ? 'size-1 bg-neutral-600' : 'h-2 w-px bg-neutral-400')}
                    style={{ left: `${Math.min(100, ((m.minuto * 60_000) / duracionMs) * 100)}%` }}
                  />
                ))}
              <div className="absolute top-2.5" style={{ left: `${progreso * 100}%` }}>
                <div className={cn('h-5 w-0.5', rellenoAvance)} />
                <span
                  className={cn(
                    'absolute -top-2 whitespace-nowrap font-medium tabular-nums',
                    colapso ? 'text-critical-600' : 'text-primary-700',
                    // Cerca del final el rótulo pasa a la izquierda del cursor para no salirse del eje.
                    progreso > 0.85 ? 'right-1.5' : 'left-1.5',
                  )}
                >
                  D{dia} · {formatearHora(relojSimulado)}
                  {colapso && ' · Colapso'}
                </span>
              </div>
            </div>
            <span className="flex items-center gap-1.5 whitespace-nowrap text-neutral-600">
              <span aria-hidden="true" className="size-1 bg-neutral-600" /> Incidencia <span aria-hidden="true" className="h-2 w-px bg-neutral-400" /> Planificador
            </span>
            <span className="whitespace-nowrap font-medium tabular-nums text-neutral-900">
              {colapso || estado === 'DETENIDA' ? `Detenida en ${porcentaje} %` : `${porcentaje} % completado`}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
