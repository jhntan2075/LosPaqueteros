// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DialogoConfirmacion } from './DialogoConfirmacion';

afterEach(cleanup);

const montar = (tono?: 'peligro' | 'normal') =>
  render(
    <DialogoConfirmacion
      abierto
      titulo="¿Seguro?"
      descripcion="Descripción"
      textoConfirmar="Confirmar"
      tono={tono}
      onConfirmar={vi.fn()}
      onCancelar={vi.fn()}
    />,
  );

describe('DialogoConfirmacion (tono)', () => {
  it('por defecto es de peligro: alertdialog y botón de confirmar rojo', () => {
    montar();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirmar' }).className).toContain('bg-critical-600');
  });

  it('con tono normal es un dialog y el botón de confirmar no usa el estilo de peligro', () => {
    montar('normal');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirmar' }).className).not.toContain('critical');
  });

  it('el foco arranca en Cancelar con cualquier tono', () => {
    montar('normal');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }));
  });
});
