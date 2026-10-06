import React from 'react';
import { CORTE_OCUPACION, UNIDADES, type TipoUnidad } from '../../config/dominio';
import { capitalizar } from '../../lib/formato';
import { AVERIAS_CORRIDA, estadoFlota } from '../../mocks/operacion';
import { FilaConBarra, PanelCompleto, TituloSeccion } from './comunes';

import iconoAuto from '../../assets/figma/pedidos/icono-auto.svg';
import iconoMoto from '../../assets/figma/pedidos/icono-moto.svg';
import iconoBici from '../../assets/figma/pedidos/icono-bici.svg';

// OP-07 · Estado de la flota (Figma 1:5813). Implementado sobre la captura del frame: el contexto de
// diseño no estuvo disponible (límite de llamadas de Figma), así que medidas y espaciados son aproximados.

const ICONO: Record<TipoUnidad, string> = { AUTO: iconoAuto, MOTO: iconoMoto, BICICLETA: iconoBici };
const ETIQUETA: Record<TipoUnidad, string> = { AUTO: 'Auto', MOTO: 'Moto', BICICLETA: 'Bici' };

const Leyenda: React.FC<{ color: string; etiqueta: string; valor: number }> = ({ color, etiqueta, valor }) => (
  <span className="flex items-center gap-[5px] text-[12px] whitespace-nowrap">
    <span className={`size-[7px] rounded-[1px] ${color}`} />
    <span className="font-sans text-[#64748B]">{etiqueta}</span>
    <span className="font-mono font-medium text-[#0F172A]">{valor}</span>
  </span>
);

