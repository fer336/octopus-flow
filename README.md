# OctopusFlow

OctopusFlow es un sistema web para administrar clientes, presupuestos comerciales y PDFs de cotización. Incluye una API FastAPI, un frontend React/Vite, autenticación por email/contraseña o Google OAuth, gestión de usuarios, carga de logo empresarial y generación de presupuestos en PDF.

## Quick path

1. Levantá PostgreSQL o prepará una base remota.
2. Configurá `backend/.env` y ejecutá la API en `http://localhost:8000`.
3. Configurá `frontend/.env` y ejecutá la app en `http://localhost:5173`.
4. Creá al menos un usuario con `backend/manage_users.py`.
5. Verificá el backend con `curl http://localhost:8000/api/health`.

## Qué tiene el sistema

| Área | Incluye |
|---|---|
| Presupuestos | Crear, listar, editar, eliminar, cargar ítems y exportar PDF. |
| Clientes | Alta, listado, edición y eliminación de clientes. |
| Usuarios | Login, login con Google, administración de usuarios y estado de cuenta. |
| Empresa | Configuración básica y carga/eliminación/lectura de logo. |
| PDF | Render principal con HTML/CSS vía WeasyPrint y fallback legacy con ReportLab. |
| Frontend | App React 18 con Vite, Tailwind CSS, Axios, Google OAuth y tours con `driver.js`. |
| Deploy | Imágenes Docker para backend, frontend tenant y frontend CMS; compose para Swarm/Traefik. |

## Capturas

| Pantalla | Imagen |
|---|---|
| Login | ![Login de OctopusFlow](docs/images/login.png) |
| Tabla de presupuestos | ![Tabla de presupuestos de OctopusFlow](docs/images/tabla.png) |
| Nuevo presupuesto | ![Formulario de nuevo presupuesto en OctopusFlow](docs/images/nuevo-presupuesto.png) |
| Editar presupuesto | ![Formulario de edición de presupuesto en OctopusFlow](docs/images/editar-presupuesto.png) |
| Presupuesto generado | ![Presupuesto generado en OctopusFlow](docs/images/presupuesto.png) |

## Requisitos

| Herramienta | Versión sugerida | Para qué se usa |
|---|---:|---|
| Python | 3.11 | Backend FastAPI. |
| Node.js | 18+ | Frontend Vite. |
| npm | 9+ | Instalación y scripts frontend. |
| PostgreSQL | 14+ | Base de datos. |
| WeasyPrint deps | Según sistema operativo | Render HTML → PDF fuera de Docker. |

> MinIO aparece como integración para logos/activos, pero no es necesario para el camino básico local si no vas a probar almacenamiento de archivos en entorno aislado.

## Instalación local

### 1. Base de datos

Si usás PostgreSQL local, creá la base y el usuario:

```sql
CREATE DATABASE octopusflow_db;
CREATE USER octopusflow_user WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE octopusflow_db TO octopusflow_user;
```

Si ya tenés una base remota, podés saltar este paso y apuntar `DATABASE_URL` a esa instancia.

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Creá `backend/.env`:

```env
DATABASE_URL=postgresql://octopusflow_user:tu_password@localhost:5432/octopusflow_db
GOOGLE_CLIENT_ID=tu_google_client_id.apps.googleusercontent.com
SECRET_KEY=generar_una_clave_larga_y_unica
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
DOMAIN=localhost
```

Si vas a renderizar PDFs con WeasyPrint fuera de Docker, instalá sus dependencias de sistema. En Debian/Ubuntu:

```bash
sudo apt-get update && sudo apt-get install -y \
  libcairo2 \
  libgdk-pixbuf-2.0-0 \
  libpango-1.0-0 \
  libpangoft2-1.0-0 \
  shared-mime-info
```

Levantá la API:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Endpoints útiles:

| Endpoint | Uso |
|---|---|
| `http://localhost:8000` | Raíz de la API. |
| `http://localhost:8000/api/health` | Healthcheck. |
| `http://localhost:8000/docs` | Swagger UI. |

### 3. Frontend

En otra terminal:

```bash
cd frontend
npm install
```

Creá `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=tu_google_client_id.apps.googleusercontent.com
```

Levantá la app principal:

```bash
npm run dev
```

Acceso local:

- App web: `http://localhost:5173`

También existen scripts de desarrollo desde la raíz:

```bash
npm run dev:tenant
npm run dev:cms
```

