// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as datosOperacion from '../../hooks/useDatosOperacion';
import { clienteApi } from '../../services/clienteApi';
import * as clienteStomp from '../../services/clienteStomp';
import type { EjecucionApi } from '../../types/api';
import { datosRubrica, prepararEntornoMapa } from '../../test/rubrica/escenario';
import { CorridaSimulacion } from './CorridaSimulacion';

// En una simulación colapsada el diagnóstico flota a la derecha del mapa: el modo enfoque lo oculta junto con
// lo demás y, al apagarlo, vuelve.

const ejecucion: EjecucionApi = {
  id: 'sim-1',
  nombre: 'Simulación hasta el colapso',
  tipoEscenario: 'COLAPSO_LOGISTICO',
  estado: 'COLAPSADA',
  algoritmo: 'GA',
  fechaInicio: '2026-03-03',
  horaInicio: '00:00:00',
  dias: 5,
  relojSimulado: null,
  relojReal: null,
  parametros: { saltoConsumoScSegundos: 1, saltoAlgoritmoSaMinutos: 30, factorAceleracionK: 180, fraccionSemaforoRojo: 0.15, fraccionSemaforoAmbar: 0.4 },
  indicadores: null,
  flota: { autos: 10, motos: 15, bicicletas: 12 },
  historica: false,
  resultado: null,
};

beforeEach(() => {
  prepararEntornoMapa();
  const datos = { ...datosRubrica(), estadoEjecucion: 'COLAPSADA' as const };
  vi.spyOn(datosOperacion, 'useEjecucionEnVivo').mockReturnValue({ datos, error: null, recibidoEnMs: Date.now() });
  vi.spyOn(clienteStomp, 'alCambiarConexion').mockReturnValue(() => {});
  vi.spyOn(clienteApi, 'detallePedido').mockResolvedValue({ hitos: [] } as never);
  vi.spyOn(clienteApi, 'estimarAverias').mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Simulación colapsada · modo enfoque', () => {
  it('oculta el diagnóstico del colapso y su acceso, y al apagarlo el diagnóstico vuelve', () => {
    render(<CorridaSimulacion ejecucion={ejecucion} onSalir={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Diagnóstico del colapso' })).toBeTruthy();

    const enfoque = screen.getByRole('button', { name: 'Modo enfoque' });
    fireEvent.click(enfoque);
    expect(screen.queryByRole('heading', { name: 'Diagnóstico del colapso' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ver diagnóstico del colapso' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Alertas' })).toBeNull();
    expect(screen.getByRole('toolbar', { name: 'Herramientas del mapa' })).toBeTruthy();

    fireEvent.click(enfoque);
    expect(screen.getByRole('heading', { name: 'Diagnóstico del colapso' })).toBeTruthy();
  });

  it('con el diagnóstico cerrado, el enfoque también oculta el acceso para reabrirlo', () => {
    render(<CorridaSimulacion ejecucion={ejecucion} onSalir={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar diagnóstico' }));
    expect(screen.getByRole('button', { name: 'Ver diagnóstico del colapso' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Modo enfoque' }));
    expect(screen.queryByRole('button', { name: 'Ver diagnóstico del colapso' })).toBeNull();
  });

  it('el acceso para reabrir el diagnóstico va abajo al centro, no en la fila de arriba donde están la franja de resumen y las herramientas', () => {
    render(<CorridaSimulacion ejecucion={ejecucion} onSalir={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar diagnóstico' }));
    const acceso = screen.getByRole('button', { name: 'Ver diagnóstico del colapso' });
    expect(acceso.className).not.toMatch(/(^|\s)(top-\S+|right-\S+)/);
    expect(acceso.className).toContain('left-1/2');
    expect(acceso.style.top).toBe('');
    expect(parseFloat(acceso.style.bottom)).toBeGreaterThanOrEqual(12);
  });
});
