# Debian 12 (bookworm): bullseye reached EOL and its security repo returns 404
FROM python:3.11-slim-bookworm

# Labels para GHCR
LABEL org.opencontainers.image.source="https://github.com/fer336/octopus-flow"
LABEL org.opencontainers.image.description="OctopusFlow Backend API"
LABEL org.opencontainers.image.licenses="MIT"

# Argumento de versión (para metadata)
ARG PACKAGE_VERSION=dev
LABEL org.opencontainers.image.version="${PACKAGE_VERSION}"

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema
# libpq-dev: para psycopg2
# gcc: para compilar
# python3-dev: cabeceras de python
# libffi-dev: para criptografía (passlib/bcrypt)
# libcairo2/libpango*/libgdk-pixbuf/shared-mime-info: runtime requerido por WeasyPrint
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    python3-dev \
    libffi-dev \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend
COPY . .

# Crear directorio para archivos estáticos (logos)
RUN mkdir -p static

# Exponer el puerto
EXPOSE 8000

# Comando para iniciar la aplicación
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
