# INSTITUTO DE EDUCACIÓN SUPERIOR TECNOLÓGICO PÚBLICO SANTIAGO ANTÚNEZ DE MAYOLO
## PROGRAMA DE ESTUDIO DE DISEÑO Y PROGRAMACIÓN WEB
### “Ser excelentes”

---

# GUÍA DE PRÁCTICA N.° 04: CONFIGURACIÓN DEL ENTORNO DE DESARROLLO

| CAMPO | INFORMACIÓN |
|---|---|
| **UNIDAD DIDÁCTICA:** | Gestión de aplicaciones Web |
| **SEMANA:** | 04 |
| **PERIODO ACADÉMICO:** | VI |
| **ESTUDIANTE:** | **Paucar Ramos Max** |
| **DOCENTE:** | Ing. Erick Donniex Moscoso Bravo |
| **SISTEMA / PROYECTO:** | **PRESTAP** - Sistema de Gestión de Préstamos y Cobranzas |
| **MODALIDAD:** | **Puramente Local y Aislada (100% Offline, sin dependencias de servicios Cloud)** |
| **FECHA:** | Setiembre 2026 |

---

## I. PROPÓSITO DE LA PRÁCTICA
Configurar un entorno reproducible para la aplicación web (**PRESTAP**), comprobar sus dependencias, variables y conexiones, y aislar un entorno de **staging local** mediante contenedores Docker y Docker Compose con su propio motor de base de datos local (**`app-db`**), funcionando de manera **puramente local y sin conexión a internet**, permitiendo validar el caso de uso crítico (*Registrar préstamo*) en condiciones controladas antes del pase a producción.

---

## II. FUNDAMENTO TEÓRICO Y COMPARATIVA DE ENTORNOS

| ENTORNO | FINALIDAD | TRATAMIENTO DE LA CONFIGURACIÓN |
|---|---|---|
| **Local (Nativo en Host)** | Desarrollo ágil y depuración directa en la máquina del estudiante sin conexión a internet. | `NODE_ENV=development`, puerto host `3000`, base de datos local / almacenamiento local `data/local_db.json` o `127.0.0.1:5432`, recarga en caliente (*hot-reload* Turbopack). |
| **Staging Local (Docker)** | Validación previa en condiciones aisladas simulando el entorno de producción. | `NODE_ENV=production`, `APP_ENV=staging`, puerto host `8080:3000`, base de datos en contenedor propio `app-db` (PostgreSQL local), red virtualizada `prestap-network`, healthcheck activo. |
| **Producción** | Despliegue cloud para usuarios reales. | Despliegue gestionado, HTTPS forzado, secretos en KMS/Vault, RLS en base de datos cloud. |

---

## III. PARTE PRÁCTICA Y PROCEDIMIENTO

### Actividad 1. Organizamos los archivos de staging

Se estructuraron los archivos de infraestructura y orquestación dentro de la raíz del proyecto para asegurar un aislamiento sin interferir con el entorno de desarrollo nativo.

```plaintext
prestap/
├── Dockerfile                  # Construcción multi-stage de la aplicación web (Next.js 16)
├── docker-compose.yml          # Orquestador de servicios: app-db (PostgreSQL) y prestap-staging
├── .dockerignore               # Exclusión de archivos pesados o sensibles
├── .env.staging.example        # Plantilla pública sin secretos
├── .env.staging                # Variables del entorno staging local
├── scripts/
│   └── init-db.sql             # Script SQL de inicialización y tablas para la BD local
├── data/
│   └── local_db.json           # Almacenamiento local persistente offline para entorno nativo
├── app/                        # App Router: Frontend (UI) y Backend (API REST)
├── components/                 # Componentes React interactivos
├── lib/                        # Lógica de negocio, autenticación y adaptador DB local
└── README.md                   # Instrucciones estandarizadas de despliegue
```

#### Tabla de Organización de Archivos:
| ARCHIVO O CARPETA | RUTA CREADA EN EL PROYECTO | RESPONSABLE |
|---|---|---|
| **Dockerfile** | `./Dockerfile` | Paucar Ramos Max |
| **docker-compose.yml** | `./docker-compose.yml` | Paucar Ramos Max |
| **.env.staging.example** | `./.env.staging.example` | Paucar Ramos Max |
| **.dockerignore** | `./.dockerignore` | Paucar Ramos Max |
| **init-db.sql** | `./scripts/init-db.sql` | Paucar Ramos Max |

