-- Parametros del dominio que el operador configura desde la interfaz (rubrica B02, B04, B07-B09):
-- ubicacion y capacidad de los almacenes, capacidad, velocidad y costo por km de cada tipo de unidad, y
-- duraciones de las averias. Una sola fila (id = 1) con los parametros en JSON; si no existe, la API usa
-- los valores de ConfiguracionDominio. Cada ejecucion nueva copia la version vigente al crearse: un cambio
-- nunca altera una ejecucion en curso.

CREATE TABLE parametros_dominio (
    id              INT            NOT NULL,
    contenido       VARCHAR(4000)  NOT NULL,
    actualizado_en  DATETIME(6)    NULL,
    CONSTRAINT pk_parametros_dominio PRIMARY KEY (id)
);
