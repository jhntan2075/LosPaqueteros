package pe.pucp.paqtracker.iaco.app;

import pe.pucp.paqtracker.iaco.datos.AuditorDatos;
import pe.pucp.paqtracker.iaco.datos.CatalogoDatos;
import pe.pucp.paqtracker.iaco.datos.LectorMantenimiento;
import pe.pucp.paqtracker.iaco.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.iaco.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.iaco.modelo.Pedido;
import pe.pucp.paqtracker.iaco.servicio.AnalizadorFactibilidad;
import pe.pucp.paqtracker.iaco.servicio.Metricas;
import pe.pucp.paqtracker.iaco.servicio.ParametrosIACO;
import pe.pucp.paqtracker.iaco.servicio.Planificador;
import pe.pucp.paqtracker.iaco.servicio.PlanificadorIACO;
import pe.pucp.paqtracker.iaco.servicio.Simulador;

import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Punto de entrada del banco de pruebas.
 *
 * <pre>
 *   simular      --mes 202601 [--dias 31] [--algoritmo v21|v30] [--sin M11,M18]
 *   comparar     --mes 202601,202602,...   [--algoritmos v21,v30] [--salida resultados.md]
 *   factibilidad --mes 202601[,...]
 *   meses
 * </pre>
 *
 * Todas aceptan {@code --datos <ruta>} (por defecto, el directorio actual).
 */
public final class Main {

