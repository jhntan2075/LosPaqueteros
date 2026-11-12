// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeApi, clienteApi } from '../../services/clienteApi';
import * as clienteStomp from '../../services/clienteStomp';
import type { EjecucionApi } from '../../types/api';
import { ModuloSimulacion } from './ModuloSimulacion';

// La corrida abierta se refleja en ?ejecucion=<id>: con ese parámetro en la URL (enlace compartido o
// recarga), se busca por id y se abre directamente, sin pasar por la lista. El límite de esta prueba
// es la búsqueda por id: lo que CorridaSimulacion hace después (estado en vivo por REST/STOMP) no lo
// ejercita ningún test del proyecto, así que no se llega hasta ahí.

const ejecucion: EjecucionApi = {
  id: 'sim-1',
  nombre: 'Simulación 5 días',
  tipoEscenario: 'SIMULACION_PERIODO',
  estado: 'EN_CURSO',
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
  // ConfiguracionEscenario (lo que se ve sin ?ejecucion en la URL) pide la lista al montarse.
  vi.spyOn(clienteApi, 'listarEjecuciones').mockResolvedValue([]);
  // Si una prueba llega a abrir una corrida, CorridaSimulacion pide su estado en vivo por REST y STOMP:
  // sin mock, intentaría una conexión de red real. Se deja pendiente para siempre (no es lo que se prueba
  // aquí) y sin tópicos reales.
  vi.spyOn(clienteApi, 'estado').mockReturnValue(new Promise(() => {}));
  vi.spyOn(clienteStomp, 'suscribir').mockReturnValue(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('ModuloSimulacion · abrir por URL', () => {
  it('sin ?ejecucion en la URL, muestra la configuración de escenario', async () => {
    render(<ModuloSimulacion />);
    expect(await screen.findByText('Configuración de escenario')).toBeTruthy();
  });

  it('con ?ejecucion=<id> en la URL, busca esa corrida y, mientras llega, lo dice', () => {
    window.history.replaceState(null, '', '/?tab=simulacion&ejecucion=sim-1');
    vi.spyOn(clienteApi, 'consultarEjecucion').mockReturnValue(new Promise(() => {})); // nunca resuelve
    render(<ModuloSimulacion />);
    expect(screen.getByText('Abrir simulación')).toBeTruthy();
    expect(screen.getByText('Abriendo…')).toBeTruthy();
  });

  it('con ?ejecucion=<id>, busca esa corrida por su id exacto', () => {
    window.history.replaceState(null, '', '/?tab=simulacion&ejecucion=sim-1');
    const consultar = vi.spyOn(clienteApi, 'consultarEjecucion').mockReturnValue(new Promise(() => {}));
    render(<ModuloSimulacion />);
    expect(consultar).toHaveBeenCalledWith('sim-1');
  });

  it('cuando la corrida pedida por URL no existe, se informa el error y se puede volver a la lista', async () => {
    window.history.replaceState(null, '', '/?tab=simulacion&ejecucion=no-existe');
    vi.spyOn(clienteApi, 'consultarEjecucion').mockRejectedValue(new ErrorDeApi(404, 'No se encontró la ejecución no-existe'));
    render(<ModuloSimulacion />);

    expect(await screen.findByText('No se encontró la ejecución no-existe')).toBeTruthy();
    expect(screen.queryByText('Abriendo…')).toBeNull();

    screen.getByRole('button', { name: 'Ver otras simulaciones' }).click();
    expect(await screen.findByText('Configuración de escenario')).toBeTruthy();
    // Solo se quita "ejecucion" de la URL: "tab" se queda, porque se sigue viendo Simulación.
    expect(window.location.search).toBe('?tab=simulacion');
  });

  it('al abrir una corrida de la lista, su id queda en la URL sin volver a pedirla', async () => {
    vi.spyOn(clienteApi, 'listarEjecuciones').mockResolvedValue([ejecucion]);
    const consultar = vi.spyOn(clienteApi, 'consultarEjecucion');
    render(<ModuloSimulacion />);

    fireEvent.click(await screen.findByRole('tab', { name: /Simulaciones existentes/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Ver corrida/ }));

    expect(window.location.search).toBe('?ejecucion=sim-1');
    // ConfiguracionEscenario entrega la ejecución completa: no hace falta volver a pedirla por id.
    expect(consultar).not.toHaveBeenCalled();
  });
});

describe('ModuloSimulacion · corridas guardadas', () => {
  const historica: EjecucionApi = {
    ...ejecucion,
    id: 'colapso-viejo',
    nombre: 'Simulación hasta el colapso desde 2026-03-03',
    tipoEscenario: 'COLAPSO_LOGISTICO',
    estado: 'COLAPSADA',
    relojSimulado: '05/03/2026 14:20:00',
    parametros: null,
    historica: true,
    resultado: {
      metricas: {
        entregas: 1520,
        incumplimientos: 1,
        entregasTarde: 1,
        distanciaKm: 18234.4,
        costoTotal: 41200,
        productosEntregados: 4800,
        productosFueraPlazo: 3,
        retrasoTotalMin: 25,
        retrasoPonderado: 75,
        replanificaciones: 130,
        tiempoComputoMaxMs: 950,
        tiempoComputoTotalMs: 52000,
        planificacionesMedidas: 130,
        picoUnidades: 33,
        usoAutos: 210,
        usoMotos: 330,
        usoBicicletas: 120,
        averiasAtendidas: 0,
      },
      tiempoComputoPromedioMs: 400,
      colapso: {
        fecha: '2026-03-05T19:20:00Z',
        causa: 'ENTREGA_TARDIA',
        pedido: 'P-123456',
        unidad: 'M-07',
        horaLimite: '2026-03-05T19:00:00Z',
        llegadaEstimada: '2026-03-05T19:25:00Z',
      },
      origenDatos: 'ARCHIVO',
      semilla: 1,
      relojAlcanzado: '2026-03-05T19:20:00Z',
      creadaEn: '2026-11-10T15:00:00Z',
      finalizadaEn: '2026-11-10T15:40:00Z',
    },
  };

  it('en la lista, una corrida guardada se abre para ver su resultado', async () => {
    vi.spyOn(clienteApi, 'listarEjecuciones').mockResolvedValue([historica]);
    render(<ModuloSimulacion />);

    fireEvent.click(await screen.findByRole('tab', { name: /Simulaciones existentes/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Ver resultado/ }));

    expect(await screen.findByText('Corrida guardada: se conserva su resultado, no el mapa.')).toBeTruthy();
    expect(screen.getByText('P-123456')).toBeTruthy();
    expect(screen.getByText('Entrega fuera de plazo')).toBeTruthy();
    expect(screen.getByText('Archivo subido para esta corrida')).toBeTruthy();
    expect(screen.getByText('18 234 km')).toBeTruthy();
  });

  it('una corrida guardada no pide su estado en vivo', async () => {
    window.history.replaceState(null, '', '/?tab=simulacion&ejecucion=colapso-viejo');
    vi.spyOn(clienteApi, 'consultarEjecucion').mockResolvedValue(historica);
    render(<ModuloSimulacion />);

    expect(await screen.findByText('Corrida guardada: se conserva su resultado, no el mapa.')).toBeTruthy();
    expect(clienteApi.estado).not.toHaveBeenCalled();
    expect(clienteStomp.suscribir).not.toHaveBeenCalled();
  });
});
