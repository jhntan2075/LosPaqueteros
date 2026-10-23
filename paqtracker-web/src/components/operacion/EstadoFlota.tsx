import React from 'react';
import { UNIDADES, type TipoUnidad } from '../../config/dominio';
import { RANGO_OCUPACION } from '../../config/glosario';
import { capitalizar, formatearMomento } from '../../lib/formato';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { estadoFlota, nivelDeOcupacion } from '../../lib/operacion';
import { COLOR_HOLGURA } from '../pedidos/estilos';
import { FilaConBarra, TituloSeccion } from './comunes';

import { colorDeCarga, iconoVehiculo } from '../map/iconosVehiculo';

// OP-07 · Estado de la flota (Figma 1:5813). Implementado sobre la captura del frame: el contexto de
// diseño no estuvo disponible (límite de llamadas de Figma), así que medidas y espaciados son aproximados.

const ETIQUETA: Record<TipoUnidad, string> = { AUTO: 'Auto', MOTO: 'Moto', BICICLETA: 'Bici' };
const FONDO_NIVEL = { ROJO: 'bg-critical-600', AMBAR: 'bg-warn-500', VERDE: 'bg-ok-600', CERRADO: 'bg-neutral-400' } as const;

const unidades = (n: number) => `${n} ${n === 1 ? 'unidad' : 'unidades'}`;

const Leyenda: React.FC<{ color: string; etiqueta: string; valor: number }> = ({ color, etiqueta, valor }) => (
  <span className="flex items-center gap-[5px] text-body whitespace-nowrap">
    <span className={`size-[7px] rounded-[1px] ${color}`} />
    <span className="font-sans text-neutral-500">{etiqueta}</span>
    <span className="tabular-nums font-medium text-neutral-900">{valor}</span>
  </span>
);

