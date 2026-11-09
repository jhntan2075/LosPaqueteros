import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Boton } from './Boton';

// Encabezado común de todas las pestañas: volver (opcional), título único de la página (h1),
// descripción y acciones a la derecha. Altura mínima 64 px.

interface EncabezadoPaginaProps {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  /** Vuelve a la vista anterior con un texto explícito ("Volver a la cola de pedidos"). */
  volver?: { texto: string; onClick: () => void; title?: string };
  /** Estado junto al título (insignia). */
  estado?: React.ReactNode;
  acciones?: React.ReactNode;
  /** Contenido extra bajo el título (datos de la simulación, por ejemplo). */
  children?: React.ReactNode;
}

export const EncabezadoPagina: React.FC<EncabezadoPaginaProps> = ({ titulo, descripcion, volver, estado, acciones, children }) => (
  <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {volver && (
        <Boton
          variante="fantasma"
          tamano="sm"
          icono={ArrowLeft}
          onClick={volver.onClick}
          title={volver.title}
          className="-ml-2.5 self-start text-neutral-600"
        >
          {volver.texto}
        </Boton>
      )}
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-title text-neutral-900">{titulo}</h1>
        {estado}
      </div>
      {descripcion && <p className="text-body text-neutral-600">{descripcion}</p>}
      {children}
    </div>
    {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
  </header>
);
