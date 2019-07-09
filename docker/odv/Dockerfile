FROM ubuntu:16.04

# Install Java and ant
RUN apt-get update -y && apt-get install -y default-jdk ant

WORKDIR /opt/odv

COPY src src/
COPY lib lib/
COPY nbproject nbproject/
COPY build.xml build.xml

# Compile
RUN ant jar

# Add odv to path
RUN printf '#!/bin/bash\njava -cp /opt/odv/lib/javacsv.jar:/opt/odv/lib/picocli/picocli-4.0.0-alpha-2.jar:/opt/odv/lib/gson/gson-2.8.5.jar:/opt/odv/lib/java-runtime-compiler/compiler-2.3.1.jar:/opt/odv/dist/OpenDiabetesVault.jar de.opendiabetes.vault.cli.CliManager "$@"' > /usr/bin/odv && \
    chmod +x /usr/bin/odv
