-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.usuarios (
  id_usuario character varying NOT NULL,
  usuario character varying NOT NULL UNIQUE,
  correo character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  password_salt character varying NOT NULL,
  rol character varying NOT NULL CHECK (rol::text = ANY (ARRAY['ADMIN'::character varying, 'OPERADOR'::character varying, 'SUPERVISOR'::character varying, 'COBRADOR'::character varying]::text[])),
  estado character varying NOT NULL DEFAULT 'ACTIVO'::character varying CHECK (estado::text = ANY (ARRAY['ACTIVO'::character varying, 'INACTIVO'::character varying]::text[])),
  fecha_creacion timestamp with time zone NOT NULL DEFAULT now(),
  fecha_modificacion timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario)
);
CREATE TABLE public.clientes (
  id_cliente character varying NOT NULL,
  dni character varying NOT NULL UNIQUE,
  nombres_apellidos character varying NOT NULL,
  nombre_negocio character varying NOT NULL,
  celular character varying NOT NULL,
  direccion_puesto character varying,
  fecha_creacion timestamp with time zone NOT NULL DEFAULT now(),
  fecha_modificacion timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente)
);
CREATE TABLE public.prestamos (
  id_prestamo character varying NOT NULL,
  id_cliente character varying NOT NULL,
  monto numeric NOT NULL CHECK (monto > 0::numeric),
  interes numeric NOT NULL CHECK (interes >= 0::numeric),
  monto_interes numeric NOT NULL,
  total_pagar numeric NOT NULL,
  dias integer NOT NULL CHECK (dias >= 1 AND dias <= 365),
  cuota_diaria numeric NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  estado character varying NOT NULL DEFAULT 'ACTIVO'::character varying CHECK (estado::text = ANY (ARRAY['PENDIENTE'::character varying, 'ACTIVO'::character varying, 'PAGADO'::character varying, 'VENCIDO'::character varying, 'CANCELADO'::character varying]::text[])),
  fecha_creacion timestamp with time zone NOT NULL DEFAULT now(),
  fecha_modificacion timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT prestamos_pkey PRIMARY KEY (id_prestamo),
  CONSTRAINT fk_prestamo_cliente FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente)
);
CREATE TABLE public.cuotas (
  id_cuota character varying NOT NULL,
  id_prestamo character varying NOT NULL,
  numero_cuota integer NOT NULL,
  fecha_vencimiento date NOT NULL,
  monto numeric NOT NULL CHECK (monto > 0::numeric),
  estado character varying NOT NULL DEFAULT 'PENDIENTE'::character varying CHECK (estado::text = ANY (ARRAY['PENDIENTE'::character varying, 'PAGADA'::character varying, 'VENCIDA'::character varying]::text[])),
  fecha_creacion timestamp with time zone NOT NULL DEFAULT now(),
  fecha_modificacion timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cuotas_pkey PRIMARY KEY (id_cuota),
  CONSTRAINT fk_cuota_prestamo FOREIGN KEY (id_prestamo) REFERENCES public.prestamos(id_prestamo)
);
CREATE TABLE public.pagos (
  id_pago character varying NOT NULL,
  id_prestamo character varying NOT NULL,
  id_cuota character varying NOT NULL,
  numero_cuota integer NOT NULL,
  fecha_pago date NOT NULL,
  monto_pagado numeric NOT NULL CHECK (monto_pagado > 0::numeric),
  observacion character varying,
  fecha_creacion timestamp with time zone NOT NULL DEFAULT now(),
  fecha_modificacion timestamp with time zone NOT NULL DEFAULT now(),
  id_usuario character varying,
  CONSTRAINT pagos_pkey PRIMARY KEY (id_pago),
  CONSTRAINT fk_pago_prestamo FOREIGN KEY (id_prestamo) REFERENCES public.prestamos(id_prestamo),
  CONSTRAINT fk_pago_cuota FOREIGN KEY (id_cuota) REFERENCES public.cuotas(id_cuota),
  CONSTRAINT fk_pago_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);



---

## Table `usuarios`

Control de acceso, autenticación (scrypt) y permisos RBAC del sistema

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_usuario` | `varchar` | Primary |
| `usuario` | `varchar` |  Unique |
| `correo` | `varchar` |  Unique |
| `password_hash` | `varchar` |  |
| `password_salt` | `varchar` |  |
| `rol` | `varchar` |  |
| `estado` | `varchar` |  |
| `fecha_creacion` | `timestamptz` |  |
| `fecha_modificacion` | `timestamptz` |  |

## Table `clientes`

Prestatarios / clientes del negocio

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_cliente` | `varchar` | Primary |
| `dni` | `varchar` |  Unique |
| `nombres_apellidos` | `varchar` |  |
| `nombre_negocio` | `varchar` |  |
| `celular` | `varchar` |  |
| `direccion_puesto` | `varchar` |  Nullable |
| `fecha_creacion` | `timestamptz` |  |
| `fecha_modificacion` | `timestamptz` |  |

## Table `prestamos`

Préstamos otorgados bajo modalidad de cuota diaria / microcrédito

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_prestamo` | `varchar` | Primary |
| `id_cliente` | `varchar` |  |
| `monto` | `numeric` |  |
| `interes` | `numeric` |  |
| `monto_interes` | `numeric` |  |
| `total_pagar` | `numeric` |  |
| `dias` | `int4` |  |
| `cuota_diaria` | `numeric` |  |
| `fecha_inicio` | `date` |  |
| `fecha_fin` | `date` |  |
| `estado` | `varchar` |  |
| `fecha_creacion` | `timestamptz` |  |
| `fecha_modificacion` | `timestamptz` |  |

## Table `cuotas`

Cronograma diario generado automáticamente al crear un préstamo (N cuotas = N días)

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_cuota` | `varchar` | Primary |
| `id_prestamo` | `varchar` |  |
| `numero_cuota` | `int4` |  |
| `fecha_vencimiento` | `date` |  |
| `monto` | `numeric` |  |
| `estado` | `varchar` |  |
| `fecha_creacion` | `timestamptz` |  |
| `fecha_modificacion` | `timestamptz` |  |

## Table `pagos`

Transacciones y recibos de cobro de cuotas

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_pago` | `varchar` | Primary |
| `id_prestamo` | `varchar` |  |
| `id_cuota` | `varchar` |  |
| `numero_cuota` | `int4` |  |
| `fecha_pago` | `date` |  |
| `monto_pagado` | `numeric` |  |
| `observacion` | `varchar` |  Nullable |
| `fecha_creacion` | `timestamptz` |  |
| `fecha_modificacion` | `timestamptz` |  |
| `id_usuario` | `varchar` |  Nullable |

