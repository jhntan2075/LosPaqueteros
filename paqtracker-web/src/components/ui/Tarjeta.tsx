import React, { useId } from 'react';
import { cn } from '../../lib/clases';

// Superficie base: tarjeta blanca con borde, radio `card` y sombra mínima. Con `titulo`, la sección
// queda rotulada por su encabezado (aria-labelledby).

interface TarjetaProps {
  titulo?: React.ReactNode;
  descripcion?: React.ReactNode;
  /** Botones o datos a la derecha del título. */
  acciones?: React.ReactNode;
  /** Nivel del título dentro de la página (por defecto h2). */
  nivel?: 2 | 3;
  /** Línea bajo el encabezado (listas y tablas que llegan hasta el borde). */
  divisor?: boolean;
  /** Sin relleno en el cuerpo: tablas y listas que ocupan todo el ancho. */
  sinRelleno?: boolean;
  id?: string;
  className?: string;
  cuerpoClassName?: string;
  children?: React.ReactNode;
}

export const Tarjeta: React.FC<TarjetaProps> = ({
  titulo,
  descripcion,
  acciones,
  nivel = 2,
  divisor = false,
  sinRelleno = false,
  id,
  className,
  cuerpoClassName,
  children,
}) => {
  const generado = useId();
  const idTitulo = `${id ?? generado}-titulo`;
  const Titulo = nivel === 2 ? 'h2' : 'h3';
  const conEncabezado = titulo !== undefined || acciones !== undefined;

  return (
    <section
      id={id}
      aria-labelledby={titulo !== undefined ? idTitulo : undefined}
      className={cn('flex min-w-0 flex-col rounded-card border border-neutral-200 bg-superficie shadow-xs', className)}
    >
      {conEncabezado && (
        <div className={cn('flex flex-wrap items-start gap-x-3 gap-y-2 px-5 pt-4', divisor ? 'border-b border-neutral-200 pb-3' : 'pb-3')}>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {titulo !== undefined && (
              <Titulo id={idTitulo} className="text-title-sm text-neutral-900">
                {titulo}
              </Titulo>
            )}
            {descripcion && <p className="text-body-sm text-neutral-600">{descripcion}</p>}
          </div>
          {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
        </div>
      )}
      {children !== undefined && (
        <div className={cn(sinRelleno ? '' : conEncabezado && !divisor ? 'px-5 pb-5' : 'p-5', cuerpoClassName)}>{children}</div>
      )}
    </section>
  );
};
