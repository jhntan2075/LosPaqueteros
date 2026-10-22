-- Una averia registrada por error puede deshacerse mientras sigue programada (el motor aun no la aplica).
-- La fila no se borra: queda en la bitacora con el instante real en que se cancelo. Fecha en UTC.

ALTER TABLE averia ADD COLUMN cancelada_en DATETIME(6) NULL;
