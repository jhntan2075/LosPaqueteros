# Imagen del planificador PaqTracker (Java 21, DA-01).
# Etapa de compilacion: compila el arbol de paquetes con el JDK.
FROM eclipse-temurin:21.0.5_11-jdk-alpine AS build
WORKDIR /app
COPY src ./src
RUN javac --release 21 -encoding UTF-8 -d out $(find src -name "*.java")

# Etapa de ejecucion: solo el runtime y las clases compiladas, con usuario no root.
FROM eclipse-temurin:21.0.5_11-jre-alpine
RUN addgroup -S paqtracker && adduser -S paqtracker -G paqtracker
WORKDIR /app
COPY --from=build --chown=paqtracker:paqtracker /app/out ./out
COPY --chown=paqtracker:paqtracker datos ./datos
USER paqtracker
ENTRYPOINT ["java", "-Xmx4g", "-cp", "out", "pe.pucp.paqtracker.servicio.SimulacionDinamica"]
CMD ["datos/ventas.v20260909", "datos/bloqueos.v20260909", "7", "202601"]
