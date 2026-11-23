import React from 'react';
import type { OcupacionGlobal } from '../../lib/operacion';
import type { SeccionIncidencias } from '../../types/operacion';
import { AlertasMapaTarjeta, type AlertasMapa } from './AlertasMapaTarjeta';
import { BuscadorMapa, type BusquedaMapa } from './BuscadorMapa';
import { IndicadoresGlobales } from './IndicadoresGlobales';

// Pila de arriba a la izquierda del mapa, en el orden en que el operador mira: buscar, qué exige actuar
// (alertas) y cómo va la ocupación global. Su ancho deja libre la barra de herramientas de la derecha.

interface PilaSuperiorMapaProps {
  busqueda: BusquedaMapa;
  alertas: AlertasMapa;
  /** En Simulación solo se alerta del riesgo. */
  soloRiesgo: boolean;
  onAbrirIncidencias: (seccion?: SeccionIncidencias) => void;
  ocupacion: { flota: OcupacionGlobal; almacenes: OcupacionGlobal; onAbrirFlota?: () => void; onAbrirAlmacenes?: () => void };
  /** Pantalla angosta: el buscador se pliega a un botón de ícono. */
  compacto: boolean;
}

export const PilaSuperiorMapa: React.FC<PilaSuperiorMapaProps> = ({ busqueda, alertas, soloRiesgo, onAbrirIncidencias, ocupacion, compacto }) => (
  <div data-sin-zoom className="absolute top-3 left-3 z-10 flex flex-col gap-2 w-[min(340px,calc(100%-88px))] cursor-default">
    <BuscadorMapa busqueda={busqueda} plegable={compacto} />
    <AlertasMapaTarjeta alertas={alertas} soloRiesgo={soloRiesgo} onAbrir={onAbrirIncidencias} />
    <IndicadoresGlobales
      flota={ocupacion.flota}
      almacenes={ocupacion.almacenes}
      onAbrirFlota={ocupacion.onAbrirFlota}
      onAbrirAlmacenes={ocupacion.onAbrirAlmacenes}
    />
  </div>
);
