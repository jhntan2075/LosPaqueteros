import { useState, useEffect } from 'react';
import { Sidebar, type TabModulo } from './components/layout/Sidebar';
import { HeaderKPIs } from './components/layout/HeaderKPIs';
import { FooterBar } from './components/layout/FooterBar';
import { LegendModal } from './components/modals/LegendModal';
import { ModuloOperacion } from './components/operacion/ModuloOperacion';
import { ModuloPedidos } from './components/pedidos/ModuloPedidos';
import { BLOQUEOS, FLOTA, RESUMEN_PEDIDOS, pedidosEnRiesgo } from './mocks/operacion';
import type { SubvistaOperacion } from './types/operacion';
import type { VistaPedidos } from './types/pedidos';
import { useStompSocket } from './hooks/useStompSocket';
import { ModuloSimulacion } from './components/simulacion/ModuloSimulacion';

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

  // Modales
  const [modalLeyendaAbierto, setModalLeyendaAbierto] = useState(false);

  // Estado del Reloj y Simulación
  const [relojTexto, setRelojTexto] = useState('25/08/2026 · 11:15:40');
  const [segundosActualizado, setSegundosActualizado] = useState(1);

  // Hook STOMP persistente
  const { isConnected, subscribe } = useStompSocket({ debug: false });

  // Suscripción al tópico de estado en vivo
  useEffect(() => {
    if (!isConnected) return;

    const unsub = subscribe('/topic/ejecuciones/activa/estado', (data: any) => {
      if (data?.relojSimuladoFormateado) {
        setRelojTexto(data.relojSimuladoFormateado);
        setSegundosActualizado(0);
      }
    });

    return () => unsub();
  }, [isConnected, subscribe]);

  // Contador de segundos desde la última actualización
  useEffect(() => {
    const timer = setInterval(() => {
      setSegundosActualizado((prev) => (prev < 60 ? prev + 1 : 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC]">
      {/* Barra Lateral Izquierda (Figma: 90px con logo "P", Operación, Pedidos, etc.) */}
      <Sidebar
        tabActiva={tabActiva}
        subvistaOperacion={subvistaOperacion}
        onCambiarTab={(tab) => (tab === 'pedidos' ? abrirPedidos('cola') : setTabActiva(tab))}
        onCambiarSubvistaOperacion={abrirOperacion}
      />

      {/* Área Central: Header, Lienzo Principal y Footer */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Cinta Superior de KPIs y Reloj (Operación trae su propio encabezado y fila de KPIs) */}
        {!pantallaCompleta && tabActiva !== 'operacion' && tabActiva !== 'simulacion' && <HeaderKPIs
          relojSimulado={relojTexto}
          pedidosEntregados={412}
          totalPedidos={1305}
          pedidosEnRuta={87}
          pedidosEnEspera={806}
          pedidosEnRiesgoRojo={3}
          pedidosEnRiesgoAmbar={11}
          unidadesEnUso={34}
          totalUnidades={60}
          saturacion={0.82}
        />}

        {/* Vista dinámica según el módulo seleccionado en la barra lateral */}
        <main className="flex-1 relative flex overflow-hidden bg-[#F8FAFC]">
          {tabActiva === 'operacion' && (
            <ModuloOperacion
              subvista={subvistaOperacion}
              relojSimulado={relojTexto}
              conectado={isConnected}
              onCambiarSubvista={setSubvistaOperacion}
              onHoverCoordenada={setNodoHover}
            />
          )}

          {tabActiva === 'pedidos' && (
            <ModuloPedidos
              vista={vistaPedidos}
              relojSimulado={relojTexto}
              onCambiarVista={setVistaPedidos}
              onVerEnLienzo={() => setTabActiva('operacion')}
            />
          )}

          {tabActiva === 'planes' && (
            <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full space-y-4">
              <div className="bg-white p-6 rounded-xl border border-[#CBD5E1] shadow-xs">
                <h2 className="text-base font-bold text-slate-800 mb-1">Planes de Ruteo Generados</h2>
                <p className="text-xs text-slate-500 mb-4">Última reconciliación de rutas calculada por el motor GA / IACO (LE-058, LE-059).</p>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block">Tiempo Cómputo (Ta)</span>
                    <span className="text-base font-bold font-mono text-[#1E40AF]">320 ms</span>
                    <span className="text-[10px] text-green-600 block mt-1">Cumple Ta &lt; Sa / k</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block">Cadencia de Planificación (Sa)</span>
                    <span className="text-base font-bold font-mono text-slate-800">30 min</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block">Tramos Planificados</span>
                    <span className="text-base font-bold font-mono text-slate-800">48 rutas</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Simulación queda montada aunque se cambie de pestaña: una corrida en curso no se reinicia */}
          <div className={tabActiva === 'simulacion' ? 'flex-1 flex flex-col min-h-0 min-w-0' : 'hidden'}>
            <ModuloSimulacion onVerBitacoraCompleta={() => abrirOperacion('bitacora')} onAbrirLeyenda={() => setModalLeyendaAbierto(true)} />
          </div>

          {tabActiva === 'metricas' && (
            <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full space-y-4">
              <div className="bg-white p-6 rounded-xl border border-[#CBD5E1] shadow-xs">
                <h2 className="text-base font-bold text-slate-800 mb-1">Métricas y Reporte de Cierre</h2>
                <p className="text-xs text-slate-500 mb-4">Registro continuo de hitos e indicadores del sistema (LE-048, LE-099).</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-slate-50 rounded">
                    <span>Eficacia de entrega en plazo:</span>
                    <span className="font-mono font-bold text-green-700">99,03 % (408 / 412)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded">
                    <span>Ocupación de flota activa:</span>
                    <span className="font-mono font-bold text-[#1E40AF]">56,6 % (34 / 60)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded">
                    <span>Saturación de almacenamiento:</span>
                    <span className="font-mono font-bold text-[#B45309]">82 % (Ámbar)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'ajustes' && (
            <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full space-y-4">
              <div className="bg-white p-6 rounded-xl border border-[#CBD5E1] shadow-xs">
                <h2 className="text-base font-bold text-slate-800 mb-1">Ajustes y Configuración en Caliente (QA-05)</h2>
                <p className="text-xs text-slate-500 mb-4">Aplica cambios de parámetros en la siguiente iteración sin reiniciar.</p>
                <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                  <div>
                    <label className="text-[#64748B] block mb-1">Velocidad Camión Tipo A (km/h)</label>
                    <input type="number" defaultValue={50} className="w-full border border-[#CBD5E1] rounded p-2 font-mono" />
                  </div>
                  <div>
                    <label className="text-[#64748B] block mb-1">Velocidad Camión Tipo B (km/h)</label>
                    <input type="number" defaultValue={60} className="w-full border border-[#CBD5E1] rounded p-2 font-mono" />
                  </div>
                  <div>
                    <label className="text-[#64748B] block mb-1">Umbral Ámbar Semáforo (%)</label>
                    <input type="number" defaultValue={40} className="w-full border border-[#CBD5E1] rounded p-2 font-mono" />
                  </div>
                  <div>
                    <label className="text-[#64748B] block mb-1">Umbral Rojo Crítico (%)</label>
                    <input type="number" defaultValue={15} className="w-full border border-[#CBD5E1] rounded p-2 font-mono" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Barra de Estado Inferior (Figma: nodo (19,9), pedidos, holgura, leyenda) */}
        {!pantallaCompleta && tabActiva !== 'simulacion' && <FooterBar
          nodoSeleccionado={enLienzo ? nodoHover : undefined}
          totalPedidos={RESUMEN_PEDIDOS.total}
          entregados={RESUMEN_PEDIDOS.entregados}
          enRuta={RESUMEN_PEDIDOS.enRuta}
          enRiesgo={pedidosEnRiesgo().filter((p) => p.nivel === 'ROJO').length}
          bloqueosActivos={BLOQUEOS.length}
          averiasActivas={FLOTA.filter((u) => u.estado === 'AVERIADA').length}
          segundosDesdeActualizacion={segundosActualizado}
          onAbrirLeyenda={enLienzo ? () => setModalLeyendaAbierto(true) : undefined}
          onVerBitacora={() => abrirOperacion('bitacora')}
        />}
      </div>

      {/* Modales Interactivos del Diseño */}
      <LegendModal
        abierto={modalLeyendaAbierto}
        onCerrar={() => setModalLeyendaAbierto(false)}
      />
    </div>
  );
}
