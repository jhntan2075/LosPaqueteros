// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextoAverias, type ContextoAveriasValor } from '../../hooks/useAverias';
import { ContextoDatosOperacion } from '../../hooks/useDatosOperacion';
import { clienteApi } from '../../services/clienteApi';
import { datosOperacion, INICIO_MS, unidadApi } from '../../test/fabricas';
import type { EstimacionAveriaApi, RespuestaRegistroAveriaApi, UnidadEnMapaApi } from '../../types/api';
import type { DatosOperacion } from '../../types/operacion';
import { DialogoRegistrarAveria } from './DialogoRegistrarAveria';

const respuesta: RespuestaRegistroAveriaApi = {
  id: 1,
  ejecucionId: 'ej-1',
  unidad: 'A-01',
  tipo: 1,
  estado: 'PROGRAMADA',
  instanteMs: INICIO_MS + 60_000,
  reincorporacionMs: INICIO_MS + 7_200_000,
  trasladoCentralMs: null,
};

const HORA = 3_600_000;
const estimaciones: EstimacionAveriaApi[] = [
  { tipo: 1, instanteMs: INICIO_MS + 60_000, reincorporacionMs: INICIO_MS + 2 * HORA, trasladoCentralMs: null },
  { tipo: 2, instanteMs: INICIO_MS + 60_000, reincorporacionMs: INICIO_MS + 23 * HORA, trasladoCentralMs: INICIO_MS + 4 * HORA },
  { tipo: 3, instanteMs: INICIO_MS + 60_000, reincorporacionMs: INICIO_MS + 55 * HORA, trasladoCentralMs: INICIO_MS + 4 * HORA },
];

const parada = (codigoPedido: string) => ({ codigoPedido, destino: { x: 1, y: 1 }, cantidad: 1, etaMs: INICIO_MS + 600_000 });

const unidades: UnidadEnMapaApi[] = [
  unidadApi({ codigo: 'A-01', estado: 'EN_RUTA', paradas: [parada('#1'), parada('#2')], cargaActual: 2 }),
  unidadApi({ id: 2, codigo: 'A-02', estado: 'DISPONIBLE_EN_ALMACEN' }),
  unidadApi({ id: 3, codigo: 'M-01', tipo: 'MOTO', estado: 'EN_RUTA', paradas: [parada('#3')] }),
  unidadApi({ id: 4, codigo: 'M-02', tipo: 'MOTO', estado: 'AVERIADA' }),
  unidadApi({ id: 5, codigo: 'A-03', estado: 'EN_RUTA', paradas: ['#4', '#5', '#6', '#7', '#8'].map(parada), cargaActual: 5 }),
];
const datos = datosOperacion({ unidades });

function montar(
  props: {
    unidadInicial?: string;
    registrar?: ContextoAveriasValor['registrar'];
    pendientes?: ContextoAveriasValor['pendientes'];
    datos?: DatosOperacion;
  } = {},
) {
  const onCerrar = vi.fn();
  const onRegistrada = vi.fn();
  const registrar = props.registrar ?? vi.fn().mockResolvedValue(respuesta);
  const arbol = (valor: DatosOperacion) => (
    <ContextoDatosOperacion.Provider value={valor}>
      <ContextoAverias.Provider value={{ pendientes: props.pendientes ?? {}, registrar, cancelar: vi.fn() }}>
        <DialogoRegistrarAveria unidadInicial={props.unidadInicial} onCerrar={onCerrar} onRegistrada={onRegistrada} />
      </ContextoAverias.Provider>
    </ContextoDatosOperacion.Provider>
  );
  const { rerender } = render(arbol(props.datos ?? datos));
  return { onCerrar, onRegistrada, registrar, actualizar: (valor: DatosOperacion) => rerender(arbol(valor)) };
}

const botonRegistrar = () => screen.getByRole('button', { name: /^(Registrar avería|Registrando…)$/ }) as HTMLButtonElement;
const combobox = () => screen.getByRole('combobox', { name: 'Unidad' }) as HTMLInputElement;
const opcion = (codigo: string) => screen.getByRole('option', { name: new RegExp(`^${codigo}\\b`) });
/** Busca la unidad por su código en el combobox y la elige con un clic, como el operador. */
const elegirUnidad = (codigo: string) => {
  fireEvent.change(combobox(), { target: { value: codigo } });
  fireEvent.click(opcion(codigo));
};
const elegirTipo = (tipo: 1 | 2 | 3) => fireEvent.click(screen.getByDisplayValue(String(tipo)));

