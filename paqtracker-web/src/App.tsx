import { useState, useEffect } from 'react';
import { Sidebar, type TabModulo } from './components/layout/Sidebar';
import { HeaderKPIs } from './components/layout/HeaderKPIs';
import { FooterBar } from './components/layout/FooterBar';
import { GridMap } from './components/map/GridMap';
import { OrderRegistrationModal } from './components/modals/OrderRegistrationModal';
import { OrderQueueModal } from './components/modals/OrderQueueModal';
import { LegendModal } from './components/modals/LegendModal';
import { useStompSocket } from './hooks/useStompSocket';
import { UploadCloud, Play, Pause, RotateCcw } from 'lucide-react';
import type { TipoEscenario } from './types/ejecucion';

export default function App() {
  const [tabActiva, setTabActiva] = useState<TabModulo>('operacion');
  const [nodoHover, setNodoHover] = useState<{ x: number; y: number }>({ x: 19, y: 9 });

  // Modales
  const [modalRegistroAbierto, setModalRegistroAbierto] = useState(false);
  const [modalColaAbierto, setModalColaAbierto] = useState(false);
  const [modalLeyendaAbierto, setModalLeyendaAbierto] = useState(false);

  // Estado del Reloj y Simulación
  const [relojTexto, setRelojTexto] = useState('25/08/2026 · 11:15:40');
  const [segundosActualizado, setSegundosActualizado] = useState(1);
  const [escenarioActual, setEscenarioActual] = useState<TipoEscenario>('DIA_A_DIA');
  const [enEjecucion, setEnEjecucion] = useState(true);

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
      <Sidebar tabActiva={tabActiva} onCambiarTab={setTabActiva} />

      {/* Área Central: Header, Lienzo Principal y Footer */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Cinta Superior de KPIs y Reloj de Operación */}
        <HeaderKPIs
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
        />

        {/* Vista dinámica según el módulo seleccionado en la barra lateral */}
        <main className="flex-1 relative flex overflow-hidden bg-[#F8FAFC]">
          {tabActiva === 'operacion' && (
            <GridMap
              onHoverCoordenada={(coord) => setNodoHover(coord)}
              onRegistrarPedidoClick={() => setModalRegistroAbierto(true)}
              onColaPedidosClick={() => setModalColaAbierto(true)}
              onAbrirAyudaClick={() => setModalLeyendaAbierto(true)}
            />
          )}

          {tabActiva === 'pedidos' && (
            <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full space-y-4">
              <div className="bg-white p-6 rounded-xl border border-[#CBD5E1] shadow-xs">
                <h2 className="text-base font-bold text-slate-800 mb-1">Módulo de Pedidos</h2>
                <p className="text-xs text-slate-500 mb-4">Gestión y carga masiva de ventas mensuales (LE-006 / LE-007).</p>
                <div
                  onClick={() => setModalRegistroAbierto(true)}
                  className="border-2 border-dashed border-[#CBD5E1] rounded-lg p-8 text-center hover:border-[#1E40AF] transition cursor-pointer"
                >
                  <UploadCloud className="w-10 h-10 text-[#1E40AF] mx-auto mb-2" />
                  <span className="text-sm font-medium text-slate-700 block">
                    Arrastra aquí el archivo ventas2026mm.txt o haz clic para subir
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">Formato oficial de pedidos de PaqRap</span>
                </div>
              </div>
            </div>
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

          {tabActiva === 'simulacion' && (
            <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full space-y-4">
              <div className="bg-white p-6 rounded-xl border border-[#CBD5E1] shadow-xs">
                <h2 className="text-base font-bold text-slate-800 mb-1">Control de Escenarios</h2>
                <p className="text-xs text-slate-500 mb-4">Ejecución independiente de los 3 escenarios del curso (DA-08, LE-043).</p>
                <div className="flex items-center gap-3">
                  <select
                    value={escenarioActual}
                    onChange={(e) => setEscenarioActual(e.target.value as TipoEscenario)}
                    className="border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs font-mono"
                  >
                    <option value="DIA_A_DIA">Día a Día (Reloj real, k = 1)</option>
                    <option value="SIMULACION_5_DIAS">Simulación de 5 Días (30 a 60 min reales)</option>
                    <option value="COLAPSO_LOGISTICO">Colapso Logístico</option>
                  </select>
                  <button
                    onClick={() => setEnEjecucion(!enEjecucion)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium text-white flex items-center gap-1.5 transition ${
                      enEjecucion ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#1E40AF] hover:bg-blue-800'
                    }`}
                  >
                    {enEjecucion ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{enEjecucion ? 'Pausar Simulación' : 'Iniciar Simulación'}</span>
                  </button>
                  <button
                    onClick={() => alert('Simulación reiniciada a hora cero.')}
                    className="p-2 border border-[#CBD5E1] rounded-lg text-slate-600 hover:bg-slate-100 transition"
                    title="Reiniciar a hora 0"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

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
        <FooterBar
          nodoSeleccionado={nodoHover}
          totalPedidos={1305}
          entregados={412}
          enRuta={87}
          enRiesgo={3}
          bloqueosActivos={4}
          averiasActivas={2}
          segundosDesdeActualizacion={segundosActualizado}
          onAbrirLeyenda={() => setModalLeyendaAbierto(true)}
        />
      </div>

      {/* Modales Interactivos del Diseño */}
      <OrderRegistrationModal
        abierto={modalRegistroAbierto}
        onCerrar={() => setModalRegistroAbierto(false)}
      />

      <OrderQueueModal
        abierto={modalColaAbierto}
        onCerrar={() => setModalColaAbierto(false)}
      />

      <LegendModal
        abierto={modalLeyendaAbierto}
        onCerrar={() => setModalLeyendaAbierto(false)}
      />
    </div>
  );
}
