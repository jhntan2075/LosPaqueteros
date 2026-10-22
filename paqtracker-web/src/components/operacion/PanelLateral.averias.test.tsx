// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextoAverias, type ContextoAveriasValor } from '../../hooks/useAverias';
import { ContextoAvisos, type Aviso } from '../../hooks/useAvisos';
import { ContextoDatosOperacion } from '../../hooks/useDatosOperacion';
import { clienteApi } from '../../services/clienteApi';
import { datosOperacion, INICIO_MS, unidadApi } from '../../test/fabricas';
import type { MensajeEstadoApi, RespuestaRegistroAveriaApi } from '../../types/api';
import { PanelLateral, type SeleccionPanel } from './PanelLateral';

// Averías en el panel lateral: el motivo cuando no se admiten, deshacer mientras sigue programada y el
// aviso tras registrar.

const respuesta: RespuestaRegistroAveriaApi = {
  id: 7,
  ejecucionId: 'ej-1',
  unidad: 'A-01',
  tipo: 2,
  estado: 'PROGRAMADA',
  instanteMs: INICIO_MS + 60_000,
  reincorporacionMs: INICIO_MS + 23 * 3_600_000,
  trasladoCentralMs: null,
};

function montar(seleccion: SeleccionPanel, opciones: { mensaje?: Partial<MensajeEstadoApi>; averias?: Partial<ContextoAveriasValor> } = {}) {
  const datos = datosOperacion({ unidades: [unidadApi({ codigo: 'A-01', estado: 'EN_RUTA' })], ...opciones.mensaje });
  const mostrarAviso = vi.fn<(aviso: Aviso) => void>();
  const averias: ContextoAveriasValor = {
    pendientes: {},
    registrar: vi.fn().mockResolvedValue(respuesta),
    cancelar: vi.fn().mockResolvedValue(undefined),
    ...opciones.averias,
  };
  const onSeleccionar = vi.fn();
  render(
    <ContextoDatosOperacion.Provider value={datos}>
      <ContextoAverias.Provider value={averias}>
        <ContextoAvisos.Provider value={mostrarAviso}>
          <PanelLateral seleccion={seleccion} onSeleccionar={onSeleccionar} onCerrar={vi.fn()} onCentrar={vi.fn()} />
        </ContextoAvisos.Provider>
      </ContextoAverias.Provider>
    </ContextoDatosOperacion.Provider>,
  );
  return { averias, mostrarAviso, onSeleccionar };
}

beforeEach(() => {
  vi.spyOn(clienteApi, 'estimarAverias').mockResolvedValue([]);
  vi.spyOn(clienteApi, 'detallePedido').mockResolvedValue({ hitos: [] } as never);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PanelLateral · averías', () => {
  it('en una ejecución que no admite averías muestra el motivo como texto, sin botón', () => {
    montar({ tipo: 'vehiculo', codigo: 'A-01' }, { mensaje: { tipoEscenario: 'COLAPSO_LOGISTICO' } });
    expect(screen.queryByRole('button', { name: 'Registrar avería' })).toBeNull();
    expect(screen.getByText('Esta simulación no admite averías.')).toBeTruthy();
  });

  it('en Incidencias el acceso dice "+ Registrar avería" y abre el diálogo con buscador', () => {
    montar({ tipo: 'incidencias' });
    fireEvent.click(screen.getByRole('button', { name: '+ Registrar avería' }));
    expect(screen.getByRole('dialog', { name: 'Registrar avería' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Unidad' })).toBeTruthy();
  });

  it('una avería por aplicarse se puede cancelar desde el detalle del vehículo', async () => {
    const { averias, mostrarAviso } = montar(
      { tipo: 'vehiculo', codigo: 'A-01' },
      { averias: { pendientes: { 'ej-1:A-01': respuesta } } },
    );
    expect(screen.getByText(/Avería registrada \(tipo 2 · intermedia\) · se aplica a las/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Registrar avería' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar avería' }));
    await waitFor(() => expect(averias.cancelar).toHaveBeenCalledWith('ej-1', 'A-01'));
    expect(mostrarAviso).toHaveBeenCalledWith({ texto: 'Avería de A-01 cancelada: sigue en servicio.' });
  });

  it('si ya se aplicó, cancelar muestra un aviso de error', async () => {
    const cancelar = vi.fn().mockRejectedValue(new Error('La avería de A-01 ya se aplicó: no se puede deshacer.'));
    const { mostrarAviso } = montar({ tipo: 'vehiculo', codigo: 'A-01' }, { averias: { pendientes: { 'ej-1:A-01': respuesta }, cancelar } });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar avería' }));
    await waitFor(() =>
      expect(mostrarAviso).toHaveBeenCalledWith({ tipo: 'error', texto: 'La avería de A-01 ya se aplicó: no se puede deshacer.' }),
    );
  });

  it('al registrar abre el detalle de la unidad y ofrece Deshacer en el aviso', async () => {
    const { averias, mostrarAviso, onSeleccionar } = montar({ tipo: 'vehiculo', codigo: 'A-01' });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar avería' }));
    const dialogo = within(screen.getByRole('dialog', { name: 'Registrar avería' }));
    fireEvent.click(dialogo.getByDisplayValue('2'));
    fireEvent.click(dialogo.getByRole('button', { name: 'Registrar avería' }));

    await waitFor(() => expect(mostrarAviso).toHaveBeenCalled());
    expect(onSeleccionar).toHaveBeenCalledWith({ tipo: 'vehiculo', codigo: 'A-01' });
    const aviso = mostrarAviso.mock.calls[0][0];
    expect(aviso.texto).toBe('Avería registrada en A-01 · vuelve a operar mañana 07:00');
    expect(aviso.accion?.etiqueta).toBe('Deshacer');

    aviso.accion?.alHacer();
    await waitFor(() => expect(averias.cancelar).toHaveBeenCalledWith('ej-1', 'A-01'));
  });
});
