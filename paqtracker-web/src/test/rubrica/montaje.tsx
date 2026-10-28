import type React from 'react';
import { render } from '@testing-library/react';
import { ModuloOperacion } from '../../components/operacion/ModuloOperacion';
import { ContextoAverias } from '../../hooks/useAverias';
import { ContextoAvisos } from '../../hooks/useAvisos';
import { ContextoDatosOperacion } from '../../hooks/useDatosOperacion';
import type { DatosOperacion, SubvistaOperacion } from '../../types/operacion';
import { averiasFalsas, datosRubrica } from './escenario';

// Montaje de pantallas para las pruebas de la rúbrica, con los contextos que leen el mapa y el panel.

const conContextos = (ui: React.ReactElement, datos: DatosOperacion) => (
  <ContextoDatosOperacion.Provider value={datos}>
    <ContextoAverias.Provider value={averiasFalsas()}>
      <ContextoAvisos.Provider value={() => {}}>{ui}</ContextoAvisos.Provider>
    </ContextoAverias.Provider>
  </ContextoDatosOperacion.Provider>
);

/** Renderiza un componente dentro de los contextos de una ejecución. */
export const renderConDatos = (ui: React.ReactElement, datos: DatosOperacion = datosRubrica()) => render(conContextos(ui, datos));

/**
 * Operación completa (mapa + panel lateral) sobre el escenario de la rúbrica. La subvista vive aquí,
 * como en App: al cambiarla se vuelve a renderizar Operación con la nueva.
 */
export function montarOperacion(opciones: { datos?: DatosOperacion; subvista?: SubvistaOperacion; pedidoAEnfocar?: string } = {}) {
  const datos = opciones.datos ?? datosRubrica();
  const operacion = (subvista: SubvistaOperacion): React.ReactElement => (
    <ModuloOperacion
      subvista={subvista}
      onCambiarSubvista={(nueva) => resultado.rerender(conContextos(operacion(nueva), datos))}
      onHoverCoordenada={() => {}}
      pedidoAEnfocar={opciones.pedidoAEnfocar}
    />
  );
  const resultado = render(conContextos(operacion(opciones.subvista ?? 'vivo'), datos));
  return resultado;
}
