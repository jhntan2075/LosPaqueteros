import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Boton } from './Boton';
import { EstadoVacio } from './EstadoVacio';

// Error de carga: causa + siguiente paso. "Reintentar" solo aparece si la pantalla sabe volver a pedir los datos.

interface EstadoErrorProps {
  titulo: string;
  descripcion?: string;
  onReintentar?: () => void;
}

export const EstadoError: React.FC<EstadoErrorProps> = ({ titulo, descripcion, onReintentar }) => (
  <div role="alert">
    <EstadoVacio
      tono="critical"
      icono={AlertTriangle}
      titulo={titulo}
      descripcion={descripcion}
      accion={
        onReintentar && (
          <Boton variante="secundario" tamano="sm" icono={RefreshCw} onClick={onReintentar}>
            Reintentar
          </Boton>
        )
      }
    />
  </div>
);
