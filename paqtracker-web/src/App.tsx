import { useEffect, useState } from 'react';
import { TopNavbar, type TabModulo } from './components/layout/TopNavbar';
import { EstadoConexion } from './components/layout/EstadoConexion';
import { HeaderKPIs } from './components/layout/HeaderKPIs';
import { FooterBar } from './components/layout/FooterBar';
import { LegendModal } from './components/modals/LegendModal';
import { ModuloOperacion } from './components/operacion/ModuloOperacion';
import { ModuloPedidos } from './components/pedidos/ModuloPedidos';
import { ModuloSimulacion } from './components/simulacion/ModuloSimulacion';
import { ContextoDatosOperacion, useEjecucionEnVivo } from './hooks/useDatosOperacion';
import { useConexionStomp } from './hooks/useConexionStomp';
import { formatearFechaNumerica } from './lib/formato';
import { turnoVigente } from './lib/turnos';
import { pedidosEnRiesgo, resumenRiesgo } from './lib/operacion';
import { ID_DIA_A_DIA } from './services/clienteApi';
import type { DatosOperacion, SubvistaOperacion } from './types/operacion';
import type { VistaPedidos } from './types/pedidos';

const formatoPorcentaje = (valor: number) => `${valor.toFixed(1).replace('.', ',')} %`;