beforeEach(() => {
  vi.spyOn(clienteApi, 'estimarAverias').mockResolvedValue(estimaciones);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DialogoRegistrarAveria', () => {
  it('arranca sin unidad ni tipo y pide ambos', () => {
    montar();
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    expect(botonRegistrar().disabled).toBe(true);
    expect(screen.getByText('Elige la unidad y el tipo de avería.')).toBeTruthy();
  });

  it('la lista agrupa por disponibilidad y no deja elegir las unidades ya averiadas o con avería pendiente', () => {
    montar({ pendientes: { 'ej-1:A-02': respuesta } });
    fireEvent.click(combobox());

    expect(screen.getByRole('group', { name: 'Fuera del almacén' })).toBeTruthy();
    expect(within(screen.getByRole('group', { name: 'No disponibles' })).getAllByRole('option')).toHaveLength(2);
    expect(opcion('A-01').getAttribute('aria-disabled')).toBeNull();
    expect(opcion('A-02').getAttribute('aria-disabled')).toBe('true'); // avería registrada, aún aplicándose
    expect(opcion('A-02').textContent).toContain('Avería registrada, por aplicarse');
    expect(opcion('M-02').getAttribute('aria-disabled')).toBe('true'); // ya averiada
    expect(opcion('M-02').textContent).toContain('Averiada');

    fireEvent.click(opcion('M-02'));
    expect(combobox().value).toBe(''); // la opción bloqueada no se elige
  });

  it('busca por tipo de unidad y avisa cuando nada coincide', () => {
    montar();
    fireEvent.change(combobox(), { target: { value: 'moto' } });
    expect(screen.getAllByRole('option').map((o) => o.textContent?.slice(0, 4))).toEqual(['M-01', 'M-02']);

    fireEvent.change(combobox(), { target: { value: 'zz' } });
    expect(screen.getByText('Ninguna unidad coincide con «zz».')).toBeTruthy();
  });

  it('con el teclado: flechas saltan las bloqueadas, Enter elige y Escape cierra la lista sin cerrar el diálogo', () => {
    const { onCerrar } = montar();
    const entrada = combobox();
    fireEvent.keyDown(entrada, { key: 'ArrowDown' }); // abre la lista
    expect(entrada.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(entrada, { key: 'ArrowDown' }); // A-01 → A-03
    expect(entrada.getAttribute('aria-activedescendant')).toMatch(/A-03$/);
    fireEvent.keyDown(entrada, { key: 'Enter' });
    expect(entrada.value).toBe('A-03 · Auto');

    fireEvent.keyDown(entrada, { key: 'ArrowDown' });
    fireEvent.keyDown(entrada, { key: 'Escape' });
    expect(entrada.getAttribute('aria-expanded')).toBe('false');
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it('el botón se habilita solo con unidad y tipo elegidos', () => {
    montar();
    elegirUnidad('A-01');
    expect(botonRegistrar().disabled).toBe(true);
    expect(screen.getByText('Elige el tipo de avería.')).toBeTruthy();
    elegirTipo(2);
    expect(botonRegistrar().disabled).toBe(false);
  });

  it('muestra el impacto sobre los pedidos de la unidad antes de confirmar', () => {
    montar();
    elegirUnidad('A-01');
    expect(screen.getByText(/Lleva 2 pedidos \(#1 #2\)\. Elige el tipo/)).toBeTruthy();
    elegirTipo(1);
    expect(screen.getByText(/Sus 2 pedidos \(#1 #2\) se quedan en la unidad/)).toBeTruthy();
    elegirUnidad('M-01');
    expect(screen.getByText(/Su pedido \(#3\) se queda en la unidad/)).toBeTruthy();
    elegirUnidad('A-02');
    expect(screen.getByText('No lleva pedidos: solo deja de estar disponible.')).toBeTruthy();
  });

  it('con muchos pedidos nombra los tres primeros y resume el resto', () => {
    montar({ unidadInicial: 'A-03' });
    const texto = screen.getByText(/Lleva 5 pedidos/);
    expect(texto.textContent).toContain('(#4 #5 #6 y 2 más)');
    expect(texto.getAttribute('title')).toBe('#4 #5 #6 #7 #8');
  });

  it('avisa si los pedidos de la unidad cambian mientras se decide', () => {
    const { actualizar } = montar({ unidadInicial: 'A-01' });
    expect(screen.queryByText(/Sus pedidos cambiaron/)).toBeNull();
    const entregoUno = unidades.map((u) => (u.codigo === 'A-01' ? { ...u, paradas: [parada('#2')], cargaActual: 1 } : u));
    actualizar(datosOperacion({ unidades: entregoUno }));
    expect(screen.getByText(/Sus pedidos cambiaron desde que la elegiste/)).toBeTruthy();
  });

  it('muestra cuándo volvería a operar la unidad con cada tipo, según el servidor', async () => {
    montar({ unidadInicial: 'A-01' });
    await waitFor(() => expect(screen.getByText('Volvería hoy 10:00')).toBeTruthy());
    expect(screen.getByText('Volvería mañana 07:00')).toBeTruthy();
    expect(screen.getByText('Volvería 05/03 15:00')).toBeTruthy();
    expect(clienteApi.estimarAverias).toHaveBeenCalledWith('ej-1');
  });

  it('sin estimación del servidor igual deja registrar, con la regla de duración', async () => {
    vi.mocked(clienteApi.estimarAverias).mockRejectedValue(new Error('sin red'));
    montar({ unidadInicial: 'A-01' });
    await waitFor(() => expect(clienteApi.estimarAverias).toHaveBeenCalled());
    expect(screen.queryByText(/^Volvería/)).toBeNull();
    expect(screen.getByText('Hasta el fin del siguiente turno')).toBeTruthy();
    elegirTipo(2);
    expect(botonRegistrar().disabled).toBe(false);
  });

  it('con unidad inicial la muestra fija sin buscador', () => {
    montar({ unidadInicial: 'A-01' });
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText(/Auto A-01/)).toBeTruthy();
    expect(screen.getByText(/En ruta · carga 2\/10 · 2 pedidos/)).toBeTruthy();
  });

  it('las tarjetas de tipo son radios nativos sin valor por defecto', () => {
    montar({ unidadInicial: 'A-01' });
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios).toHaveLength(3);
    expect(radios.some((r) => r.checked)).toBe(false);
    expect(screen.queryByText(/\*/)).toBeNull(); // sin asterisco de obligatorio
  });

  it('confirmar registra la avería y avisa con la respuesta', async () => {
    const { registrar, onRegistrada } = montar({ unidadInicial: 'A-01' });
    elegirTipo(3);
    fireEvent.click(botonRegistrar());
    await waitFor(() => expect(onRegistrada).toHaveBeenCalledWith(respuesta));
    expect(registrar).toHaveBeenCalledWith('ej-1', 'A-01', 3);
  });

  it('mientras envía bloquea el botón y el cierre', async () => {
    let resolver: (r: RespuestaRegistroAveriaApi) => void = () => {};
    const registrar = vi.fn(() => new Promise<RespuestaRegistroAveriaApi>((r) => (resolver = r)));
    const { onCerrar } = montar({ unidadInicial: 'A-01', registrar });
    elegirTipo(1);
    fireEvent.click(botonRegistrar());

    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrando…' })).toBeTruthy());
    expect(botonRegistrar().disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCerrar).not.toHaveBeenCalled();
    resolver(respuesta);
  });

  it('si falla anuncia el error, lo enfoca y permite reintentar', async () => {
    const registrar = vi.fn().mockRejectedValueOnce(new Error('A-01 ya está averiada.')).mockResolvedValueOnce(respuesta);
    const { onRegistrada } = montar({ unidadInicial: 'A-01', registrar });
    elegirTipo(1);
    fireEvent.click(botonRegistrar());

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toBe('A-01 ya está averiada.');
    expect(document.activeElement).toBe(alerta);
    expect(onRegistrada).not.toHaveBeenCalled();
    expect(botonRegistrar().disabled).toBe(false);

    fireEvent.click(botonRegistrar());
    await waitFor(() => expect(onRegistrada).toHaveBeenCalledWith(respuesta));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('Tab no sale del diálogo: desde el último control vuelve al primero', () => {
    montar({ unidadInicial: 'A-01' });
    elegirTipo(1);
    botonRegistrar().focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar' }));
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(botonRegistrar());
  });

  it('Escape y Cancelar cierran el diálogo', () => {
    const { onCerrar } = montar();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCerrar).toHaveBeenCalledTimes(2);
  });

  it('en una simulación en curso avisa que el reloj sigue y que se aplica en segundos', () => {
    montar();
    expect(screen.getByText(/La simulación sigue corriendo mientras eliges/)).toBeTruthy();
    expect(screen.getByText(/del reloj de la simulación y se aplica en unos segundos/)).toBeTruthy();
  });

  it('en la operación día a día dice que se aplica en los próximos minutos', () => {
    montar({ datos: datosOperacion({ unidades, tipoEscenario: 'DIA_A_DIA' }) });
    expect(screen.queryByText(/La simulación sigue corriendo/)).toBeNull();
    expect(screen.getByText(/y se aplica en los próximos minutos/)).toBeTruthy();
  });
});
