import React, { useRef, useState } from 'react';
import { CORTE_HOLGURA } from '../../config/dominio';
import { NOMBRE_REGISTRO, leerArchivo } from '../../lib/archivosSimulacion';
import { formatearFechaLarga, formatearFechaNumerica, formatearMiles } from '../../lib/formato';
import type { ArchivoCargado, ConfiguracionCorrida, EscenarioSimulacion, TipoArchivo } from '../../types/simulacion';

// Configuración de escenario (Figma "Configuración de escenario · vacío / completado"), implementada
// sobre las capturas de los frames.

const ESCENARIOS: { valor: EscenarioSimulacion; titulo: string; descripcion: string; resumen: string }[] = [
  { valor: 'CINCO_DIAS', titulo: 'Simulación 5 días', descripcion: 'Comprime 5 días de operación en 30–60 min de ejecución.', resumen: 'Simulación 5 días' },
  { valor: 'COLAPSO', titulo: 'Hasta el colapso', descripcion: 'Corre hasta el primer pedido imposible de entregar en plazo.', resumen: 'Hasta el colapso' },
];

const ARCHIVOS: { tipo: TipoArchivo; etiqueta: string; acepta: string }[] = [
  { tipo: 'pedidos', etiqueta: 'Pedidos', acepta: '.txt,.csv' },
  { tipo: 'bloqueos', etiqueta: 'Bloqueos', acepta: '.txt,.csv' },
  { tipo: 'averias', etiqueta: 'Averías', acepta: '.txt,.csv' },
];

const Seccion: React.FC<{ numero: string; titulo: string; resumen: React.ReactNode; resumenPendiente?: boolean; children: React.ReactNode }> = ({
  numero,
  titulo,
  resumen,
  resumenPendiente = false,
  children,
}) => {
  const [abierta, setAbierta] = useState(true);
  return (
    <section className="bg-white border border-[#E2E8F0] rounded-[4px]">
      <button
        type="button"
        onClick={() => setAbierta(!abierta)}
        aria-expanded={abierta}
        className="w-full h-[48px] px-[15px] flex items-center gap-[14px] text-left"
      >
        <span className="font-mono text-[12px] text-[#94A3B8]">{numero}</span>
        <h2 className="font-sans font-semibold text-[14px] text-[#0F172A]">{titulo}</h2>
        <span className={`ml-auto font-mono text-[12px] ${resumenPendiente ? 'text-[#94A3B8]' : 'text-[#0F172A]'}`}>{resumen}</span>
        <span className={`text-[9px] text-[#94A3B8] transition-transform ${abierta ? '' : 'rotate-180'}`} aria-hidden="true">
          ▲
        </span>
      </button>
      {abierta && <div className="px-[15px] pb-[18px] flex flex-col gap-[8px]">{children}</div>}
    </section>
  );
};

const Etiqueta: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="font-sans text-[12px] text-[#334155]">
    {children}
  </label>
);

