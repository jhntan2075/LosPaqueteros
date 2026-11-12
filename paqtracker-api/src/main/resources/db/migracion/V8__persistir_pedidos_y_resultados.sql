-- Los pedidos y el resultado de cada ejecucion pasan a vivir en la base (decisiones en
-- docs/decisiones-persistencia.md). Fechas en UTC.
--
-- pedido: guarda todos los pedidos que el sistema opera, no solo los manuales.
--   origen ARCHIVO_SISTEMA: archivos de ventas del curso, cargados una vez al arrancar (lote = 'SISTEMA').
--   origen MANUAL: registrados por el operador en el dia a dia (lote vacio).
--   origen ARCHIVO_CORRIDA: archivo subido para una sola simulacion (lote = identificador del lote); no
--   reemplaza a los del sistema.
--   El avance (estado, cantidad_entregada, entregado_en, retraso_minutos) solo lo escribe el dia a dia, para
--   retomar tras un reinicio; las simulaciones lo ignoran.
-- La tabla deja de depender de ejecucion: un pedido del sistema lo comparten el dia a dia y todas las
-- simulaciones de su fecha. El identificador del pedido en el motor es su id en esta tabla.

ALTER TABLE pedido DROP CONSTRAINT fk_pedido_ejecucion;
ALTER TABLE pedido DROP CONSTRAINT uq_pedido_ejecucion;
ALTER TABLE pedido DROP COLUMN id_en_ejecucion;
ALTER TABLE pedido MODIFY ejecucion_id VARCHAR(40) NULL;
ALTER TABLE pedido MODIFY cliente VARCHAR(80) NULL;

ALTER TABLE pedido ADD COLUMN origen VARCHAR(20) NOT NULL DEFAULT 'MANUAL';
ALTER TABLE pedido ADD COLUMN lote VARCHAR(40) NULL;
ALTER TABLE pedido ADD COLUMN mes_archivo VARCHAR(6) NULL;
ALTER TABLE pedido ADD COLUMN orden INT NULL;
ALTER TABLE pedido ADD COLUMN estado VARCHAR(20) NULL;
ALTER TABLE pedido ADD COLUMN cantidad_entregada INT NOT NULL DEFAULT 0;
ALTER TABLE pedido ADD COLUMN entregado_en DATETIME(6) NULL;
ALTER TABLE pedido ADD COLUMN retraso_minutos INT NULL;

-- Un archivo cargado dos veces no duplica sus pedidos (lote, mes y posicion en el archivo).
ALTER TABLE pedido ADD CONSTRAINT uq_pedido_archivo UNIQUE (lote, mes_archivo, orden);
CREATE INDEX idx_pedido_lote_registro ON pedido (lote, registrado_en);
CREATE INDEX idx_pedido_origen_registro ON pedido (origen, registrado_en);

-- ejecucion: el resultado completo de cada corrida, para el historial y la comparacion GA vs IACO.
ALTER TABLE ejecucion ADD COLUMN nombre VARCHAR(120) NULL;
ALTER TABLE ejecucion ADD COLUMN distancia_km DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN costo_total DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN entregas_tarde INT NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN productos_entregados BIGINT NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN productos_fuera_plazo BIGINT NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN retraso_total_min BIGINT NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN retraso_ponderado BIGINT NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN replanificaciones INT NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN tiempo_computo_max_ms BIGINT NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN tiempo_computo_total_ms BIGINT NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN planificaciones_medidas INT NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN pico_unidades INT NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN uso_autos INT NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN uso_motos INT NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN uso_bicicletas INT NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN averias_atendidas INT NOT NULL DEFAULT 0;
ALTER TABLE ejecucion ADD COLUMN colapso_causa VARCHAR(40) NULL;
ALTER TABLE ejecucion ADD COLUMN colapso_pedido VARCHAR(20) NULL;
ALTER TABLE ejecucion ADD COLUMN colapso_unidad VARCHAR(20) NULL;
ALTER TABLE ejecucion ADD COLUMN colapso_hora_limite DATETIME(6) NULL;
ALTER TABLE ejecucion ADD COLUMN colapso_llegada_estimada DATETIME(6) NULL;
ALTER TABLE ejecucion ADD COLUMN origen_datos VARCHAR(20) NOT NULL DEFAULT 'SISTEMA';
ALTER TABLE ejecucion ADD COLUMN semilla BIGINT NULL;
ALTER TABLE ejecucion ADD COLUMN parametros VARCHAR(4000) NULL;
ALTER TABLE ejecucion ADD COLUMN reloj_alcanzado DATETIME(6) NULL;
