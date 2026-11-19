# Frontend de Prestap

Documentacion tecnica de la interfaz web de Prestap. El frontend esta construido
con Next.js 16, React 19, TypeScript y Tailwind CSS.

## Objetivo

La interfaz permite gestionar clientes, prestamos, cuotas, pagos y reportes de
una cartera de microcreditos. La persistencia no se realiza directamente desde
los componentes: todas las operaciones pasan por el cliente HTTP centralizado
en `lib/api-client.ts`.

## Requisitos

- Node.js compatible con Next.js 16.
- pnpm 11.5.3 o una version compatible.
- Variables de entorno configuradas (`DATABASE_URL` y `AUTH_SECRET`).
- Un usuario activo en la tabla `usuarios` de PostgreSQL (por defecto `admin01`).

## Ejecucion local

```bash
pnpm install
pnpm dev
```

Abrir `http://localhost:3000`. Los comandos disponibles son:

```bash
pnpm dev       # servidor de desarrollo
pnpm build     # compilacion de produccion
pnpm start     # servidor de produccion
pnpm lint      # ESLint
```

La configuracion de la API esta documentada en
[docs/api.md](api.md).

## Estructura del frontend

```text
app/
  page.tsx                         redireccion inicial a /login
  layout.tsx                       layout raiz, metadata, fuentes y fondo
  (auth)/login/page.tsx            formulario de autenticacion
  (dashboard)/layout.tsx           shell protegido del dashboard
  (dashboard)/page.tsx             dashboard principal
  (dashboard)/clientes/page.tsx    listado y CRUD de clientes
  (dashboard)/prestamos/page.tsx   listado y alta de prestamos
  (dashboard)/prestamos/[id_prestamo]/page.tsx
                                   detalle y cuotas de un prestamo
  (dashboard)/pagos/page.tsx       historial de cobranzas
  (dashboard)/reportes/page.tsx    reportes de cartera, pagos y morosidad

components/
  auth-context.tsx                 estado global de autenticacion
  ui/sidebar.tsx                   navegacion y cierre de sesion
  ui/modal.tsx                     dialogos de formularios y confirmaciones
  ui/toast.tsx                     notificaciones de exito y error
  ui/stat-card.tsx                 tarjetas de indicadores
  ui/badge.tsx                     estados de prestamos
  ui/theme-toggle.tsx              cambio de tema claro/oscuro

lib/
  api-client.ts                    funciones y tipos para consumir la API
```

Los grupos `(auth)` y `(dashboard)` son route groups de Next.js: organizan el
codigo sin formar parte de la URL.

## Rutas de pantalla

| Ruta | Pantalla | Funcion |
| --- | --- | --- |
| `/` | Redireccion | Envia al usuario a `/login`. |
| `/login` | Inicio de sesion | Valida usuario o correo y contrasena. |
| `/dashboard` | Dashboard | Muestra indicadores de cartera y accesos rapidos. |
| `/dashboard/clientes` | Clientes | Busca, crea, edita y elimina clientes. |
| `/dashboard/prestamos` | Prestamos | Filtra, busca y crea prestamos. |
| `/dashboard/prestamos/:id_prestamo` | Detalle | Consulta cuotas y registra pagos del prestamo. |
| `/dashboard/pagos` | Pagos | Consulta y filtra el historial de cobranzas. |
| `/dashboard/reportes` | Reportes | Consulta cartera, pagos y morosos mediante pestanas. |

## Flujo de autenticacion

1. El usuario abre `/` o `/login`.
2. El formulario envia `usuario` y `password` a `POST /api/auth/login`.
3. La API establece la cookie HTTP-only `prestap_session`.
4. El frontend redirige a `/dashboard`.
5. `AuthProvider` consulta `GET /api/auth/me` al cargar el layout del dashboard.
6. Si la sesion no existe o no es valida, redirige nuevamente a `/login`.
7. El boton de cierre de sesion llama a `POST /api/auth/logout` y vuelve a `/login`.