const RanuraArchivo: React.FC<{
  tipo: TipoArchivo;
  etiqueta: string;
  acepta: string;
  archivo?: ArchivoCargado;
  onCargar: (archivo: File) => void;
}> = ({ tipo, etiqueta, acepta, archivo, onCargar }) => {
  const entrada = useRef<HTMLInputElement>(null);
  const nombres = NOMBRE_REGISTRO[tipo];
  const id = `archivo-${tipo}`;
  return (
    <div className="flex flex-col gap-[8px] mb-[6px]">
      <Etiqueta htmlFor={id}>{etiqueta}</Etiqueta>
      <div
        className={`w-[360px] h-[32px] px-[10px] rounded-[2px] flex items-center gap-[10px] text-[12px] ${
          archivo ? 'border border-[#CBD5E1] bg-white' : 'border border-dashed border-[#94A3B8] bg-[#F8FAFC]'
        }`}
      >
        {archivo ? (
          <>
            <span className="font-mono text-[#0F172A] truncate">"{archivo.nombre}"</span>
            <span className="ml-auto font-mono text-[#64748B] whitespace-nowrap">
              {formatearMiles(archivo.registros)} {archivo.registros === 1 ? nombres.singular : nombres.plural}
            </span>
          </>
        ) : (
          <span className="font-mono text-[#94A3B8]">Ningún archivo cargado</span>
        )}
        <button type="button" onClick={() => entrada.current?.click()} className={`font-sans font-medium text-[#1E40AF] hover:underline whitespace-nowrap ${archivo ? '' : 'ml-auto'}`}>
          {archivo ? 'Reemplazar' : 'Subir archivo'}
        </button>
        <input
          ref={entrada}
          id={id}
          type="file"
          accept={acepta}
          className="sr-only"
          onChange={(evento) => {
            const elegido = evento.target.files?.[0];
            if (elegido) onCargar(elegido);
            evento.target.value = '';
          }}
        />
      </div>
      {archivo && archivo.lineasInvalidas.length > 0 && (
        <p className="font-sans text-[12px] text-[#B45309]">
          {archivo.lineasInvalidas.length} {archivo.lineasInvalidas.length === 1 ? 'línea no respeta' : 'líneas no respetan'} el formato y se
          omitirán (línea {archivo.lineasInvalidas.slice(0, 5).join(', ')}
          {archivo.lineasInvalidas.length > 5 ? '…' : ''}).
        </p>
      )}
      {archivo && archivo.registros === 0 && (
        <p className="font-sans text-[12px] text-[#B91C1C]">El archivo no tiene registros válidos.</p>
      )}
    </div>
  );
};

const FilaResumen: React.FC<{ etiqueta: string; valor?: string }> = ({ etiqueta, valor }) => (
  <div className="h-[33px] flex items-center justify-between border-b border-dashed border-[#E2E8F0] text-[12px]">
    <span className="font-sans text-[#64748B]">{etiqueta}</span>
    <span className={`font-mono ${valor ? 'text-[#0F172A]' : 'text-[#94A3B8]'} truncate pl-[12px]`}>{valor ?? '—'}</span>
  </div>
);

interface ConfiguracionEscenarioProps {
  onEjecutar: (configuracion: ConfiguracionCorrida) => void;
}

