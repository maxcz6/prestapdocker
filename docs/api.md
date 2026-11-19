# API de Prestap

Arquitectura aplicada:

- Next.js: frontend, API y logica de negocio.
- PostgreSQL 16 (Local/Docker): almacenamiento relacional y persistencia.

Variables necesarias:

```env
DATABASE_URL=postgres://usuario_staging:staging_secret_2026@localhost:5432/bd_proyecto_staging
AUTH_SECRET=una-clave-larga-para-firmar-sesiones
```

Rutas creadas:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/health`
- `GET /api/clientes`
- `POST /api/clientes`
- `PUT /api/clientes`
- `DELETE /api/clientes?id_cliente=C001`
- `GET /api/prestamos`
- `POST /api/prestamos`
- `PUT /api/prestamos`
- `DELETE /api/prestamos?id_prestamo=P001`
- `GET /api/cuotas`
- `GET /api/cuotas?id_prestamo=P001`
- `GET /api/pagos`
- `POST /api/pagos`
- `GET /api/dashboard`
- `GET /api/reportes/prestamos`
- `GET /api/reportes/pagos`
- `GET /api/reportes/morosos`

Todas las rutas de datos estan protegidas por sesion. Primero debe ejecutarse `POST /api/auth/login`.

`GET /api/health` queda como diagnostico de conexion a la base de datos PostgreSQL.

Tablas en la Base de Datos:

- `clientes`: `id_cliente`, `dni`, `nombres_apellidos`, `nombre_negocio`, `celular`, `direccion_puesto`
- `prestamos`: `id_prestamo`, `id_cliente`, `monto`, `interes`, `monto_interes`, `total_pagar`, `dias`, `cuota_diaria`, `fecha_inicio`, `fecha_fin`, `estado`
- `cuotas`: `id_cuota`, `id_prestamo`, `numero_cuota`, `fecha_vencimiento`, `monto`, `estado`
- `pagos`: `id_pago`, `id_prestamo`, `id_cuota`, `numero_cuota`, `fecha_pago`, `monto_pagado`, `observacion`
- `usuarios`: `id_usuario`, `usuario`, `correo`, `password_hash`, `password_salt`, `rol`, `estado`

Las columnas `fecha_creacion` y `fecha_modificacion` se llenan automaticamente.

---------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------


# API de Prestap

Referencia tecnica de la API HTTP implementada en Next.js. La API usa PostgreSQL local (Docker / pg) como persistencia.

## Convenciones

- URL local: `http://localhost:3000`.
- En produccion, reemplaza la URL base por la URL asignada por Vercel.
- Todas las peticiones con body deben usar `Content-Type: application/json`.
- Las fechas usan el formato `YYYY-MM-DD`.
- Los importes se redondean a dos decimales.
- Una respuesta exitosa usa `{ "success": true, "data": ... }`.
- Un error usa `{ "success": false, "error": "...", "details": ... }`.
- Los errores inesperados responden HTTP `500` con `error: "Error interno del servidor"`.

## Configuracion

Define estas variables en `.env.local` y en el entorno de despliegue:

`AUTH_SECRET` firma las sesiones y nunca debe exponerse al navegador ni
subirse al repositorio.

## Autenticacion

Las rutas de negocio requieren la cookie HTTP-only `prestap_session`. La cookie
dura ocho horas y se crea al iniciar sesion.

### POST `/api/auth/login`

No requiere autenticacion. Acepta usuario o correo:

```json
{
	"usuario": "admin",
	"password": "mi-clave"
}
```

Tambien puede usarse `correo` en lugar de `usuario`. Responde HTTP `200` y
establece la cookie:

```json
{
	"success": true,
	"data": {
		"id_usuario": "U001",
		"usuario": "admin",
		"correo": "admin@example.com",
		"rol": "ADMIN"
	}
}
```

Errores habituales: `400` si falta el identificador o la contrasena, `401`
si las credenciales son incorrectas y `403` si el usuario no esta activo.

### POST `/api/auth/logout`

No requiere autenticacion. Elimina la cookie de sesion.

```json
{ "success": true }
```

### GET `/api/auth/me`

No requiere autenticacion. Permite comprobar si la cookie actual es valida.

