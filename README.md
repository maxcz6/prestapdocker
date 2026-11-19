# Prestap

Sistema de préstamos y cobranzas. Este documento es el informe breve de
seguridad del staging solicitado en la Actividad 10.

## 1. Diagnóstico inicial y plan

Se eligió un laboratorio local, sin dominio público. Antes del cambio, la
aplicación respondía por HTTP en `localhost:8080`, no tenía proxy TLS, el
contenedor publicaba directamente el puerto de Next.js y
`docker-compose.yml` contenía credenciales de ejemplo. La aplicación ya
definía cabeceras en Next.js, pero no existía evidencia de una respuesta HTTPS
real. Además, el error del dashboard podía mostrar `error.message`.

| Control | Estado inicial | Cambio realizado | Evidencia |
|---|---|---|---|
| HTTPS o TLS | Acceso HTTP directo | Caddy con `tls internal` como proxy | `curl.exe -k -I https://localhost` |
| Cabeceras | Definidas, sin prueba en staging | Se aplican seis cabeceras en `next.config.ts` | Respuesta HTTPS |
| Secretos | Valores de ejemplo en Compose y fallback PostgreSQL | Variables desde `.env.staging`, sin credenciales fallback | `git grep` |
| Configuración del servidor | App y PostgreSQL publicados al host | App y DB accesibles solo dentro de Docker | `docker compose ps` |

## 2. Puesta en marcha HTTPS local

Archivos principales: [Caddyfile](Caddyfile),
[docker-compose.yml](docker-compose.yml) y [Dockerfile](Dockerfile).

La configuración usa `.env.staging` directamente como `env_file` de la
aplicación y PostgreSQL. No es necesario crear `.env` ni pasar
`--env-file`.

Si `.env.staging` todavía no existe:

```powershell
Copy-Item .env.staging.example .env.staging
notepad .env.staging
```

Cambie los valores `replace-with-*` por valores locales. `DB_PASSWORD` y
`POSTGRES_PASSWORD` deben ser iguales. Nunca publique esos valores ni los
incluya en capturas.

Recrear los servicios con la nueva configuración:

```powershell
docker compose down
docker compose up -d --build
docker compose ps
```

La URL de staging es `https://localhost`. El certificado es emitido por la CA
interna de Caddy y es exclusivamente para desarrollo local. Para probarlo sin
instalar la CA:

```powershell
curl.exe -k -I https://localhost
```

La salida debe incluir `HTTP/1.1 200` o `HTTP/2 200` y los puertos `80` y `443`
deben aparecer publicados para `prestap-proxy`:

```text
0.0.0.0:80->80/tcp
0.0.0.0:443->443/tcp
```

Si el proxy no está saludable, consulte:

```powershell
docker compose logs --tail=100 proxy
docker compose ps
```

| Prueba | Resultado esperado | Evidencia |
|---|---|---|
| URL HTTPS responde | Código HTTP 200/3xx | `curl.exe -k -I https://localhost` |
| Certificado | Emisor Caddy y SAN `localhost` | Navegador o `curl.exe -k -v` |
| Contenido mixto | No hay recursos `http://` | DevTools, pestaña Network |

## 3. Cabeceras y configuración segura

[next.config.ts](next.config.ts) aplica estas cabeceras a todas las rutas:

| Control | Valor | Justificación |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Evita interpretar respuestas con un tipo distinto al declarado. |
| `X-Frame-Options` | `DENY` | Reduce el riesgo de clickjacking. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita la información enviada como Referer. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Fuerza HTTPS después de la primera visita. |
| `Permissions-Policy` | Cámara, micrófono y geolocalización deshabilitados | Reduce capacidades innecesarias del navegador. |
| `X-DNS-Prefetch-Control` | `on` | Controla la resolución DNS especulativa. |

La aplicación ejecuta `NODE_ENV=production`, el contenedor corre como usuario
no root y la app no publica su puerto al host. PostgreSQL tampoco publica el
puerto `5432`. No se habilita CORS genérico. Los errores de UI muestran un
mensaje genérico y la API conserva el detalle únicamente en los logs del
servidor.

## 4. Manejo de secretos

`DB_PASSWORD`, `POSTGRES_PASSWORD` y `AUTH_SECRET` se leen desde
`.env.staging`. Los archivos `.env*` están excluidos por
[.gitignore](.gitignore). `lib/postgres.ts` tampoco contiene una credencial por
defecto.

Verificación segura, sin mostrar valores:

```powershell
git grep -n -E "staging_password_example|prestap-staging-secret-key"
git check-ignore .env .env.staging
```

La primera orden no debe devolver credenciales en archivos versionados. La
segunda debe confirmar que los archivos locales están ignorados.

## 5. Prueba integral antes y después

| Caso | Antes | Después | Resultado esperado | Evidencia |
|---|---|---|---|---|
| Acceso al staging | HTTP directo | HTTPS por Caddy | Acceso exitoso | `curl.exe -k -I https://localhost` |
| Cabeceras | Sin evidencia en staging | Cinco o más cabeceras | Controles presentes | Salida de `curl.exe -k -I` |
| Función principal | Registro disponible | Registro detrás del proxy | Continúa operativa | Flujo de clientes y API |
| Error provocado | Podía mostrar mensaje interno | Mensaje genérico sin traza | No expone rutas ni stack | `app/dashboard/error.tsx` |
| Revisión del repositorio | Valores de ejemplo | Variables locales ignoradas | Sin secretos versionados | `git grep` y `git check-ignore` |

## Control y verificación

- [x] La URL de staging utiliza HTTPS local.
- [x] Las cabeceras se configuran para una respuesta real.
- [x] La aplicación conserva su funcionalidad principal.
- [x] No se publican valores secretos en código, capturas ni anexos.
- [x] Los errores públicos no exponen trazas internas.
- [x] La comparación antes/después es verificable.

## Conclusiones

1. El principal riesgo era la combinación de credenciales de ejemplo y acceso
   HTTP directo. Se corrigió usando variables locales y Caddy como único punto
   de entrada.
2. `curl.exe -k -I https://localhost` demuestra HTTPS y las cabeceras. El
   certificado local se valida revisando su emisor y el SAN `localhost`.
3. La aplicación recibe sus secretos mediante variables de entorno cargadas
   desde un archivo local ignorado por Git.

## Anexos

- Anexo 1: [docker-compose.yml](docker-compose.yml), [Caddyfile](Caddyfile) y
  [next.config.ts](next.config.ts), sin valores secretos versionados.
- Anexo 2: salida de `curl.exe -k -I https://localhost` y detalle del
  certificado.
- Anexo 3: tablas de diagnóstico y comparación antes/después de este README.
