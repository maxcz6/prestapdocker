-- ============================================================
-- PRESTAP - Inicialización de Base de Datos Puramente Local (PostgreSQL)
-- Compatible con Docker (app-db) y entorno local nativo
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usuarios (
  id_usuario VARCHAR(50) NOT NULL PRIMARY KEY,
  usuario VARCHAR(100) NOT NULL UNIQUE,
  correo VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  password_salt VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE VIEW public.users AS SELECT * FROM public.usuarios;

CREATE TABLE IF NOT EXISTS public.clientes (
  id_cliente VARCHAR(50) NOT NULL PRIMARY KEY,
  dni VARCHAR(20) NOT NULL UNIQUE,
  nombres_apellidos VARCHAR(200) NOT NULL,
  nombre_negocio VARCHAR(200) NOT NULL,
  celular VARCHAR(20) NOT NULL,
  direccion_puesto VARCHAR(255),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prestamos (
  id_prestamo VARCHAR(50) NOT NULL PRIMARY KEY,
  id_cliente VARCHAR(50) NOT NULL REFERENCES public.clientes(id_cliente),
  monto NUMERIC NOT NULL,
  interes NUMERIC NOT NULL,
  monto_interes NUMERIC NOT NULL,
  total_pagar NUMERIC NOT NULL,
  dias INTEGER NOT NULL,
  cuota_diaria NUMERIC NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cuotas (
  id_cuota VARCHAR(50) NOT NULL PRIMARY KEY,
  id_prestamo VARCHAR(50) NOT NULL REFERENCES public.prestamos(id_prestamo) ON DELETE CASCADE,
  numero_cuota INTEGER NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  monto NUMERIC NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pagos (
  id_pago VARCHAR(50) NOT NULL PRIMARY KEY,
  id_prestamo VARCHAR(50) NOT NULL REFERENCES public.prestamos(id_prestamo),
  id_cuota VARCHAR(50) NOT NULL REFERENCES public.cuotas(id_cuota),
  numero_cuota INTEGER NOT NULL,
  fecha_pago DATE NOT NULL,
  monto_pagado NUMERIC NOT NULL,
  observacion VARCHAR(255),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  id_usuario VARCHAR(50) REFERENCES public.usuarios(id_usuario)
);

-- ============================================================
-- SEED DATA (Datos iniciales para funcionamiento puramente local)
-- ============================================================

-- Usuario Administrador inicial: admin01 / admin01
INSERT INTO public.usuarios (id_usuario, usuario, correo, password_hash, password_salt, rol, estado)
VALUES (
  'U_ADMIN01',
  'admin01',
  'admin01@prestap.com',
  '95760883d71149cb92e39cccbe28563a05b965fb750a3714890f62a4996d9aeda30299c9f10f5c638e72888240eba4ae944537f7564f11a1fd3a846598e5a666',
  '88d806e694a0ef412d6f299fd0d839df',
  'ADMIN',
  'ACTIVO'
) ON CONFLICT (id_usuario) DO NOTHING;

-- Clientes iniciales para pruebas
INSERT INTO public.clientes (id_cliente, dni, nombres_apellidos, nombre_negocio, celular, direccion_puesto)
VALUES 
  ('CF23EC578', '81151922', 'María Elena Quispe Rojas', 'Abarrotes María', '987654321', 'Mercado Central Puesto 12'),
  ('C4DED2F97', '82151922', 'José Luis Ramos Paredes', 'Frutería Don José', '987654322', 'Mercado Central Puesto 45'),
  ('CB4ED5C42', '83151922', 'Ana Cecilia Torres Huamán', 'Bazar Anita', '987654323', 'Av. Comercio 123')
ON CONFLICT (id_cliente) DO NOTHING;
