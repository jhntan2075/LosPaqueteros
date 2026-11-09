import { useCallback, useState } from 'react';
import { TopNavbar, type TabModulo } from './components/layout/TopNavbar';
import { ProveedorAvisos } from './components/layout/Avisos';
import { EstadoConexion } from './components/layout/EstadoConexion';
import { FooterBar } from './components/layout/FooterBar';
import { ModuloOperacion } from './components/operacion/ModuloOperacion';
import { ModuloPedidos } from './components/pedidos/ModuloPedidos';
import { ModuloSimulacion } from './components/simulacion/ModuloSimulacion';
import { ModuloConfiguracion } from './components/configuracion/ModuloConfiguracion';
import { ModuloMetricas } from './components/metricas/ModuloMetricas';
import { ContextoDatosOperacion, useEjecucionEnVivo } from './hooks/useDatosOperacion';
import { ProveedorAverias } from './components/layout/ProveedorAverias';
import { useConexionStomp } from './hooks/useConexionStomp';
import { useParametroUrlCerrado } from './hooks/useParametroUrl';
import { useSegundosDesde } from './hooks/useSegundosDesde';
import { useRangosSemaforoGlobales } from './hooks/useRangosSemaforo';
import { useParametrosDominioGlobales } from './hooks/useParametrosDominio';
import { formatearFechaLarga } from './lib/formato';
import { turnoVigente } from './lib/turnos';
import { cantidadBloqueos, pedidosEnRiesgo } from './lib/operacion';
import { ID_DIA_A_DIA } from './services/clienteApi';
import type { SubvistaOperacion } from './types/operacion';
import type { VistaPedidos } from './types/pedidos';

// Qué pantalla se ve se refleja en la URL (?tab=…&panel=…&vista=…): se puede recargar, compartir o
// deshacer con el botón atrás. Un valor fuera de este conjunto (enlace viejo, URL escrita a mano) cae
// al valor por defecto en vez de romper la pantalla.
const TABS_VALIDAS: TabModulo[] = ['operacion', 'pedidos', 'simulacion', 'metricas', 'configuracion'];
const SUBVISTAS_VALIDAS: SubvistaOperacion[] = ['vivo', 'resumen', 'incidencias', 'pedidos', 'flota', 'almacenes', 'bitacora'];
const VISTAS_PEDIDOS_VALIDAS: VistaPedidos[] = ['cola', 'registrar', 'registrado'];

export default function App() {
  // Rangos del semáforo guardados en la API: al cambiarlos, toda la pantalla se vuelve a dibujar con ellos.
  useRangosSemaforoGlobales();
  // Almacenes, unidades y averías configurados (B02, B04, B07-B09): al cambiarlos se vuelve a dibujar todo.
  useParametrosDominioGlobales();
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
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-superficie">
          <TopNavbar
            tabActiva={tabActiva}
            onCambiarTab={(tab) => (tab === 'pedidos' ? abrirPedidos('cola') : setTabActiva(tab))}
            relojSimulado={relojDiaADia ? formatearFechaLarga(relojDiaADia) : undefined}
            turno={relojDiaADia ? turnoVigente(relojDiaADia).actual : undefined}
            conectado={conectado}
          />

          <ContextoDatosOperacion.Provider value={datos}>
            <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
              <main className="flex-1 relative flex overflow-hidden bg-superficie">
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

                {tabActiva === 'metricas' && (datos ? <ModuloMetricas datos={datos} /> : sinDatos)}

                {tabActiva === 'configuracion' && <ModuloConfiguracion />}
              </main>

              {datos && !pantallaCompleta && tabActiva !== 'simulacion' && tabActiva !== 'configuracion' && (
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