/** `compacto`: dentro del panel derecho de la corrida, sin marco ni botón de cierre. */
export const EstadoFlota: React.FC<{ onCerrar?: () => void; compacto?: boolean }> = ({ onCerrar, compacto = false }) => {
  const flota = estadoFlota();
  const utilizacion = Math.round((flota.enRuta / flota.total) * 100);
  const segmentos = [
    { clave: 'ruta', valor: flota.enRuta, color: 'bg-[#1E40AF]' },
    { clave: 'disp', valor: flota.disponibles, color: 'bg-[#CBD5E1]' },
    { clave: 'aver', valor: flota.averiadas.length, color: 'bg-[#B91C1C]' },
  ];

  const atencion = [
    flota.averiadas.length > 0 && {
      color: 'rojo' as const,
      titulo: `${flota.averiadas.length} unidades averiadas`,
      detalle: flota.averiadas.map((u) => `${capitalizar(UNIDADES[u.tipo].nombre)} ${u.codigo} (${u.averia?.fueraDeServicio})`).join(' · '),
    },
    flota.llenas.length > 0 && {
      color: 'ambar' as const,
      titulo: `${flota.llenas.length} ${flota.llenas.length === 1 ? 'unidad' : 'unidades'} al 100 % de carga`,
      detalle: `${flota.llenas.map((u) => u.codigo).join(' ')} · no admiten reasignación`,
    },
    flota.ociosas.length > 0 && {
      color: 'ambar' as const,
      titulo: `${flota.ociosas.length} unidades ociosas más de 30 min`,
      detalle: flota.ociosas.map((u) => u.codigo).join(' '),
    },
    flota.sinAlimentacion.length > 0 && {
      color: 'ambar' as const,
      titulo: `${flota.sinAlimentacion.length} sin alimentación tomada`,
      detalle: `${flota.sinAlimentacion.map((u) => `${capitalizar(UNIDADES[u.tipo].nombre)} ${u.codigo}`).join(' · ')} · turno vence 15:00`,
    },
  ].filter(Boolean) as { color: 'rojo' | 'ambar'; titulo: string; detalle: string }[];

  const contenido = (
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Resumen */}
        <section className="px-[12px] pt-[14px] pb-[12px] border-b border-[#E2E8F0] flex flex-col gap-[10px]">
          <TituloSeccion derecha={`utilización ${utilizacion} %`} onCerrar={onCerrar}>
            Estado de la flota · {flota.total} unidades
          </TituloSeccion>
          <div className={`flex gap-[2px] h-[12px] ${compacto ? 'w-full' : 'w-[316px]'}`} role="img" aria-label={`${flota.enRuta} en ruta, ${flota.disponibles} disponibles, ${flota.averiadas.length} averiadas`}>
            {segmentos.map((s) => (
              <span key={s.clave} className={`${s.color} rounded-[1px]`} style={{ flexGrow: s.valor, flexBasis: 0 }} />
            ))}
          </div>
          <div className="flex gap-[16px]">
            <Leyenda color="bg-[#1E40AF]" etiqueta="en ruta" valor={flota.enRuta} />
            <Leyenda color="bg-[#CBD5E1]" etiqueta="disponibles" valor={flota.disponibles} />
            <Leyenda color="bg-[#B91C1C]" etiqueta="averiadas" valor={flota.averiadas.length} />
          </div>
        </section>

        {/* Por tipo de unidad */}
        <section className="px-[12px] pt-[12px] pb-[14px] border-b border-[#E2E8F0] flex flex-col gap-[10px]">
          <TituloSeccion derecha="en ruta / total · ocupación media">Por tipo de unidad</TituloSeccion>
          {flota.porTipo.map(({ tipo, enRuta, total, ocupacion }) => {
            const alta = ocupacion >= CORTE_OCUPACION.rojo - 0.05;
            return (
              <div key={tipo} className="flex flex-col gap-[5px]">
                <div className="flex items-center gap-[8px] text-[12px]">
                  <img src={ICONO[tipo]} alt="" className="block -my-[4px]" />
                  <span className="font-sans font-semibold text-[#0F172A]">{ETIQUETA[tipo]}</span>
                  <span className="font-mono text-[#64748B]">
                    {enRuta} / {total} en ruta
                  </span>
                  <span className={`ml-auto font-mono ${alta ? 'text-[#B45309]' : 'text-[#0F172A]'}`}>
                    ocup. {Math.round(ocupacion * 100)} %
                  </span>
                </div>
                <div className="h-[4px] bg-[#E2E8F0] rounded-full overflow-hidden" role="presentation">
                  <div className={`h-full rounded-full ${alta ? 'bg-[#B45309]' : 'bg-[#1E40AF]'}`} style={{ width: `${(enRuta / total) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </section>

        {/* Requiere atención */}
        <section className="px-[12px] pt-[12px] pb-[14px] border-b border-[#E2E8F0] flex flex-col gap-[12px]">
          <TituloSeccion derecha={atencion.length}>Requiere atención</TituloSeccion>
          {atencion.length === 0 && <p className="font-sans text-[12px] text-[#64748B]">Ninguna unidad requiere atención.</p>}
          {atencion.map((item) => (
            <FilaConBarra key={item.titulo} color={item.color} titulo={item.titulo} detalle={item.detalle} detalleMono />
          ))}
        </section>

        {/* Averías de la corrida */}
        <section className="px-[12px] pt-[12px] pb-[14px] flex flex-col gap-[6px] text-[12px]">
          <TituloSeccion derecha={`${AVERIAS_CORRIDA.registradas} registradas`}>Averías de la corrida</TituloSeccion>
          <div className="flex justify-between pt-[4px]">
            <span className="font-sans text-[#64748B]">Por tipo de falla</span>
            <span className="font-mono text-[#0F172A]">
              tipo 1: {AVERIAS_CORRIDA.porTipo[1]} · tipo 2: {AVERIAS_CORRIDA.porTipo[2]} · tipo 3: {AVERIAS_CORRIDA.porTipo[3]}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-sans text-[#64748B]">Fuera de servicio</span>
            <span className="font-mono text-[#0F172A]">{AVERIAS_CORRIDA.minutosFueraDeServicio} min acumulados</span>
          </div>
          <div className="flex justify-between">
            <span className="font-sans text-[#64748B]">Reincidentes</span>
            <span className="font-mono text-[#0F172A]">{AVERIAS_CORRIDA.reincidente}</span>
          </div>
        </section>
      </div>
  );
  return compacto ? contenido : <PanelCompleto etiqueta="Estado de la flota">{contenido}</PanelCompleto>;
};