export const ConfiguracionEscenario: React.FC<ConfiguracionEscenarioProps> = ({ onEjecutar }) => {
  const [escenario, setEscenario] = useState<EscenarioSimulacion>('CINCO_DIAS');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [archivos, setArchivos] = useState<Partial<Record<TipoArchivo, ArchivoCargado>>>({});
  const [corteVerde, setCorteVerde] = useState(String(CORTE_HOLGURA.ambar * 100));
  const [corteRojo, setCorteRojo] = useState(String(CORTE_HOLGURA.rojo * 100));

  const inicio = fecha && hora ? new Date(`${fecha}T${hora}`) : null;
  const inicioValido = inicio !== null && !Number.isNaN(inicio.getTime());
  const cargados = ARCHIVOS.filter(({ tipo }) => (archivos[tipo]?.registros ?? 0) > 0).length;
  const verde = Number(corteVerde);
  const rojo = Number(corteRojo);
  const cortesValidos = corteVerde !== '' && corteRojo !== '' && rojo > 0 && rojo < verde && verde < 100;
  const listo = inicioValido && cargados === ARCHIVOS.length && cortesValidos;

  const faltantes = [
    !inicioValido && 'la fecha de inicio',
    cargados < ARCHIVOS.length && `${ARCHIVOS.length - cargados === ARCHIVOS.length ? 'los 3' : `${ARCHIVOS.length - cargados}`} archivo${ARCHIVOS.length - cargados === 1 ? '' : 's'} requerido${ARCHIVOS.length - cargados === 1 ? '' : 's'}`,
    !cortesValidos && 'cortes del semáforo válidos',
  ].filter(Boolean) as string[];

  const cargar = async (tipo: TipoArchivo, archivo: File) => {
    const resultado = await leerArchivo(tipo, archivo);
    setArchivos((previos) => ({ ...previos, [tipo]: resultado }));
  };

  const ejecutar = () => {
    if (!listo || !inicio) return;
    onEjecutar({
      escenario,
      inicio,
      archivos: archivos as Record<TipoArchivo, ArchivoCargado>,
      corteVerde: verde / 100,
      corteRojo: rojo / 100,
    });
  };

  const resumenArchivo = (tipo: TipoArchivo) => {
    const a = archivos[tipo];
    return a && a.registros > 0 ? `${a.registros} · ${a.nombre}` : undefined;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 leading-[normal]">
      <header className="h-[80px] bg-white border-b border-[#E2E8F0] px-[24px] flex flex-col justify-center gap-[6px] shrink-0">
        <h1 className="font-sans font-semibold text-[18px] text-[#0F172A]">Configuración de escenario</h1>
        <p className="font-sans text-[12px] text-[#64748B]">Un solo planificador, tres escenarios. Lo que cambia son los parámetros de esta pantalla.</p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex gap-[24px] items-start p-[24px] min-w-[1100px]">
          <div className="flex-1 min-w-0 flex flex-col gap-[12px]">
            <Seccion numero="01" titulo="Escenario" resumen="">
              <div className="grid grid-cols-2 gap-[12px]" role="radiogroup" aria-label="Escenario">
                {ESCENARIOS.map((opcion) => {
                  const activo = opcion.valor === escenario;
                  return (
                    <button
                      key={opcion.valor}
                      type="button"
                      role="radio"
                      aria-checked={activo}
                      onClick={() => setEscenario(opcion.valor)}
                      className={`h-[69px] px-[13px] rounded-[2px] text-left flex flex-col justify-center gap-[6px] transition ${
                        activo ? 'bg-[#EAF1FD] border-2 border-[#1E40AF]' : 'bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <span className={`font-sans font-semibold text-[14px] ${activo ? 'text-[#1E40AF]' : 'text-[#0F172A]'}`}>{opcion.titulo}</span>
                      <span className="font-sans text-[12px] text-[#64748B]">{opcion.descripcion}</span>
                    </button>
                  );
                })}
              </div>
            </Seccion>

            <Seccion numero="02" titulo="Periodo" resumen={inicioValido ? formatearFechaLarga(inicio, false) : 'Sin definir'}>
              <Etiqueta htmlFor="inicio-fecha">Fecha y hora de inicio</Etiqueta>
              <div className="flex gap-[10px]">
                <input
                  id="inicio-fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-[180px] h-[32px] px-[10px] border border-[#CBD5E1] rounded-[2px] font-mono text-[12px] text-[#0F172A] outline-none focus:border-[#1E40AF]"
                />
                <input
                  type="time"
                  aria-label="Hora de inicio"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-[110px] h-[32px] px-[10px] border border-[#CBD5E1] rounded-[2px] font-mono text-[12px] text-[#0F172A] outline-none focus:border-[#1E40AF]"
                />
              </div>
            </Seccion>

            <Seccion numero="03" titulo="Datos de la simulación" resumen={`${cargados}/3 archivos cargados`} resumenPendiente={cargados < 3}>
              {ARCHIVOS.map(({ tipo, etiqueta, acepta }) => (
                <RanuraArchivo key={tipo} tipo={tipo} etiqueta={etiqueta} acepta={acepta} archivo={archivos[tipo]} onCargar={(a) => cargar(tipo, a)} />
              ))}
            </Seccion>

            <Seccion numero="04" titulo="Rango de semáforo (holgura)" resumen={`${corteVerde || '—'} % / ${corteRojo || '—'} % · CF-02`}>
              <span className="self-start bg-[#F8FAFC] border border-[#E2E8F0] rounded-[2px] px-[9px] py-[4px] font-sans text-[12px] text-[#334155]">
                Valores de CF-02 · editable solo para esta corrida
              </span>
              <div className="flex gap-[84px] mt-[4px]">
                {[
                  { id: 'corte-verde', etiqueta: 'Corte verde / ámbar (holgura ≥)', valor: corteVerde, cambiar: setCorteVerde },
                  { id: 'corte-rojo', etiqueta: 'Corte ámbar / rojo (holgura <)', valor: corteRojo, cambiar: setCorteRojo },
                ].map((campo) => (
                  <div key={campo.id} className="flex flex-col gap-[8px]">
                    <Etiqueta htmlFor={campo.id}>{campo.etiqueta}</Etiqueta>
                    <div className="w-[120px] h-[32px] px-[10px] border border-[#CBD5E1] rounded-[2px] flex items-center gap-[6px] focus-within:border-[#1E40AF]">
                      <input
                        id={campo.id}
                        type="number"
                        min={1}
                        max={99}
                        value={campo.valor}
                        onChange={(e) => campo.cambiar(e.target.value)}
                        className="w-full min-w-0 bg-transparent outline-none font-mono text-[12px] text-[#0F172A] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="font-mono text-[12px] text-[#64748B]">%</span>
                    </div>
                  </div>
                ))}
              </div>
              {cortesValidos ? (
                <>
                  <div className="flex h-[8px] mt-[8px] rounded-[1px] overflow-hidden" role="img" aria-label={`rojo bajo ${rojo} %, ámbar de ${rojo} a ${verde} %, verde sobre ${verde} %`}>
                    <span className="bg-[#B91C1C]" style={{ width: `${rojo}%` }} />
                    <span className="bg-[#B45309]" style={{ width: `${verde - rojo}%` }} />
                    <span className="bg-[#15803D] flex-1" />
                  </div>
                  <div className="relative h-[16px] font-sans font-medium text-[12px]">
                    <span className="absolute -translate-x-1/2 text-[#B91C1C]" style={{ left: `${rojo / 2}%` }}>
                      &lt; {rojo} % rojo
                    </span>
                    <span className="absolute -translate-x-1/2 text-[#B45309]" style={{ left: `${(rojo + verde) / 2}%` }}>
                      {rojo}–{verde} % ámbar
                    </span>
                    <span className="absolute -translate-x-1/2 text-[#15803D]" style={{ left: `${(verde + 100) / 2}%` }}>
                      &gt; {verde} % verde
                    </span>
                  </div>
                </>
              ) : (
                <p className="font-sans text-[12px] text-[#B91C1C] mt-[6px]">El corte rojo debe ser menor que el corte verde, y ambos estar entre 1 % y 99 %.</p>
              )}
              <p className="mt-[6px] border-l-[3px] border-[#94A3B8] pl-[9px] font-sans text-[12px] text-[#334155]">
                Estos cortes se aplican solo a esta corrida y quedan registrados en «Parámetros de la corrida» del informe, para que la comparación entre
                corridas sea auditable. Si no se modifican, se usan los valores vigentes en CF-02.
              </p>
            </Seccion>
          </div>

          <aside className="w-[360px] shrink-0 sticky top-0 bg-white border border-[#E2E8F0] rounded-[4px]">
            <h2 className="h-[48px] px-[15px] flex items-center border-b border-[#E2E8F0] font-sans font-semibold text-[14px] text-[#0F172A]">Resumen de la corrida</h2>
            <div className="px-[15px] pt-[8px] pb-[16px] flex flex-col">
              <FilaResumen etiqueta="Escenario" valor={ESCENARIOS.find((e) => e.valor === escenario)!.resumen} />
              <FilaResumen etiqueta="Inicio" valor={inicioValido ? formatearFechaNumerica(inicio) : undefined} />
              <FilaResumen etiqueta="Pedidos" valor={resumenArchivo('pedidos')} />
              <FilaResumen etiqueta="Bloqueos" valor={resumenArchivo('bloqueos')} />
              <FilaResumen etiqueta="Averías" valor={resumenArchivo('averias')} />
              <button
                type="button"
                onClick={ejecutar}
                disabled={!listo}
                className="mt-[24px] h-[44px] rounded-[2px] bg-[#1E40AF] hover:bg-[#1E3A8A] disabled:bg-[#94A3B8] disabled:cursor-not-allowed text-white font-sans font-semibold text-[14px] transition"
              >
                Ejecutar simulación
              </button>
              {!listo && (
                <p className="mt-[10px] border-l-[3px] border-[#94A3B8] pl-[9px] font-sans text-[12px] text-[#64748B]">
                  Define {faltantes.join(', ').replace(/, ([^,]*)$/, ' y $1')} para continuar.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