/** Indicadores del planificador (LE-058, LE-059) de la operación día a día. */
const PanelPlanes: React.FC<{ datos: DatosOperacion }> = ({ datos }) => {
  const { indicadores } = datos;
  return (
    <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full space-y-4">
      <div className="bg-white p-6 rounded-xl border border-[#CBD5E1] shadow-xs">
        <h2 className="text-base font-bold text-slate-800 mb-1">Planes de Ruteo Generados</h2>
        <p className="text-xs text-slate-500 mb-4">Última planificación del motor de la operación día a día (LE-058, LE-059).</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-500 block">Tiempo de cómputo (Ta)</span>
            <span className="text-base font-bold font-mono text-[#1E40AF]">{indicadores.tiempoComputoUltimoTaMs} ms</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-500 block">Planificaciones ejecutadas</span>
            <span className="text-base font-bold font-mono text-slate-800">{indicadores.replanificaciones}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-500 block">Distancia recorrida</span>
            <span className="text-base font-bold font-mono text-slate-800">{Math.round(indicadores.distanciaTotalKm)} km</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Indicadores de cierre de la operación día a día. */
const PanelMetricas: React.FC<{ datos: DatosOperacion }> = ({ datos }) => {
  const { indicadores, resumen, flota } = datos;
  const enRuta = flota.filter((u) => u.estado === 'EN_RUTA').length;
  return (
    <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full space-y-4">
      <div className="bg-white p-6 rounded-xl border border-[#CBD5E1] shadow-xs">
        <h2 className="text-base font-bold text-slate-800 mb-1">Métricas de la operación</h2>
        <p className="text-xs text-slate-500 mb-4">Indicadores en vivo de la operación día a día (LE-086).</p>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between p-2 bg-slate-50 rounded">
            <span>Entregas en plazo:</span>
            <span className="font-mono font-bold text-green-700">
              {formatoPorcentaje(indicadores.porcentajeCumplimiento)} ({resumen.enPlazo} / {resumen.entregados})
            </span>
          </div>
          <div className="flex justify-between p-2 bg-slate-50 rounded">
            <span>Ocupación de la flota:</span>
            <span className="font-mono font-bold text-[#1E40AF]">
              {formatoPorcentaje(flota.length === 0 ? 0 : (enRuta / flota.length) * 100)} ({enRuta} / {flota.length})
            </span>
          </div>
          <div className="flex justify-between p-2 bg-slate-50 rounded">
            <span>Tiempo promedio de entrega:</span>
            <span className="font-mono font-bold text-slate-800">{Math.round(indicadores.tiempoPromedioEntregaMinutos)} min</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [tabActiva, setTabActiva] = useState<TabModulo>('operacion');
  const [nodoHover, setNodoHover] = useState<{ x: number; y: number }>({ x: 19, y: 9 });

  // Sub-vista del módulo Pedidos (PE-02 cola, PE-01 registro y confirmación)
  const [vistaPedidos, setVistaPedidos] = useState<VistaPedidos>('cola');
  // Registro y confirmación traen su propio encabezado y no llevan barra inferior
  const pantallaCompleta = tabActiva === 'pedidos' && vistaPedidos !== 'cola';

  // Sub-vista de Operación (lienzo en vivo, incidencias, OP-07 flota, OP-09 bitácora)
  const [subvistaOperacion, setSubvistaOperacion] = useState<SubvistaOperacion>('vivo');
  const abrirOperacion = (subvista: SubvistaOperacion) => {
    setSubvistaOperacion(subvista);
    setTabActiva('operacion');
  };
  const enLienzo = tabActiva === 'operacion' && (subvistaOperacion === 'vivo' || subvistaOperacion === 'incidencias');

  const abrirPedidos = (vista: VistaPedidos) => {
    setVistaPedidos(vista);
    setTabActiva('pedidos');
  };

  const [modalLeyendaAbierto, setModalLeyendaAbierto] = useState(false);

  // Operación día a día: una sola suscripción para Operación, Pedidos, encabezado y barra inferior.
  const diaADia = useEjecucionEnVivo(ID_DIA_A_DIA);
  const datos = diaADia.datos;

  // Segundos desde la última instantánea recibida, para la barra inferior.
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const temporizador = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(temporizador);
  }, []);
  const segundosActualizado = diaADia.recibidoEnMs === 0 ? 0 : Math.max(0, Math.round((ahora - diaADia.recibidoEnMs) / 1000));

  const conectado = useConexionStomp();
  const riesgo = datos ? resumenRiesgo(datos) : null;
  const sinDatos = <EstadoConexion titulo="Operación día a día" error={diaADia.error} />;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F8FAFC]">
      <TopNavbar
        tabActiva={tabActiva}
        onCambiarTab={(tab) => (tab === 'pedidos' ? abrirPedidos('cola') : setTabActiva(tab))}
        relojSimulado={datos ? formatearFechaNumerica(datos.reloj, true) : undefined}
        turno={datos ? turnoVigente(datos.reloj).actual : undefined}
        conectado={conectado}
      />

      <ContextoDatosOperacion.Provider value={datos}>
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          {/* Cinta superior de KPIs (Operación y Simulación traen su propio encabezado) */}
          {datos && riesgo && !pantallaCompleta && tabActiva !== 'operacion' && tabActiva !== 'simulacion' && (
            <HeaderKPIs
              pedidosEntregados={datos.resumen.entregados}
              totalPedidos={datos.resumen.total}
              pedidosEnRuta={datos.resumen.enRuta}
              pedidosEnEspera={datos.resumen.enEspera}
              pedidosEnRiesgoRojo={riesgo.rojo}
              pedidosEnRiesgoAmbar={riesgo.ambar}
              unidadesEnUso={datos.flota.filter((u) => u.estado === 'EN_RUTA').length}
              totalUnidades={datos.flota.length}
              saturacion={datos.resumen.saturacion}
            />
          )}

          <main className="flex-1 relative flex overflow-hidden bg-[#F8FAFC]">
            {tabActiva === 'operacion' &&
              (datos ? (
                <ModuloOperacion subvista={subvistaOperacion} onCambiarSubvista={setSubvistaOperacion} onHoverCoordenada={setNodoHover} />
              ) : (
                sinDatos
              ))}

            {tabActiva === 'pedidos' &&
              (datos ? (
                <ModuloPedidos vista={vistaPedidos} onCambiarVista={setVistaPedidos} onVerEnLienzo={() => setTabActiva('operacion')} />
              ) : (
                sinDatos
              ))}

            {tabActiva === 'planes' && (datos ? <PanelPlanes datos={datos} /> : sinDatos)}

            {/* Simulación queda montada aunque se cambie de pestaña: la corrida elegida no se pierde */}
            <div className={tabActiva === 'simulacion' ? 'flex-1 flex flex-col min-h-0 min-w-0' : 'hidden'}>
              <ModuloSimulacion onVerBitacoraCompleta={() => abrirOperacion('bitacora')} onAbrirLeyenda={() => setModalLeyendaAbierto(true)} />
            </div>

            {tabActiva === 'metricas' && (datos ? <PanelMetricas datos={datos} /> : sinDatos)}

            {tabActiva === 'ajustes' && (
              <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full space-y-4">
                <div className="bg-white p-6 rounded-xl border border-[#CBD5E1] shadow-xs">
                  <h2 className="text-base font-bold text-slate-800 mb-1">Ajustes y configuración</h2>
                  <p className="text-xs text-slate-500">
                    La edición de parámetros en caliente (CU-26 a CU-28) se incorpora en una entrega posterior. Los parámetros vigentes
                    se definen en la configuración del servidor.
                  </p>
                </div>
              </div>
            )}
          </main>

          {datos && !pantallaCompleta && tabActiva !== 'simulacion' && (
            <FooterBar
              nodoSeleccionado={enLienzo ? nodoHover : undefined}
              totalPedidos={datos.resumen.total}
              entregados={datos.resumen.entregados}
              enRuta={datos.resumen.enRuta}
              enRiesgo={pedidosEnRiesgo(datos).filter((p) => p.nivel === 'ROJO').length}
              bloqueosActivos={datos.bloqueos.length}
              averiasActivas={datos.flota.filter((u) => u.estado === 'AVERIADA').length}
              segundosDesdeActualizacion={segundosActualizado}
              onAbrirLeyenda={enLienzo ? () => setModalLeyendaAbierto(true) : undefined}
              onVerBitacora={() => abrirOperacion('bitacora')}
            />
          )}
        </div>
      </ContextoDatosOperacion.Provider>

      <LegendModal abierto={modalLeyendaAbierto} onCerrar={() => setModalLeyendaAbierto(false)} />
    </div>
  );
}
