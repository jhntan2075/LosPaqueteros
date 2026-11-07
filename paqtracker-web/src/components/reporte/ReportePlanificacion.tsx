import React, { useState } from 'react';
import { Download, Printer, RefreshCw } from 'lucide-react';
import { ALMACENES, UNIDADES } from '../../config/dominio';
import { usePlanEstable } from '../../hooks/usePlanEstable';
import { capitalizar, formatearDiaMesHora, formatearMiles } from '../../lib/formato';
import type { IdAlmacenApi, PlanEstableApi, RutaPlanificadaApi } from '../../types/api';

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

const Cifra: React.FC<{ etiqueta: string; valor: React.ReactNode; detalle?: string }> = ({ etiqueta, valor, detalle }) => (
  <div className="border border-[#E2E8F0] rounded-[6px] px-[12px] py-[8px] flex flex-col gap-[2px] bg-white">
    <span className="text-[12px] text-[#64748B]">{etiqueta}</span>
    <span className="tabular-nums font-semibold text-[20px] text-[#0F172A]">{valor}</span>
    {detalle && <span className="text-[11px] text-[#64748B]">{detalle}</span>}
  </div>
);

const FilaRuta: React.FC<{ ruta: RutaPlanificadaApi }> = ({ ruta }) => {
  const [abierta, setAbierta] = useState(false);
  const idParadas = `paradas-${ruta.unidad}`;
  const ocupacion = ruta.capacidad === 0 ? 0 : Math.round((ruta.carga / ruta.capacidad) * 100);
  return (
    <>
      <tr className="border-b border-[#F1F5F9]">
        <td className="py-[6px] px-[10px]">
          <button
            type="button"
            onClick={() => setAbierta(!abierta)}
            aria-expanded={abierta}
            aria-controls={idParadas}
            className="font-semibold text-[#0F172A] hover:underline whitespace-nowrap"
          >
            <span aria-hidden="true" className="inline-block w-[12px] text-[#64748B]">
              {abierta ? '▾' : '▸'}
            </span>
            {nombreUnidad(ruta)}
          </button>
        </td>
        <td className="py-[6px] px-[10px] text-[#334155]">{nombreAlmacen(ruta.almacenOrigen)}</td>
        <td className="py-[6px] px-[10px] tabular-nums">{fecha(ruta.salidaMs)}</td>
        <td className="py-[6px] px-[10px] tabular-nums">{fecha(ruta.regresoMs)}</td>
        <td className="py-[6px] px-[10px] tabular-nums text-right">{ruta.paradas.length}</td>
        <td className="py-[6px] px-[10px] tabular-nums text-right whitespace-nowrap">
          {ruta.carga}/{ruta.capacidad} · {ocupacion} %
        </td>
        <td className="py-[6px] px-[10px] tabular-nums text-right">{formatearMiles(ruta.distanciaKm)}</td>
      </tr>
      {abierta && (
        <tr id={idParadas} className="bg-[#F8FAFC]">
          <td colSpan={7} className="px-[10px] py-[6px]">
            <ol aria-label={`Paradas de ${ruta.unidad}`} className="flex flex-col gap-[2px] text-[12px]">
              {ruta.paradas.map((p, i) => {
                const holgura = holguraMinutos(p.llegadaMs, p.horaLimiteMs);
                return (
                  <li key={`${p.pedido}-${i}`} className="grid grid-cols-[24px_96px_80px_70px_1fr_1fr] gap-[8px] tabular-nums">
                    <span className="text-[#64748B]">{i + 1}.</span>
                    <span className="font-semibold text-[#0F172A]">{p.pedido}</span>
                    <span className="text-[#64748B]">
                      ({p.destino.x},{p.destino.y})
                    </span>
                    <span>{p.cantidad} paq.</span>
                    <span>llega {fecha(p.llegadaMs)}</span>
                    <span className={holgura < 0 ? 'text-[#B91C1C]' : 'text-[#64748B]'}>
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

  if (cargando && !plan) return <p className="p-[24px] text-[13px] text-[#64748B]">Cargando la última planificación…</p>;
  if (sinPlan)
    return (
      <p className="p-[24px] text-[13px] text-[#64748B]">
        Esta ejecución todavía no planificó: el primer plan se genera en el primer salto del planificador (Sa).
      </p>
    );
  if (error || !plan)
    return (
      <div className="p-[24px] flex items-center gap-[12px] text-[13px]">
        <p role="alert" className="text-[#B91C1C]">
          No se pudo obtener la planificación: {error ?? 'sin respuesta'}
        </p>
        <button type="button" onClick={recargar} className="text-[#1E40AF] font-medium hover:underline">
          Reintentar
        </button>
      </div>
    );

  const paquetes = plan.rutas.reduce((total, r) => total + r.carga, 0);
  const km = plan.rutas.reduce((total, r) => total + r.distanciaKm, 0);
  const paradas = plan.rutas.reduce((total, r) => total + r.paradas.length, 0);

  return (
    <section aria-label="Última planificación estable" data-imprimible className="p-[24px] flex flex-col gap-[16px] leading-[normal]">
      <header className="flex flex-wrap items-start gap-[12px]">
        <div className="flex flex-col gap-[4px]">
          <h2 className="font-semibold text-[16px] text-[#0F172A]">Última planificación estable</h2>
          <p className="text-[12px] text-[#64748B] tabular-nums">
            Planificada el {fecha(plan.instanteMs)} (reloj simulado) · {plan.algoritmo} · Ta {formatearMiles(plan.tiempoComputoMs)} ms ·{' '}
            {plan.unidadesDespachadas} {plan.unidadesDespachadas === 1 ? 'unidad salió' : 'unidades salieron'} con este plan
          </p>
        </div>
        <div className="ml-auto flex items-center gap-[8px]" data-no-imprimir>
          {actualizable && (
            <button
              type="button"
              onClick={recargar}
              disabled={cargando}
              className="h-[32px] px-[12px] rounded-[6px] border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#334155] text-[12px] font-medium flex items-center gap-[6px] disabled:opacity-50"
            >
              <RefreshCw className="w-[14px] h-[14px]" />
              Actualizar
            </button>
          )}
          <button
            type="button"
            onClick={() => exportarCsv(plan)}
            className="h-[32px] px-[12px] rounded-[6px] border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#334155] text-[12px] font-medium flex items-center gap-[6px]"
          >
            <Download className="w-[14px] h-[14px]" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-[32px] px-[12px] rounded-[6px] border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#334155] text-[12px] font-medium flex items-center gap-[6px]"
          >
            <Printer className="w-[14px] h-[14px]" />
            Imprimir
          </button>
        </div>
      </header>

      {plan.colapso && (
        <p role="status" className="border border-[#B91C1C] bg-[#FEF2F2] rounded-[6px] px-[12px] py-[8px] text-[13px] text-[#0F172A]">
          <strong className="text-[#B91C1C]">Plan anterior al colapso.</strong> La operación colapsó el {fecha(plan.colapso.instanteMs)}: el pedido{' '}
          <strong>{plan.colapso.pedido}</strong> no se podía entregar a tiempo. Este es el último plan que se cumplía.
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
        <Cifra etiqueta="Unidades con ruta" valor={plan.rutas.length} detalle={`${paradas} ${paradas === 1 ? 'parada' : 'paradas'} pendientes`} />
        <Cifra etiqueta="Paquetes planificados" valor={formatearMiles(paquetes)} />
        <Cifra etiqueta="Distancia de las rutas" valor={`${formatearMiles(km)} km`} />
        <Cifra
          etiqueta="Pedidos sin asignar"
          valor={plan.pedidosSinAsignar.length}
          detalle={plan.pedidosSinAsignar.length === 0 ? 'Todos tienen unidad' : 'Entran en la próxima planificación'}
        />
      </div>

      {plan.rutas.length === 0 ? (
        <p className="text-[13px] text-[#64748B]">El plan no deja entregas pendientes: todas las unidades terminaron sus rutas.</p>
      ) : (
        <div className="overflow-x-auto border border-[#E2E8F0] rounded-[6px] bg-white">
          <table className="w-full text-left text-[12px] border-collapse">
            <caption className="sr-only">Rutas del plan, una por unidad; cada fila se despliega con sus paradas en orden.</caption>
            <thead className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase tracking-[0.5px]">
              <tr>
                <th className="py-[6px] px-[10px] font-semibold">Unidad</th>
                <th className="py-[6px] px-[10px] font-semibold">Origen</th>
                <th className="py-[6px] px-[10px] font-semibold">Salida</th>
                <th className="py-[6px] px-[10px] font-semibold">Regreso</th>
                <th className="py-[6px] px-[10px] font-semibold text-right">Paradas</th>
                <th className="py-[6px] px-[10px] font-semibold text-right">Carga</th>
                <th className="py-[6px] px-[10px] font-semibold text-right">Km</th>
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
        <p className="text-[12px] text-[#64748B]">
          <span className="font-medium text-[#0F172A]">Sin asignar:</span> {plan.pedidosSinAsignar.join(', ')}
        </p>
      )}
    </section>
  );
};
