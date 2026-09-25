import { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Package, 
  Settings, 
  Play, 
  Pause, 
  RotateCcw, 
  Radio, 
  UploadCloud, 
  Clock
} from 'lucide-react';
import { useStompSocket } from './hooks/useStompSocket';
import { useVehicleInterpolation } from './hooks/useVehicleInterpolation';
import type { Camion, Almacen } from './types/domain';
import type { TipoEscenario, NivelSemaforo, IndicadoresOperacion } from './types/ejecucion';

// Datos de demostración iniciales para verificar render e interpolación
const ALMACENES_DEMO: Almacen[] = [
  { id: 'alm-1', codigo: 'ALM-LIMA-NORTE', nombre: 'Almacén Norte', ubicacion: { x: 80, y: 120 }, capacidadMaxima: 1500, stockActual: 1100, esPrincipal: true },
  { id: 'alm-2', codigo: 'ALM-LIMA-CENTRO', nombre: 'Almacén Central', ubicacion: { x: 320, y: 240 }, capacidadMaxima: 3000, stockActual: 2400, esPrincipal: true },
  { id: 'alm-3', codigo: 'ALM-LIMA-SUR', nombre: 'Almacén Sur', ubicacion: { x: 550, y: 400 }, capacidadMaxima: 1200, stockActual: 800, esPrincipal: false },
];

const CAMIONES_DEMO: Camion[] = [
  {
    id: 'cam-1',
    codigo: 'CAM-A01',
    tipo: 'A',
    capacidadMaxima: 30,
    cargaActual: 18,
    velocidadKmH: 50,
    estado: 'EN_RUTA',
    ubicacionActual: { x: 80, y: 120 },
    tramoEnCurso: {
      origen: { x: 80, y: 120 },
      destino: { x: 320, y: 240 },
      tiempoSalidaSimulado: 0,
      tiempoLlegadaEstimado: 60000, // 60 segundos
    }
  },
  {
    id: 'cam-2',
    codigo: 'CAM-B02',
    tipo: 'B',
    capacidadMaxima: 15,
    cargaActual: 10,
    velocidadKmH: 60,
    estado: 'EN_RUTA',
    ubicacionActual: { x: 320, y: 240 },
    tramoEnCurso: {
      origen: { x: 320, y: 240 },
      destino: { x: 550, y: 400 },
      tiempoSalidaSimulado: 10000,
      tiempoLlegadaEstimado: 70000,
    }
  },
  {
    id: 'cam-3',
    codigo: 'CAM-C03',
    tipo: 'C',
    capacidadMaxima: 5,
    cargaActual: 0,
    velocidadKmH: 70,
    estado: 'DISPONIBLE',
    ubicacionActual: { x: 550, y: 400 },
  }
];

