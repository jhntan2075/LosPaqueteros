// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteSesion, ErrorDeApi } from '../../services/clienteApi';
import { borrarSesion, guardarSesion, leerSesion, terminarSesion } from '../../services/sesion';
import { useSesion } from './contextoSesion';
import { PuertaSesion } from './PuertaSesion';

vi.mock('../../services/clienteStomp', () => ({ desconectar: vi.fn() }));

const enUnaHora = () => Date.now() + 3_600_000;

const Aplicacion = () => {
  const sesion = useSesion();
  return (
    <div>
      <p>Aplicación</p>
      {sesion && <button onClick={sesion.cerrarSesion}>Salir</button>}
    </div>
  );
};

const montar = () =>
  render(
    <PuertaSesion>
      <Aplicacion />
    </PuertaSesion>,
  );

const escribir = (etiqueta: string, valor: string) => fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

beforeEach(() => borrarSesion());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  borrarSesion();
});

describe('PuertaSesion', () => {
  it('sin sesión muestra el login y no la aplicación', async () => {
    vi.spyOn(clienteSesion, 'consultar').mockResolvedValue({ seguridadActiva: true, autenticado: false, usuario: null, expiraEnMs: null });
    montar();
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(screen.queryByText('Aplicación')).toBeNull();
  });

  it('con la seguridad apagada entra directo y sin botón Salir', async () => {
    vi.spyOn(clienteSesion, 'consultar').mockResolvedValue({ seguridadActiva: false, autenticado: false, usuario: null, expiraEnMs: null });
    montar();
    expect(await screen.findByText('Aplicación')).toBeTruthy();
    expect(screen.queryByText('Salir')).toBeNull();
  });

  it('credenciales incorrectas muestran el error, vacían la clave y siguen en el login', async () => {
    vi.spyOn(clienteSesion, 'consultar').mockResolvedValue({ seguridadActiva: true, autenticado: false, usuario: null, expiraEnMs: null });
    vi.spyOn(clienteSesion, 'iniciar').mockRejectedValue(new ErrorDeApi(401, 'Usuario o contraseña incorrectos'));
    montar();
    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    escribir('Usuario', 'operaciones');
    escribir('Contraseña', 'mala');
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Usuario o contraseña incorrectos'));
    expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe('');
    expect(screen.queryByText('Aplicación')).toBeNull();
  });

  it('campos vacíos no llaman a la API', async () => {
    vi.spyOn(clienteSesion, 'consultar').mockResolvedValue({ seguridadActiva: true, autenticado: false, usuario: null, expiraEnMs: null });
    const iniciar = vi.spyOn(clienteSesion, 'iniciar');
    montar();
    await screen.findByRole('heading', { name: 'Iniciar sesión' });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Completa usuario y contraseña'));
    expect(iniciar).not.toHaveBeenCalled();
  });

  it('credenciales correctas guardan la sesión, abren la aplicación y Salir vuelve al login', async () => {
    vi.spyOn(clienteSesion, 'consultar').mockResolvedValue({ seguridadActiva: true, autenticado: false, usuario: null, expiraEnMs: null });
    vi.spyOn(clienteSesion, 'iniciar').mockResolvedValue({ token: 'tok-1', usuario: 'operaciones', expiraEnMs: enUnaHora() });
    const cerrar = vi.spyOn(clienteSesion, 'cerrar').mockResolvedValue();
    montar();
    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    escribir('Usuario', 'operaciones');
    escribir('Contraseña', 'correcta');
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('Aplicación')).toBeTruthy();
    expect(leerSesion()?.token).toBe('tok-1');

    fireEvent.click(screen.getByText('Salir'));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(leerSesion()).toBeNull();
    expect(cerrar).toHaveBeenCalledWith('tok-1');
  });

  it('una sesión guardada y vigente entra sin pedir credenciales', async () => {
    guardarSesion({ token: 'tok-2', usuario: 'operaciones', expiraEnMs: enUnaHora() });
    const consultar = vi
      .spyOn(clienteSesion, 'consultar')
      .mockResolvedValue({ seguridadActiva: true, autenticado: true, usuario: 'operaciones', expiraEnMs: enUnaHora() });
    montar();
    expect(await screen.findByText('Aplicación')).toBeTruthy();
    expect(consultar).toHaveBeenCalledWith('tok-2');
  });

  it('una sesión guardada que la API ya no reconoce pide ingresar de nuevo con el aviso de vencida', async () => {
    guardarSesion({ token: 'tok-viejo', usuario: 'operaciones', expiraEnMs: enUnaHora() });
    vi.spyOn(clienteSesion, 'consultar').mockResolvedValue({ seguridadActiva: true, autenticado: false, usuario: null, expiraEnMs: null });
    montar();
    expect(await screen.findByText(/Tu sesión venció/)).toBeTruthy();
    expect((screen.getByLabelText('Usuario') as HTMLInputElement).value).toBe('operaciones');
    expect(leerSesion()).toBeNull();
  });

  it('si la sesión termina con la aplicación abierta (401 o vencimiento) vuelve al login', async () => {
    guardarSesion({ token: 'tok-3', usuario: 'operaciones', expiraEnMs: enUnaHora() });
    vi.spyOn(clienteSesion, 'consultar').mockResolvedValue({ seguridadActiva: true, autenticado: true, usuario: 'operaciones', expiraEnMs: enUnaHora() });
    montar();
    await screen.findByText('Aplicación');

    act(() => terminarSesion('vencida'));

    await waitFor(() => expect(screen.queryByText('Aplicación')).toBeNull());
    expect(screen.getByText(/Tu sesión venció/)).toBeTruthy();
  });

  it('sin conexión con la API muestra el login con el aviso y permite reintentar', async () => {
    const consultar = vi.spyOn(clienteSesion, 'consultar').mockRejectedValueOnce(new ErrorDeApi(0, 'No se pudo conectar con el servidor'));
    consultar.mockResolvedValueOnce({ seguridadActiva: false, autenticado: false, usuario: null, expiraEnMs: null });
    montar();
    expect(await screen.findByText(/No se pudo conectar con el servidor/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Aplicación')).toBeTruthy();
  });
});