---

### Actividad 2. Elegimos el staging adecuado para nuestro proyecto

#### DECISIÓN DEL EQUIPO:

| DECISIÓN DEL EQUIPO | RESPUESTA |
|---|---|
| **Alternativa elegida** | **[ ] A &nbsp;&nbsp; [X] B &nbsp;&nbsp; [ ] C** |
| **Caso de uso que se probará** | Inicio de sesión de Administrador y Registro de Préstamo con cálculo automático de amortización, interés y generación de cuotas diarias. |
| **Contenedores que se crearán** | **2 contenedores orquestados en red interna:**<br>1. **`app-db`:** Contenedor de Base de Datos local con imagen `postgres:16-alpine`, volumen persistente y script de inicialización `init-db.sql`.<br>2. **`prestap-staging`:** Contenedor de la aplicación web con compilación multi-stage Alpine (Next.js 16 / React 19) exponiendo la UI y la API REST en el puerto `8080`. |
| **Justificación de la elección** | El sistema PRESTAP emplea una arquitectura desacoplada donde la interfaz consume servicios API REST locales. Para garantizar que funcione de manera **puramente local y sin depender de internet ni de servicios cloud**, se desplegó un motor de base de datos PostgreSQL local dentro de Compose (`app-db`), sincronizado con healthcheck antes de que inicie la API. |

---

### Actividad 3. Comprobamos los requisitos del proyecto

Se verificaron las versiones de las herramientas en el entorno local antes de la contenerización:

| QUÉ DEBEMOS VERIFICAR | CÓMO COMPROBARLO | DATO REGISTRADO | RESULTADO |
|---|---|---|:---:|
| **Lenguaje o runtime principal** | `node -v` | Node.js v24.19.0 (host) / Node.js v22 (Docker Alpine) | **[X] Compatible** [ ] Problema |
| **Framework principal** | `package.json` | Next.js 16.3.2 (App Router con React 19.2.8) | **[X] Compatible** [ ] Problema |
| **Gestor de dependencias** | `pnpm -v` | pnpm 11.5.3 | **[X] Disponible** [ ] Falta |
| **Motor de base de datos** | Configuración BD local | PostgreSQL 16 (contenedor `app-db` puramente local) | **[X] Compatible** [ ] Problema |
| **Puerto del frontend/API local** | Servidor dev nativo | 3000 | **[X] Libre** [ ] En uso |
| **Puerto de staging local** | Docker Compose | 8080 (app) y 5432 (app-db) | **[X] Libre** [ ] En uso |
| **Archivo de dependencias** | Raíz del proyecto | `package.json` y `pnpm-lock.yaml` | **[X] Existe** [ ] Falta |

#### Comandos mínimos para instalar e iniciar la aplicación en local nativo (sin Docker y sin internet):
```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env.local

# 3. Ejecutar pruebas unitarias locales
pnpm test

# 4. Iniciar servidor de desarrollo en puerto 3000
pnpm dev
```

---

### Actividad 4. Construimos el staging con Docker

| ARCHIVO | QUÉ DEBE RESOLVER | REALIZADO |
|---|---|:---:|
| **Dockerfile** | Configura imagen base `node:22-alpine`, instala dependencias con pnpm, compila la versión standalone de Next.js y establece un usuario sin privilegios root (`nextjs`). | **[X]** |
| **docker-compose.yml** | Orquesta la red `prestap-network`, define el contenedor de base de datos local `app-db` con healthcheck, y configura `prestap-staging` enlazado en el puerto `8080:3000`. | **[X]** |
| **.env.staging.example** | Declara las variables indispensables del entorno (`DB_HOST=app-db`, `DB_DATABASE=bd_proyecto_staging`, etc.) sin credenciales de producción. | **[X]** |
| **.dockerignore** | Omite la transferencia de `node_modules`, `.next`, `.git` y artefactos de pruebas al demonio de construcción Docker. | **[X]** |

