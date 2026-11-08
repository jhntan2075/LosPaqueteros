import { afterEach, describe, expect, it } from 'vitest';
import { alTerminarSesion, borrarSesion, guardarSesion, leerSesion, terminarSesion, tokenVigente } from './sesion';

afterEach(() => borrarSesion());

// Entorno node: sin localStorage, la sesión vive en memoria (como en un navegador que lo bloquea).
describe('sesion', () => {
  it('guarda, lee y borra la sesión aunque no haya almacenamiento', () => {
    guardarSesion({ token: 't', usuario: 'operaciones', expiraEnMs: 2_000 });
    expect(leerSesion()).toEqual({ token: 't', usuario: 'operaciones', expiraEnMs: 2_000 });
    borrarSesion();
    expect(leerSesion()).toBeNull();
  });

  it('el token solo vale antes del vencimiento', () => {
    guardarSesion({ token: 't', usuario: 'operaciones', expiraEnMs: 2_000 });
    expect(tokenVigente(1_999)).toBe('t');
    expect(tokenVigente(2_000)).toBeNull();
  });

  it('terminar la sesión la borra y avisa el motivo', () => {
    const motivos: string[] = [];
    const dejar = alTerminarSesion((m) => motivos.push(m));
    guardarSesion({ token: 't', usuario: 'operaciones', expiraEnMs: 2_000 });

    terminarSesion('cerrada');
    dejar();
    terminarSesion('vencida');

    expect(motivos).toEqual(['cerrada']);
    expect(leerSesion()).toBeNull();
  });
});
