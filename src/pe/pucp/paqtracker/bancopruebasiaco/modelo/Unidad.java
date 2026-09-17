package pe.pucp.paqtracker.bancopruebasiaco.modelo;

import pe.pucp.paqtracker.bancopruebasiaco.modelo.ConfiguracionDominio.PerfilVehiculo;

/**
 * Unidad de reparto de la flota. {@code indice} define el grupo de refrigerio
 * (escalonado en tres bloques, LE-024), por lo que debe ser estable durante la corrida.
 */
public final class Unidad {

    private final String codigo;
    private final int indice;
    private final TipoVehiculo tipo;
    private final PerfilVehiculo perfil;

    private Nodo posicion;
    private double libreDesde;
    private double kmAcumulados;

    public Unidad(String codigo, int indice, ConfiguracionDominio cfg, Nodo posicionInicial) {
        this.codigo = codigo;
        this.indice = indice;
        this.tipo = TipoVehiculo.deCodigoUnidad(codigo);
        this.perfil = cfg.perfil(tipo);
        this.posicion = posicionInicial;
        this.libreDesde = 0;
        this.kmAcumulados = 0;
    }

    public String codigo() { return codigo; }

    public int indice() { return indice; }

    public TipoVehiculo tipo() { return tipo; }

    public int capacidad() { return perfil.capacidad(); }

    public double velocidad() { return perfil.velocidadKmH(); }

    public double costoPorKm() { return perfil.costoPorKm(); }

    /** Minutos que tarda la unidad en recorrer un km. */
    public double minutosPorKm() { return 60.0 / perfil.velocidadKmH(); }

    public Nodo posicion() { return posicion; }

    public void moverA(Nodo posicion) { this.posicion = posicion; }

    public double libreDesde() { return libreDesde; }

    public void ocuparHasta(double minuto) { this.libreDesde = minuto; }

    public double kmAcumulados() { return kmAcumulados; }

    public void acumularKm(double km) { this.kmAcumulados += km; }

    public double costoAcumulado() { return kmAcumulados * perfil.costoPorKm(); }

    public boolean disponibleEn(double minuto) { return libreDesde <= minuto; }

    @Override
    public String toString() { return codigo; }
}