#### Comandos de Staging:
```bash
# Construir las imágenes y levantar el entorno local completo
docker compose up --build -d

# Consultar el estado y salud de los contenedores
docker compose ps

# Visualizar logs del contenedor
docker compose logs --tail=50
```

---

### Actividad 5. Separamos local y staging

| CONFIGURACIÓN | LOCAL NATIVO | STAGING LOCAL (DOCKER) | EVIDENCIA |
|---|---|---|---|
| **APP_ENV / NODE_ENV** | `development` | `staging` / `production` | Inspección en endpoint `/api/health` |
| **Puerto Web / API** | `3000` | `8080` | `http://localhost:3000` vs `http://localhost:8080` |
| **Servicio / Host de BD** | `127.0.0.1` / Local JSON | `app-db` (nombre del contenedor) | Conexión interna en red Compose |
| **Nombre de base de datos** | `bd_proyecto_local` | `bd_proyecto_staging` | Declaración en `docker-compose.yml` |
| **Red** | Red del sistema operativo host | Red virtual puente `prestap-network` | Aislamiento verificado en Compose |
| **Depuración** | Habilitada (Hot reload Turbopack) | Standalone optimizada para staging | Salida de logs limpia en contenedor |
| **Contenedor o servicio** | Ejecución nativa en host | Docker Engine / WSL2 (`app-db` + `app`) | `docker compose ps` (ambos `healthy`) |

**Cambios realizados en los archivos Docker y de configuración:**
Se desvinculó cualquier dependencia cloud externa para permitir un funcionamiento **100% autónomo y local**. En `docker-compose.yml` se configuró el servicio `app-db` con PostgreSQL 16 y volumen de persistencia `prestap_pgdata`. El servicio `prestap-staging` se configuró con `depends_on` con condición `service_healthy`, garantizando que la API solo arranque una vez que el motor de base de datos local esté listo para recibir peticiones.

---

### Actividad 6. Verificamos el caso de uso en Docker

| PRUEBA | RESULTADO ESPERADO | RESULTADO OBTENIDO | EVIDENCIA |
|---|---|---|---|
| **`docker compose ps`** | Todos los servicios en estado `Up (healthy)`. | Contenedores `app-db` y `prestap-staging` operativos y saludables. | Captura de consola ejecutando `docker compose ps`. |
| **Abrir la URL de staging** | Acceso al frontend en el puerto local 8080. | Pantalla de inicio de sesión carga con código HTTP 200 en `http://localhost:8080/login`. | Respuesta HTTP 200 OK del navegador. |
| **Autenticación (Login)** | Autenticación exitosa contra la base de datos local. | Login de `admin01` con rol `ADMIN` verificado contra la tabla `usuarios` de `app-db`. | Respuesta JSON: `{"success":true,"data":{"usuario":"admin01","rol":"ADMIN"}}`. |
| **Ejecutar caso de uso: Registrar Préstamo** | Préstamo registrado con cálculo automático de 24 cuotas diarias. | Préstamo `PMU1NO2VK10FA6D` creado por S/ 2,000.00 con 24 cuotas de S/ 95.83 (Total: S/ 2,300.00). | Respuesta HTTP 200 devuelta por `POST /api/prestamos`. |
| **Comprobar la base de datos** | La fila existe en la base staging y no en local. | Registro insertado en la BD `bd_proyecto_staging` dentro del contenedor (usuario `maxx` y préstamos creados). En el entorno local nativo estos registros no existen. | Query `SELECT * FROM users;` y `SELECT * FROM prestamos;` en `bd_proyecto_staging` del contenedor `app-db`. |
| **Revisar logs** | Sin excepciones de conexión ni fallos de runtime. | Logs de Next.js y PostgreSQL limpios con respuestas HTTP 200. | `docker compose logs --tail=25`. |

---

### Actividad 7. Probamos la reproducibilidad

