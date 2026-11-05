import { useCallback, useState } from 'react';
import { TopNavbar, type TabModulo } from './components/layout/TopNavbar';
import { ProveedorAvisos } from './components/layout/Avisos';
import { EstadoConexion } from './components/layout/EstadoConexion';
import { FooterBar } from './components/layout/FooterBar';
import { ModuloOperacion } from './components/operacion/ModuloOperacion';
import { ModuloPedidos } from './components/pedidos/ModuloPedidos';
import { ModuloSimulacion } from './components/simulacion/ModuloSimulacion';
import { ContextoDatosOperacion, useEjecucionEnVivo } from './hooks/useDatosOperacion';
import { ProveedorAverias } from './components/layout/ProveedorAverias';
import { useConexionStomp } from './hooks/useConexionStomp';
import { useParametroUrlCerrado } from './hooks/useParametroUrl';
import { useSegundosDesde } from './hooks/useSegundosDesde';
import { ALMACENES, CORTE_INVENTARIO, UNIDADES } from './config/dominio';
import { useRangosSemaforoGlobales } from './hooks/useRangosSemaforo';
import { capitalizar, formatearFechaNumerica, formatearMiles } from './lib/formato';
import { turnoVigente } from './lib/turnos';
import { cantidadBloqueos, estadoFlota, pedidosEnRiesgo } from './lib/operacion';
import { ID_DIA_A_DIA } from './services/clienteApi';
import type { DatosOperacion, SubvistaOperacion } from './types/operacion';
import type { NivelHolgura, VistaPedidos } from './types/pedidos';

const formatoPorcentaje = (valor: number) => `${valor.toFixed(1).replace('.', ',')} %`;

// Qué pantalla se ve se refleja en la URL (?tab=…&panel=…&vista=…): se puede recargar, compartir o
// deshacer con el botón atrás. Un valor fuera de este conjunto (enlace viejo, URL escrita a mano) cae
// al valor por defecto en vez de romper la pantalla.
const TABS_VALIDAS: TabModulo[] = ['operacion', 'pedidos', 'simulacion', 'metricas'];
const SUBVISTAS_VALIDAS: SubvistaOperacion[] = ['vivo', 'resumen', 'incidencias', 'flota', 'bitacora'];
const VISTAS_PEDIDOS_VALIDAS: VistaPedidos[] = ['cola', 'registrar', 'registrado'];

const Indicador: React.FC<{ etiqueta: string; valor: string; detalle?: string; color?: string }> = ({
  etiqueta,
  valor,
  detalle,
  color = 'text-slate-800',
}) => (
  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-0.5">
    <span className="text-slate-600 text-xs">{etiqueta}</span>
    <span className={`text-base font-bold tabular-nums ${color}`}>{valor}</span>
    {detalle && <span className="text-slate-600 text-xs">{detalle}</span>}
  </div>
);

const NOMBRE_NIVEL: Record<NivelHolgura, string> = { ROJO: 'Crítico', AMBAR: 'Ajustado', VERDE: 'Holgado', CERRADO: 'Resuelto' };
const COLOR_BARRA_NIVEL: Record<NivelHolgura, string> = { ROJO: 'bg-red-500', AMBAR: 'bg-amber-500', VERDE: 'bg-green-500', CERRADO: 'bg-slate-400' };
/** Alerta de stock bajo (LE-078) con los cortes de inventario vigentes. */
const COLOR_BARRA_STOCK = (porcentaje: number) =>
  porcentaje < CORTE_INVENTARIO.rojo * 100 ? 'bg-red-500' : porcentaje < CORTE_INVENTARIO.ambar * 100 ? 'bg-amber-500' : 'bg-green-500';

const BarraDistribucion: React.FC<{ etiqueta: string; pct: number; detalle: string; color: string }> = ({ etiqueta, pct, detalle, color }) => (
  <div className="flex items-center gap-3 text-xs">
    <span className="w-20 shrink-0 text-slate-600">{etiqueta}</span>
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
    <span className="w-20 shrink-0 text-right tabular-nums font-medium text-slate-800">{detalle}</span>
  </div>
);

/** Indicadores de la operación día a día: cumplimiento, flota y planificador, con desagregados que no
 * se ven en ningún otro panel (por tipo de unidad, por nivel de holgura y por almacén). */