```json
{
	"success": true,
	"data": {
		"authenticated": true,
		"session": {
			"id_usuario": "U001",
			"usuario": "admin",
			"rol": "ADMIN"
		}
	}
}
```

Cuando no hay sesion, `authenticated` es `false` y `session` es `null`.

## Clientes

Todas las rutas de esta seccion requieren sesion.

### GET `/api/clientes`

Devuelve todos los clientes:

```json
{
	"success": true,
	"data": [
		{
			"id_cliente": "C001",
			"dni": "12345678",
			"nombres_apellidos": "Ana Perez",
			"nombre_negocio": "Bodega Central",
			"celular": "999999999",
			"direccion_puesto": "Mercado Central"
		}
	]
}
```

### POST `/api/clientes`

Crea un cliente. Todos los campos del formulario son obligatorios. El DNI debe
tener exactamente 8 digitos y el celular debe tener 9 digitos e iniciar con
`9`. Nombres y negocio admiten solo letras, espacios, apostrofos y guiones,
con longitud de 2 a 100 caracteres. La direccion admite letras, numeros y
puntuacion comun, con longitud de 2 a 60 caracteres.

```json
{
	"dni": "12345678",
	"nombres_apellidos": "Ana Perez",
	"nombre_negocio": "Bodega Central",
	"celular": "999999999",
	"direccion_puesto": "Mercado Central"
}
```

Responde HTTP `201` con el cliente creado. Un DNI duplicado responde `409`.

#### Qué hace el código del endpoint

La ruta `app/api/clientes/route.ts` procesa el alta en este orden:

```ts
await requireRole(["ADMIN", "OPERADOR", "SUPERVISOR"]); // Comprueba sesión y rol.
const input = await request.json(); // Lee los datos de la petición.
const clientes = await getClientes(); // Carga clientes para detectar DNI repetidos.
const cliente = crearCliente(input, clientes); // Normaliza, valida y asigna identificador.
const write = await insertarFila(TABLES.clientes, cliente); // Guarda el registro.
return jsonOk({ ...cliente, id: write.id ?? cliente.id }, 201); // Devuelve HTTP 201.
```

`crearCliente` usa la lógica de `lib/business.ts`: `normalizarCliente` recorta
los espacios externos y reduce espacios repetidos en los textos;
`validarClienteInput` comprueba el tipo, obligatoriedad, formato, caracteres
permitidos y longitudes; y `assertDniDisponible` evita duplicar el DNI. El
servidor repite estas reglas, por lo que también se aplican si se envía una
petición sin utilizar el formulario del navegador.

### PUT `/api/clientes`

Actualiza un cliente. Requiere `id_cliente` o `id`; los campos no enviados
conservan su valor anterior. Usa las mismas validaciones del alta.

```json
{
	"id_cliente": "C001",
	"celular": "988888888",
	"direccion_puesto": "Mercado Norte"
}
```

Respuestas relevantes: `400` por datos invalidos, `404` si no existe y `409`
si el DNI pertenece a otro cliente.

### DELETE `/api/clientes?id_cliente=C001`

Tambien acepta el parametro `id`. No permite eliminar un cliente que tenga
prestamos registrados. Responde:

```json
{
	"success": true,
	"data": { "id_cliente": "C001", "eliminado": true }
}
```

## Prestamos

Todas las rutas de esta seccion requieren sesion.

### GET `/api/prestamos`

Devuelve prestamos con cliente, estado calculado y saldo:

```json
{
	"success": true,
	"data": [
		{
			"id_prestamo": "P001",
			"id_cliente": "C001",
			"monto": 1000,
			"interes": 10,
			"monto_interes": 100,
			"total_pagar": 1100,
			"dias": 10,
			"cuota_diaria": 110,
			"fecha_inicio": "2026-08-01",
			"fecha_fin": "2026-08-10",
			"estado": "ACTIVO",
			"cliente": {},
			"saldo": { "total": 1100, "pagado": 0, "saldo": 1100 }
		}
	]
}
```

### POST `/api/prestamos`

Crea un prestamo y sus cuotas diarias. El cliente debe existir, `monto` debe
ser mayor que cero, `interes` no puede ser negativo y `dias` debe ser entero
positivo.

