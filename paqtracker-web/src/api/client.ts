import type { EjecucionInfo, TipoEscenario, ParametrosEjecucion } from '../types/ejecucion';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Cliente REST centralizado para comunicarse con paqtracker-api (IF-02)
 */
export const apiClient = {
  // --- Ejecuciones (DA-08, LE-043) ---
  async getEjecucionesActivas(): Promise<EjecucionInfo[]> {
    const res = await fetch(`${BASE_URL}/ejecuciones`);
    if (!res.ok) throw new Error('Error al obtener ejecuciones activas');
    return res.json();
  },

  async crearEjecucion(tipo: TipoEscenario, parametros?: Partial<ParametrosEjecucion>): Promise<EjecucionInfo> {
    const res = await fetch(`${BASE_URL}/ejecuciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipoEscenario: tipo, parametros }),
    });
    if (!res.ok) throw new Error('Error al crear ejecución');
    return res.json();
  },

  async iniciarEjecucion(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/ejecuciones/${id}/iniciar`, { method: 'POST' });
    if (!res.ok) throw new Error('Error al iniciar ejecución');
  },

  async pausarEjecucion(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/ejecuciones/${id}/pausar`, { method: 'POST' });
    if (!res.ok) throw new Error('Error al pausar ejecución');
  },

  async getEstadoInicial(id: string): Promise<unknown> {
    const res = await fetch(`${BASE_URL}/ejecuciones/${id}/estado`);
    if (!res.ok) throw new Error('Error al obtener estado inicial');
    return res.json();
  },

  // --- Carga masiva de archivos (LE-006, LE-007, DA-05) ---
  async cargarArchivoPedidos(file: File, mes: string): Promise<{ registrosValidos: number; errores: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mes', mes);

    const res = await fetch(`${BASE_URL}/archivos/pedidos`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Error al cargar archivo de pedidos');
    return res.json();
  },

  // --- Registro de averías en caliente (P&R 3, LE-038) ---
  async registrarAveria(ejecucionId: string, camionId: string, motivo?: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/ejecuciones/${ejecucionId}/averias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ camionId, motivo }),
    });
    if (!res.ok) throw new Error('Error al registrar avería');
  },

  // --- Configuración en caliente (QA-05, LE-021, LE-078) ---
  async actualizarParametros(ejecucionId: string, parametros: Partial<ParametrosEjecucion>): Promise<void> {
    const res = await fetch(`${BASE_URL}/ejecuciones/${ejecucionId}/configuracion`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parametros),
    });
    if (!res.ok) throw new Error('Error al actualizar configuración en caliente');
  },
};