| ETAPA | RESULTADO | PROBLEMA ENCONTRADO | AJUSTE A LA INSTRUCCIÓN / SOLUCIÓN |
|---|:---:|---|---|
| **Obtener el proyecto** | **[X] Correcto** [ ] Falla | Ninguno. Se clonó en el espacio de trabajo local. | Instrucción clara de clonación en `README.md`. |
| **Motor Docker** | **[X] Correcto** [ ] Falla | Error `invalid vhdx file` en disco virtual WSL2 de Docker Desktop por archivo de 0 bytes. | Se ejecutó `wsl --shutdown`, se eliminó el archivo corrupto y se reinició Docker Desktop. |
| **Instalar dependencias y build** | **[X] Correcto** [ ] Falla | `node:20-alpine` no incluía `node:sqlite` exigido por pnpm 11 y requería flag de scripts. | Se migró la imagen base a `node:22-alpine` y se añadió `--dangerously-allow-all-builds`. |
| **Preparar variables** | **[X] Correcto** [ ] Falla | Falta de archivo de entorno en staging local. | Se documentó el comando: `cp .env.staging.example .env.staging`. |
| **Iniciar servicios y sincronización** | **[X] Correcto** [ ] Falla | La aplicación web arrancaba antes de que PostgreSQL terminara de inicializar sus tablas. | Se configuró una verificación de salud (`healthcheck`) con `pg_isready` y `depends_on: condition: service_healthy`. |
| **Ejecutar el caso de uso** | **[X] Correcto** [ ] Falla | Necesidad de operar sin conexión a internet. | Se integró soporte para base de datos local en PostgreSQL (`app-db`) y almacenamiento local offline en `data/local_db.json`. |

---

### Actividad 8. Evidencia técnica final

| CONTENIDO OBLIGATORIO | CUMPLE | UBICACIÓN / EVIDENCIA |
|---|:---:|---|
| **Requisitos y versiones exactas** | **[X]** | `README.md`: Node.js 22+, pnpm 11.5.3, PostgreSQL 16 Alpine, Next.js 16.3.2 |
| **Instalación de dependencias** | **[X]** | `README.md` (`pnpm install --frozen-lockfile`) |
| **Archivo .env.example sin secretos** | **[X]** | Archivo `.env.staging.example` en la raíz |
| **Servicios, puertos y orden de inicio** | **[X]** | Archivo `docker-compose.yml` (`app-db` en puerto 5432, `prestap-staging` en puerto 8080) |
| **Procedimiento para entorno local** | **[X]** | Guía en `README.md` (`pnpm dev` en puerto 3000 con datos locales) |
| **Procedimiento para staging local** | **[X]** | Guía en `README.md` (`docker compose up -d` en puerto 8080) |
| **Comando de inicio y verificación** | **[X]** | `docker compose up -d`, `docker compose ps` y `http://localhost:8080/api/health` |
| **Problema detectado y solución aplicada** | **[X]** | Sincronización `healthcheck` de PostgreSQL y compatibilidad de runtime en Alpine |

---

## IV. RESULTADOS ESPERADOS

### Resumen del resultado:
| CAMPO | RESPUESTA |
|---|---|
| **Caso de uso verificado** | Autenticación y registro de préstamo con generación de 24 cuotas diarias en entorno puramente local. |
| **Entorno local** | **[X] Operativo** [ ] Con observaciones [ ] No operativo |
| **Staging local** | **[X] Operativo** [ ] Con observaciones [ ] No operativo |
| **Principal problema detectado** | Falta de sincronización en el arranque de la base de datos local y necesidad de desvincular el sistema de conexiones cloud para funcionar 100% offline. |
| **Corrección aplicada** | Configuración de rutina `healthcheck` en `app-db` dentro de `docker-compose.yml` e incorporación de adaptador de base de datos local con script `scripts/init-db.sql`. |
| **¿Otro integrante logró reproducirlo?** | **[X] Sí** [ ] Parcialmente [ ] No |

---

## V. CONCLUSIONES

### 1. ¿Qué elemento del entorno impedía o podía impedir la ejecución del proyecto?
Impedían la ejecución la dependencia de servicios cloud en la nube que requerían conexión a internet, la divergencia en la versión de Node.js en contenedores Alpine (pnpm 11 exigía Node >= 22.13), la colisión de puertos entre el host y los contenedores, y la falta de un mecanismo de espera que garantizara que la base de datos estuviese lista antes de recibir conexiones de la API.