```json
{
	"id_cliente": "C001",
	"monto": 1000,
	"interes": 10,
	"dias": 10,
	"fecha_inicio": "2026-08-01"
}
```

Calcula `monto_interes`, `total_pagar`, `cuota_diaria` y `fecha_fin`. El
prestamo queda `ACTIVO` y cada cuota queda `PENDIENTE`. Responde HTTP `201`:

```json
{
	"success": true,
	"data": { "prestamo": {}, "cuotas": [] }
}
```

### PUT `/api/prestamos`

Actualiza el estado de un prestamo. Acepta `id_prestamo` o `id`.

```json
{
	"id_prestamo": "P001",
	"estado": "CANCELADO"
}
```

Estados validos: `PENDIENTE`, `ACTIVO`, `PAGADO`, `VENCIDO` y `CANCELADO`.

### DELETE `/api/prestamos?id_prestamo=P001`

Tambien acepta `id`. No permite eliminar prestamos con pagos registrados; si
no tienen pagos, elimina el prestamo y sus cuotas.

```json
{
	"success": true,
	"data": { "id_prestamo": "P001", "cuotas_eliminadas": 10, "eliminado": true }
}
```

## Cuotas

### GET `/api/cuotas?id_prestamo=P001`

Requiere sesion. El parametro `id_prestamo` es opcional: si se omite, devuelve
todas las cuotas. Las cuotas con pago se muestran como `PAGADA`; una cuota
pendiente cuya fecha ya paso se muestra como `VENCIDA`.

## Pagos

### GET `/api/pagos`

Requiere sesion. Devuelve pagos enriquecidos con `cliente`, `prestamo` y
`cuota`.

### POST `/api/pagos`

Registra un pago. El prestamo debe existir y la cuota se identifica con
`id_cuota` o, alternativamente, con `numero_cuota`.

```json
{
	"id_prestamo": "P001",
	"id_cuota": "Q001",
	"numero_cuota": 1,
	"fecha_pago": "2026-08-24",
	"monto_pagado": 110,
	"observacion": "Pago diario"
}
```

`fecha_pago` es opcional y usa la fecha actual si se omite. El monto debe ser
mayor que cero. Al registrar el pago, la cuota pasa a `PAGADA` y se recalcula
el estado del prestamo. Responde HTTP `201`:

```json
{
	"success": true,
	"data": { "pago": {}, "cuota": {}, "estadoPrestamo": "ACTIVO" }
}
```

Una cuota ya pagada responde `409`; un prestamo o cuota inexistente responde
`404`.

## Dashboard y reportes

Todas estas rutas requieren sesion.

### GET `/api/dashboard`

Devuelve contadores y totales de cartera:

```json
{
	"success": true,
	"data": {
		"clientes": 0,
		"prestamos": 0,
		"prestado": 0,
		"total_cartera": 0,
		"cobrado": 0,
		"saldo": 0,
		"cuotas_vencidas": 0,
		"monto_vencido": 0,
		"morosos": 0
	}
}
```

### GET `/api/reportes/prestamos`

Devuelve un resumen por prestamo con cliente, negocio, montos, pagos, saldo y
estado.

### GET `/api/reportes/pagos`

Devuelve pagos con `fecha`, `cliente`, `negocio`, `prestamo`, `cuota`, `monto`
y `observacion`.

### GET `/api/reportes/morosos`

Devuelve prestamos con cuotas vencidas. Cada elemento incluye `cliente`,
`telefono`, `negocio`, `prestamo`, `cuotas_vencidas`, `monto_vencido` y `saldo`.

## Diagnostico

### GET `/api/health`

Ruta para comprobar la conexion a la base de datos PostgreSQL y verificar las tablas
`clientes`, `prestamos`, `cuotas`, `pagos` y `usuarios`.

Respuesta completa HTTP `200`:

```json
{
	"success": true,
	"data": { "ok": true, "db": "postgres-local (app-db)", "checks": [] }
}
```

Responde HTTP `207` si alguna tabla tiene problemas. Cada elemento de
`checks` identifica `table`, `rows` y `error`.
