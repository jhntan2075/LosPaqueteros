import React, { useRef, useState } from 'react';
import { useCorridaSimulada, type EstadoCorrida } from '../../hooks/useCorridaSimulada';
import { unidadesEnElInstante } from '../../lib/movimiento';
import { BLOQUEOS, FLOTA, RESUMEN_PEDIDOS, estadoFlota, pedidosEnRiesgo } from '../../mocks/operacion';
import { FLOTA_COLAPSO, RESUMEN_COLAPSO, RIESGO_COLAPSO } from '../../mocks/simulacion';
import type { Coordenada } from '../../types/domain';
import type { ConfiguracionCorrida } from '../../types/simulacion';
import { FooterBar } from '../layout/FooterBar';
import { GridMap, type DestinoMapa, type GridMapHandle } from '../map/GridMap';
import { PanelLateral, type SeleccionPanel } from '../operacion/PanelLateral';
import { RailKpis } from '../operacion/RailKpis';
import { DiagnosticoColapso } from './DiagnosticoColapso';
import { EncabezadoCorrida } from './EncabezadoCorrida';

// Corrida de simulación (Figma "Corrida de Simulación" y variantes con panel de incidencias, flota,
// bitácora, detalle de pedido o vehículo, y "· Hasta el colapso"). El reloj lo lleva
// useCorridaSimulada; el estado del lienzo usa el conjunto de ejemplo de Operación hasta que
// paqtracker-api publique el estado de la corrida.

const ANCHO_PANEL_PX = 340 + 12;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DESTINOS: DestinoMapa[] = FLOTA.flatMap((u) => u.paradas.map((p) => ({ pedido: p.pedido, destino: p.destino, nivel: p.nivel, unidad: u.codigo })));
const UNIDADES_MAPA = FLOTA.filter((u) => u.estado !== 'DISPONIBLE');

export interface ResultadoCorrida {
  estado: EstadoCorrida;
  relojFinal: Date;
  simuladoMs: number;
  transcurridoRealMs: number;
}

interface CorridaSimulacionProps {
  configuracion: ConfiguracionCorrida;
  onDetener: () => void;
  onVerInforme: (resultado: ResultadoCorrida) => void;
  onVerBitacoraCompleta: () => void;
  onAbrirLeyenda: () => void;
}

export const CorridaSimulacion: React.FC<CorridaSimulacionProps> = ({ configuracion, onDetener, onVerInforme, onVerBitacoraCompleta, onAbrirLeyenda }) => {
  const corrida = useCorridaSimulada(configuracion.escenario, configuracion.inicio);
  const mapaRef = useRef<GridMapHandle>(null);
  const [panel, setPanel] = useState<SeleccionPanel | null>(null);
  // El diagnóstico se abre solo al detectar el colapso; el usuario puede cerrarlo.
  const [diagnosticoCerrado, setDiagnosticoCerrado] = useState(false);
  const [nodo, setNodo] = useState<Coordenada>({ x: 19, y: 9 });

  const colapso = corrida.estado === 'COLAPSO';
  const verDiagnostico = colapso && !diagnosticoCerrado && panel === null;
  const flota = estadoFlota();
  const riesgo = pedidosEnRiesgo();
  const dia = `${corrida.relojSimulado.getDate()} ${MESES[corrida.relojSimulado.getMonth()]}`;
  const verInforme = () =>
    onVerInforme({ estado: corrida.estado, relojFinal: corrida.relojSimulado, simuladoMs: corrida.simuladoMs, transcurridoRealMs: corrida.transcurridoRealMs });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <EncabezadoCorrida
        escenario={configuracion.escenario}
        inicio={configuracion.inicio}
        {...corrida}
        onDetener={onDetener}
        onVerInforme={verInforme}
      />
      <RailKpis
        resumen={colapso ? RESUMEN_COLAPSO : RESUMEN_PEDIDOS}
        riesgo={
          colapso
            ? RIESGO_COLAPSO
            : {
                rojo: riesgo.filter((p) => p.nivel === 'ROJO').length,
                ambar: riesgo.filter((p) => p.nivel === 'AMBAR').length,
                holguraMinima: riesgo[0]?.holgura ?? '—',
              }
        }
        flota={colapso ? FLOTA_COLAPSO : { ...flota, averiadas: flota.averiadas.length }}
        onVerFlota={() => setPanel({ tipo: 'flota' })}
        onVerIncidencias={() => setPanel({ tipo: 'incidencias' })}
        notaSaturacion={colapso ? 'superó 1,00 en D5 07:40' : 'Alerta desde 0,70'}
      />
      <main className="flex-1 relative flex min-h-0 bg-[#F8FAFC]">
        <GridMap
          ref={mapaRef}
          variante="simulacion"
          unidades={unidadesEnElInstante(UNIDADES_MAPA, corrida.simuladoMs / 60_000)}
          destinos={DESTINOS}
          bloqueos={BLOQUEOS}
          seleccion={panel && (panel.tipo === 'pedido' || panel.tipo === 'vehiculo') ? panel : null}
          anchoPanelDerecho={panel || verDiagnostico ? ANCHO_PANEL_PX : 0}
          riesgo={colapso ? RIESGO_COLAPSO.rojo + RIESGO_COLAPSO.ambar : riesgo.length}
          onSeleccionar={setPanel}
          onAbrirIncidencias={() => setPanel({ tipo: 'incidencias' })}
          onHoverCoordenada={setNodo}
          onAyuda={onAbrirLeyenda}
        >
          {panel && (
            <PanelLateral
              pestanasCorrida
              seleccion={panel}
              diaReloj={dia}
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
              onVerInforme={verInforme}
            />
          )}
        </GridMap>
      </main>
      <FooterBar
        nodoSeleccionado={nodo}
        totalPedidos={colapso ? RESUMEN_COLAPSO.total : RESUMEN_PEDIDOS.total}
        entregados={colapso ? RESUMEN_COLAPSO.entregados : RESUMEN_PEDIDOS.entregados}
        enRuta={colapso ? RESUMEN_COLAPSO.enRuta : RESUMEN_PEDIDOS.enRuta}
        enRiesgo={colapso ? RIESGO_COLAPSO.rojo : riesgo.filter((p) => p.nivel === 'ROJO').length}
        bloqueosActivos={BLOQUEOS.length}
        averiasActivas={flota.averiadas.length}
        segundosDesdeActualizacion={1}
        onAbrirLeyenda={onAbrirLeyenda}
        estadoAlerta={colapso ? 'mapa congelado al detectar el colapso' : undefined}
      />
    </div>
  );
};
