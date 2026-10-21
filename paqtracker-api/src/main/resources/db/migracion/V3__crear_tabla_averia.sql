-- Averias registradas manualmente por el operador durante una ejecucion (CU-13). El motor las aplica en
-- el primer salto Sc posterior al registro; aqui queda la bitacora. Fechas en UTC.

CREATE TABLE averia (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    ejecucion_id   VARCHAR(40)  NOT NULL,
    codigo_unidad  VARCHAR(10)  NOT NULL,
    tipo           INT          NOT NULL,
    instante       DATETIME(6)  NOT NULL,
    registrada_en  DATETIME(6)  NOT NULL,
    CONSTRAINT pk_averia PRIMARY KEY (id),
    CONSTRAINT ck_averia_tipo CHECK (tipo BETWEEN 1 AND 3),
    CONSTRAINT fk_averia_ejecucion FOREIGN KEY (ejecucion_id) REFERENCES ejecucion (id)
);
