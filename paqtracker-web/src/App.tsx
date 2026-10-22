import { useCallback, useState } from 'react';
import { TopNavbar, type TabModulo } from './components/layout/TopNavbar';
import { EstadoConexion } from './components/layout/EstadoConexion';
import { FooterBar } from './components/layout/FooterBar';
import { ModuloOperacion } from './components/operacion/ModuloOperacion';
import { ModuloPedidos } from './components/pedidos/ModuloPedidos';
import { ModuloSimulacion } from './components/simulacion/ModuloSimulacion';
import { ContextoDatosOperacion, useEjecucionEnVivo } from './hooks/useDatosOperacion';
import { useConexionStomp } from './hooks/useConexionStomp';
import { useSegundosDesde } from './hooks/useSegundosDesde';
import { formatearFechaNumerica, formatearMiles } from './lib/formato';
import { turnoVigente } from './lib/turnos';
import { pedidosEnRiesgo } from './lib/operacion';
import { ID_DIA_A_DIA } from './services/clienteApi';
import type { DatosOperacion, SubvistaOperacion } from './types/operacion';
import type { VistaPedidos } from './types/pedidos';

const formatoPorcentaje = (valor: number) => `${valor.toFixed(1).replace('.', ',')} %`;

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

/** Indicadores de la operación día a día: cumplimiento, flota y planificador en una sola vista. */
const PanelMetricas: React.FC<{ datos: DatosOperacion }> = ({ datos }) => {
  const { indicadores, resumen, flota } = datos;
  const enRuta = flota.filter((u) => u.estado === 'EN_RUTA').length;
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
    </div>
  );
};

export default function App() {
  const [tabActiva, setTabActiva] = useState<TabModulo>('operacion');
  const [nodoHover, setNodoHover] = useState<{ x: number; y: number }>({ x: 19, y: 9 });

  // Sub-vista del módulo Pedidos (cola, registro y confirmación)
  const [vistaPedidos, setVistaPedidos] = useState<VistaPedidos>('cola');
  // Registro y confirmación traen su propio encabezado y no llevan barra inferior
  const pantallaCompleta = tabActiva === 'pedidos' && vistaPedidos !== 'cola';

  // Panel del mapa de Operación: 'vivo' sin panel, o su pestaña abierta (incidencias, flota, bitácora)
  const [subvistaOperacion, setSubvistaOperacion] = useState<SubvistaOperacion>('vivo');
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
            {tabActiva === 'operacion' &&
              (datos ? (
                <ModuloOperacion
                  subvista={subvistaOperacion}
                  onCambiarSubvista={setSubvistaOperacion}
                  onHoverCoordenada={setNodoHover}
                  pedidoAEnfocar={pedidoAEnfocar}
                  onPedidoEnfocado={limpiarPedidoAEnfocar}
                />
              ) : (
                sinDatos
              ))}

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
              bloqueosActivos={datos.bloqueos.length}
              averiasActivas={datos.flota.filter((u) => u.estado === 'AVERIADA').length}
              segundosDesdeActualizacion={segundosActualizado}
              conectado={conectado}
            />
          )}
        </div>
      </ContextoDatosOperacion.Provider>
    </div>
  );
}
