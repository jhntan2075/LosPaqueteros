import React, { useMemo, useRef, useState } from 'react';
import { ContextoDatosOperacion, useDatosOperacion, useEjecucionEnVivo } from '../../hooks/useDatosOperacion';
import { useControlEjecucion } from '../../hooks/useEjecuciones';
import { estadoFlota, pedidosEnRiesgo, resumenRiesgo } from '../../lib/operacion';
import type { EjecucionApi } from '../../types/api';
import type { Coordenada } from '../../types/domain';
import type { EscenarioSimulacion, EstadoCorrida, MarcaAvance } from '../../types/simulacion';
import { EstadoConexion } from '../layout/EstadoConexion';
import { FooterBar } from '../layout/FooterBar';
import { GridMap, type DestinoMapa, type GridMapHandle } from '../map/GridMap';
import { PanelLateral, type SeleccionPanel } from '../operacion/PanelLateral';
import { RailKpis } from '../operacion/RailKpis';
import { DiagnosticoColapso } from './DiagnosticoColapso';
import { EncabezadoCorrida } from './EncabezadoCorrida';
import { InformeCorrida } from './InformeCorrida';

// Corrida de simulación (Figma "Corrida de Simulación" y variantes con panel de incidencias, flota,
// bitácora, detalle de pedido o vehículo, y "· Hasta el colapso"). Muestra en vivo la ejecución que
// corre en paqtracker-api: cualquier dispositivo que la abra ve lo mismo.

const ANCHO_PANEL_PX = 340 + 12;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

interface CorridaSimulacionProps {
  ejecucion: EjecucionApi;
  onSalir: () => void;
  onVerBitacoraCompleta: () => void;
  onAbrirLeyenda: () => void;
}

export const CorridaSimulacion: React.FC<CorridaSimulacionProps> = (props) => {
  const { datos, error } = useEjecucionEnVivo(props.ejecucion.id);
  if (!datos) return <EstadoConexion titulo={props.ejecucion.nombre} error={error} />;
  return (
    <ContextoDatosOperacion.Provider value={datos}>
      <CorridaEnVivo {...props} />
    </ContextoDatosOperacion.Provider>
  );
};

const CorridaEnVivo: React.FC<CorridaSimulacionProps> = ({ ejecucion, onSalir, onVerBitacoraCompleta, onAbrirLeyenda }) => {
  const datos = useDatosOperacion();
  const { detener } = useControlEjecucion(ejecucion.id);
  const mapaRef = useRef<GridMapHandle>(null);
  const [panel, setPanel] = useState<SeleccionPanel | null>(null);
  const [verInforme, setVerInforme] = useState(false);
  // El diagnóstico se abre solo al detectar el colapso; el usuario puede cerrarlo.
  const [diagnosticoCerrado, setDiagnosticoCerrado] = useState(false);
  const [nodo, setNodo] = useState<Coordenada>({ x: 19, y: 9 });

  const estado: EstadoCorrida =
    datos.estadoEjecucion === 'COLAPSADA' ? 'COLAPSO' : datos.estadoEjecucion === 'FINALIZADA' ? 'COMPLETADA' : 'EJECUCION';
  const colapso = estado === 'COLAPSO';
  const verDiagnostico = colapso && !diagnosticoCerrado && panel === null;
  const flota = estadoFlota(datos);
  const riesgo = pedidosEnRiesgo(datos);
  const dia = `${datos.reloj.getDate()} ${MESES[datos.reloj.getMonth()]}`;
  const destinos: DestinoMapa[] = useMemo(
    () => datos.flota.flatMap((u) => u.paradas.map((p) => ({ pedido: p.pedido, destino: p.destino, nivel: p.nivel, unidad: u.codigo }))),
    [datos.flota],
  );
  // Las marcas de avance salen de la bitácora: planificaciones e incidencias.
  const marcas: MarcaAvance[] = useMemo(
    () =>
      datos.eventos
        .filter((e) => e.categoria === 'PLANIFICADOR' || e.categoria === 'INCIDENCIA')
        .map((e) => ({ id: e.id, minuto: (e.instanteMs - datos.relojInicio.getTime()) / 60_000, tipo: e.categoria === 'PLANIFICADOR' ? 'PLANIFICADOR' : 'INCIDENCIA' })),
    [datos.eventos, datos.relojInicio],
  );

  if (verInforme) {
    return <InformeCorrida ejecucion={ejecucion} estado={estado} onVolverACorrida={() => setVerInforme(false)} onNuevaCorrida={onSalir} />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <EncabezadoCorrida
        escenario={ejecucion.tipoEscenario as EscenarioSimulacion}
        estado={estado}
        inicio={datos.relojInicio}
        relojSimulado={datos.reloj}
        simuladoMs={datos.transcurridoSimuladoMs}
        diasTotales={ejecucion.dias}
        transcurridoRealMs={datos.transcurridoRealMs}
        factorAceleracion={datos.factorAceleracion}
        marcas={marcas}
        onDetener={detener}
        onSalir={onSalir}
        onVerInforme={() => setVerInforme(true)}
      />
      <main className="flex-1 relative flex min-h-0 bg-[#F8FAFC]">
        <GridMap
          ref={mapaRef}
          variante="simulacion"
          unidades={datos.flota.filter((u) => u.estado !== 'DISPONIBLE')}
          destinos={destinos}
          bloqueos={datos.bloqueos}
          almacenes={datos.almacenes}
          seleccion={panel && (panel.tipo === 'pedido' || panel.tipo === 'vehiculo') ? panel : null}
          anchoPanelDerecho={panel || verDiagnostico ? ANCHO_PANEL_PX : 0}
          riesgo={riesgo.length}
          onSeleccionar={setPanel}
          onAbrirIncidencias={() => setPanel({ tipo: 'incidencias' })}
          onHoverCoordenada={setNodo}
          onAyuda={onAbrirLeyenda}
          slotKpis={
            <RailKpis
              resumen={datos.resumen}
              riesgo={resumenRiesgo(datos)}
              flota={{ ...flota, averiadas: flota.averiadas.length }}
              notaSaturacion={colapso ? 'al detectarse el colapso' : 'Alerta desde 0,70'}
              onVerFlota={() => setPanel({ tipo: 'flota' })}
              onVerIncidencias={() => setPanel({ tipo: 'incidencias' })}
            />
          }
        >
          {panel && (
            <PanelLateral
              pestanasCorrida
              seleccion={panel}
              onSeleccionar={setPanel}
              onCerrar={() => setPanel(null)}
              onCentrar={(punto) => mapaRef.current?.centrarEn(punto)}
              onVerBitacoraCompleta={onVerBitacoraCompleta}
            />
          )}
          {verDiagnostico && (
            <DiagnosticoColapso
              diaColapso={dia}
              onCerrar={() => setDiagnosticoCerrado(true)}
              onEstadoCompleto={() => setPanel({ tipo: 'incidencias' })}
              onVerInforme={() => setVerInforme(true)}
            />
          )}
        </GridMap>
      </main>
      <FooterBar
        nodoSeleccionado={nodo}
        totalPedidos={datos.resumen.total}
        entregados={datos.resumen.entregados}
        enRuta={datos.resumen.enRuta}
        enRiesgo={riesgo.filter((p) => p.nivel === 'ROJO').length}
        bloqueosActivos={datos.bloqueos.length}
        averiasActivas={flota.averiadas.length}
        segundosDesdeActualizacion={1}
        onAbrirLeyenda={onAbrirLeyenda}
        estadoAlerta={colapso ? 'mapa congelado al detectar el colapso' : undefined}
      />
    </div>
  );
};
