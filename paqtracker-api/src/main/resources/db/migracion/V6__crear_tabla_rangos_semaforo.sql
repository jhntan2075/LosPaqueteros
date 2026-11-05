-- Rangos del semaforo que el operador configura desde la interfaz (punto 6 de la evaluacion). Una sola
-- fila (id = 1). Los valores por omision son los que regian hasta ahora; al arrancar, la API crea la fila
-- si no existe, tomando los cortes de holgura e inventario de APP_SEMAFORO_* y APP_INVENTARIO_*.
-- Todo se guarda como fraccion entre 0 y 1.
--   holgura_*            holgura restante del pedido sobre su plazo; rojo bajo holgura_rojo
--   inventario_*         stock de un almacen intermedio sobre su capacidad (alerta de stock bajo, LE-078)
--   ocupacion_unidad_*   carga de una unidad sobre su capacidad; vacio hasta ocupacion_unidad_vacio
--   ocupacion_almacen_*  stock de un almacen intermedio sobre su capacidad (semaforo + vacio)

CREATE TABLE rangos_semaforo (
    id                       INT          NOT NULL,
    holgura_rojo             DOUBLE       NOT NULL DEFAULT 0.15,
    holgura_ambar            DOUBLE       NOT NULL DEFAULT 0.40,
    inventario_rojo          DOUBLE       NOT NULL DEFAULT 0.20,
    inventario_ambar         DOUBLE       NOT NULL DEFAULT 0.50,
    ocupacion_unidad_vacio   DOUBLE       NOT NULL DEFAULT 0.00,
    ocupacion_unidad_ambar   DOUBLE       NOT NULL DEFAULT 0.70,
    ocupacion_unidad_rojo    DOUBLE       NOT NULL DEFAULT 0.90,
    ocupacion_almacen_vacio  DOUBLE       NOT NULL DEFAULT 0.00,
    ocupacion_almacen_ambar  DOUBLE       NOT NULL DEFAULT 0.50,
    ocupacion_almacen_rojo   DOUBLE       NOT NULL DEFAULT 0.80,
    actualizado_en           DATETIME(6)  NULL,
    CONSTRAINT pk_rangos_semaforo PRIMARY KEY (id)
);
