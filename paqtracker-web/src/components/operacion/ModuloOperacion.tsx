import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { estadoFlota, fueraDelAlmacen, resumenRiesgo } from '../../lib/operacion';
import type { Coordenada } from '../../types/domain';
import { useNavegacionPanel } from '../../hooks/useNavegacionPanel';
import type { SubvistaOperacion } from '../../types/operacion';
import { GridMap, type DestinoMapa, type GridMapHandle } from '../map/GridMap';
import { BarraPaneles } from './BarraPaneles';
import { PanelLateral } from './PanelLateral';

// Operación día a día: mapa en vivo de la ejecución que difunde paqtracker-api. Resumen, Incidencias,
// Pedidos, Flota, Almacenes y Bitácora son pestañas del panel lateral sobre el mapa, elegidas desde la barra vertical fija
// a su derecha, igual que en la corrida de simulación.

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
  // La subvista es la pestaña abierta del panel; 'vivo' es el mapa sin panel. El detalle abierto, lo
  // resaltado y la pila de "Volver" los lleva la navegación del panel, la misma que en Simulación.
  const nav = useNavegacionPanel({
    pestana: subvista === 'vivo' ? null : subvista,
    abrirPestana: onCambiarSubvista,
    cerrarPanel: () => onCambiarSubvista('vivo'),
  });
  // Destino por centrar: se reintenta con cada instantánea hasta que el mapa midió su contenedor.
  const porCentrarRef = useRef<Coordenada | null>(null);
  // Último pedidoAEnfocar ya abierto: evita reabrirlo en cada render mientras la prop sigue viva.
  const [ultimoPedidoAEnfocar, setUltimoPedidoAEnfocar] = useState<string | null>(null);

  const flota = estadoFlota(datos);
  const riesgo = resumenRiesgo(datos);
  const destinos: DestinoMapa[] = useMemo(
    () => datos.flota.flatMap((u) => u.paradas.map((p) => ({ pedido: p.pedido, destino: p.destino, nivel: p.nivel, holgura: p.holgura, unidad: u.codigo }))),
    [datos.flota],
  );
  const unidadesEnMapa = datos.flota.filter(fueraDelAlmacen);
  const { panelAbierto } = nav;

  // Pedido pedido desde otra pantalla ("Ubicar en el mapa"): se abre en cuanto cambia la prop, no solo
  // al montar (Operación ahora queda montada entre pestañas, para no perder el zoom, el panel y las
  // capas). El detalle se ajusta aquí mismo, durante el render, como recomienda React para derivar
  // estado de una prop que cambia (evita el repintado extra de hacerlo en un efecto).
  const pedidoAEnfocarActual = pedidoAEnfocar ?? null;
  if (pedidoAEnfocarActual !== ultimoPedidoAEnfocar) {
    setUltimoPedidoAEnfocar(pedidoAEnfocarActual);
    const pedido = pedidoAEnfocarActual ? datos.pedidos[pedidoAEnfocarActual] : undefined;
    if (pedido) nav.seleccionar({ tipo: 'pedido', codigo: pedido.codigo });
  }

  // Centrar el mapa y avisar al padre que ya se abrió sí son efectos: el primero toca un ref que otro
  // efecto lee más abajo, y el segundo sincroniza con el estado de otro componente.
  useEffect(() => {
    if (!pedidoAEnfocar) return;
    const pedido = datos.pedidos[pedidoAEnfocar];
    if (pedido) porCentrarRef.current = pedido.destino;
    onPedidoEnfocado?.();
  }, [pedidoAEnfocar, datos, onPedidoEnfocado]);

  useEffect(() => {
    if (porCentrarRef.current && panelAbierto && mapaRef.current?.centrarEn(porCentrarRef.current)) porCentrarRef.current = null;
  }, [datos, panelAbierto]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <main className="flex-1 relative flex min-h-0 bg-superficie">
        <GridMap
          ref={mapaRef}
          unidades={unidadesEnMapa}
          destinos={destinos}
          bloqueos={datos.bloqueos}
          almacenes={datos.almacenes}
          seleccion={nav.seleccionMapa}
          anchoPanelDerecho={panelAbierto ? ANCHO_PANEL_PX : 0}
          riesgo={riesgo}
          onSeleccionar={nav.elegirEnMapa}
          onAbrirIncidencias={() => nav.seleccionar({ tipo: 'incidencias' })}
          onAbrirAverias={() => nav.seleccionar({ tipo: 'flota' })}
          onAbrirFlota={() => nav.seleccionar({ tipo: 'flota' })}
          onAbrirAlmacenes={() => nav.seleccionar({ tipo: 'almacenes' })}
          onHoverCoordenada={onHoverCoordenada}
        >
          {panelAbierto && (
            <PanelLateral
              seleccion={nav.seleccionPanel}
              onSeleccionar={nav.seleccionar}
              onCerrar={nav.cerrar}
              onCentrar={(punto) => mapaRef.current?.centrarEn(punto)}
              onVolver={nav.volver}
              etiquetaVolver={nav.etiquetaVolver}
              resaltado={nav.resaltado}
              onResaltar={nav.resaltar}
            />
          )}
        </GridMap>
        <BarraPaneles
          activa={panelAbierto ? nav.pestanaActiva : null}
          onSeleccionar={(tipo) => nav.seleccionar({ tipo })}
          conteos={{ incidencias: riesgo.rojo + riesgo.ambar, flota: flota.averiadas.length }}
        />
      </main>
    </div>
  );
};