const PanelMetricas: React.FC<{ datos: DatosOperacion }> = ({ datos }) => {
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
    <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full space-y-4">
      <section className="bg-white p-6 rounded-xl border border-[#CBD5E1] shadow-xs">
        <h1 className="text-base font-bold text-slate-800 mb-1">Métricas de la operación</h1>
        <p className="text-xs text-slate-600 mb-4">Indicadores en vivo de la operación día a día.</p>
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Entregas y flota</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <Indicador
            etiqueta="Entregas en plazo"
            valor={formatoPorcentaje(indicadores.porcentajeCumplimiento)}
            detalle={`${resumen.enPlazo} de ${resumen.entregados} entregados`}
            color="text-green-700"
          />
          <Indicador
            etiqueta="Unidades en ruta"
            valor={`${enRuta} / ${flota.length}`}
            detalle={formatoPorcentaje(flota.length === 0 ? 0 : (enRuta / flota.length) * 100)}
            color="text-[#1E40AF]"
          />
          <Indicador etiqueta="Tiempo promedio de entrega" valor={`${Math.round(indicadores.tiempoPromedioEntregaMinutos)} min`} />
        </div>
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Planificador</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Indicador etiqueta="Planificaciones ejecutadas" valor={formatearMiles(indicadores.replanificaciones)} />
          <Indicador etiqueta="Tiempo de la última planificación" valor={`${indicadores.tiempoComputoUltimoTaMs} ms`} color="text-[#1E40AF]" />
          <Indicador etiqueta="Distancia recorrida" valor={`${formatearMiles(Math.round(indicadores.distanciaTotalKm))} km`} />
        </div>
      </section>

      <section className="bg-white p-6 rounded-xl border border-[#CBD5E1] shadow-xs">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Flota por tipo de unidad</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 text-left border-b border-slate-200">
              <th className="py-1.5 font-medium">Tipo</th>
              <th className="py-1.5 font-medium text-right">En ruta</th>
              <th className="py-1.5 font-medium text-right">Total</th>
              <th className="py-1.5 font-medium text-right">Carga a bordo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {porTipo.map((t) => (
              <tr key={t.tipo}>
                <td className="py-1.5 text-slate-800 font-medium">{capitalizar(UNIDADES[t.tipo].nombre)}</td>
                <td className="py-1.5 text-right tabular-nums">{t.enRuta}</td>
                <td className="py-1.5 text-right tabular-nums">{t.total}</td>
                <td className="py-1.5 text-right tabular-nums">{t.cargaABordo === null ? '—' : formatoPorcentaje(t.cargaABordo * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white p-6 rounded-xl border border-[#CBD5E1] shadow-xs">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Pedidos por nivel de holgura</h2>
        <div className="flex flex-col gap-2">
          {porNivel.map(({ nivel, cantidad }) => {
            const pct = pedidosActivos.length === 0 ? 0 : (cantidad / pedidosActivos.length) * 100;
            return (
              <BarraDistribucion
                key={nivel}
                etiqueta={NOMBRE_NIVEL[nivel]}
                pct={pct}
                detalle={`${cantidad} (${pct.toFixed(0)} %)`}
                color={COLOR_BARRA_NIVEL[nivel]}
              />
            );
          })}
        </div>
      </section>

      {almacenesOrdenados.length > 0 && (
        <section className="bg-white p-6 rounded-xl border border-[#CBD5E1] shadow-xs">
          <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Stock por almacén</h2>
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
        </section>
      )}
    </div>
  );
};

export default function App() {
  // Rangos del semáforo guardados en la API: al cambiarlos, toda la pantalla se vuelve a dibujar con ellos.
  useRangosSemaforoGlobales();
  const [tabActiva, fijarTabActiva] = useParametroUrlCerrado('tab', TABS_VALIDAS, 'operacion');
  // Cambiar de pestaña queda en el historial (atrás vuelve a la pestaña anterior); los parámetros más
  // finos de abajo (panel, vista) se reemplazan en vez de empujar, para no llenar el historial con cada clic.
  const setTabActiva = useCallback((tab: TabModulo) => fijarTabActiva(tab, { empujar: true }), [fijarTabActiva]);
  const [nodoHover, setNodoHover] = useState<{ x: number; y: number }>({ x: 19, y: 9 });

  // Sub-vista del módulo Pedidos (cola, registro y confirmación)
  const [vistaPedidos, setVistaPedidos] = useParametroUrlCerrado('vista', VISTAS_PEDIDOS_VALIDAS, 'cola');
  // Registro y confirmación traen su propio encabezado y no llevan barra inferior
  const pantallaCompleta = tabActiva === 'pedidos' && vistaPedidos !== 'cola';

  // Panel del mapa de Operación: 'vivo' sin panel, o su pestaña abierta (incidencias, flota, bitácora)
  const [subvistaOperacion, setSubvistaOperacion] = useParametroUrlCerrado('panel', SUBVISTAS_VALIDAS, 'vivo');
  const abrirOperacion = (subvista: SubvistaOperacion) => {
    setSubvistaOperacion(subvista);
    setTabActiva('operacion');
  };
  const enLienzo = tabActiva === 'operacion';

  // Pedido que Pedidos pidió ubicar en el lienzo; Operación lo abre y lo centra, y luego se limpia.
  const [pedidoAEnfocar, setPedidoAEnfocar] = useState<string | null>(null);
  const verPedidoEnLienzo = (codigo: string) => {
    setPedidoAEnfocar(codigo);
    abrirOperacion('vivo');
  };
  const limpiarPedidoAEnfocar = useCallback(() => setPedidoAEnfocar(null), []);

  const abrirPedidos = (vista: VistaPedidos) => {
    setVistaPedidos(vista);
    setTabActiva('pedidos');
  };

  // Operación día a día: una sola suscripción para Operación, Pedidos, Métricas y barra inferior.
  const diaADia = useEjecucionEnVivo(ID_DIA_A_DIA);
  const datos = diaADia.datos;

  // Segundos desde la última instantánea recibida, para la barra inferior.
  const segundosActualizado = useSegundosDesde(diaADia.recibidoEnMs);

  const conectado = useConexionStomp();
  const sinDatos = <EstadoConexion titulo="Operación día a día" error={diaADia.error} />;
  // En Simulación manda el reloj de la corrida: el del día a día se oculta para no mostrar dos relojes.
  const relojDiaADia = datos && tabActiva !== 'simulacion' ? datos.reloj : null;

  return (
    <ProveedorAvisos>
      <ProveedorAverias>
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F8FAFC]">
          <TopNavbar
            tabActiva={tabActiva}
            onCambiarTab={(tab) => (tab === 'pedidos' ? abrirPedidos('cola') : setTabActiva(tab))}
            relojSimulado={relojDiaADia ? formatearFechaNumerica(relojDiaADia, true) : undefined}
            turno={relojDiaADia ? turnoVigente(relojDiaADia).actual : undefined}
            conectado={conectado}
          />

          <ContextoDatosOperacion.Provider value={datos}>
            <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
              <main className="flex-1 relative flex overflow-hidden bg-[#F8FAFC]">
                {/* Operación queda montada aunque se cambie de pestaña, como la corrida de Simulación:
                    el zoom, el objeto abierto en el panel y las capas visibles del mapa no se pierden
                    al volver. Antes de la primera instantánea no hay nada que montar. */}
                {datos && (
                  <div className={tabActiva === 'operacion' ? 'flex-1 flex flex-col min-h-0 min-w-0' : 'hidden'}>
                    <ModuloOperacion
                      subvista={subvistaOperacion}
                      onCambiarSubvista={setSubvistaOperacion}
                      onHoverCoordenada={setNodoHover}
                      pedidoAEnfocar={pedidoAEnfocar}
                      onPedidoEnfocado={limpiarPedidoAEnfocar}
                    />
                  </div>
                )}
                {tabActiva === 'operacion' && !datos && sinDatos}

                {tabActiva === 'pedidos' &&
                  (datos ? (
                    <ModuloPedidos vista={vistaPedidos} onCambiarVista={setVistaPedidos} onVerEnLienzo={verPedidoEnLienzo} />
                  ) : (
                    sinDatos
                  ))}

                {/* Simulación queda montada aunque se cambie de pestaña: la corrida elegida no se pierde */}
                <div className={tabActiva === 'simulacion' ? 'flex-1 flex flex-col min-h-0 min-w-0' : 'hidden'}>
                  <ModuloSimulacion />
                </div>

                {tabActiva === 'metricas' && (datos ? <PanelMetricas datos={datos} /> : sinDatos)}
              </main>

              {datos && !pantallaCompleta && tabActiva !== 'simulacion' && (
                <FooterBar
                  nodoSeleccionado={enLienzo ? nodoHover : undefined}
                  totalPedidos={datos.resumen.total}
                  entregados={datos.resumen.entregados}
                  enRuta={datos.resumen.enRuta}
                  criticos={pedidosEnRiesgo(datos).filter((p) => p.nivel === 'ROJO').length}
                  bloqueosActivos={cantidadBloqueos(datos)}
                  averiasActivas={datos.flota.filter((u) => u.estado === 'AVERIADA').length}
                  segundosDesdeActualizacion={segundosActualizado}
                  conectado={conectado}
                />
              )}
            </div>
          </ContextoDatosOperacion.Provider>
        </div>
      </ProveedorAverias>
    </ProveedorAvisos>
  );
}
