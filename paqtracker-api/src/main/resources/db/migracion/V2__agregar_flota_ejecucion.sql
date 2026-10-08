-- Composicion de la flota con la que corre cada ejecucion (LE-019, LE-051). Las ejecuciones ya
-- guardadas corrieron con la flota del dominio: 10 autos, 15 motos y 12 bicicletas.

ALTER TABLE ejecucion ADD COLUMN autos INT NOT NULL DEFAULT 10;
ALTER TABLE ejecucion ADD COLUMN motos INT NOT NULL DEFAULT 15;
ALTER TABLE ejecucion ADD COLUMN bicicletas INT NOT NULL DEFAULT 12;
