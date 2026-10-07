-- Esquema inicial de PaqTracker. El estado en vivo de cada ejecucion (flota, cola, reloj) vive en
-- memoria en su motor; aqui se guarda la configuracion y el resultado de cada ejecucion y los
-- pedidos registrados manualmente (CU-01). Fechas en UTC.

CREATE TABLE ejecucion (
    id                  VARCHAR(40)  NOT NULL,
    tipo_escenario      VARCHAR(30)  NOT NULL,
    estado              VARCHAR(20)  NOT NULL,
    algoritmo           VARCHAR(10)  NOT NULL,
    fecha_inicio        DATE         NOT NULL,
    dias                INT          NOT NULL,
    factor_aceleracion  DOUBLE       NOT NULL,
    creada_en           DATETIME(6)  NOT NULL,
    finalizada_en       DATETIME(6)  NULL,
    entregas            INT          NOT NULL,
    incumplimientos     INT          NOT NULL,
    fecha_colapso       DATETIME(6)  NULL,
    CONSTRAINT pk_ejecucion PRIMARY KEY (id)
);

CREATE TABLE pedido (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    ejecucion_id     VARCHAR(40)  NOT NULL,
    id_en_ejecucion  INT          NOT NULL,
    cliente          VARCHAR(80)  NOT NULL,
    destino_x        INT          NOT NULL,
    destino_y        INT          NOT NULL,
    cantidad         INT          NOT NULL,
    plazo_horas      INT          NOT NULL,
    registrado_en    DATETIME(6)  NOT NULL,
    hora_limite      DATETIME(6)  NOT NULL,
    CONSTRAINT pk_pedido PRIMARY KEY (id),
    CONSTRAINT uq_pedido_ejecucion UNIQUE (ejecucion_id, id_en_ejecucion),
    CONSTRAINT fk_pedido_ejecucion FOREIGN KEY (ejecucion_id) REFERENCES ejecucion (id)
);