El cliente HTTP usa `credentials: "include"`, por lo que la cookie se envia
automaticamente en las llamadas a la API. El frontend no almacena la contrasena
ni el token de sesion en `localStorage`.

### Roles

El usuario autenticado contiene `id_usuario`, `usuario` y `rol`. El rol se
muestra en el pie del sidebar. Actualmente no existen permisos distintos por
rol en el frontend: todo usuario autenticado puede ver y usar las pantallas del
dashboard. Si se implementan permisos, deben aplicarse tambien en la API y no
solo ocultando enlaces en el navegador.

## Navegacion y layout

`app/layout.tsx` es el layout raiz. Define idioma, metadata, fuentes Geist,
estilos globales y el fondo visual de la aplicacion.

`app/(dashboard)/layout.tsx` envuelve las pantallas autenticadas con:

- `AuthProvider`, para mantener el usuario y las acciones de login/logout.
- `ToastProvider`, para notificaciones.
- `Sidebar`, para navegacion entre modulos.
- Estado de carga mientras se comprueba la sesion.

El sidebar incluye estos enlaces:

- Dashboard
- Clientes
- Prestamos
- Pagos
- Reportes

En pantallas pequenas se convierte en un menu lateral desplegable. En escritorio
permanece fijo a la izquierda.

## Funcionalidades por pantalla

### Dashboard

Consume `api.dashboard.get()` y muestra ocho indicadores:

- Total de clientes.
- Prestamos emitidos.
- Capital prestado.
- Total de cartera con interes.
- Monto cobrado.
- Saldo por cobrar.
- Cuotas vencidas y monto vencido.
- Clientes morosos.

Incluye accesos rapidos para crear clientes y prestamos. Tiene estados de carga,
error y reintento.

### Clientes

Consume `api.clientes` y proporciona:

- Listado completo.
- Busqueda por nombre, DNI o negocio.
- Alta mediante modal.
- Edicion mediante modal.
- Eliminacion con confirmacion.

Validaciones del formulario:

- DNI numerico de exactamente 8 digitos.
- Celular de exactamente 9 digitos que comienza con `9`.
- Nombres y negocio de 2 a 100 caracteres; solo letras, espacios, apostrofos y guiones.
- Direccion obligatoria de 2 a 60 caracteres; acepta letras, numeros y puntuacion comun.
- DNI, nombres, negocio, celular y direccion obligatorios en el formulario.

#### Que hace el codigo de validacion

La funcion `handleSave` de `app/dashboard/clientes/page.tsx` recorta espacios
con `trim()`, comprueba los formatos con expresiones regulares y valida
longitudes antes de llamar a `api.clientes.create()` o
`api.clientes.update()`. Si hay errores, los guarda en el estado `errors` para
mostrarlos junto a los campos y termina sin enviar la peticion.

El formulario tiene el atributo `noValidate`, por lo que el envio no depende
del mecanismo automatico de validacion HTML. Las comprobaciones de
`handleSave` son las que muestran los mensajes al usuario. Los atributos de los
campos, como `maxLength` e `inputMode`, complementan esas comprobaciones.

La validacion del frontend es una ayuda de interfaz, no una barrera de
seguridad. El servidor vuelve a validar los campos en
`lib/business.ts` antes de guardarlos. Las reglas de tipo, formato, lista
permitida y longitud coinciden con las del formulario, incluyendo la
obligatoriedad de la direccion. El frontend recorta los espacios externos
antes del envio, y el servidor tambien normaliza espacios externos y repetidos.

### Prestamos

Consume `api.prestamos.list()`, `api.clientes.list()` y
`api.prestamos.create()`.

Incluye:

- Busqueda por ID de prestamo, cliente o DNI.
- Filtro por estado.
- Alta de prestamo desde un modal.
- Calculadora en vivo de interes, total, cuota diaria y fecha final.
- Enlace al detalle y calendario de cuotas.

