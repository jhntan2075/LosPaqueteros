package pe.pucp.paqtracker.modulos.incidencias.infraestructura;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.PuertoMantenimiento;
import pe.pucp.paqtracker.modulos.incidencias.dominio.RepositorioMantenimiento;
import java.time.LocalDate;
import java.util.List;

/**
 * Implementa el puerto del modulo de ejecucion con el plan de mantenimiento que guarda este modulo.
 */
@Component
public class AdaptadorMantenimiento implements PuertoMantenimiento {

    private final RepositorioMantenimiento repositorio;

    /**
     * @param repositorio persistencia del plan
     */
    public AdaptadorMantenimiento(RepositorioMantenimiento repositorio) {
        this.repositorio = repositorio;
    }

    @Override
    public List<MantenimientoFuente> entre(LocalDate desde, LocalDate hasta) {
        return repositorio.listarEntre(desde, hasta).stream()
                .map(m -> new MantenimientoFuente(m.fecha(), m.tipo(), m.correlativo())).toList();
    }
}
