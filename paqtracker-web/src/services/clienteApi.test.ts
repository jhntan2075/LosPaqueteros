import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeApi, clienteApi } from './clienteApi';

const respuesta = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });

const simularFetch = (impl: () => Promise<Response>) => {
  const fetchSimulado = vi.fn(impl);
  vi.stubGlobal('fetch', fetchSimulado);
  return fetchSimulado;
};

afterEach(() => vi.unstubAllGlobals());

describe('clienteApi', () => {
  it('registrarAveria hace POST JSON a la ejecución, con el id codificado', async () => {
    const fetchSimulado = simularFetch(async () => respuesta({ id: 1, estado: 'PROGRAMADA' }, 202));
    const resultado = await clienteApi.registrarAveria('ej 1/x', 'M-03', 2);

    const [url, opciones] = fetchSimulado.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/ejecuciones/ej%201%2Fx/averias');
    expect(opciones.method).toBe('POST');
    expect(opciones.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(opciones.body as string)).toEqual({ unidad: 'M-03', tipo: 2 });
    expect(resultado).toMatchObject({ id: 1, estado: 'PROGRAMADA' });
  });

  it('iniciar hace POST sin cuerpo ni cabecera de contenido', async () => {
    const fetchSimulado = simularFetch(async () => respuesta({ id: 'ej-1' }));
    await clienteApi.iniciar('ej-1');
    const [url, opciones] = fetchSimulado.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/ejecuciones/ej-1/iniciar');
    expect(opciones.body).toBeUndefined();
    expect(opciones.headers).toBeUndefined();
  });

  it('codifica los parámetros de consulta de los pedidos', async () => {
    const fetchSimulado = simularFetch(async () => respuesta([]));
    await clienteApi.listarPedidos('dia a dia');
    expect((fetchSimulado.mock.calls[0] as unknown as [string])[0]).toBe('/api/pedidos?ejecucionId=dia%20a%20dia');
  });

  it('un error HTTP lanza ErrorDeApi con estado, mensaje y detalles del cuerpo', async () => {
    simularFetch(async () => respuesta({ estado: 409, error: 'Conflict', mensaje: 'La unidad ya está averiada', detalles: ['a', 'b'] }, 409));
    const error = await clienteApi.registrarAveria('ej-1', 'M-03', 1).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDeApi);
    expect(error).toMatchObject({ estado: 409, message: 'La unidad ya está averiada', detalles: ['a', 'b'] });
  });

  it('si el cuerpo del error no es JSON usa un mensaje genérico', async () => {
    simularFetch(async () => new Response('<html>', { status: 502 }));
    const error = await clienteApi.estado('ej-1').catch((e: unknown) => e);
    expect(error).toMatchObject({ estado: 502, message: 'Error 502', detalles: [] });
  });

  it('un fallo de red se traduce a ErrorDeApi con estado 0', async () => {
    simularFetch(async () => {
      throw new TypeError('fetch failed');
    });
    const error = await clienteApi.listarEjecuciones().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDeApi);
    expect(error).toMatchObject({ estado: 0, message: 'No se pudo conectar con el servidor' });
  });

  it('subirVentas envía un formulario con archivo y mes', async () => {
    const fetchSimulado = simularFetch(async () => respuesta({}));
    await clienteApi.subirVentas(new File(['x'], 'ventas.txt'), '202603');
    const [url, opciones] = fetchSimulado.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/archivos/pedidos');
    const formulario = opciones.body as FormData;
    expect(formulario.get('mes')).toBe('202603');
    expect((formulario.get('file') as File).name).toBe('ventas.txt');
  });
});