| Script | Puerto | Uso |
|---|---:|---|
| `npm run dev:tenant` | 5173 | App principal. |
| `npm run dev:cms` | 5174 | Modo CMS con `VITE_APP_MODE=cms`. |

### 4. Usuario inicial

El backend no autocrea usuarios autorizados. Antes de iniciar sesión, creá un usuario:

```bash
cd backend
source venv/bin/activate

# Listar usuarios
python manage_users.py list

# Crear usuario habilitado para Google login
python manage_users.py add demo@octopusflow.local "Usuario Demo"

# Crear usuario con contraseña
python manage_users.py add demo@octopusflow.local "Usuario Demo" "Cambiar123!"

# Asignar contraseña a un usuario existente
python manage_users.py set-password demo@octopusflow.local "Cambiar123!"
```

Reglas de login:

| Método | Condición |
|---|---|
| Google OAuth | El email de Google debe existir en `users`. |
| Email/contraseña | El usuario debe tener `hashed_password` generado por `manage_users.py`. |

### 5. Verificación rápida

```bash
curl http://localhost:8000/api/health
```

Respuesta esperada:

```json
{"status":"healthy","database":"connected"}
```

## Variables de entorno

### Backend

| Variable | Obligatoria | Uso |
|---|---:|---|
| `DATABASE_URL` | Sí | Conexión SQLAlchemy a PostgreSQL. |
| `GOOGLE_CLIENT_ID` | Sí si usás Google OAuth | Valida el ID token recibido desde Google. |
| `SECRET_KEY` | Sí recomendado | Firma los JWT internos. |
| `API_HOST` | No | Host de bind para Uvicorn. |
| `API_PORT` | No | Puerto de la API. |
| `CORS_ORIGINS` | Parcial | Orígenes esperados para CORS. |
| `DOMAIN` | No | Dominio de referencia para despliegue. |

> Importante: hoy el backend permite `localhost/127.0.0.1` por regex y mantiene orígenes productivos en `backend/main.py`. `CORS_ORIGINS` está documentada, pero no gobierna todo el comportamiento por sí sola.

### Frontend

| Variable | Obligatoria | Uso |
|---|---:|---|
| `VITE_API_URL` | Sí | Base URL del backend. |
| `VITE_GOOGLE_CLIENT_ID` | Sí si usás Google OAuth | Client ID usado por `GoogleOAuthProvider`. |

## Google OAuth

El flujo actual usa popup JavaScript, no redirect URI:

1. El frontend monta `GoogleOAuthProvider` con `VITE_GOOGLE_CLIENT_ID`.
2. `GoogleLogin` abre el popup de Google.
3. Google devuelve un ID token en `credentialResponse.credential`.
4. El frontend envía `POST /api/auth/google` con `{ "token": "<google-id-token>" }`.
5. El backend valida el token contra `GOOGLE_CLIENT_ID` y devuelve un JWT interno.

En Google Cloud Console configurá **Authorized JavaScript origins** para cada origen real:

- `http://localhost:5173`
- `http://localhost:3000`
- `https://app.octopusflow.example`
- Los dominios productivos que uses para tenant/CMS.

Solo necesitás redirect URI si en el futuro migrás a un flujo redirect-based.

## PDF de presupuestos

| Punto | Estado actual |
|---|---|
| Endpoint | `GET /api/budgets/{id}/pdf`. |
| Content-Type | `application/pdf`. |
| Render principal | Templates HTML/CSS en `backend/templates/pdf/`. |
| Fallback | ReportLab legacy si WeasyPrint o sus librerías no están disponibles. |

## Base de datos y migraciones

Estado actual:

- El backend ejecuta `Base.metadata.create_all(bind=engine)` al arrancar.
- Las tablas se crean automáticamente si no existen.
- Alembic está presente, pero no hay una baseline versionada consolidada en el repo.

Próximo paso recomendado:

1. Congelar el esquema actual como baseline.
2. Inicializar Alembic contra `DATABASE_URL`.
3. Generar una revisión inicial equivalente al esquema vivo.
4. Validar esa baseline en una base vacía.
5. Reemplazar gradualmente `create_all` por migraciones explícitas.

Hasta que eso exista, cualquier cambio de esquema debe hacerse con cuidado: `create_all` no reemplaza un historial serio de migraciones.

## Deploy

### Docker Compose para Swarm/Traefik

El archivo `docker-compose.yml` está orientado a producción con Portainer + Swarm + Traefik.

