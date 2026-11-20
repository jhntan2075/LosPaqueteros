import React from 'react';
import { ClipboardList, Package, Truck, Warehouse } from 'lucide-react';
import { ALMACENES, CORTE_INVENTARIO, UNIDADES } from '../../config/dominio';
import { NOMBRE_HOLGURA } from '../../config/glosario';
import { capitalizar, formatearAntiguedad, formatearDuracion, formatearNumero } from '../../lib/formato';
import { cn } from '../../lib/clases';
import { estadoFlota } from '../../lib/operacion';
import { nivelDeOcupacion } from '../../lib/semaforo';
import type { DatosOperacion } from '../../types/operacion';
import type { NivelHolgura } from '../../types/pedidos';
import { MarcaSemaforo } from '../map/simbolos';
import { EncabezadoPagina, Indicador, Insignia, Tarjeta, TituloGrupo } from '../ui';

const formatoPorcentaje = (valor: number) => `${valor.toFixed(1).replace('.', ',')} %`;

const COLOR_BARRA_NIVEL: Record<NivelHolgura, string> = {
  ROJO: 'bg-critical-600',
  AMBAR: 'bg-warn-500',
  VERDE: 'bg-ok-600',
  CERRADO: 'bg-neutral-400',
};
/** Alerta de stock bajo (LE-078) con los cortes de inventario vigentes. */
const COLOR_BARRA_STOCK = (porcentaje: number) =>
  porcentaje < CORTE_INVENTARIO.rojo * 100 ? 'bg-critical-600' : porcentaje < CORTE_INVENTARIO.ambar * 100 ? 'bg-warn-500' : 'bg-ok-600';

const BarraDistribucion: React.FC<{ etiqueta: string; pct: number; detalle: string; color: string }> = ({ etiqueta, pct, detalle, color }) => (
  <div className="flex items-center gap-3 text-body-sm">
    <span className="w-20 shrink-0 text-neutral-600">{etiqueta}</span>
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
      <div className={cn('h-full', color)} style={{ width: `${pct}%` }} />
    </div>
    <span className="w-20 shrink-0 text-right font-medium tabular-nums text-neutral-900">{detalle}</span>
  </div>
);

interface ModuloMetricasProps {
  datos: DatosOperacion;
  /** Antigüedad del último dato del día a día; sin valor (sin datos en vivo) no se muestra. */
  segundosDesdeActualizacion?: number;
}

/** Indicadores de la operación día a día: cumplimiento, flota y planificador, con desagregados que no
 * se ven en ningún otro panel (por tipo de unidad, por nivel de holgura y por almacén). */