    public static void main(String[] args) {
        System.setOut(new PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.out),
                true, StandardCharsets.UTF_8));
        if (args.length == 0) {
            uso();
            return;
        }
        Map<String, String> op = opciones(args);
        Path raiz = Path.of(op.getOrDefault("datos", "."));
        ConfiguracionDominio cfg = ConfiguracionDominio.porDefecto();
        CatalogoDatos catalogo = new CatalogoDatos(raiz);

        switch (args[0]) {
            case "simular" -> simular(catalogo, cfg, op);
            case "comparar" -> comparar(catalogo, cfg, op);
            case "factibilidad" -> factibilidad(catalogo, cfg, op);
            case "meses" -> System.out.println("Meses con datos: " + catalogo.mesesDisponibles());
            case "datos" -> auditarDatos(catalogo);
            default -> uso();
        }
    }

    private static void uso() {
        System.out.println("""
                PaqTracker - banco de pruebas del planificador IACO

                  simular      --mes 202601 [--dias 31] [--algoritmo v21|v30] [--sin M11,M18]
                  comparar     --mes 202601,202602 [--algoritmos v21,v30] [--salida archivo.md]
                  factibilidad --mes 202601[,202602] [--plazo 8]
                  meses        lista los meses con datos bajo --datos

                Ablacion: --sin M11..M18 apaga una mejora de la v3.0 para medir su aporte.
                """);
    }

    private static Map<String, String> opciones(String[] args) {
        Map<String, String> op = new LinkedHashMap<>();
        for (int i = 1; i < args.length; i++) {
            if (args[i].startsWith("--") && i + 1 < args.length) {
                op.put(args[i].substring(2), args[i + 1]);
                i++;
            }
        }
        return op;
    }

    /**
     * Construye el simulador. {@code --maxdif} controla la regla anti-inanicion
     * (ciclos que un pedido puede quedar represado antes de forzar el despacho);
     * un valor muy alto la desactiva y reproduce la puerta de consolidacion tal
     * como estaba en el prototipo Python.
     */
    private static Simulador simulador(EscenarioOperativo esc, Map<String, String> op) {
        int maxDif = Integer.parseInt(op.getOrDefault("maxdif", "24"));
        double carga = Double.parseDouble(op.getOrDefault("carga", "0.6"));
        int ciclo = Integer.parseInt(op.getOrDefault("ciclo", "30"));
        return new Simulador(esc, ciclo, carga, maxDif);
    }

    /**
     * El único archivo de mantenimiento programa set–oct 2026. {@code proyectado}
     * (por omisión) lo extiende al resto de meses por día del mes, que es el supuesto
     * con el que se calibró el banco de pruebas; {@code real} solo aplica taller en
     * los meses efectivamente programados.
     */
    private static boolean proyectarMant(Map<String, String> op) {
        return !"real".equalsIgnoreCase(op.getOrDefault("mantenimiento", "proyectado"));
    }

    private static List<String> meses(Map<String, String> op, CatalogoDatos catalogo) {
        String v = op.get("mes");
        if (v == null || v.isBlank()) {
            return catalogo.mesesDisponibles();
        }
        return List.of(v.split(","));
    }

    private static Planificador crear(String clave, ConfiguracionDominio cfg,
                                      Map<String, String> op) {
        ParametrosIACO par;
        String nombre;
        switch (clave.toLowerCase()) {
            case "v21", "iaco_v21", "2.1" -> {
                par = ParametrosIACO.v21();
                nombre = "IACO v2.1";
            }
            case "v30", "iaco_v30", "3.0" -> {
                par = ParametrosIACO.v30();
                nombre = "IACO v3.0";
            }
            default -> throw new IllegalArgumentException("Algoritmo desconocido: " + clave);
        }
        String sin = op.get("sin");
        if (sin != null && !sin.isBlank()) {
            for (String mejora : sin.split(",")) {
                desactivar(par, mejora.trim().toUpperCase());
                nombre += " -" + mejora.trim().toUpperCase();
            }
        }
        if (op.containsKey("semilla")) {
            par.semilla = Long.parseLong(op.get("semilla"));
        }
        return new PlanificadorIACO(nombre, cfg, par);
    }

    /** Ablacion: apaga una mejora concreta para medir su aporte por separado. */
    private static void desactivar(ParametrosIACO par, String mejora) {
        switch (mejora) {
            case "M11" -> par.interRutas = false;
            case "M12" -> par.indiceEspacial = false;
            case "M13" -> par.coloniaParalela = false;
            case "M14" -> par.lexicografico = false;
            case "M15" -> {
                par.q0 = 0.0;
                par.xiLocal = 0.0;
            }
            case "M16" -> par.suavizadoAdaptativo = false;
            case "M17" -> par.hormigaCodiciosa = false;
            case "M18" -> par.reservaDinamica = false;
            case "M19" -> par.modoSaturacion = false;
            case "M20" -> par.siembraPorRendimiento = false;
            case "M21" -> par.prioridadRecuperable = false;
            case "COLONIA" -> {
                par.hormigas = 15;
                par.iteraciones = 25;
                par.busquedaLocalTop = 3;
            }
            default -> throw new IllegalArgumentException("Mejora desconocida: " + mejora);
        }
    }

    // -------------------------------------------------------------------- datos

    /** Inventario de los archivos de entrada: qué trae cada mes y qué falta. */
    private static void auditarDatos(CatalogoDatos catalogo) {
        List<AuditorDatos.ResumenMes> filas = new AuditorDatos(catalogo).auditar();

        System.out.println("Raiz: " + catalogo.raiz().toAbsolutePath());
        System.out.println("Meses con ventas y bloqueos: " + filas.size());
        System.out.println();
        System.out.printf("%-8s %8s %8s %8s %9s %10s %9s %8s  %s%n",
                "Mes", "Pedidos", "Dia 1", "Dia n", "Calend.", "Dias utiles",
                "Ped/dia", "Bloqueos", "Estado");
        int completos = 0;
        int totalPedidos = 0;
        for (AuditorDatos.ResumenMes r : filas) {
            String estado;
            if (r.mesIncompleto()) {
                estado = "CORTADO en dia " + r.ultimoDia() + " de " + r.diasCalendario()
                        + " (ese dia trae " + r.pedidosUltimoDia() + " de ~"
                        + r.medianaPedidosPorDia() + "; se descarta)";
            } else {
                estado = "completo";
                completos++;
            }
            totalPedidos += r.pedidos();
            System.out.printf("%-8s %8d %8d %8d %9d %10d %9.0f %8d  %s%n",
                    r.mes(), r.pedidos(), r.primerDia(), r.ultimoDia(), r.diasCalendario(),
                    r.diasUtiles(), r.pedidosPorDiaUtil(), r.bloqueos(), estado);
        }
        System.out.println();
        System.out.printf("Total: %d pedidos en %d meses; %d meses completos, %d con demanda cortada.%n",
                totalPedidos, filas.size(), completos, filas.size() - completos);
        System.out.println("Cantidad media por pedido: "
                + String.format("%.2f", filas.stream().mapToDouble(
                        r -> r.cantidadMedia() * r.pedidos()).sum() / Math.max(1, totalPedidos))
                + " paquetes");

        catalogo.mantenimiento().ifPresent(pm -> {
            LectorMantenimiento.PlanMantenimiento plan = LectorMantenimiento.leer(pm, 31);
            System.out.println();
            System.out.println("Mantenimiento preventivo: " + pm.getFileName());
            System.out.println("  flota censada: " + plan.codigosFlota().size() + " unidades "
                    + resumenFlota(plan.codigosFlota()));
            System.out.println("  intervenciones: " + plan.intervenciones()
                    + " en los meses " + plan.mesesCubiertos());
            System.out.println("  Es el unico archivo de mantenimiento: programa solo esos meses.");
            System.out.println("  El resto de meses se simula proyectando el plan por dia del mes");
            System.out.println("  (--mantenimiento proyectado, por omision) o sin taller");
            System.out.println("  (--mantenimiento real).");
        });
    }

    private static String resumenFlota(List<String> codigos) {
        long autos = codigos.stream().filter(c -> c.startsWith("TA")).count();
        long motos = codigos.stream().filter(c -> c.startsWith("TM")).count();
        long bicis = codigos.stream().filter(c -> c.startsWith("TB")).count();
        return "(" + autos + " autos, " + motos + " motos, " + bicis + " bicicletas)";
    }

    // ------------------------------------------------------------------ simular

    private static void simular(CatalogoDatos catalogo, ConfiguracionDominio cfg,
                                Map<String, String> op) {
        int dias = Integer.parseInt(op.getOrDefault("dias", "0"));
        String algoritmo = op.getOrDefault("algoritmo", "v30");
        for (String mes : meses(op, catalogo)) {
            EscenarioOperativo esc = catalogo.escenario(mes, dias, 1, cfg, proyectarMant(op));
            System.out.println(esc);
            Planificador plan = crear(algoritmo, cfg, op);
            if (plan instanceof PlanificadorIACO iaco) {
                System.out.println("Parametros: " + iaco.parametros());
            }
            try {
                Metricas m = simulador(esc, op).ejecutar(plan);
                System.out.println(m.resumen());
                System.out.println();
            } finally {
                plan.cerrar();
            }
        }
    }

    // ----------------------------------------------------------------- comparar

    private static void comparar(CatalogoDatos catalogo, ConfiguracionDominio cfg,
                                 Map<String, String> op) {
        int dias = Integer.parseInt(op.getOrDefault("dias", "0"));
        List<String> algoritmos = List.of(op.getOrDefault("algoritmos", "v21,v30").split(","));
        List<Metricas> filas = new ArrayList<>();

        for (String mes : meses(op, catalogo)) {
            EscenarioOperativo esc = catalogo.escenario(mes, dias, 1, cfg, proyectarMant(op));
            System.out.println(esc);
            for (String alg : algoritmos) {
                Planificador plan = crear(alg, cfg, op);
                try {
                    Metricas m = simulador(esc, op).ejecutar(plan);
                    filas.add(m);
                    System.out.println(m.resumen());
                    System.out.println();
                } finally {
                    plan.cerrar();
                }
            }
        }

        String tabla = tablaMarkdown(filas);
        System.out.println(tabla);
        String salida = op.get("salida");
        if (salida != null) {
            try {
                Files.writeString(Path.of(salida), tabla, StandardCharsets.UTF_8);
                System.out.println("Tabla escrita en " + salida);
            } catch (Exception e) {
                System.err.println("No se pudo escribir " + salida + ": " + e.getMessage());
            }
        }
    }

    private static String tablaMarkdown(List<Metricas> filas) {
        StringBuilder sb = new StringBuilder();
        sb.append("| Mes | Dias | Version | Pedidos | En plazo | Tardios | Sin entregar | km | km vacio | Costo | "
                + "t/plan medio (ms) | t/plan max (ms) | Corrida (s) | Colapso |\n");
        sb.append("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n");
        for (Metricas m : filas) {
            sb.append(String.format(
                    "| %s | %d | %s | %d | %.2f%% | %d | %d | %.0f | %.0f | %.0f | %.0f | %.0f | %.1f | %s |%n",
                    m.escenario(), m.diasSimulados(), m.planificador(), m.pedidos(),
                    m.porcentajeEnPlazo(), m.tardios(), m.sinEntregar(), m.km(), m.kmVacio(),
                    m.costo(), m.msPlanMedio(), m.msPlanMax(), m.msCorrida() / 1000.0,
                    m.colapso() == null ? "-" : m.colapso()));
        }
        return sb.toString();
    }

    // ------------------------------------------------------------- factibilidad

    private static void factibilidad(CatalogoDatos catalogo, ConfiguracionDominio cfg,
                                     Map<String, String> op) {
        int dias = Integer.parseInt(op.getOrDefault("dias", "0"));
        int plazoMaximo = Integer.parseInt(op.getOrDefault("plazo", "8"));
        for (String mes : meses(op, catalogo)) {
            EscenarioOperativo esc = catalogo.escenario(mes, dias, 1, cfg, proyectarMant(op));
            Simulador sim = new Simulador(esc);
            AnalizadorFactibilidad an = new AnalizadorFactibilidad(cfg, sim.ciudad(), 30);
            List<Pedido> pedidos = esc.pedidos();
            Map<Integer, AnalizadorFactibilidad.Imposible> imposibles =
                    an.imposibles(pedidos, plazoMaximo);
            long porTurno = imposibles.values().stream()
                    .filter(i -> i.causa() == AnalizadorFactibilidad.Causa.TURNO).count();
            System.out.printf("%s: %d pedidos, %d imposibles (%d por turno, %d por bloqueo)%n",
                    esc.etiqueta(), pedidos.size(), imposibles.size(), porTurno,
                    imposibles.size() - porTurno);
            for (AnalizadorFactibilidad.Imposible i : imposibles.values()) {
                System.out.printf("   id=%d  %s  atraso minimo=%s min%n",
                        i.idPedido(), i.causa(), i.atrasoMinimo() < 0 ? "sin salida" : i.atrasoMinimo());
            }
        }
    }

    private Main() {
    }
}
