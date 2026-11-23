import React, { useState } from 'react';
import type { OcupacionGlobal } from '../../lib/operacion';
import type { SeccionIncidencias } from '../../types/operacion';
import { AlertasMapaTarjeta, type AlertasMapa } from './AlertasMapaTarjeta';
import { BuscadorMapa, type BusquedaMapa } from './BuscadorMapa';
import { ANCHO_PILA_MAX_PX, RESERVA_PILA_PX } from './estilosMapa';
import { IndicadoresGlobales } from './IndicadoresGlobales';

// Pila de arriba a la izquierda del mapa, en el orden en que el operador mira: buscar, qué exige actuar
// (alertas), el resumen cuando no cabe en el centro de arriba y cómo va la ocupación global. Su ancho deja libre
// la barra de herramientas de la derecha. En su
// forma reducida (celular o mapa de poca altura) solo muestra el buscador y el titular de alertas: el resto
// se despliega con "Ver detalle" para no tapar la malla.

interface PilaSuperiorMapaProps {
  busqueda: BusquedaMapa;
  alertas: AlertasMapa;
  /** En Simulación solo se alerta del riesgo. */
  soloRiesgo: boolean;
  onAbrirIncidencias: (seccion?: SeccionIncidencias) => void;
  ocupacion: { flota: OcupacionGlobal; almacenes: OcupacionGlobal; onAbrirFlota?: () => void; onAbrirAlmacenes?: () => void };
  /** Pantalla angosta: el buscador se pliega a un botón de ícono. */
  compacto: boolean;
  /** Forma reducida: buscador y una fila de alertas; las cifras y la ocupación, tras "Ver detalle". */
  reducida: boolean;
  /** La franja de resumen, cuando va dentro de la pila (celular o poco ancho): bajo las alertas. */
  resumen?: React.ReactNode;
}

export const PilaSuperiorMapa: React.FC<PilaSuperiorMapaProps> = ({ busqueda, alertas, soloRiesgo, onAbrirIncidencias, ocupacion, compacto, reducida, resumen }) => {
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  return (
    // El contenedor no captura toques: solo sus tarjetas, para que el espacio libre a su lado siga moviendo el mapa.
    <div
      className="absolute top-3 left-3 z-10 flex flex-col gap-2 cursor-default pointer-events-none [&>*]:pointer-events-auto"
      style={{ width: `min(${ANCHO_PILA_MAX_PX}px, calc(100% - ${RESERVA_PILA_PX}px))` }}
    >
      <BuscadorMapa busqueda={busqueda} plegable={compacto} />
      <AlertasMapaTarjeta
        alertas={alertas}
        soloRiesgo={soloRiesgo}
        onAbrir={onAbrirIncidencias}
        reducida={reducida}
        detalleAbierto={detalleAbierto}
        onAlternarDetalle={() => setDetalleAbierto(!detalleAbierto)}
      />
      {resumen}
      {(!reducida || detalleAbierto) && (
        <IndicadoresGlobales
          flota={ocupacion.flota}
          almacenes={ocupacion.almacenes}
          onAbrirFlota={ocupacion.onAbrirFlota}
          onAbrirAlmacenes={ocupacion.onAbrirAlmacenes}
        />
      )}
    </div>
  );
};
