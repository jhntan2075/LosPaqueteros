// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Plus, X } from 'lucide-react';
import { cn } from '../../lib/clases';
import { Aviso, Boton, Campo, EncabezadoPagina, Entrada, FilaDato, Insignia, Pestanas, Tarjeta } from '.';

afterEach(cleanup);

describe('cn', () => {
  it('conserva el tamaño de la escala propia junto a un color de texto', () => {
    expect(cn('text-body text-neutral-600')).toBe('text-body text-neutral-600');
  });
  it('la última clase gana entre dos tamaños o dos radios', () => {
    expect(cn('text-body', 'text-title')).toBe('text-title');
    expect(cn('rounded-control', 'rounded-card')).toBe('rounded-card');
  });
});

describe('Boton', () => {
  it('es type="button" por defecto y muestra su ícono como decorativo', () => {
    render(<Boton icono={Plus}>Registrar pedido</Boton>);
    const boton = screen.getByRole('button', { name: 'Registrar pedido' });
    expect(boton.getAttribute('type')).toBe('button');
    expect(boton.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
  it('mientras carga queda deshabilitado y muestra el texto de carga', () => {
    const onClick = vi.fn();
    render(<Boton cargando textoCargando="Guardando…" onClick={onClick}>Guardar</Boton>);
    const boton = screen.getByRole('button', { name: 'Guardando…' });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(boton);
    expect(onClick).not.toHaveBeenCalled();
  });
  it('sin texto es cuadrado y se nombra con aria-label', () => {
    render(<Boton icono={X} aria-label="Cerrar" />);
    expect(screen.getByRole('button', { name: 'Cerrar' }).className).toContain('size-8');
  });
});

describe('Campo', () => {
  it('une etiqueta, ayuda y error con el control', () => {
    const { rerender } = render(
      <Campo htmlFor="cap" etiqueta="Capacidad" ayuda="En paquetes">
        <Entrada id="cap" />
      </Campo>,
    );
    const input = screen.getByLabelText('Capacidad');
    expect(input.getAttribute('aria-describedby')).toBe('cap-ayuda');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    rerender(
      <Campo htmlFor="cap" etiqueta="Capacidad" ayuda="En paquetes" error="Debe ser mayor que 0">
        <Entrada id="cap" />
      </Campo>,
    );
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Debe ser mayor que 0').id).toBe('cap-error');
  });
});

describe('Tarjeta y EncabezadoPagina', () => {
  it('la tarjeta queda rotulada por su título', () => {
    render(<Tarjeta titulo="Almacenes">contenido</Tarjeta>);
    expect(screen.getByRole('region', { name: 'Almacenes' })).toBeTruthy();
  });
  it('el encabezado tiene un h1 y un botón de volver con texto explícito', () => {
    const onVolver = vi.fn();
    render(<EncabezadoPagina titulo="Registrar nuevo pedido" volver={{ texto: 'Volver a la cola de pedidos', onClick: onVolver }} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Registrar nuevo pedido' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a la cola de pedidos' }));
    expect(onVolver).toHaveBeenCalled();
  });
});

describe('Pestanas', () => {
  it('marca la activa y se mueve con las flechas', () => {
    const onCambiar = vi.fn();
    render(
      <Pestanas
        etiqueta="Contenido"
        activa="a"
        onCambiar={onCambiar}
        opciones={[
          { id: 'a', etiqueta: 'Resumen' },
          { id: 'b', etiqueta: 'Planificación' },
        ]}
      />,
    );
    const resumen = screen.getByRole('tab', { name: 'Resumen' });
    expect(resumen.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(resumen, { key: 'ArrowRight' });
    expect(onCambiar).toHaveBeenCalledWith('b');
  });
});

describe('Insignia, FilaDato y Aviso', () => {
  it('la insignia siempre lleva texto; el punto es decorativo', () => {
    render(<Insignia tono="ok" punto>Completada</Insignia>);
    const insignia = screen.getByText('Completada');
    expect(insignia.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
  it('la fila muestra etiqueta y valor', () => {
    render(<FilaDato etiqueta="Distancia recorrida" valor="321 km" />);
    expect(screen.getByText('Distancia recorrida').parentElement?.textContent).toBe('Distancia recorrida321 km');
  });
  it('el aviso de error se anuncia con role alert', () => {
    render(<Aviso tono="critical" role="alert">No se pudo guardar</Aviso>);
    expect(screen.getByRole('alert').textContent).toContain('No se pudo guardar');
  });
});

describe('Campo respeta lo que trae el control', () => {
  it('no pisa un aria-invalid propio ni su aria-describedby', () => {
    render(
      <Campo htmlFor="clave" etiqueta="Contraseña" ayuda="Distingue mayúsculas">
        <Entrada id="clave" aria-invalid aria-describedby="error-login" />
      </Campo>,
    );
    const input = screen.getByLabelText('Contraseña');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('error-login clave-ayuda');
  });
});
