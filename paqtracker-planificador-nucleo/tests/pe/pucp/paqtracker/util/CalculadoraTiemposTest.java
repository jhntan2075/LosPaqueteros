package pe.pucp.paqtracker.util;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.TipoTramo;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas unitarias de CalculadoraTiempos: conversion de distancia a minutos de
 * viaje segun la velocidad del tipo de unidad, y trazado de los tramos de una ruta.
 */
class CalculadoraTiemposTest {

    /** Salida que cruza el refrigerio de varias unidades, para ejercitar la pausa. */
    private static final int SALIDA_CON_REFRIGERIO = 600;

    @Test
    void trazar_rutaConDosEntregas_ultimaLlegadaIgualaElFinDeRecorrer() {
        List<Almacen> almacenes = ConfiguracionDominio.crearAlmacenes();
        EscenarioOperativo escenario = escenario(almacenes);
        Ruta ruta = rutaDeDosEntregas(almacenes);

        List<Tramo> tramos = CalculadoraTiempos.trazar(escenario, ruta, SALIDA_CON_REFRIGERIO);
        int[] recorrido = CalculadoraTiempos.recorrer(escenario, ruta, SALIDA_CON_REFRIGERIO);

        assertEquals(recorrido[CalculadoraTiempos.INDICE_FIN], tramos.get(tramos.size() - 1).getLlegada());
        assertEquals(recorrido[CalculadoraTiempos.INDICE_DISTANCIA],
                tramos.stream().mapToInt(Tramo::getDistancia).sum());
    }

    @Test
    void trazar_rutaConDosEntregas_alternaViajeServicioYTerminaEnRetorno() {
        List<Almacen> almacenes = ConfiguracionDominio.crearAlmacenes();
        List<Tramo> tramos = CalculadoraTiempos.trazar(escenario(almacenes), rutaDeDosEntregas(almacenes), 0);

        assertEquals(List.of(TipoTramo.VIAJE_A_ENTREGA, TipoTramo.SERVICIO, TipoTramo.VIAJE_A_ENTREGA,
                TipoTramo.SERVICIO, TipoTramo.RETORNO), tramos.stream().map(Tramo::getTipo).toList());
        for (int i = 1; i < tramos.size(); i++) {
            assertEquals(tramos.get(i - 1).getLlegada(), tramos.get(i).getSalida());
            assertEquals(tramos.get(i - 1).getDestino(), tramos.get(i).getOrigen());
        }
        assertTrue(tramos.get(0).esEntrega());
        for (Tramo tramo : tramos) {
            assertEquals(tramo.getOrigen(), tramo.getCamino().get(0));
            assertEquals(tramo.getDestino(), tramo.getCamino().get(tramo.getCamino().size() - 1));
        }
        assertEquals(ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS,
                tramos.get(1).getLlegada() - tramos.get(1).getSalida());
    }

    @Test
    void trazar_rutaSinEntregas_retornaListaVacia() {
        List<Almacen> almacenes = ConfiguracionDominio.crearAlmacenes();
        Ruta ruta = new Ruta(new Vehiculo(1, TipoVehiculo.AUTO, almacenes.get(0)), almacenes.get(0));

        assertTrue(CalculadoraTiempos.trazar(escenario(almacenes), ruta, 0).isEmpty());
    }

    private static EscenarioOperativo escenario(List<Almacen> almacenes) {
        return new EscenarioOperativo(almacenes, List.of(), List.of(), 0,
                ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS, null, ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS);
    }

    private static Ruta rutaDeDosEntregas(List<Almacen> almacenes) {
        Almacen central = almacenes.get(0);
        Ruta ruta = new Ruta(new Vehiculo(3, TipoVehiculo.MOTOCICLETA, central), central);
        ruta.getSecuencia().add(new Entrega(1, 10, new Nodo(35, 20), 3, 0, 2160));
        ruta.getSecuencia().add(new Entrega(2, 11, new Nodo(40, 30), 2, 0, 2160));
        ruta.setDestino(almacenes.get(2));
        return ruta;
    }

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
