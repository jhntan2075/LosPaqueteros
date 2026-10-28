-- Hora del primer dia en la que arranca el reloj de la ejecucion (criterio 1 de la rubrica). Las
-- ejecuciones ya guardadas arrancaron a la medianoche.

ALTER TABLE ejecucion ADD COLUMN hora_inicio TIME NOT NULL DEFAULT '00:00:00';
