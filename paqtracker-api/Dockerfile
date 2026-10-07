# Imagen de la API de operacion PaqTracker (Java 21, DA-01). Se construye desde la raiz del
# monorepo porque necesita el POM padre y el nucleo:
#   docker build -f paqtracker-api/Dockerfile -t paqtracker-api .

# Etapa de compilacion: Maven Wrapper con el JDK; solo api + nucleo (-am).
FROM eclipse-temurin:21.0.5_11-jdk-alpine AS build
WORKDIR /app
COPY mvnw pom.xml ./
COPY .mvn ./.mvn
COPY paqtracker-planificador-nucleo ./paqtracker-planificador-nucleo
COPY paqtracker-api ./paqtracker-api
COPY paqtracker-experimentacion/pom.xml ./paqtracker-experimentacion/pom.xml
RUN chmod +x mvnw && ./mvnw -B -ntp -pl paqtracker-api -am package -DskipTests

# Etapa de ejecucion: solo el runtime y el JAR, con usuario no root.
FROM eclipse-temurin:21.0.5_11-jre-alpine
RUN addgroup -S paqtracker && adduser -S paqtracker -G paqtracker
WORKDIR /app
COPY --from=build --chown=paqtracker:paqtracker /app/paqtracker-api/target/paqtracker-api.jar ./paqtracker-api.jar
COPY --chown=paqtracker:paqtracker datos ./datos
USER paqtracker
EXPOSE 3000
ENTRYPOINT ["java", "-Xmx640m", "-XX:+UseSerialGC", "-jar", "paqtracker-api.jar"]
