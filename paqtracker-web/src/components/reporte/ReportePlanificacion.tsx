import React, { useState } from 'react';
import { Download, Printer, RefreshCw } from 'lucide-react';
import { ALMACENES, UNIDADES } from '../../config/dominio';
import { usePlanEstable } from '../../hooks/usePlanEstable';
import { capitalizar, formatearDiaMesHora, formatearMiles } from '../../lib/formato';
import { cn } from '../../lib/clases';
import type { IdAlmacenApi, PlanEstableApi, RutaPlanificadaApi } from '../../types/api';
import { Aviso, Boton, Indicador } from '../ui';

// Reporte de la última planificación estable (rúbrica 91.EvaSw G08 simulación del periodo, G09 cierre del día a
// día, G10 colapso): el plan vigente tras la última planificación que terminó sin colapso, una ruta por unidad
// con sus paradas en orden. Es una foto: se pide al abrir y con "Actualizar", no con cada instantánea.

const MS_POR_MINUTO = 60_000;

const nombreAlmacen = (id: IdAlmacenApi) => ALMACENES.find((a) => a.id === id)?.nombre ?? id;
const nombreUnidad = (ruta: RutaPlanificadaApi) => `${capitalizar(UNIDADES[ruta.tipo].nombre)} ${ruta.unidad}`;
const fecha = (ms: number) => formatearDiaMesHora(new Date(ms));

/** Holgura con la que llega la parada: positiva a tiempo, negativa con retraso. */
const holguraMinutos = (llegadaMs: number, horaLimiteMs: number) => Math.round((horaLimiteMs - llegadaMs) / MS_POR_MINUTO);

