import React from 'react';
import { formatearFechaLarga, formatearMiles } from '../../lib/formato';
import type { EjecucionApi, EstadoEjecucionApi, ResultadoGuardadoApi } from '../../types/api';
import { Aviso, Boton, EncabezadoPagina, FilaDato, Tarjeta } from '../ui';

// Resultado de una corrida que ya no está en memoria (pasada o de antes de un reinicio de la API): la base
// guarda su resumen y el contexto para reproducirla, no el mapa ni las instantáneas.

const ESTADO: Record<EstadoEjecucionApi, string> = {
  CONFIGURADA: 'Configurada',
  EN_CURSO: 'Interrumpida',
  PAUSADA: 'Interrumpida',
  FINALIZADA: 'Finalizada',
  COLAPSADA: 'Colapsada',
};

const CAUSA_COLAPSO: Record<NonNullable<ResultadoGuardadoApi['colapso']>['causa'], string> = {
  ENTREGA_TARDIA: 'Entrega fuera de plazo',
  PLAZO_VENCIDO_SIN_DESPACHO: 'Plazo vencido sin despacho',
};

const ORIGEN_DATOS: Record<ResultadoGuardadoApi['origenDatos'], string> = {
  SISTEMA: 'Pedidos del sistema',
  ARCHIVO: 'Archivo subido para esta corrida',
};

const fecha = (iso: string | null) => (iso ? formatearFechaLarga(new Date(iso), false) : '—');
const kilometros = (km: number) => `${formatearMiles(Math.round(km))} km`;
const milisegundos = (ms: number) => `${formatearMiles(Math.round(ms))} ms`;

const Seccion: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <Tarjeta cuerpoClassName="flex flex-col px-5 pb-3 pt-4">
    <h2 className="border-b border-neutral-200 pb-3 text-title-sm text-neutral-900">{titulo}</h2>
    {children}
  </Tarjeta>
);

const Fila: React.FC<{ etiqueta: string; valor: string }> = ({ etiqueta, valor }) => (
  <FilaDato separador etiqueta={etiqueta} valor={valor} />
);

interface ResultadoHistoricoProps {
  ejecucion: EjecucionApi;
  onSalir: () => void;
}

export const ResultadoHistorico: React.FC<ResultadoHistoricoProps> = ({ ejecucion, onSalir }) => {
  const resultado = ejecucion.resultado;
  const escenario = ejecucion.tipoEscenario === 'COLAPSO_LOGISTICO' ? 'Hasta el colapso' : `Simulación ${ejecucion.dias} días`;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EncabezadoPagina
        titulo={ejecucion.nombre}
        descripcion="Corrida guardada: se conserva su resultado, no el mapa."
        volver={{ texto: 'Ver otras simulaciones', onClick: onSalir }}
        acciones={
          <Boton variante="primario" onClick={onSalir}>
            Nueva corrida
          </Boton>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-superficie">
        {!resultado ? (
          <div className="mx-auto max-w-xl p-6">
            <Aviso tono="warn">Esta corrida no tiene un resultado guardado.</Aviso>
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-4 p-4 sm:p-6 lg:grid-cols-3">
            <Seccion titulo="Resultado">
              <Fila etiqueta="Estado" valor={ESTADO[ejecucion.estado]} />
              <Fila etiqueta="Escenario" valor={escenario} />
              <Fila etiqueta="Reloj alcanzado" valor={ejecucion.relojSimulado ?? '—'} />
              <Fila etiqueta="Entregas" valor={formatearMiles(resultado.metricas.entregas)} />
              <Fila etiqueta="Fuera de plazo" valor={formatearMiles(resultado.metricas.incumplimientos)} />
              <Fila etiqueta="Paquetes entregados" valor={formatearMiles(resultado.metricas.productosEntregados)} />
              <Fila etiqueta="Distancia recorrida" valor={kilometros(resultado.metricas.distanciaKm)} />
              <Fila etiqueta="Costo de operación" valor={formatearMiles(Math.round(resultado.metricas.costoTotal))} />
            </Seccion>

            <Seccion titulo="Planificador y flota">
              <Fila etiqueta="Planificaciones" valor={formatearMiles(resultado.metricas.replanificaciones)} />
              <Fila etiqueta="Tiempo de cómputo promedio" valor={milisegundos(resultado.tiempoComputoPromedioMs)} />
              <Fila etiqueta="Tiempo de cómputo máximo" valor={milisegundos(resultado.metricas.tiempoComputoMaxMs)} />
              <Fila etiqueta="Unidades en ruta a la vez (máx.)" valor={String(resultado.metricas.picoUnidades)} />
              <Fila
                etiqueta="Rutas por tipo"
                valor={`${resultado.metricas.usoAutos} A · ${resultado.metricas.usoMotos} M · ${resultado.metricas.usoBicicletas} B`}
              />
              <Fila etiqueta="Averías atendidas" valor={String(resultado.metricas.averiasAtendidas)} />
            </Seccion>

            <Seccion titulo="Parámetros de la corrida">
              <Fila etiqueta="Algoritmo" valor={ejecucion.algoritmo} />
              <Fila etiqueta="Flota" valor={`${ejecucion.flota.autos} A · ${ejecucion.flota.motos} M · ${ejecucion.flota.bicicletas} B`} />
              <Fila etiqueta="Pedidos" valor={ORIGEN_DATOS[resultado.origenDatos]} />
              <Fila etiqueta="Semilla" valor={resultado.semilla === null ? '—' : String(resultado.semilla)} />
              <Fila etiqueta="Creada" valor={fecha(resultado.creadaEn)} />
              <Fila etiqueta="Terminó" valor={fecha(resultado.finalizadaEn)} />
            </Seccion>

            {resultado.colapso && (
              <Seccion titulo="Colapso logístico">
                <Fila etiqueta="Instante" valor={fecha(resultado.colapso.fecha)} />
                <Fila etiqueta="Causa" valor={CAUSA_COLAPSO[resultado.colapso.causa]} />
                <Fila etiqueta="Pedido" valor={resultado.colapso.pedido} />
                <Fila etiqueta="Unidad" valor={resultado.colapso.unidad ?? 'Sin despachar'} />
                <Fila etiqueta="Hora límite" valor={fecha(resultado.colapso.horaLimite)} />
                <Fila etiqueta="Llegada estimada" valor={fecha(resultado.colapso.llegadaEstimada)} />
              </Seccion>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
