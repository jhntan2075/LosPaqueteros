package pe.pucp.paqtracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Punto de entrada de la API de operacion de PaqTracker (monolito modular, DA-03).
 * Cada funcionalidad vive en un modulo bajo {@code modulos/} con capas internas
 * presentacion, aplicacion, dominio e infraestructura.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class AplicacionPaqtracker {

    /**
     * Arranca la aplicacion Spring Boot.
     *
     * @param args argumentos de linea de comandos
     */
    public static void main(String[] args) {
        SpringApplication.run(AplicacionPaqtracker.class, args);
    }
}
