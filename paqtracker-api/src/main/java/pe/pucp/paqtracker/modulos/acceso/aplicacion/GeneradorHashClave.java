package pe.pucp.paqtracker.modulos.acceso.aplicacion;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.io.Console;

/**
 * Genera el hash BCrypt para {@code APP_CLAVE_HASH}. Se ejecuta desde el jar de la API, sin levantarla:
 * <pre>
 * java -cp paqtracker-api.jar -Dloader.main=pe.pucp.paqtracker.modulos.acceso.aplicacion.GeneradorHashClave \
 *      org.springframework.boot.loader.launch.PropertiesLauncher
 * </pre>
 * Pide la clave sin mostrarla en pantalla. Tambien la acepta como primer argumento, aunque asi queda en el
 * historial de la terminal.
 */
public final class GeneradorHashClave {

    private static final int LARGO_MINIMO = 8;

    private GeneradorHashClave() {
    }

    /**
     * @param args opcionalmente, la clave en claro
     */
    public static void main(String[] args) {
        String clave;
        if (args.length > 0) {
            clave = args[0];
        } else {
            Console consola = System.console();
            if (consola == null) {
                System.err.println("Sin terminal interactiva: pase la clave como argumento");
                System.exit(1);
                return;
            }
            char[] leida = consola.readPassword("Clave nueva: ");
            char[] repetida = consola.readPassword("Repita la clave: ");
            if (leida == null || repetida == null || !String.valueOf(leida).equals(String.valueOf(repetida))) {
                System.err.println("Las claves no coinciden");
                System.exit(1);
                return;
            }
            clave = String.valueOf(leida);
        }
        if (clave.length() < LARGO_MINIMO) {
            System.err.println("La clave debe tener al menos " + LARGO_MINIMO + " caracteres");
            System.exit(1);
            return;
        }
        System.out.println(new BCryptPasswordEncoder().encode(clave));
    }
}
