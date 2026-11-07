package pe.pucp.paqtracker.modulos.configuracion.infraestructura;

import org.springframework.stereotype.Repository;
import pe.pucp.paqtracker.modelo.ParametrosDominio;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.dto.ParametrosDominioApi;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RepositorioParametrosDominio;
import tools.jackson.databind.json.JsonMapper;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

/**
 * Adaptador JPA del repositorio de parametros del dominio. Guarda el mismo JSON que expone la API, asi la
 * fila se puede leer a mano si hace falta.
 */
@Repository
public class RepositorioParametrosDominioJpa implements RepositorioParametrosDominio {

    private final RepositorioParametrosDominioSpringData springData;
    private final JsonMapper json;

    /**
     * @param springData acceso Spring Data a la tabla
     * @param json       serializador JSON de Spring
     */
    public RepositorioParametrosDominioJpa(RepositorioParametrosDominioSpringData springData, JsonMapper json) {
        this.springData = springData;
        this.json = json;
    }

    @Override
    public Optional<ParametrosDominio> buscar() {
        return springData.findById(EntidadParametrosDominio.ID_UNICO)
                .map(fila -> json.readValue(fila.getContenido(), ParametrosDominioApi.class).aDominio());
    }

    @Override
    public ParametrosDominio guardar(ParametrosDominio parametros, Instant actualizadoEn) {
        String contenido = json.writeValueAsString(ParametrosDominioApi.desde(parametros));
        springData.save(new EntidadParametrosDominio(contenido,
                LocalDateTime.ofInstant(actualizadoEn, ZoneOffset.UTC)));
        return parametros;
    }

    @Override
    public void borrar() {
        springData.deleteById(EntidadParametrosDominio.ID_UNICO);
    }
}
