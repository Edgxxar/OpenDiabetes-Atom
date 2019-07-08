FROM ubuntu:16.04

# Install Java
RUN apt-get update -y && apt-get install -y default-jdk git ant

# Install Open Diabetes Vault
RUN git clone https://github.com/OpenDiabetes/OpenDiabetesVault.git /odv && \
    cd /odv && \
	ant jar

# Add odv to path
RUN printf '#!/bin/bash\njava -cp /odv/lib/javacsv.jar:/odv/lib/picocli/picocli-4.0.0-alpha-2.jar:/odv/lib/gson/gson-2.8.5.jar:/odv/lib/java-runtime-compiler/compiler-2.3.1.jar:/odv/dist/OpenDiabetesVault.jar de.opendiabetes.vault.cli.CliManager "$@"' > /usr/bin/odv && \
    chmod +x /usr/bin/odv
