-- Plan de mantenimiento preventivo (datos/mant.preventivo.*.txt, lineas aaaammdd:TA01). Al arrancar, la API
-- iguala esta tabla al archivo configurado; las ejecuciones leen de aqui las unidades que pasan cada dia en el
-- taller. La unidad del archivo (TA01, TM07, TB11) es la A-01, M-07, B-11 de la flota de cada ejecucion: la
-- unidad no se planifica en todo el dia de su fecha.

CREATE TABLE mantenimiento (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    fecha          DATE         NOT NULL,
    codigo_unidad  VARCHAR(10)  NOT NULL,
    tipo_unidad    VARCHAR(12)  NOT NULL,
    correlativo    INT          NOT NULL,
    cargado_en     DATETIME(6)  NOT NULL,
    CONSTRAINT pk_mantenimiento PRIMARY KEY (id),
    CONSTRAINT uq_mantenimiento_fecha_unidad UNIQUE (fecha, codigo_unidad),
    CONSTRAINT ck_mantenimiento_correlativo CHECK (correlativo >= 1)
);

CREATE INDEX idx_mantenimiento_fecha ON mantenimiento (fecha);
