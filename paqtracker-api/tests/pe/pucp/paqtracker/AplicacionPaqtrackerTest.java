package pe.pucp.paqtracker;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Verifica que el contexto de Spring arranca con la configuracion de pruebas.
 */
@SpringBootTest
class AplicacionPaqtrackerTest {

    @Test
    void contexto_configuracionDePruebas_arrancaSinErrores() {
        // El arranque del contexto es la verificacion: falla si algun bean no se puede crear.
    }
}
