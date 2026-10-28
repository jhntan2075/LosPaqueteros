import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { estadoFlota, fueraDelAlmacen, resumenRiesgo } from '../../lib/operacion';
import type { Coordenada } from '../../types/domain';
import type { SubvistaOperacion } from '../../types/operacion';
import { GridMap, type DestinoMapa, type GridMapHandle, type ObjetoMapa } from '../map/GridMap';
import { PanelLateral, type SeleccionPanel } from './PanelLateral';
import { RailKpis } from './RailKpis';

// Operación día a día: mapa en vivo de la ejecución que difunde paqtracker-api. Incidencias, flota y
// bitácora son pestañas del panel lateral sobre el mapa, igual que en la corrida de simulación.

const ANCHO_PANEL_PX = 340 + 12;

interface ModuloOperacionProps {
  subvista: SubvistaOperacion;
  onCambiarSubvista: (subvista: SubvistaOperacion) => void;
  onHoverCoordenada: (coord: Coordenada) => void;
  /** Pedido que otra pantalla pidió ubicar (p. ej. "Ubicar en el mapa" desde Pedidos). */
  pedidoAEnfocar?: string | null;
  /** Avisa que el pedido solicitado ya se abrió, para no reabrirlo al volver a Operación. */
  onPedidoEnfocado?: () => void;
}

export const ModuloOperacion: React.FC<ModuloOperacionProps> = ({
  subvista,
  onCambiarSubvista,
  onHoverCoordenada,
  pedidoAEnfocar,
  onPedidoEnfocado,
}) => {
  const datos = useDatosOperacion();
  const mapaRef = useRef<GridMapHandle>(null);
  // Operación se monta al entrar a la pestaña, así que el pedido solicitado desde otra pantalla se abre
  // directamente en el estado inicial del panel.
  const pedidoInicial = pedidoAEnfocar ? datos.pedidos[pedidoAEnfocar] : undefined;
  // Objeto abierto en el panel derecho; sin objeto, el panel muestra la lista de incidencias.
  const [detalle, setDetalle] = useState<ObjetoMapa | null>(() => (pedidoInicial ? { tipo: 'pedido', codigo: pedidoInicial.codigo } : null));
  // Destino por centrar: se reintenta con cada instantánea hasta que el mapa midió su contenedor.
  const porCentrarRef = useRef<Coordenada | null>(pedidoInicial?.destino ?? null);

  const flota = estadoFlota(datos);
  const riesgo = resumenRiesgo(datos);
  const destinos: DestinoMapa[] = useMemo(
    () => datos.flota.flatMap((u) => u.paradas.map((p) => ({ pedido: p.pedido, destino: p.destino, nivel: p.nivel, holgura: p.holgura, unidad: u.codigo }))),
    [datos.flota],
  );
  const unidadesEnMapa = datos.flota.filter(fueraDelAlmacen);
  // La subvista es la pestaña abierta del panel; 'vivo' es el mapa sin panel.
  const panelAbierto = subvista !== 'vivo' || detalle !== null;
  const seleccionPanel: SeleccionPanel = detalle ?? { tipo: subvista === 'vivo' ? 'incidencias' : subvista };

  useEffect(() => {
    if (pedidoAEnfocar) onPedidoEnfocado?.();
  }, [pedidoAEnfocar, onPedidoEnfocado]);

  useEffect(() => {
    if (porCentrarRef.current && panelAbierto && mapaRef.current?.centrarEn(porCentrarRef.current)) porCentrarRef.current = null;
  }, [datos, panelAbierto]);

  const seleccionar = (seleccion: SeleccionPanel) => {
    if (seleccion.tipo === 'incidencias' || seleccion.tipo === 'flota' || seleccion.tipo === 'bitacora') {
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <main className="flex-1 relative flex min-h-0 bg-[#F8FAFC]">
        <GridMap
          ref={mapaRef}
          unidades={unidadesEnMapa}
          destinos={destinos}
          bloqueos={datos.bloqueos}
          almacenes={datos.almacenes}
          seleccion={detalle}
          anchoPanelDerecho={panelAbierto ? ANCHO_PANEL_PX : 0}
          riesgo={riesgo}
          onSeleccionar={setDetalle}
          onAbrirIncidencias={() => seleccionar({ tipo: 'incidencias' })}
          onAbrirPanel={(pestana) => seleccionar({ tipo: pestana })}
          onHoverCoordenada={onHoverCoordenada}
          slotKpis={
            <RailKpis
              resumen={datos.resumen}
              riesgo={riesgo}
              flota={{ ...flota, averiadas: flota.averiadas.length }}
              onVerFlota={() => seleccionar({ tipo: 'flota' })}
              onVerIncidencias={() => seleccionar({ tipo: 'incidencias' })}
            />
          }
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
      </main>
    </div>
  );
};