function exportarCsv(plan: PlanEstableApi) {
  const encabezado = ['Unidad', 'Tipo', 'Origen', 'Salida', 'Regreso', 'Km de la ruta', 'Orden', 'Pedido', 'Destino', 'Paquetes', 'Llegada estimada', 'Hora límite', 'Holgura (min)'];
  const filas = plan.rutas.flatMap((ruta) =>
    ruta.paradas.map((p, i) => [
      ruta.unidad,
      UNIDADES[ruta.tipo].nombre,
      nombreAlmacen(ruta.almacenOrigen),
      fecha(ruta.salidaMs),
      fecha(ruta.regresoMs),
      ruta.distanciaKm,
      i + 1,
      p.pedido,
      `(${p.destino.x}; ${p.destino.y})`,
      p.cantidad,
      fecha(p.llegadaMs),
      fecha(p.horaLimiteMs),
      holguraMinutos(p.llegadaMs, p.horaLimiteMs),
    ]),
  );
  const sinAsignar = plan.pedidosSinAsignar.map((codigo) => ['', '', '', '', '', '', '', codigo, '', '', 'Sin unidad asignada', '', '']);
  const csv = [encabezado, ...filas, ...sinAsignar].map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  enlace.download = `planificacion-${plan.ejecucionId}-${new Date(plan.instanteMs).toISOString().slice(0, 16).replace(':', '')}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

/** Celda de la tabla de rutas (encabezado y cuerpo comparten el mismo relleno). */
const CELDA = 'px-2.5 py-1.5';

const FilaRuta: React.FC<{ ruta: RutaPlanificadaApi }> = ({ ruta }) => {
  const [abierta, setAbierta] = useState(false);
  const idParadas = `paradas-${ruta.unidad}`;
  const ocupacion = ruta.capacidad === 0 ? 0 : Math.round((ruta.carga / ruta.capacidad) * 100);
  return (
    <>
      <tr className="border-b border-neutral-100">
        <td className={CELDA}>
          <button
            type="button"
            onClick={() => setAbierta(!abierta)}
            aria-expanded={abierta}
            aria-controls={idParadas}
            className="whitespace-nowrap font-semibold text-neutral-900 hover:underline"
          >
            <span aria-hidden="true" className="inline-block w-3 text-neutral-600">
              {abierta ? '▾' : '▸'}
            </span>
            {nombreUnidad(ruta)}
          </button>
        </td>
        <td className={cn(CELDA, 'text-neutral-700')}>{nombreAlmacen(ruta.almacenOrigen)}</td>
        <td className={cn(CELDA, 'tabular-nums')}>{fecha(ruta.salidaMs)}</td>
        <td className={cn(CELDA, 'tabular-nums')}>{fecha(ruta.regresoMs)}</td>
        <td className={cn(CELDA, 'text-right tabular-nums')}>{ruta.paradas.length}</td>
        <td className={cn(CELDA, 'whitespace-nowrap text-right tabular-nums')}>
          {ruta.carga}/{ruta.capacidad} · {ocupacion} %
        </td>
        <td className={cn(CELDA, 'text-right tabular-nums')}>{formatearMiles(ruta.distanciaKm)}</td>
      </tr>
      {abierta && (
        <tr id={idParadas} className="bg-neutral-50">
          <td colSpan={7} className={CELDA}>
            <ol aria-label={`Paradas de ${ruta.unidad}`} className="flex flex-col gap-0.5 text-body-sm">
              {ruta.paradas.map((p, i) => {
                const holgura = holguraMinutos(p.llegadaMs, p.horaLimiteMs);
                return (
                  // Columnas fijas para que las paradas se lean alineadas, como una subtabla.
                  <li key={`${p.pedido}-${i}`} className="grid grid-cols-[1.5rem_6rem_5rem_4.5rem_1fr_1fr] gap-2 tabular-nums">
                    <span className="text-neutral-600">{i + 1}.</span>
                    <span className="font-semibold text-neutral-900">{p.pedido}</span>
                    <span className="text-neutral-600">
                      ({p.destino.x},{p.destino.y})
                    </span>
                    <span>{p.cantidad} paq.</span>
                    <span>llega {fecha(p.llegadaMs)}</span>
                    <span className={holgura < 0 ? 'text-critical-600' : 'text-neutral-600'}>
                      límite {fecha(p.horaLimiteMs)} · {holgura < 0 ? `${-holgura} min tarde` : `${holgura} min de holgura`}
                    </span>
                  </li>
                );
              })}
            </ol>
          </td>
        </tr>
      )}
    </>
  );
};

interface ReportePlanificacionProps {
  ejecucionId: string;
  /** Muestra "Actualizar": en el día a día el plan cambia con cada salto Sa. */
  actualizable?: boolean;
}

export const ReportePlanificacion: React.FC<ReportePlanificacionProps> = ({ ejecucionId, actualizable = false }) => {
  const { plan, cargando, error, sinPlan, recargar } = usePlanEstable(ejecucionId);

  if (cargando && !plan) return <p className="p-6 text-body text-neutral-600">Cargando la última planificación…</p>;
  if (sinPlan)
    return (
      <p className="p-6 text-body text-neutral-600">
        Esta ejecución todavía no planificó: el primer plan se genera en el primer salto del planificador (Sa).
      </p>
    );
  if (error || !plan)
    return (
      <div className="p-6">
        <Aviso
          tono="critical"
          role="alert"
          accion={
            <Boton variante="secundario" tamano="sm" icono={RefreshCw} onClick={recargar}>
              Reintentar
            </Boton>
          }
        >
          No se pudo obtener la planificación: {error ?? 'sin respuesta'}
        </Aviso>
      </div>
    );

  const paquetes = plan.rutas.reduce((total, r) => total + r.carga, 0);
  const km = plan.rutas.reduce((total, r) => total + r.distanciaKm, 0);
  const paradas = plan.rutas.reduce((total, r) => total + r.paradas.length, 0);

  return (
    <section aria-label="Última planificación estable" data-imprimible className="flex flex-col gap-4 p-6">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-title-sm text-neutral-900">Última planificación estable</h2>
          <p className="text-body-sm tabular-nums text-neutral-600">
            Planificada el {fecha(plan.instanteMs)} (reloj simulado) · {plan.algoritmo} · Ta {formatearMiles(plan.tiempoComputoMs)} ms ·{' '}
            {plan.unidadesDespachadas} {plan.unidadesDespachadas === 1 ? 'unidad salió' : 'unidades salieron'} con este plan
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2" data-no-imprimir>
          {actualizable && (
            <Boton variante="secundario" tamano="sm" icono={RefreshCw} onClick={recargar} disabled={cargando}>
              Actualizar
            </Boton>
          )}
          <Boton variante="secundario" tamano="sm" icono={Download} onClick={() => exportarCsv(plan)}>
            Exportar CSV
          </Boton>
          <Boton variante="secundario" tamano="sm" icono={Printer} onClick={() => window.print()}>
            Imprimir
          </Boton>
        </div>
      </header>

      {plan.colapso && (
        <Aviso tono="critical" role="status">
          <span className="text-neutral-900">
            <strong className="font-semibold text-critical-600">Plan anterior al colapso.</strong> La operación colapsó el {fecha(plan.colapso.instanteMs)}: el
            pedido <strong className="font-semibold">{plan.colapso.pedido}</strong> no se podía entregar a tiempo. Este es el último plan que se cumplía.
          </span>
        </Aviso>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          className="bg-white"
          etiqueta="Unidades con ruta"
          valor={plan.rutas.length}
          detalle={`${paradas} ${paradas === 1 ? 'parada' : 'paradas'} pendientes`}
        />
        <Indicador className="bg-white" etiqueta="Paquetes planificados" valor={formatearMiles(paquetes)} />
        <Indicador className="bg-white" etiqueta="Distancia de las rutas" valor={`${formatearMiles(km)} km`} />
        <Indicador
          className="bg-white"
          etiqueta="Pedidos sin asignar"
          valor={plan.pedidosSinAsignar.length}
          detalle={plan.pedidosSinAsignar.length === 0 ? 'Todos tienen unidad' : 'Entran en la próxima planificación'}
        />
      </div>

      {plan.rutas.length === 0 ? (
        <p className="text-body text-neutral-600">El plan no deja entregas pendientes: todas las unidades terminaron sus rutas.</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-neutral-200 bg-white shadow-xs">
          <table className="w-full border-collapse text-left text-body-sm text-neutral-900">
            <caption className="sr-only">Rutas del plan, una por unidad; cada fila se despliega con sus paradas en orden.</caption>
            <thead className="bg-neutral-50 text-overline uppercase text-neutral-600">
              <tr>
                <th className={cn(CELDA, 'font-semibold')}>Unidad</th>
                <th className={cn(CELDA, 'font-semibold')}>Origen</th>
                <th className={cn(CELDA, 'font-semibold')}>Salida</th>
                <th className={cn(CELDA, 'font-semibold')}>Regreso</th>
                <th className={cn(CELDA, 'text-right font-semibold')}>Paradas</th>
                <th className={cn(CELDA, 'text-right font-semibold')}>Carga</th>
                <th className={cn(CELDA, 'text-right font-semibold')}>Km</th>
              </tr>
            </thead>
            <tbody>
              {plan.rutas.map((ruta) => (
                <FilaRuta key={ruta.unidad} ruta={ruta} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {plan.pedidosSinAsignar.length > 0 && (
        <p className="text-body-sm text-neutral-600">
          <span className="font-medium text-neutral-900">Sin asignar:</span> {plan.pedidosSinAsignar.join(', ')}
        </p>
      )}
    </section>
  );
};
