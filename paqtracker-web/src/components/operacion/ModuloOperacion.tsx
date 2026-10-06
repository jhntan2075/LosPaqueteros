import React, { useRef, useState } from 'react';
import { BLOQUEOS, FLOTA, RESUMEN_PEDIDOS, estadoFlota, pedidosEnRiesgo } from '../../mocks/operacion';
import { RELOJ_SIMULADO_EJEMPLO } from '../../mocks/pedidos';
import { useRelojEnVivo } from '../../hooks/useRelojEnVivo';
import { formatearFechaNumerica } from '../../lib/formato';
import { unidadesEnElInstante } from '../../lib/movimiento';
import type { Coordenada } from '../../types/domain';
import type { SubvistaOperacion } from '../../types/operacion';
import { GridMap, type DestinoMapa, type GridMapHandle, type ObjetoMapa } from '../map/GridMap';
import { BitacoraEventos } from './BitacoraEventos';
import { EncabezadoOperacion } from './EncabezadoOperacion';
import { EstadoFlota } from './EstadoFlota';
import { PanelLateral, type SeleccionPanel } from './PanelLateral';
import { RailKpis } from './RailKpis';

const ANCHO_PANEL_PX = 340 + 12;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Datos derivados una sola vez del estado de ejemplo (en vivo vendrán de STOMP).
const DESTINOS: DestinoMapa[] = FLOTA.flatMap((u) => u.paradas.map((p) => ({ pedido: p.pedido, destino: p.destino, nivel: p.nivel, unidad: u.codigo })));
const UNIDADES_MAPA = FLOTA.filter((u) => u.estado !== 'DISPONIBLE');

interface ModuloOperacionProps {
  subvista: SubvistaOperacion;
  relojSimulado: string;
  conectado: boolean;
  onCambiarSubvista: (subvista: SubvistaOperacion) => void;
  onHoverCoordenada: (coord: Coordenada) => void;
}

export const ModuloOperacion: React.FC<ModuloOperacionProps> = ({ subvista, relojSimulado, conectado, onCambiarSubvista, onHoverCoordenada }) => {
  const mapaRef = useRef<GridMapHandle>(null);
  // Sin conexión, el reloj y las unidades avanzan localmente en tiempo real (k = 1).
  // ×60 por defecto: a tiempo real (×1) el desplazamiento de las unidades apenas se percibe.
  const { reloj, velocidad, cambiarVelocidad } = useRelojEnVivo(RELOJ_SIMULADO_EJEMPLO, 60);
  const minutosDesdeBase = (reloj.getTime() - RELOJ_SIMULADO_EJEMPLO.getTime()) / 60_000;
  const relojTexto = conectado ? relojSimulado : formatearFechaNumerica(reloj, true);
  // Objeto abierto en el panel derecho; sin objeto, el panel muestra la lista de incidencias.
  const [detalle, setDetalle] = useState<ObjetoMapa | null>(null);

  const flota = estadoFlota();
  const riesgo = pedidosEnRiesgo();
  const enMapa = subvista === 'vivo' || subvista === 'incidencias';
  const panelAbierto = enMapa && (subvista === 'incidencias' || detalle !== null);
  const seleccionPanel: SeleccionPanel = detalle ?? { tipo: 'incidencias' };
  const diaReloj = `${RELOJ_SIMULADO_EJEMPLO.getDate()} ${MESES[RELOJ_SIMULADO_EJEMPLO.getMonth()]}`;

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
      <EncabezadoOperacion
        relojSimulado={relojTexto}
        conectado={conectado}
        velocidad={conectado ? undefined : velocidad}
        onCambiarVelocidad={cambiarVelocidad}
      />
      <RailKpis
        resumen={RESUMEN_PEDIDOS}
        riesgo={{
          rojo: riesgo.filter((p) => p.nivel === 'ROJO').length,
          ambar: riesgo.filter((p) => p.nivel === 'AMBAR').length,
          holguraMinima: riesgo[0]?.holgura ?? '—',
        }}
        flota={{ ...flota, averiadas: flota.averiadas.length }}
        onVerFlota={() => onCambiarSubvista('flota')}
        onVerIncidencias={() => seleccionar({ tipo: 'incidencias' })}
      />
      <main className="flex-1 relative flex min-h-0 bg-[#F8FAFC]">
        {enMapa && (
          <GridMap
            ref={mapaRef}
            unidades={unidadesEnElInstante(UNIDADES_MAPA, minutosDesdeBase)}
            destinos={DESTINOS}
            bloqueos={BLOQUEOS}
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
                diaReloj={diaReloj}
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