export default function App() {
  const [escenarioActual, setEscenarioActual] = useState<TipoEscenario>('DIA_A_DIA');
  const [estaEjecutando, setEstaEjecutando] = useState<boolean>(false);
  const [tabActiva, setTabActiva] = useState<'mapa' | 'pedidos' | 'configuracion'>('mapa');

  // Reloj simulado local para interpolación
  const [tiempoSimuladoMs, setTiempoSimuladoMs] = useState<number>(0);
  const [camiones, setCamiones] = useState<Camion[]>(CAMIONES_DEMO);
  const [almacenes] = useState<Almacen[]>(ALMACENES_DEMO);

  // Hook STOMP persistente
  const { isConnected, subscribe } = useStompSocket({ debug: false });

  // Hook de interpolación continua con requestAnimationFrame (QA-02, LE-064)
  const posicionesInterpoladas = useVehicleInterpolation(camiones, tiempoSimuladoMs);

  const [indicadores] = useState<IndicadoresOperacion>({
    pedidosEntregadosATiempo: 142,
    pedidosEntregadosConRetraso: 3,
    pedidosPendientes: 28,
    camionesOperativos: 8,
    camionesAveriados: 0,
    tiempoPromedioEntregaMinutos: 45,
    tiempoComputoUltimoTaMs: 320,
    estadoSemaforoGlobal: 'VERDE',
  });

  // Suscripción a tópicos del backend si hay conexión
  useEffect(() => {
    if (!isConnected) return;

    const unsubEstado = subscribe('/topic/ejecuciones/activa/estado', (data: any) => {
      if (data?.unidades) setCamiones(data.unidades);
      if (data?.relojSimuladoMs) setTiempoSimuladoMs(data.relojSimuladoMs);
    });

    return () => {
      unsubEstado();
    };
  }, [isConnected, subscribe]);

  // Avance del reloj en modo demo local
  useEffect(() => {
    if (!estaEjecutando) return;
    const interval = setInterval(() => {
      setTiempoSimuladoMs((prev) => (prev + 500) % 75000);
    }, 100);
    return () => clearInterval(interval);
  }, [estaEjecutando]);

  const formatearReloj = (ms: number) => {
    const totalSegundos = Math.floor(ms / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  };

  const getSemaforoBadge = (nivel: NivelSemaforo) => {
    switch (nivel) {
      case 'VERDE':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-300">Semáforo: Normal (Verde)</span>;
      case 'AMBAR':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300">Semáforo: Alerta (Ámbar)</span>;
      case 'ROJO':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-300 animate-pulse">Semáforo: Crítico (Rojo)</span>;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100">
      {/* Barra Superior de Control y Estado */}
      <header className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">PaqTracker</h1>
            <p className="text-xs text-slate-400">Sistema de Ruteo y Monitoreo Logístico</p>
          </div>
        </div>

        {/* Relojes y Estado del Semáforo */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <Clock className="h-4 w-4 text-indigo-400" />
            <div className="text-xs">
              <span className="text-slate-400 mr-1">Simulado:</span>
              <span className="font-mono font-bold text-indigo-300">{formatearReloj(tiempoSimuladoMs)}</span>
            </div>
          </div>

          <div>{getSemaforoBadge(indicadores.estadoSemaforoGlobal)}</div>

          {/* Indicador WebSocket */}
          <div className="flex items-center space-x-1.5 text-xs">
            <Radio className={`h-4 w-4 ${isConnected ? 'text-green-400' : 'text-slate-500'}`} />
            <span className={isConnected ? 'text-green-400' : 'text-slate-400'}>
              {isConnected ? 'En Línea (STOMP)' : 'Sin Conexión API'}
            </span>
          </div>
        </div>

        {/* Controles de Escenario y Ejecución */}
        <div className="flex items-center space-x-3">
          <select 
            value={escenarioActual} 
            onChange={(e) => setEscenarioActual(e.target.value as TipoEscenario)}
            className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="DIA_A_DIA">Día a Día (Reloj Real)</option>
            <option value="SIMULACION_5_DIAS">Simulación 5 Días (k &gt; 1)</option>
            <option value="COLAPSO_LOGISTICO">Colapso Logístico</option>
          </select>

          <button
            onClick={() => setEstaEjecutando(!estaEjecutando)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              estaEjecutando 
                ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {estaEjecutando ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{estaEjecutando ? 'Pausar' : 'Iniciar'}</span>
          </button>

          <button 
            onClick={() => { setEstaEjecutando(false); setTiempoSimuladoMs(0); }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Reiniciar"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Navegación de Pestañas / Módulos Funcionales */}
      <nav className="bg-white border-b border-slate-200 px-6 py-2 flex space-x-4">
        <button
          onClick={() => setTabActiva('mapa')}
          className={`flex items-center space-x-2 text-sm font-medium py-1.5 px-3 rounded-md transition ${
            tabActiva === 'mapa' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>Visualizador del Mapa</span>
        </button>
        <button
          onClick={() => setTabActiva('pedidos')}
          className={`flex items-center space-x-2 text-sm font-medium py-1.5 px-3 rounded-md transition ${
            tabActiva === 'pedidos' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Registro y Carga de Pedidos</span>
        </button>
        <button
          onClick={() => setTabActiva('configuracion')}
          className={`flex items-center space-x-2 text-sm font-medium py-1.5 px-3 rounded-md transition ${
            tabActiva === 'configuracion' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Parámetros y Semáforo</span>
        </button>
      </nav>

      {/* Contenido Principal */}
      <main className="flex-1 flex overflow-hidden">
        {tabActiva === 'mapa' && (
          <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
            {/* Lienzo Interactivo del Mapa (SVG con soporte Pan/Zoom) */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Red de Transporte y Posición de Unidades (LE-064)</span>
                <span className="text-xs text-slate-400">Interpolación por requestAnimationFrame</span>
              </div>

              <div className="flex-1 border border-slate-100 rounded-lg bg-slate-900 relative overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 650 500">
                  {/* Tramos de red vial (Grid / Rutas) */}
                  <line x1="80" y1="120" x2="320" y2="240" stroke="#334155" strokeWidth="3" strokeDasharray="4 4" />
                  <line x1="320" y1="240" x2="550" y2="400" stroke="#334155" strokeWidth="3" strokeDasharray="4 4" />
                  <line x1="80" y1="120" x2="550" y2="400" stroke="#1e293b" strokeWidth="2" />

                  {/* Almacenes */}
                  {almacenes.map((alm) => (
                    <g key={alm.id} transform={`translate(${alm.ubicacion.x}, ${alm.ubicacion.y})`}>
                      <rect x="-16" y="-16" width="32" height="32" rx="6" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                      <text x="0" y="26" fill="#cbd5e1" fontSize="10" textAnchor="middle" fontWeight="bold">
                        {alm.codigo}
                      </text>
                      <text x="0" y="38" fill="#94a3b8" fontSize="9" textAnchor="middle">
                        Stock: {alm.stockActual}/{alm.capacidadMaxima}
                      </text>
                    </g>
                  ))}

                  {/* Camiones con posición interpolada en tiempo real */}
                  {Object.values(posicionesInterpoladas).map((pos) => (
                    <g key={pos.camionId} transform={`translate(${pos.coordenada.x}, ${pos.coordenada.y})`}>
                      <circle r="12" fill={pos.enMovimiento ? '#22c55e' : '#f59e0b'} stroke="#ffffff" strokeWidth="2" />
                      <text x="0" y="4" fill="#ffffff" fontSize="9" textAnchor="middle" fontWeight="bold">
                        {pos.codigo.replace('CAM-', '')}
                      </text>
                      <text x="0" y="-16" fill="#f8fafc" fontSize="9" textAnchor="middle">
                        {pos.progresoPorcentaje}%
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Panel Lateral de Indicadores y Unidades */}
            <div className="w-full md:w-80 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col space-y-4 overflow-y-auto">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-2">Indicadores Clave</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-slate-500 block">A Tiempo</span>
                    <span className="text-base font-bold text-green-600">{indicadores.pedidosEntregadosATiempo}</span>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-slate-500 block">Con Retraso</span>
                    <span className="text-base font-bold text-red-600">{indicadores.pedidosEntregadosConRetraso}</span>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-slate-500 block">Pendientes</span>
                    <span className="text-base font-bold text-slate-700">{indicadores.pedidosPendientes}</span>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-slate-500 block">Último Ta</span>
                    <span className="text-base font-bold text-indigo-600">{indicadores.tiempoComputoUltimoTaMs} ms</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-2">Flota en Operación</h3>
                <div className="space-y-2">
                  {camiones.map((c) => (
                    <div key={c.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-700 block">{c.codigo} (Tipo {c.tipo})</span>
                        <span className="text-slate-500">Carga: {c.cargaActual}/{c.capacidadMaxima} paq.</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.estado === 'EN_RUTA' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {c.estado}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tabActiva === 'pedidos' && (
          <div className="p-6 max-w-4xl mx-auto w-full space-y-6 overflow-y-auto">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 mb-1">Carga Masiva de Archivos</h2>
              <p className="text-xs text-slate-500 mb-4">Sube los archivos mensuales de pedidos (ventas2026mm) y bloqueos según LE-006 / LE-007.</p>
              
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-500 transition cursor-pointer">
                <UploadCloud className="h-10 w-10 text-indigo-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-slate-700 block">Arrastra tus archivos aquí o haz clic para examinar</span>
                <span className="text-xs text-slate-400">Formatos compatibles: .txt, .csv</span>
              </div>
            </div>
          </div>
        )}

        {tabActiva === 'configuracion' && (
          <div className="p-6 max-w-4xl mx-auto w-full space-y-6 overflow-y-auto">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 mb-1">Configuración en Caliente (QA-05)</h2>
              <p className="text-xs text-slate-500 mb-4">Los cambios aplicarán en la siguiente iteración de planificación (Sa) sin reiniciar la ejecución.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cadencia de Consumo (Sc en seg)</label>
                  <input type="number" defaultValue={1} className="w-full border border-slate-300 rounded-lg p-2" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cadencia de Planificación (Sa en min)</label>
                  <input type="number" defaultValue={30} className="w-full border border-slate-300 rounded-lg p-2" />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