### 2. ¿Qué diferencia concreta existe entre la configuración local y staging?
- **Entorno Local Nativo:** Se ejecuta de forma directa sobre el host con `NODE_ENV=development` en el puerto `3000`, conectando a base de datos local o almacenamiento local `data/local_db.json`, con depuración activa y recarga en caliente Turbopack.
- **Entorno Staging Local (Docker):** Se ejecuta en una infraestructura contenerizada y aislada con dos servicios independientes (`app-db` en PostgreSQL 16 y `prestap-staging` en Node 22 Alpine), comunicados a través de la red privada `prestap-network`, exponiendo la aplicación en el puerto `8080` bajo `NODE_ENV=production` y `APP_ENV=staging`, con healthcheck y sin requerir internet.

### 3. ¿Qué mejoró después de la prueba de reproducibilidad?
Se logró que el proyecto sea 100% reproducible y autónomo con un único comando (`docker compose up -d`), sin depender de internet ni de servicios de terceros. Tanto la base de datos como la aplicación se inicializan y vinculan automáticamente con sus tablas y datos semilla.

### 4. ¿Qué debe resolverse antes del futuro despliegue en producción?
Antes de pasar a producción se deben gestionar los secretos mediante un proveedor seguro (evitando credenciales por defecto en archivos de despliegue), configurar certificados TLS/HTTPS con cifrado estricto y habilitar copias de seguridad automáticas del volumen de datos de PostgreSQL.

---

## VI. ANEXOS

### Anexo 1. Archivos de configuración sin datos sensibles

#### 1.1 `docker-compose.yml`:
```yaml
services:
  app-db:
    image: postgres:16-alpine
    container_name: app-db
    environment:
      POSTGRES_DB: bd_proyecto_staging
      POSTGRES_USER: staging_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
      - prestap_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U staging_user -d bd_proyecto_staging"]
      interval: 3s
      timeout: 3s
      retries: 5
    networks:
      - prestap-network

  prestap-staging:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: prestap-staging
    ports:
      - "8080:3000"
    depends_on:
      app-db:
        condition: service_healthy
    environment:
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - NODE_ENV=production
      - APP_ENV=staging
      - DB_HOST=app-db
      - DB_PORT=5432
      - DB_DATABASE=bd_proyecto_staging
      - DB_USERNAME=staging_user
      - DB_PASSWORD=${DB_PASSWORD}
      - AUTH_SECRET=${AUTH_SECRET}
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 5s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped
    networks:
      - prestap-network

volumes:
  prestap_pgdata:

networks:
  prestap-network:
    driver: bridge
```

#### 1.2 `.env.staging.example`:
```env
PORT=3000
HOSTNAME=0.0.0.0
NODE_ENV=production
APP_ENV=staging
DB_HOST=app-db
DB_PORT=5432
DB_DATABASE=bd_proyecto_staging
DB_USERNAME=staging_user
DB_PASSWORD=<valor-local-no-versionado>
AUTH_SECRET=<valor-local-no-versionado>
```

---

### Anexo 2. Evidencias de los fallos controlados

#### Fallo Controlado 1: Arranque Asíncrono de Base de Datos (Database Readiness)
- **Problema:** En la primera ejecución con Docker Compose, el contenedor web intentó conectar con el puerto 5432 antes de que el motor PostgreSQL completara la creación del cluster y la ejecución del script DDL `init-db.sql`.
- **Registro del Error:** `Error: connect ECONNREFUSED 172.28.0.2:5432`.
- **Solución implementada:** Se integró la directiva `healthcheck` con `pg_isready` en el servicio `app-db` y se configuró la dependencia en `prestap-staging` con la condición `service_healthy`.

#### Fallo Controlado 2: Requerimiento de Node 22 en Alpine por pnpm 11
- **Problema:** El contenedor Alpine inicial con `node:20` fallaba al compilar dependencias nativas de pnpm 11 debido a la falta de `node:sqlite`.
- **Solución implementada:** Se actualizó la imagen base en `Dockerfile` a `node:22-alpine` y se configuró el flag `--dangerously-allow-all-builds`.

---

### Anexo 3. Ejecución del entorno local y staging local