Incluye:

| Servicio | Imagen |
|---|---|
| `backend` | `ghcr.io/fer336/octopus-flow/backend:latest` |
| `frontend` | `ghcr.io/fer336/octopus-flow/frontend:latest` |
| `frontend-cms` | `ghcr.io/fer336/octopus-flow/frontend-cms:latest` |

Requisitos operativos:

- Red externa `network_public`.
- Secreto externo `octopusflow_backend_env_v2`.
- Traefik con resolver `letsencryptresolver`.

### Build y publicación de imágenes

Script local:

```bash
chmod +x scripts/deploy-images.sh
DOCKER_USERNAME=ferc33 ./scripts/deploy-images.sh --tag v2026-03-28-2231
```

Flags:

| Flag | Uso |
|---|---|
| `--tag <tag>` | Cambia el tag de las imágenes. |
| `--no-cache` | Fuerza build sin cache. |

Variables relevantes:

| Variable | Uso |
|---|---|
| `DOCKER_USERNAME` / `DOCKERHUB_USERNAME` | Usuario u organización de Docker Hub. |
| `IMAGE_TAG` | Tag por defecto si no se pasa `--tag`. |
| `FRONTEND_API_URL` / `VITE_API_URL` | URL de API para build frontend. |
| `FRONTEND_GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` | Client ID de Google para build frontend. |

También existe `.github/workflows/deploy-images.yml` con `workflow_dispatch` para publicar imágenes desde GitHub Actions.

## Troubleshooting

| Problema | Qué revisar |
|---|---|
| Puerto ocupado | Verificá `8000`, `5173` y `5174`; ajustá URLs si cambiás puertos. |
| CORS local | Usá `localhost` o `127.0.0.1`; reiniciá backend después de cambios. |
| Google origen no autorizado | El origin debe coincidir exacto en Google Cloud Console. |
| Google login no encuentra usuario | El email debe existir previamente en `users`. |
| PDF falla localmente | Instalá dependencias de WeasyPrint o usá el fallback temporal. |
| Warning de collation PostgreSQL | Revisá upgrades/restores del sistema y planificá refresh/reindex si aplica. |

## Checklist de instalación

- [ ] PostgreSQL está disponible y `DATABASE_URL` apunta al entorno correcto.
- [ ] `backend/.env` existe y tiene `SECRET_KEY`.
- [ ] `frontend/.env` existe y apunta a la API local.
- [ ] Google OAuth tiene los Authorized JavaScript origins correctos.
- [ ] Hay al menos un usuario activo en la tabla `users`.
- [ ] `curl http://localhost:8000/api/health` responde `healthy`.
- [ ] El frontend abre en `http://localhost:5173`.
- [ ] La generación de PDF fue probada si el entorno la requiere.

## Recomendaciones operativas

- Crear `backend/.env.example` y `frontend/.env.example` para reducir errores de onboarding.
- Externalizar completamente CORS desde `backend/main.py`.
- Crear baseline Alembic antes del próximo cambio de esquema.
- Definir un usuario demo estándar para pruebas internas.
- Mantener tags versionados para imágenes Docker; usar `latest` solo como puntero conveniente.

## Apoyo y donaciones

![Apoyo](https://img.shields.io/badge/Apoyo-Activo-2ea44f?style=for-the-badge)
![Donaciones](https://img.shields.io/badge/Donaciones-Habilitadas-0a7ea4?style=for-the-badge)
![Mantenimiento](https://img.shields.io/badge/Mantenimiento-Continuo-f59e0b?style=for-the-badge)

Gracias por apoyar este proyecto. Tu aporte permite sostener mantenimiento, infraestructura y nuevas funcionalidades.

### Donar con QR

<img src="https://raw.githubusercontent.com/fer336/donation-assets/main/assets/qr-donation.jpg" alt="QR de donación" width="260" />

### Donar con PayPal

Podés donar directamente a través de PayPal usando este correo:

`casserafernando@gmail.com`

- [Donar por PayPal](mailto:casserafernando@gmail.com)

### Cómo ayudar sin donar

- Dejá una estrella al repositorio.
- Reportá errores o mejoras en issues.
- Enviá pull requests con correcciones o nuevas ideas.
- Difundí el proyecto en comunidades o redes.

## Contacto

Si necesitás ayuda o querés colaborar, abrí un issue en este repositorio o escribí a `casserafernando@gmail.com`.
