package pe.pucp.paqtracker.util;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

/**
 * Pruebas unitarias del memo de distancias: lo guardado se recupera, lo no guardado no aparece y las
 * consultas que no caben en la clave se descartan sin error.
 */
class MemoDistanciasTest {

    private static final int ORIGEN = 100;
    private static final int DESTINO = 2500;
    private static final int SALIDA = 43_200;
    private static final int VELOCIDAD = 25;
    private static final int GRUPO = 1;

    @Test
    void buscar_consultaNoGuardada_retornaSinValor() {
        MemoDistancias memo = new MemoDistancias();

        assertEquals(MemoDistancias.SIN_VALOR, memo.buscar(claveBase()));
    }

    @Test
    void buscar_consultaGuardada_retornaLaDistancia() {
        MemoDistancias memo = new MemoDistancias();

        memo.guardar(claveBase(), 37);

        assertEquals(37, memo.buscar(claveBase()));
    }

    @Test
    void buscar_otraConsultaTrasGuardar_retornaSinValor() {
        MemoDistancias memo = new MemoDistancias();
        memo.guardar(claveBase(), 37);

        long otraSalida = MemoDistancias.clave(ORIGEN, DESTINO, SALIDA + 1, VELOCIDAD, GRUPO);

        assertEquals(MemoDistancias.SIN_VALOR, memo.buscar(otraSalida));
    }

    @Test
    void clave_cadaDatoDistinto_produceClaveDistinta() {
        long base = claveBase();

        assertNotEquals(base, MemoDistancias.clave(ORIGEN + 1, DESTINO, SALIDA, VELOCIDAD, GRUPO));
        assertNotEquals(base, MemoDistancias.clave(ORIGEN, DESTINO + 1, SALIDA, VELOCIDAD, GRUPO));
        assertNotEquals(base, MemoDistancias.clave(ORIGEN, DESTINO, SALIDA + 1, VELOCIDAD, GRUPO));
        assertNotEquals(base, MemoDistancias.clave(ORIGEN, DESTINO, SALIDA, VELOCIDAD + 1, GRUPO));
        assertNotEquals(base, MemoDistancias.clave(ORIGEN, DESTINO, SALIDA, VELOCIDAD, GRUPO + 1));
    }

    @Test
    void clave_datoFueraDeRango_retornaSinClave() {
        assertEquals(MemoDistancias.SIN_CLAVE, MemoDistancias.clave(ORIGEN, DESTINO, -1, VELOCIDAD, GRUPO));
        assertEquals(MemoDistancias.SIN_CLAVE, MemoDistancias.clave(ORIGEN, DESTINO, SALIDA, 1000, GRUPO));
    }

    @Test
    void guardar_sinClave_noGuardaNada() {
        MemoDistancias memo = new MemoDistancias();

        memo.guardar(MemoDistancias.SIN_CLAVE, 37);

        assertEquals(MemoDistancias.SIN_VALOR, memo.buscar(MemoDistancias.SIN_CLAVE));
    }

    private static long claveBase() {
        return MemoDistancias.clave(ORIGEN, DESTINO, SALIDA, VELOCIDAD, GRUPO);
    }
}