#### 3.1 Estado de los Contenedores (`docker compose ps`):
```text
NAME              IMAGE                           COMMAND                  SERVICE           STATUS                   PORTS
app-db            postgres:16-alpine              "docker-entrypoint.s…"   app-db            Up (healthy)             0.0.0.0:5432->5432/tcp
prestap-staging   prestapdocker-prestap-staging   "docker-entrypoint.s…"   prestap-staging   Up (healthy)             0.0.0.0:8080->3000/tcp
```

#### 3.2 Diagnóstico de Salud API (`GET http://localhost:8080/api/health`):
```json
{
  "success": true,
  "data": {
    "ok": true,
    "db": "postgres-local (app-db)",
    "local": true
  }
}
```

#### 3.3 Capturas de Pantalla Generadas:
- **Pantalla de Inicio de Sesión (Staging en Puerto 8080):**  
  Ruta de archivo: `docs/evidencias/01_login_staging_8080.png`
- **Dashboard Principal con Sesión Iniciada (`admin01`):**  
  Ruta de archivo: `docs/evidencias/02_dashboard_principal.png`

---

### Anexo 4. Prueba del caso de uso y reproducibilidad

#### 4.1 Captura del Módulo de Préstamos:
- **Gestión de Cartera de Préstamos y Amortización:**  
  Ruta de archivo: `docs/evidencias/03_modulo_prestamos.png`
- **Gestión de Clientes Prestatarios:**  
  Ruta de archivo: `docs/evidencias/04_modulo_clientes.png`

#### 4.2 Comprobación SQL directa en el contenedor `app-db` (Persistencia física aislada):

```bash
# 1. Comprobar usuario autenticado en BD local:
docker exec -t app-db psql -U staging_user -d bd_proyecto_staging -c "SELECT id_usuario, usuario, correo, rol, estado FROM usuarios;"
```
**Resultado:**
```text
 id_usuario | usuario |       correo        |  rol  | estado 
------------+---------+---------------------+-------+--------
 U_ADMIN01  | admin01 | admin01@prestap.com | ADMIN | ACTIVO
(1 row)
```

```bash
# 2. Comprobar préstamos registrados en BD local:
docker exec -t app-db psql -U staging_user -d bd_proyecto_staging -c "SELECT id_prestamo, id_cliente, monto, total_pagar, dias, estado FROM prestamos;"
```
**Resultado:**
```text
   id_prestamo   | id_cliente | monto | total_pagar | dias | estado 
-----------------+------------+-------+-------------+------+--------
 PMU1NO2VK10FA6D | CF23EC578  |  2000 |        2300 |   24 | ACTIVO
 PMU1OEB2HB27124 | CF23EC578  |  3000 |        3300 |   30 | ACTIVO
(2 rows)
```

```bash
# 3. Comprobar generación automática de cuotas amortizadas en BD local:
docker exec -t app-db psql -U staging_user -d bd_proyecto_staging -c "SELECT id_cuota, id_prestamo, numero_cuota, fecha_vencimiento, monto, estado FROM cuotas LIMIT 5;"
```
**Resultado:**
```text
    id_cuota     |   id_prestamo   | numero_cuota | fecha_vencimiento | monto |  estado   
-----------------+-----------------+--------------+-------------------+-------+-----------
 QMU1NO2VKB5F1E9 | PMU1NO2VK10FA6D |            1 | 2026-09-15        | 95.83 | PENDIENTE
 QMU1NO2VKFC601C | PMU1NO2VK10FA6D |            2 | 2026-09-16        | 95.83 | PENDIENTE
 QMU1NO2VK321940 | PMU1NO2VK10FA6D |            3 | 2026-09-17        | 95.83 | PENDIENTE
 QMU1NO2VKC12CD3 | PMU1NO2VK10FA6D |            4 | 2026-09-18        | 95.83 | PENDIENTE
 QMU1NO2VLBDE141 | PMU1NO2VK10FA6D |            5 | 2026-09-19        | 95.83 | PENDIENTE
(5 rows)
```
Queda demostrado que el entorno Staging en Docker es **100% autónomo, aislado, funcional y almacena las transacciones exclusivamente en el contenedor local `app-db`**.
