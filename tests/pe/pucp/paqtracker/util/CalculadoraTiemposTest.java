package pe.pucp.paqtracker.util;

import pe.pucp.paqtracker.modelo.TipoVehiculo;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Pruebas unitarias de CalculadoraTiempos: conversion de distancia a minutos de
 * viaje segun la velocidad del tipo de unidad.
 */
class CalculadoraTiemposTest {

    @Test
    void minutosDeViaje_autoDiezKilometros_retornaQuinceMinutos() {
        assertEquals(15, CalculadoraTiempos.minutosDeViaje(10, TipoVehiculo.AUTO));
    }

    @Test
    void minutosDeViaje_fraccionDeMinuto_redondeaHaciaArriba() {
        // 1 km a 25 km/h son 2,4 min: la unidad no llega antes del minuto 3.
        assertEquals(3, CalculadoraTiempos.minutosDeViaje(1, TipoVehiculo.MOTOCICLETA));
    }

    @Test
    void minutosDeViaje_distanciaCero_retornaCero() {
        assertEquals(0, CalculadoraTiempos.minutosDeViaje(0, TipoVehiculo.BICICLETA));
    }
}
