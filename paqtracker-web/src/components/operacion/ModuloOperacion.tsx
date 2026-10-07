import React, { useMemo, useRef, useState } from 'react';
import { useConexionStomp } from '../../hooks/useConexionStomp';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { formatearFechaNumerica } from '../../lib/formato';
import { estadoFlota, pedidosEnRiesgo, resumenRiesgo } from '../../lib/operacion';
import { turnoVigente } from '../../lib/turnos';
import type { Coordenada } from '../../types/domain';
import type { SubvistaOperacion } from '../../types/operacion';
import { GridMap, type DestinoMapa, type GridMapHandle, type ObjetoMapa } from '../map/GridMap';
import { BitacoraEventos } from './BitacoraEventos';
import { EncabezadoOperacion } from './EncabezadoOperacion';
import { EstadoFlota } from './EstadoFlota';
import { PanelLateral, type SeleccionPanel } from './PanelLateral';
import { RailKpis } from './RailKpis';

// Operación día a día: lienzo en vivo, flota y bitácora de la ejecución que difunde paqtracker-api.

const ANCHO_PANEL_PX = 340 + 12;

interface ModuloOperacionProps {
  subvista: SubvistaOperacion;
  onCambiarSubvista: (subvista: SubvistaOperacion) => void;
  onHoverCoordenada: (coord: Coordenada) => void;
}

export const ModuloOperacion: React.FC<ModuloOperacionProps> = ({ subvista, onCambiarSubvista, onHoverCoordenada }) => {
  const datos = useDatosOperacion();
  const conectado = useConexionStomp();
  const mapaRef = useRef<GridMapHandle>(null);
  // Objeto abierto en el panel derecho; sin objeto, el panel muestra la lista de incidencias.
  const [detalle, setDetalle] = useState<ObjetoMapa | null>(null);

  const flota = estadoFlota(datos);
  const riesgo = pedidosEnRiesgo(datos);
  const destinos: DestinoMapa[] = useMemo(
    () => datos.flota.flatMap((u) => u.paradas.map((p) => ({ pedido: p.pedido, destino: p.destino, nivel: p.nivel, unidad: u.codigo }))),
    [datos.flota],
  );
  const unidadesEnMapa = datos.flota.filter((u) => u.estado !== 'DISPONIBLE');
  const enMapa = subvista === 'vivo' || subvista === 'incidencias';
  const panelAbierto = enMapa && (subvista === 'incidencias' || detalle !== null);
  const seleccionPanel: SeleccionPanel = detalle ?? { tipo: 'incidencias' };

  const seleccionar = (seleccion: SeleccionPanel) => {
    if (seleccion.tipo === 'incidencias' || seleccion.tipo === 'flota' || seleccion.tipo === 'bitacora') {
      // En Operación, Flota y Bitácora son vistas completas, no pestañas del panel.
      setDetalle(null);
      onCambiarSubvista(seleccion.tipo);
    } else {
      setDetalle(seleccion);
    }
  };
  const cerrarPanel = () => {
    setDetalle(null);
    onCambiarSubvista('vivo');
  };
  const volverAlLienzo = () => onCambiarSubvista('vivo');

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <EncabezadoOperacion relojSimulado={formatearFechaNumerica(datos.reloj, true)} turno={turnoVigente(datos.reloj).actual} conectado={conectado} />
      <RailKpis
        resumen={datos.resumen}
        riesgo={resumenRiesgo(datos)}
        flota={{ ...flota, averiadas: flota.averiadas.length }}
        onVerFlota={() => onCambiarSubvista('flota')}
        onVerIncidencias={() => seleccionar({ tipo: 'incidencias' })}
      />
      <main className="flex-1 relative flex min-h-0 bg-[#F8FAFC]">
        {enMapa && (
          <GridMap
            ref={mapaRef}
            unidades={unidadesEnMapa}
            destinos={destinos}
            bloqueos={datos.bloqueos}
            almacenes={datos.almacenes}
            seleccion={detalle}
            anchoPanelDerecho={panelAbierto ? ANCHO_PANEL_PX : 0}
            riesgo={riesgo.length}
            onSeleccionar={setDetalle}
            onAbrirIncidencias={() => seleccionar({ tipo: 'incidencias' })}
            onHoverCoordenada={onHoverCoordenada}
          >
            {panelAbierto && (
              <PanelLateral
                seleccion={seleccionPanel}
                onSeleccionar={seleccionar}
                onCerrar={cerrarPanel}
                onCentrar={(punto) => mapaRef.current?.centrarEn(punto)}
              />
            )}
          </GridMap>
        )}
        {subvista === 'flota' && <EstadoFlota onCerrar={volverAlLienzo} />}
        {subvista === 'bitacora' && <BitacoraEventos onCerrar={volverAlLienzo} />}
      </main>
    </div>
  );
};