export const ModuloMetricas: React.FC<ModuloMetricasProps> = ({ datos, segundosDesdeActualizacion }) => {
  const { indicadores, resumen, flota, almacenes } = datos;
  const enRuta = flota.filter((u) => u.estado === 'EN_RUTA').length;
  const porTipo = estadoFlota(datos).porTipo;
  const pedidosActivos = Object.values(datos.pedidos);
  const porNivel = (['ROJO', 'AMBAR', 'VERDE', 'CERRADO'] as NivelHolgura[]).map((nivel) => ({
    nivel,
    cantidad: pedidosActivos.filter((p) => p.nivel === nivel).length,
  }));
  const almacenesOrdenados = [...almacenes].filter((a) => a.porcentajeStock !== null).sort((a, b) => (a.porcentajeStock ?? 0) - (b.porcentajeStock ?? 0));

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-superficie">
      <EncabezadoPagina
        titulo="Métricas de la operación"
        descripcion="Indicadores en vivo de la operación día a día."
        estado={segundosDesdeActualizacion !== undefined && <Insignia>Actualizado hace {formatearAntiguedad(segundosDesdeActualizacion)}</Insignia>}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
          <Tarjeta cuerpoClassName="flex flex-col gap-3">
            <TituloGrupo nivel={2} icono={Truck}>
              Entregas y flota
            </TituloGrupo>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Indicador
                etiqueta="Entregas en plazo"
                valor={formatoPorcentaje(indicadores.porcentajeCumplimiento)}
                detalle={`${resumen.enPlazo} de ${resumen.entregados} entregados`}
              />
              <Indicador
                etiqueta="Unidades en ruta"
                valor={`${enRuta} / ${flota.length}`}
                detalle={formatoPorcentaje(flota.length === 0 ? 0 : (enRuta / flota.length) * 100)}
              />
              <Indicador etiqueta="Tiempo promedio de entrega" valor={formatearDuracion(indicadores.tiempoPromedioEntregaMinutos)} />
              <Indicador etiqueta="Distancia recorrida" valor={`${formatearNumero(Math.round(indicadores.distanciaTotalKm))} km`} />
            </div>
          </Tarjeta>

          <Tarjeta cuerpoClassName="flex flex-col gap-3">
            <TituloGrupo nivel={2} icono={Truck}>
              Flota por tipo de unidad
            </TituloGrupo>
            <table className="w-full text-body-sm text-neutral-700">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-600">
                  <th className="py-1.5 font-medium">Tipo</th>
                  <th className="py-1.5 text-right font-medium">En ruta</th>
                  <th className="py-1.5 text-right font-medium">Total</th>
                  <th className="py-1.5 text-right font-medium">Carga a bordo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {porTipo.map((t) => (
                  <tr key={t.tipo}>
                    <td className="py-1.5 font-medium text-neutral-900">{capitalizar(UNIDADES[t.tipo].nombre)}</td>
                    <td className="py-1.5 text-right tabular-nums">{t.enRuta}</td>
                    <td className="py-1.5 text-right tabular-nums">{t.total}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {t.cargaABordo === null ? (
                        '—'
                      ) : (
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <MarcaSemaforo nivel={nivelDeOcupacion(t.carga, t.capacidad)} />
                          {formatoPorcentaje(t.cargaABordo * 100)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tarjeta>

          <Tarjeta cuerpoClassName="flex flex-col gap-3">
            <TituloGrupo nivel={2} icono={Package}>
              Pedidos por nivel de holgura
            </TituloGrupo>
            <div className="flex flex-col gap-2">
              {porNivel.map(({ nivel, cantidad }) => {
                const pct = pedidosActivos.length === 0 ? 0 : (cantidad / pedidosActivos.length) * 100;
                return (
                  <BarraDistribucion
                    key={nivel}
                    etiqueta={NOMBRE_HOLGURA[nivel]}
                    pct={pct}
                    detalle={`${cantidad} (${pct.toFixed(0)} %)`}
                    color={COLOR_BARRA_NIVEL[nivel]}
                  />
                );
              })}
            </div>
          </Tarjeta>

          {almacenesOrdenados.length > 0 && (
            <Tarjeta cuerpoClassName="flex flex-col gap-3">
              <TituloGrupo nivel={2} icono={Warehouse}>
                Stock por almacén
              </TituloGrupo>
              <div className="flex flex-col gap-2">
                {almacenesOrdenados.map((a) => (
                  <BarraDistribucion
                    key={a.id}
                    etiqueta={ALMACENES.find((x) => x.id === a.id)?.nombreCorto ?? a.id}
                    pct={a.porcentajeStock ?? 0}
                    detalle={formatoPorcentaje(a.porcentajeStock ?? 0)}
                    color={COLOR_BARRA_STOCK(a.porcentajeStock ?? 0)}
                  />
                ))}
              </div>
            </Tarjeta>
          )}

          <Tarjeta cuerpoClassName="flex flex-col gap-3">
            <TituloGrupo nivel={2} icono={ClipboardList}>
              Rendimiento del planificador
            </TituloGrupo>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Indicador etiqueta="Planificaciones ejecutadas" valor={formatearNumero(indicadores.replanificaciones)} />
              <Indicador etiqueta="Tiempo de la última planificación" valor={`${formatearNumero(indicadores.tiempoComputoUltimoTaMs)} ms`} />
            </div>
          </Tarjeta>
        </div>
      </div>
    </div>
  );
};