/** Pestaña "Flota" del panel lateral del mapa (Operación y corrida de simulación). */
export const EstadoFlota: React.FC = () => {
  const datos = useDatosOperacion();
  const { reloj } = datos;
  const flota = estadoFlota(datos);
  const utilizacion = flota.total === 0 ? 0 : Math.round((flota.enRuta / flota.total) * 100);
  // Cada unidad cae en un solo segmento; los que valen 0 no se dibujan ni aparecen en la leyenda.
  const segmentos = [
    { clave: 'ruta', etiqueta: 'en ruta', valor: flota.enRuta, color: 'bg-primary-600' },
    { clave: 'refr', etiqueta: 'en refrigerio', valor: flota.enRefrigerio.length, color: 'bg-info-600' },
    { clave: 'disp', etiqueta: 'disponibles', valor: flota.disponibles, color: 'bg-neutral-300' },
    { clave: 'turno', etiqueta: 'fuera de turno', valor: flota.fueraDeTurno, color: 'bg-neutral-200' },
    { clave: 'aver', etiqueta: 'averiadas', valor: flota.averiadas.length, color: 'bg-critical-600' },
  ];
  const visibles = segmentos.filter((s) => s.valor > 0 || s.clave === 'ruta' || s.clave === 'disp');

  const atencion = [
    flota.averiadas.length > 0 && {
      color: 'rojo' as const,
      titulo: `${unidades(flota.averiadas.length)} ${flota.averiadas.length === 1 ? 'averiada' : 'averiadas'}`,
      detalle: flota.averiadas
        .map((u) => `${capitalizar(UNIDADES[u.tipo].nombre)} ${u.codigo}${u.averia ? ` (tipo ${u.averia.tipo}, vuelve ${formatearMomento(u.averia.vuelve, reloj)})` : ''}`)
        .join(' · '),
    },
    flota.llenas.length > 0 && {
      color: 'ambar' as const,
      titulo: `${unidades(flota.llenas.length)} al 100 % de carga`,
      detalle: `${flota.llenas.map((u) => u.codigo).join(' ')} · no admiten reasignación`,
    },
    flota.ociosas.length > 0 && {
      color: 'ambar' as const,
      titulo: `${unidades(flota.ociosas.length)} ociosas más de 30 min`,
      detalle: flota.ociosas.map((u) => u.codigo).join(' '),
    },
    flota.enRefrigerio.length > 0 && {
      color: 'ambar' as const,
      titulo: `${unidades(flota.enRefrigerio.length)} en refrigerio`,
      detalle: flota.enRefrigerio.map((u) => `${capitalizar(UNIDADES[u.tipo].nombre)} ${u.codigo}`).join(' · '),
    },
  ].filter(Boolean) as { color: 'rojo' | 'ambar'; titulo: string; detalle: string }[];

  return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Resumen */}
        <section className="px-[12px] pt-[14px] pb-[12px] border-b border-neutral-200 flex flex-col gap-[10px]">
          <TituloSeccion derecha={`${utilizacion} % en ruta`}>
            Estado de la flota · {flota.total} unidades
          </TituloSeccion>
          <div
            className="flex gap-[2px] h-[12px] w-full"
            role="img"
            aria-label={visibles.map((s) => `${s.valor} ${s.etiqueta}`).join(', ')}
          >
            {visibles.map((s) => (
              <span key={s.clave} className={`${s.color} rounded-[1px]`} style={{ flexGrow: s.valor, flexBasis: 0 }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-[16px] gap-y-[4px]">
            {visibles.map((s) => (
              <Leyenda key={s.clave} color={s.color} etiqueta={s.etiqueta} valor={s.valor} />
            ))}
          </div>
        </section>

        {/* Por tipo de unidad */}
        <section className="px-[12px] pt-[12px] pb-[14px] border-b border-neutral-200 flex flex-col gap-[10px]">
          <TituloSeccion derecha="en ruta · carga a bordo">Por tipo de unidad</TituloSeccion>
          {flota.porTipo.map(({ tipo, enRuta, total, carga, capacidad, cargaABordo }) => {
            // La barra y el porcentaje miden lo mismo: la carga a bordo, con el semáforo de carga.
            const nivel = cargaABordo === null ? null : nivelDeOcupacion(carga, capacidad);
            return (
              <div key={tipo} className="flex flex-col gap-[5px]">
                <div className="flex items-center gap-[8px] text-body">
                  <img src={iconoVehiculo(tipo, colorDeCarga(carga, capacidad)).href} alt="" className="block -my-[4px]" />
                  <span className="font-sans font-semibold text-neutral-900">{ETIQUETA[tipo]}</span>
                  <span className="tabular-nums text-neutral-500">
                    {enRuta} / {total} en ruta
                  </span>
                  <span
                    className={`ml-auto tabular-nums ${nivel ? COLOR_HOLGURA[nivel] : 'text-neutral-500'}`}
                    title="Paquetes sin entregar sobre la capacidad de las unidades fuera del almacén. Baja a medida que entregan."
                  >
                    {cargaABordo === null ? 'sin unidades fuera' : `carga ${carga}/${capacidad} · ${Math.round(cargaABordo * 100)} %`}
                  </span>
                </div>
                <div
                  className="h-[4px] bg-neutral-200 rounded-full overflow-hidden"
                  role="meter"
                  aria-label={`Carga a bordo de ${ETIQUETA[tipo].toLowerCase()}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={cargaABordo === null ? 0 : Math.round(cargaABordo * 100)}
                >
                  {nivel && (
                    <div className={`h-full rounded-full ${FONDO_NIVEL[nivel]}`} style={{ width: `${Math.min(100, (cargaABordo ?? 0) * 100)}%` }} />
                  )}
                </div>
              </div>
            );
          })}
          <p className="text-caption text-neutral-500">
            Carga: verde {RANGO_OCUPACION.VERDE} · ámbar {RANGO_OCUPACION.AMBAR} · rojo {RANGO_OCUPACION.ROJO}
          </p>
        </section>

        {/* Requiere atención */}
        <section className="px-[12px] pt-[12px] pb-[14px] flex flex-col gap-[12px]">
          <TituloSeccion derecha={atencion.length}>Requiere atención</TituloSeccion>
          {atencion.length === 0 && <p className="font-sans text-body text-neutral-500">Ninguna unidad requiere atención.</p>}
          {atencion.map((item) => (
            <FilaConBarra key={item.titulo} color={item.color} titulo={item.titulo} detalle={item.detalle} detalleMono />
          ))}
        </section>
      </div>
  );
};