El formulario solicita cliente, monto, interes, cantidad de dias y fecha de
inicio. El calculo mostrado en pantalla es informativo; la API vuelve a validar
y calcular los valores antes de guardar.

Estados disponibles: `PENDIENTE`, `ACTIVO`, `PAGADO`, `VENCIDO` y `CANCELADO`.

### Detalle de prestamo

La ruta dinamica `/dashboard/prestamos/[id_prestamo]` muestra el resumen del
prestamo y sus cuotas. Permite seleccionar una cuota pendiente y registrar su
pago mediante `api.pagos.create()`.

Al registrar un pago, la API actualiza la cuota y recalcula el estado del
prestamo. El frontend vuelve a cargar los datos para reflejar el nuevo saldo.

### Pagos

Consume `api.pagos.list()` y muestra el historial ordenado desde el pago mas
reciente. Permite buscar por cliente, negocio o ID de prestamo y presenta el
total cobrado de los resultados filtrados.

### Reportes

La pantalla usa tres pestanas:

- `Cartera de Prestamos`: resumen de capital, interes, total, pagado, saldo y estado.
- `Cobros Realizados`: fecha, cliente, negocio, prestamo, cuota, monto y observacion.
- `Gestion de Morosidad`: cuotas vencidas, monto vencido y saldo por cliente.

Cada pestana solicita sus datos solo la primera vez que se selecciona. El estado
`loadedTabs` evita peticiones repetidas durante la misma visita a la pantalla.

## Cliente HTTP

`lib/api-client.ts` centraliza las peticiones con `apiFetch<T>`:

- Agrega `Content-Type: application/json`.
- Envia cookies con `credentials: "include"`.
- Parsea la respuesta como `ApiSuccess<T>` o `ApiError`.
- Convierte los errores de la API en excepciones `Error` para que cada pantalla
  los muestre mediante toast o mensaje de error.

Para agregar una operacion nueva:

1. Define el tipo de respuesta en `lib/api-client.ts`.
2. Agrega el metodo dentro del grupo correspondiente de `api`.
3. Usa ese metodo desde la pantalla, evitando llamar `fetch` directamente.
4. Maneja estados `loading`, exito y error.
5. Actualiza [docs/api.md](api.md) si tambien cambia el contrato HTTP.

Ejemplo:

```ts
const clientes = await api.clientes.list();
```

## Componentes compartidos

- `AuthProvider`: sesion actual, login, logout y redireccion.
- `Sidebar`: menu principal, usuario activo, rol y tema.
- `Modal`: formularios y confirmaciones superpuestas.
- `ToastProvider`: notificaciones temporales mediante `useToast()`.
- `Badge`: visualizacion de estados de prestamos.
- `StatCard`: indicador numerico reutilizable.
- `ThemeToggle`: alterna el tema persistido en el navegador.

## Convenciones de desarrollo

- Las pantallas interactivas usan `"use client"`.
- Los datos remotos se cargan en `useEffect` y se protegen contra actualizaciones
  despues del desmontaje mediante una bandera `cancelled`.
- Las operaciones de escritura deshabilitan el formulario con `submitting`.
- Los errores de usuario se muestran con toast; los errores de carga de pantalla
  se muestran dentro de la vista.
- Los importes se presentan en soles con formato `es-PE`.
- Las fechas se presentan en formato local peruano.
- Mantener los tipos de dominio en `types/domain.ts` y los tipos de respuesta
  derivados en `lib/api-client.ts`.
- No exponer secretos ni credenciales en componentes del navegador.

## Despliegue

Vercel detecta el proyecto como una aplicacion Next.js. Para desplegar:

1. Subir el repositorio a GitHub.
2. Importar el repositorio en Vercel.
3. Configurar las variables de entorno descritas en [docs/api.md](api.md).
4. Ejecutar el despliegue.
5. Abrir la URL de Vercel y probar `/login`.

Las variables deben configurarse para el entorno correspondiente de Vercel.
`.env.local` es solo para desarrollo y no debe subirse al repositorio.
