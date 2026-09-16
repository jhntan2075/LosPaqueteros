# Imagen del planificador PaqTracker.
# Etapa de compilacion: compila el arbol de paquetes con el JDK.
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY src ./src
RUN javac -d out $(find src -name "*.java")

# Etapa de ejecucion: solo el runtime y las clases compiladas.
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/out ./out
COPY datos ./datos
ENTRYPOINT ["java", "-cp", "out", "pe.pucp.paqtracker.servicio.SimulacionDinamica"]
CMD ["datos/ventas_abs.txt", "datos/bloqueo_2601.txt", "7"]
