import React from 'react';

// Piezas compartidas por los paneles de Operación (flota, bitácora, incidencias, detalles).

export const TituloSeccion: React.FC<{ children: React.ReactNode; derecha?: React.ReactNode; onCerrar?: () => void }> = ({
  children,
  derecha,
  onCerrar,
}) => (
  <div className="flex items-center gap-[12px] leading-[normal]">
    <h2 className="font-sans font-semibold text-[12px] text-[#64748B] tracking-[0.7px] uppercase">{children}</h2>
    <div className="flex-1" />
    {derecha && <span className="font-mono text-[12px] text-[#94A3B8] whitespace-nowrap">{derecha}</span>}
    {onCerrar && (
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar y volver al lienzo"
        className="size-[22px] flex items-center justify-center rounded text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
      >
        ✕
      </button>
    )}
  </div>
);

const COLOR_BARRA = {
  rojo: 'bg-[#B91C1C]',
  ambar: 'bg-[#B45309]',
  azul: 'bg-[#1E40AF]',
  gris: 'bg-[#94A3B8]',
} as const;

/** Fila con barra de color a la izquierda: usada por "Requiere atención", bitácora e incidencias. */
export const FilaConBarra: React.FC<{
  color: keyof typeof COLOR_BARRA;
  titulo: string;
  detalle: React.ReactNode;
  detalleMono?: boolean;
  derecha?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ color, titulo, detalle, detalleMono = false, derecha, onClick, className = '' }) => {
  const contenido = (
    <>
      <span className={`w-[3px] self-stretch rounded-[1px] shrink-0 ${COLOR_BARRA[color]}`} />
      <span className="flex-1 min-w-0 flex flex-col gap-[2px] text-left">
        <span className="font-sans font-semibold text-[12px] text-[#0F172A] truncate">{titulo}</span>
        <span className={`text-[12px] text-[#64748B] truncate ${detalleMono ? 'font-mono' : 'font-sans'}`}>{detalle}</span>
      </span>
      {derecha}
    </>
  );
  const clases = `flex items-stretch gap-[9px] leading-[normal] ${className}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${clases} w-full hover:bg-[#F8FAFC] transition`}>
      {contenido}
    </button>
  ) : (
    <div className={clases}>{contenido}</div>
  );
};

/** Contenedor de vistas que reemplazan al lienzo (flota, bitácora). */
export const PanelCompleto: React.FC<{ children: React.ReactNode; etiqueta: string }> = ({ children, etiqueta }) => (
  <section
    aria-label={etiqueta}
    className="flex-1 min-h-0 flex flex-col bg-white border border-[#E2E8F0] rounded-[10px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.16)] overflow-hidden leading-[normal]"
  >
    {children}
  </section>
);
