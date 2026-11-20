import { useState } from 'react';
import { ALMACENES } from '../config/dominio';
import { accionAlElegirEnMapa, esResaltable, type SeleccionResaltable } from '../lib/envios';
import type { PestanaPanel, SeccionIncidencias, SeleccionPanel } from '../types/operacion';

// Navegación del panel lateral del mapa, la misma en Operación y en Simulación. Separa dos ideas:
//  - el objeto RESALTADO: lo que el mapa y las listas marcan (F01, F05), y
//  - lo que MUESTRA el panel: una pestaña (lista) o el detalle de un objeto, con una pila para "Volver".

export const TITULO_PESTANA: Record<PestanaPanel, string> = {
  resumen: 'Resumen',
  incidencias: 'Incidencias',
  pedidos: 'Envíos',
  flota: 'Flota',
  almacenes: 'Almacenes',
  bitacora: 'Bitácora',
};

/** Nombre corto del objeto de un detalle, para el botón "‹ Volver" del detalle siguiente. */
export function tituloDeSeleccion(s: SeleccionResaltable): string {
  if (s.tipo === 'almacen') return `Almacén ${ALMACENES.find((a) => a.id === s.codigo)?.nombre ?? s.codigo}`;
  if (s.tipo === 'fraccion') return `Pedido ${s.pedido}`;
  if (s.tipo === 'pedido') return `Pedido ${s.codigo}`;
  return s.codigo;
}

const mismaSeleccion = (a: SeleccionResaltable | null, b: SeleccionResaltable) =>
  a !== null && a.tipo === b.tipo && a.codigo === b.codigo;

interface Opciones {
  /** Pestaña que muestra el panel cuando no hay detalle; null si el panel está cerrado. */
  pestana: PestanaPanel | null;
  /** Abre o cambia la pestaña del panel. */
  abrirPestana: (pestana: PestanaPanel) => void;
  /** Cierra el panel. */
  cerrarPanel: () => void;
}

export interface NavegacionPanel {
  /** Objeto abierto en el panel, o null si muestra una pestaña. */
  detalle: SeleccionResaltable | null;
  /** Objeto marcado en el mapa y en las listas. */
  resaltado: SeleccionResaltable | null;
  /** Lo que el mapa resalta: el detalle abierto o, si no hay, lo marcado en la lista. */
  seleccionMapa: SeleccionResaltable | null;
  panelAbierto: boolean;
  /** Pestaña que la barra vertical resalta y a la que "Volver" regresa al vaciar la pila. */
  pestanaActiva: PestanaPanel;
  /** Qué muestra el panel: el detalle o la pestaña. */
  seleccionPanel: SeleccionPanel;
  /** Texto del botón "‹ …" del detalle. */
  etiquetaVolver: string;
  /**
   * Sección de Incidencias pedida por una alerta, con un contador que cambia en cada pedido: tocar la
   * misma alerta dos veces vuelve a llevar a su sección aunque el usuario haya desplazado la lista.
   */
  seccionIncidencias: { seccion: SeccionIncidencias; vez: number } | null;
  /** Abre una pestaña o el detalle de un objeto (desde el panel, el buscador u otra pantalla). */
  seleccionar: (seleccion: SeleccionPanel) => void;
  /** Clic en un objeto del mapa: resalta su fila si su lista está abierta; si no, abre su detalle. */
  elegirEnMapa: (objeto: SeleccionResaltable) => void;
  /** Clic en una fila de una lista: la marca en la lista y en el mapa, sin salir de la lista. */
  resaltar: (objeto: SeleccionResaltable) => void;
  volver: () => void;
  cerrar: () => void;
}

export function useNavegacionPanel({ pestana, abrirPestana, cerrarPanel }: Opciones): NavegacionPanel {
  const [detalle, setDetalle] = useState<SeleccionResaltable | null>(null);
  // Detalles anteriores: "Volver" desde un pedido abierto desde un almacén regresa al almacén.
  const [pila, setPila] = useState<SeleccionResaltable[]>([]);
  const [resaltado, setResaltado] = useState<SeleccionResaltable | null>(null);
  const [ultimaPestana, setUltimaPestana] = useState<PestanaPanel>(pestana ?? 'incidencias');
  const [seccionIncidencias, setSeccionIncidencias] = useState<{ seccion: SeccionIncidencias; vez: number } | null>(null);
  // Si el detalle se abrió con el panel cerrado (desde el mapa o el buscador), "Volver" sin historial
  // regresa al mapa, no a una pestaña que el usuario nunca abrió.
  const [desdeElMapa, setDesdeElMapa] = useState(false);
  // La pestaña puede venir de fuera (la URL en Operación): se recuerda la última al cambiar, durante el render.
  if (pestana !== null && pestana !== ultimaPestana) setUltimaPestana(pestana);

  const abrirDetalle = (objeto: SeleccionResaltable) => {
    if (!detalle) setDesdeElMapa(pestana === null);
    if (detalle && !mismaSeleccion(detalle, objeto)) setPila((anteriores) => [...anteriores, detalle]);
    setDetalle(objeto);
    setResaltado(objeto);
  };

  const seleccionar = (seleccion: SeleccionPanel) => {
    if (esResaltable(seleccion)) {
      abrirDetalle(seleccion);
      return;
    }
    setDetalle(null);
    setPila([]);
    setUltimaPestana(seleccion.tipo);
    if (seleccion.tipo === 'incidencias' && seleccion.seccion) {
      const seccion = seleccion.seccion;
      setSeccionIncidencias((previa) => ({ seccion, vez: (previa?.vez ?? 0) + 1 }));
    }
    abrirPestana(seleccion.tipo);
  };

  const elegirEnMapa = (objeto: SeleccionResaltable) => {
    if (accionAlElegirEnMapa(objeto, { detalleAbierto: detalle !== null, pestana }) === 'resaltar') setResaltado(objeto);
    else abrirDetalle(objeto);
  };

  const volver = () => {
    const anterior = pila[pila.length - 1];
    if (anterior) {
      setPila(pila.slice(0, -1));
      setDetalle(anterior);
      setResaltado(anterior);
      return;
    }
    if (desdeElMapa) {
      cerrar();
      return;
    }
    setDetalle(null);
    abrirPestana(ultimaPestana);
  };

  function cerrar() {
    setDetalle(null);
    setPila([]);
    setResaltado(null);
    setDesdeElMapa(false);
    cerrarPanel();
  }

  const anterior = pila[pila.length - 1];
  return {
    detalle,
    resaltado,
    seleccionMapa: detalle ?? resaltado,
    panelAbierto: pestana !== null || detalle !== null,
    pestanaActiva: pestana ?? ultimaPestana,
    seleccionPanel: detalle ?? { tipo: pestana ?? ultimaPestana },
    etiquetaVolver: anterior ? tituloDeSeleccion(anterior) : desdeElMapa ? 'Mapa' : TITULO_PESTANA[ultimaPestana],
    seccionIncidencias,
    seleccionar,
    elegirEnMapa,
    resaltar: setResaltado,
    volver,
    cerrar,
  };
}
