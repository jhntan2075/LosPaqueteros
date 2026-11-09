import React from 'react';
import { ALMACENES } from '../../config/dominio';
import { etiquetaPlazo } from '../../config/glosario';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { estadoFlota, pedidosEnRiesgo } from '../../lib/operacion';
import type { EventoBitacora } from '../../types/operacion';
import type { NivelHolgura } from '../../types/pedidos';
import { X } from 'lucide-react';
import { cn } from '../../lib/clases';
import { COLOR_HOLGURA } from '../pedidos/estilos';
import { Aviso, Boton, FilaDato, Insignia, TituloGrupo, type Tono } from '../ui';

// Panel derecho "Diagnóstico del colapso" (Figma "Corrida de Simulación · Hasta el colapso"). Se arma
// con el estado de la ejecución en el instante en que el servidor la detuvo por colapso.

/** Eventos previos que se muestran como deterioro. */
const EVENTOS_PREVIOS = 4;
/** Ocupación de la flota desde la que se atribuye el colapso a falta de unidades. */
const OCUPACION_SATURADA = 0.9;

const NIVEL_POR_COLOR: Record<EventoBitacora['color'], NivelHolgura> = { rojo: 'ROJO', ambar: 'AMBAR', azul: 'VERDE', gris: 'CERRADO' };

interface DiagnosticoColapsoProps {
  diaColapso: string; // "29 ago"
  onCerrar: () => void;
  onEstadoCompleto: () => void;
  onVerInforme: () => void;
}

/** Fila compacta del pedido crítico (sin la altura mínima de las listas de datos). */
const Dato: React.FC<{ etiqueta: string; valor: string; tono?: Tono }> = ({ etiqueta, valor, tono }) => (
  <FilaDato etiqueta={etiqueta} valor={valor} tono={tono} className="min-h-0 gap-2" />
);

export const DiagnosticoColapso: React.FC<DiagnosticoColapsoProps> = ({ diaColapso, onCerrar, onEstadoCompleto, onVerInforme }) => {
  const datos = useDatosOperacion();
  const previos = datos.eventos.filter((e) => e.categoria === 'INCIDENCIA' || e.categoria === 'PLANIFICADOR').slice(0, EVENTOS_PREVIOS);
  const critico = pedidosEnRiesgo(datos)[0];
  const flota = estadoFlota(datos);
  const ocupacion = flota.total === 0 ? 0 : flota.enRuta / flota.total;
  const causa =
    ocupacion >= OCUPACION_SATURADA
      ? { titulo: 'Capacidad de flota agotada', detalle: `${flota.enRuta}/${flota.total} en ruta` }
      : { titulo: 'Plazo inalcanzable con la flota libre', detalle: `${flota.disponibles} unidades libres` };
  const intermedios = datos.almacenes.filter((a) => a.capacidad !== null && a.stock !== null);

  // Ancho de 340 px: el mismo que PanelLateral (ANCHO_PANEL_PX en CorridaSimulacion reserva ese espacio en el mapa).
  return (
    <aside
      aria-label="Diagnóstico del colapso"
      data-sin-zoom
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute bottom-0 right-3 top-0 z-20 flex w-[340px] flex-col overflow-hidden rounded-card border border-neutral-200 bg-superficie shadow-overlay"
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-neutral-200 pl-3 pr-1.5">
        <span aria-hidden="true" className="size-2 rounded-full bg-critical-600" />
        <h2 className="text-title-sm text-neutral-900">Diagnóstico del colapso</h2>
        <Boton variante="fantasma" tamano="sm" icono={X} onClick={onCerrar} aria-label="Cerrar diagnóstico" title="Cerrar diagnóstico" className="ml-auto text-neutral-600" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="flex flex-col gap-2 border-b border-neutral-200 p-3">
          <TituloGrupo derecha="últimos eventos">01 · Antes — deterioro previo</TituloGrupo>
          {previos.length === 0 && <p className="text-body-sm text-neutral-600">Sin eventos registrados en esta vista.</p>}
          {previos.map((evento) => (
            <div key={evento.id} className="flex gap-2.5 text-body-sm">
              <time className="w-12 shrink-0 tabular-nums text-neutral-600">{evento.hora}</time>
              <span className={COLOR_HOLGURA[NIVEL_POR_COLOR[evento.color]]}>{evento.detalle}</span>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2 border-b border-neutral-200 p-3">
          <TituloGrupo derecha={diaColapso}>02 · Instante — pedido que rompe el plazo</TituloGrupo>
          {critico ? (
            <div className="flex flex-col gap-1.5 rounded-control border border-critical-600 px-3 py-2.5">
              <div className="flex items-center">
                <span className="text-title-sm tabular-nums text-neutral-900">Pedido {critico.codigo}</span>
                <Insignia tono="critical" contorno className="ml-auto">
                  {etiquetaPlazo(critico.plazoHoras)}
                </Insignia>
              </div>
              <Dato etiqueta="Destino / Cantidad" valor={`(${critico.destino.x},${critico.destino.y}) · ${critico.cantidad} u`} />
              <Dato etiqueta="Registrado / Límite" valor={`${critico.registrado} → ${critico.horaLimite}`} />
              <Dato etiqueta="Mejor llegada factible" valor={critico.eta} />
              <Dato etiqueta="Holgura" valor={critico.holgura} tono="critical" />
            </div>
          ) : (
            <p className="text-body-sm text-neutral-600">El pedido incumplido ya salió en una ruta que llega tarde.</p>
          )}
        </section>

        <section className="flex flex-col gap-2 p-3">
          <TituloGrupo>03 · Después — causa probable</TituloGrupo>
          <Aviso tono="critical" accion={<span className="tabular-nums">{causa.detalle}</span>} className="items-center rounded-control py-2">
            <span className="font-semibold text-neutral-900">{causa.titulo}</span>
          </Aviso>
          <div className="mt-1 flex items-center text-body-sm">
            <span className="font-semibold text-neutral-900">Almacenes en el instante del quiebre</span>
            <span className="ml-auto tabular-nums text-neutral-600">recarga a las 23:59</span>
          </div>
          {intermedios.map((a) => {
            const fraccion = (a.stock as number) / (a.capacidad as number);
            return (
              <div key={a.id} className="flex flex-col gap-1">
                <span className={cn('truncate text-body-sm tabular-nums', a.stockBajo ? 'text-critical-600' : 'text-neutral-900')}>
                  {ALMACENES.find((x) => x.id === a.id)?.nombre} · {a.stock}/{a.capacidad} u · {Math.round(fraccion * 100)} %
                </span>
                <div className="h-1 overflow-hidden rounded-full bg-neutral-200">
                  <div className={cn('h-full', a.stockBajo ? 'bg-critical-600' : 'bg-primary-600')} style={{ width: `${fraccion * 100}%` }} />
                </div>
              </div>
            );
          })}
          <Aviso tono="neutral" icono={null}>
            {datos.bloqueos.length} {datos.bloqueos.length === 1 ? 'tramo bloqueado vigente' : 'tramos bloqueados vigentes'} · {datos.resumen.enEspera} pedidos en espera
          </Aviso>
        </section>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-neutral-200 p-3">
        <Boton variante="secundario" onClick={onEstadoCompleto} className="flex-1">
          Estado completo del sistema
        </Boton>
        <Boton variante="primario" onClick={onVerInforme} className="flex-1">
          Ver informe
        </Boton>
      </div>
    </aside>
  );
};
