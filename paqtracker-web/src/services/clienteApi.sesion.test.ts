// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteApi, clienteSesion, ErrorDeApi } from './clienteApi';
import { alTerminarSesion, borrarSesion, guardarSesion, leerSesion } from './sesion';

const respuesta = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });

const simularFetch = (impl: () => Promise<Response>) => {
  const fetchSimulado = vi.fn(impl);
  vi.stubGlobal('fetch', fetchSimulado);
  return fetchSimulado;
};

const enUnaHora = () => Date.now() + 3_600_000;

beforeEach(() => borrarSesion());
afterEach(() => {
  vi.unstubAllGlobals();
  borrarSesion();
});

describe('clienteApi con sesión', () => {
  it('sin sesión no agrega cabeceras', async () => {
    const fetchSimulado = simularFetch(async () => respuesta({}));
    await clienteApi.iniciar('ej-1');
    expect((fetchSimulado.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toBeUndefined();
  });

  it('con sesión manda el token y conserva las demás cabeceras', async () => {
    guardarSesion({ token: 'tok-1', usuario: 'operaciones', expiraEnMs: enUnaHora() });
    const fetchSimulado = simularFetch(async () => respuesta({ id: 1 }, 202));
    await clienteApi.registrarAveria('ej-1', 'M-03', 2);
    const [, opciones] = fetchSimulado.mock.calls[0] as unknown as [string, RequestInit];
    expect(opciones.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer tok-1' });
  });

  it('una sesión ya vencida no se manda', async () => {
    guardarSesion({ token: 'viejo', usuario: 'operaciones', expiraEnMs: Date.now() - 1 });
    const fetchSimulado = simularFetch(async () => respuesta([]));
    await clienteApi.listarPedidos('dia-a-dia');
    expect((fetchSimulado.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toBeUndefined();
  });

  it('un 401 con token termina la sesión como vencida', async () => {
    guardarSesion({ token: 'tok-1', usuario: 'operaciones', expiraEnMs: enUnaHora() });
    const motivos: string[] = [];
    const dejar = alTerminarSesion((m) => motivos.push(m));
    simularFetch(async () => respuesta({ estado: 401, mensaje: 'Inicie sesión para continuar' }, 401));

    const error = await clienteApi.consultarParametros().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorDeApi);
    expect(motivos).toEqual(['vencida']);
    expect(leerSesion()).toBeNull();
    dejar();
  });

  it('el DELETE también lleva el token', async () => {
    guardarSesion({ token: 'tok-2', usuario: 'operaciones', expiraEnMs: enUnaHora() });
    const fetchSimulado = simularFetch(async () => new Response(null, { status: 204 }));
    await clienteApi.cancelarAveria('ej-1', 7);
    expect((fetchSimulado.mock.calls[0] as unknown as [string, RequestInit])[1]).toEqual({
      method: 'DELETE',
      headers: { Authorization: 'Bearer tok-2' },
    });
  });
});

describe('clienteSesion', () => {
  it('iniciar hace POST con las credenciales y un 401 no termina ninguna sesión', async () => {
    const motivos: string[] = [];
    const dejar = alTerminarSesion((m) => motivos.push(m));
    const fetchSimulado = simularFetch(async () => respuesta({ estado: 401, mensaje: 'Usuario o contraseña incorrectos' }, 401));

    const error = await clienteSesion.iniciar('operaciones', 'mala').catch((e: unknown) => e);

    const [url, opciones] = fetchSimulado.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/sesion');
    expect(opciones.method).toBe('POST');
    expect(JSON.parse(opciones.body as string)).toEqual({ usuario: 'operaciones', clave: 'mala' });
    expect(error).toMatchObject({ estado: 401, message: 'Usuario o contraseña incorrectos' });
    expect(motivos).toEqual([]);
    dejar();
  });

  it('consultar manda el token recibido', async () => {
    const fetchSimulado = simularFetch(async () => respuesta({ seguridadActiva: true, autenticado: true, usuario: 'x', expiraEnMs: 1 }));
    await clienteSesion.consultar('tok-3');
    expect((fetchSimulado.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toEqual({ Authorization: 'Bearer tok-3' });
  });
});
