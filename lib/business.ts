import { ApiError } from "@/lib/errors";
import { generarId } from "@/lib/ids";
import type { Cliente, Cuota, Pago, Prestamo, PrestamoEstado } from "@/types/domain";

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value.replace(",", "."));
  return Number(value);
}

function getAny(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== "") return source[key];
  }

  return undefined;
}

// ============================================================================
// TEMA 3: Sanitización de entradas (Normalización)
// ============================================================================
export function normalizarCliente(cliente: Partial<Cliente>): Cliente {
  const row = cliente as Record<string, unknown>;
  // Mantiene los alias históricos de campos y normaliza solo valores de texto.
  const normalizarTexto = (keys: string[]) =>
    String(getAny(row, keys) ?? "").trim().replace(/\s+/g, " ");

  // Sanitiza quitando espacios externos y reduciendo secuencias internas de espacios.
  // No elimina HTML ni cambia los dígitos de DNI o celular; la validación es posterior.
  return {
    id: String(getAny(row, ["id"]) ?? "").trim(),
    id_cliente: String(getAny(row, ["id_cliente"]) ?? "").trim(),
    dni: String(getAny(row, ["dni"]) ?? "").trim(),
    nombres_apellidos: normalizarTexto(["nombres_apellidos", "nombre_completo"]),
    nombre_negocio: normalizarTexto(["nombre_negocio", "negocio"]),
    celular: String(getAny(row, ["celular", "telefono"]) ?? "").trim(),
    direccion_puesto: normalizarTexto(["direccion_puesto", "direccion", "puesto"]),
    fecha_creacion: String(getAny(row, ["fecha_creacion"]) ?? "").trim(),
    fecha_modificacion: String(getAny(row, ["fecha_modificacion"]) ?? "").trim(),
  };
}

export function normalizarPrestamo(prestamo: Partial<Prestamo>): Prestamo {
  const row = prestamo as Record<string, unknown>;

  return {
    id: String(getAny(row, ["id"]) ?? "").trim(),
    id_prestamo: String(getAny(row, ["id_prestamo"]) ?? "").trim(),
    id_cliente: String(getAny(row, ["id_cliente"]) ?? "").trim(),
    monto: toNumber(getAny(row, ["monto", "monto_prestado"])),
    interes: toNumber(getAny(row, ["interes", "porcentaje_interes", "interes_porcentaje"])),
    monto_interes: toNumber(getAny(row, ["monto_interes", "interes_total"])),
    total_pagar: toNumber(getAny(row, ["total_pagar", "monto_total", "total"])),
    dias: toNumber(getAny(row, ["dias", "numero_dias", "dias_plazo"])),
    cuota_diaria: toNumber(getAny(row, ["cuota_diaria", "monto_cuota"])),
    fecha_inicio: String(getAny(row, ["fecha_inicio"]) ?? "").trim(),
    fecha_fin: String(getAny(row, ["fecha_fin"]) ?? "").trim(),
    estado: (String(getAny(row, ["estado"]) ?? "ACTIVO").trim() || "ACTIVO") as PrestamoEstado,
    fecha_creacion: String(getAny(row, ["fecha_creacion"]) ?? "").trim(),
    fecha_modificacion: String(getAny(row, ["fecha_modificacion"]) ?? "").trim(),
  };
}

export function normalizarCuota(cuota: Partial<Cuota>): Cuota {
  const row = cuota as Record<string, unknown>;

  return {
    id: String(getAny(row, ["id"]) ?? "").trim(),
    id_cuota: String(getAny(row, ["id_cuota"]) ?? "").trim(),
    id_prestamo: String(getAny(row, ["id_prestamo"]) ?? "").trim(),
    numero_cuota: toNumber(getAny(row, ["numero_cuota", "nro_cuota"])),
    fecha_vencimiento: String(getAny(row, ["fecha_vencimiento"]) ?? "").trim(),
    monto: toNumber(getAny(row, ["monto", "monto_cuota"])),
    estado: String(getAny(row, ["estado"]) ?? "PENDIENTE").trim() as Cuota["estado"],
    fecha_creacion: String(getAny(row, ["fecha_creacion"]) ?? "").trim(),
    fecha_modificacion: String(getAny(row, ["fecha_modificacion"]) ?? "").trim(),
  };
}

export function normalizarPago(pago: Partial<Pago>): Pago {
  const row = pago as Record<string, unknown>;

  return {
    id: String(getAny(row, ["id"]) ?? "").trim(),
    id_pago: String(getAny(row, ["id_pago"]) ?? "").trim(),
    id_prestamo: String(getAny(row, ["id_prestamo"]) ?? "").trim(),
    id_cuota: String(getAny(row, ["id_cuota"]) ?? "").trim(),
    numero_cuota: toNumber(getAny(row, ["numero_cuota", "nro_cuota"])),
    fecha_pago: String(getAny(row, ["fecha_pago", "fecha_hora"]) ?? "").trim(),
    monto_pagado: toNumber(getAny(row, ["monto_pagado", "monto", "monto_pago"])),
    observacion: String(getAny(row, ["observacion", "nota"]) ?? "").trim(),
    fecha_creacion: String(getAny(row, ["fecha_creacion"]) ?? "").trim(),
    fecha_modificacion: String(getAny(row, ["fecha_modificacion"]) ?? "").trim(),
  };
}

// ============================================================================
// TEMA 3: Validación de reglas de negocio en el Servidor (API / Backend)
// ============================================================================
export function validarClienteInput(input: Partial<Cliente>) {
  // La API debe rechazar cuerpos JSON que no sean objetos antes de leer propiedades.
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ApiError(400, "Los datos del cliente deben enviarse como un objeto");
  }

  const row = input as Record<string, unknown>;
  const camposTexto = [
    ["dni"],
    ["nombres_apellidos", "nombre_completo"],
    ["nombre_negocio", "negocio"],
    ["celular", "telefono"],
    ["direccion_puesto", "direccion", "puesto"],
  ];

  // Rechaza objetos y números antes de normalizar, para no convertirlos en texto accidentalmente.
  for (const aliases of camposTexto) {
    const value = getAny(row, aliases);
    if (value !== undefined && value !== null && typeof value !== "string") {
      throw new ApiError(400, "Todos los campos del cliente deben ser texto");
    }
  }

  // 1. Sanitizar campos antes de validar.
  const cliente = normalizarCliente(input);

  // 2. Validación de presencia obligatoria.
  if (!cliente.dni) throw new ApiError(400, "RB01: DNI obligatorio");
  if (!cliente.nombres_apellidos) throw new ApiError(400, "RB03: Nombre obligatorio");
  if (!cliente.nombre_negocio) throw new ApiError(400, "El nombre del negocio es obligatorio");
  if (!cliente.celular) throw new ApiError(400, "RB04: Celular obligatorio");
  if (!cliente.direccion_puesto) throw new ApiError(400, "La dirección del puesto es obligatoria");

  // 3. Repite en el servidor las reglas del formulario: formato numérico,
  // listas permitidas de caracteres y longitudes mínimas y máximas.
  if (!/^\d{8}$/.test(cliente.dni)) {
    throw new ApiError(400, "El DNI debe tener exactamente 8 dígitos numéricos");
  }
  if (
    cliente.nombres_apellidos.length < 2 ||
    cliente.nombres_apellidos.length > 100 ||
    !/^[\p{L}\p{M} '-]+$/u.test(cliente.nombres_apellidos)
  ) {
    throw new ApiError(400, "Los nombres deben tener entre 2 y 100 caracteres y contener solo letras");
  }
  if (
    cliente.nombre_negocio.length < 2 ||
    cliente.nombre_negocio.length > 100 ||
    !/^[\p{L}\p{M} '-]+$/u.test(cliente.nombre_negocio)
  ) {
    throw new ApiError(400, "El negocio debe tener entre 2 y 100 caracteres y contener solo texto");
  }
  if (!/^9\d{8}$/.test(cliente.celular)) {
    throw new ApiError(400, "El celular debe tener 9 dígitos numéricos e iniciar con 9");
  }
  if (
    cliente.direccion_puesto.length < 2 ||
    cliente.direccion_puesto.length > 60 ||
    !/^[\p{L}\p{M}0-9 .,#'°/()-]+$/u.test(cliente.direccion_puesto)
  ) {
    throw new ApiError(400, "La dirección debe tener entre 2 y 60 caracteres válidos");
  }

  return cliente;
}

// Compara el DNI normalizado con todos los clientes y responde 409 si ya existe.
export function assertDniDisponible(clientes: Cliente[], dni: string) {
  if (clientes.some((cliente) => cliente.dni === dni)) {
    throw new ApiError(409, "RB02: Ya existe un cliente con ese DNI");
  }
}

export function assertDniDisponibleParaCliente(
  clientes: Cliente[],
  dni: string,
  idCliente: string,
) {
  if (
    clientes.some(
      (cliente) => cliente.dni === dni && cliente.id_cliente !== idCliente,
    )
  ) {
    throw new ApiError(409, "RB02: Ya existe otro cliente con ese DNI");
  }
}

export function crearCliente(input: Partial<Cliente>, clientes: Cliente[]) {
  const cliente = validarClienteInput(input);
  assertDniDisponible(clientes, cliente.dni);

  return {
    ...cliente,
    id: "",
    id_cliente: generarId("C", clientes.map((item) => item.id_cliente)),
  };
}

export function actualizarClienteInput(
  idCliente: string,
  input: Partial<Cliente>,
  clientes: Cliente[],
) {
  const actual = clientes.find((cliente) => cliente.id_cliente === idCliente);

  if (!actual) throw new ApiError(404, "El cliente no existe");

  const actualizado = validarClienteInput({
    ...actual,
    ...input,
    id_cliente: actual.id_cliente,
  });

  assertDniDisponibleParaCliente(clientes, actualizado.dni, actual.id_cliente);

  return actualizado;
}

export function validarEstadoPrestamo(estado: unknown): PrestamoEstado {
  const value = String(estado ?? "").trim().toUpperCase();
  const validos: PrestamoEstado[] = ["PENDIENTE", "ACTIVO", "PAGADO", "VENCIDO", "CANCELADO"];

  if (!validos.includes(value as PrestamoEstado)) {
    throw new ApiError(400, "Estado de prestamo invalido");
  }

  return value as PrestamoEstado;
}

export function calcularPrestamo(input: {
  id_cliente?: unknown;
  monto?: unknown;
  interes?: unknown;
  dias?: unknown;
  fecha_inicio?: unknown;
}) {
  const id_cliente = String(input.id_cliente ?? "").trim();
  const monto = toNumber(input.monto);
  const interes = toNumber(input.interes);
  const dias = toNumber(input.dias);
  const fecha_inicio = String(input.fecha_inicio ?? "").trim();

  if (!id_cliente) throw new ApiError(400, "RB05: El cliente es obligatorio");
  if (!Number.isFinite(monto) || monto < 10 || monto > 50000) {
    throw new ApiError(400, "RB06: El monto debe estar entre S/ 10 y S/ 50,000");
  }
  if (!Number.isFinite(interes) || interes < 0 || interes > 100) {
    throw new ApiError(400, "RB07: El porcentaje de interés debe estar entre 0% y 100%");
  }
  // A7: Limitar el plazo maximo
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
    throw new ApiError(400, "RB08: El número de días debe estar entre 1 y 365 días");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_inicio)) {
    throw new ApiError(400, "La fecha de inicio debe tener formato YYYY-MM-DD");
  }

  const monto_interes = roundMoney(monto * (interes / 100));
  const total_pagar = roundMoney(monto + monto_interes);
  const cuota_diaria = roundMoney(total_pagar / dias);
  const fecha_fin = addDays(fecha_inicio, dias - 1);

  return {
    id_cliente,
    monto: roundMoney(monto),
    interes,
    monto_interes,
    total_pagar,
    dias,
    cuota_diaria,
    fecha_inicio,
    fecha_fin,
  };
}

export function crearPrestamoYCuotas(
  input: Parameters<typeof calcularPrestamo>[0],
  clientes: Cliente[],
  prestamos: Prestamo[],
  cuotas: Cuota[],
) {
  const calculo = calcularPrestamo(input);

  if (!clientes.some((cliente) => cliente.id_cliente === calculo.id_cliente)) {
    throw new ApiError(404, "RB05: El cliente no existe");
  }

  const prestamo: Prestamo = {
    id: "",
    id_prestamo: generarId("P", prestamos.map((item) => item.id_prestamo)),
    ...calculo,
    estado: "ACTIVO",
    fecha_creacion: "",
    fecha_modificacion: "",
  };

  const cuotasGeneradas = Array.from({ length: prestamo.dias }, (_, index) => ({
    id_cuota: generarId(
      "Q",
      cuotas.map((item) => item.id_cuota).concat(
        Array.from({ length: index }, (_item, previousIndex) =>
          `Q${String(cuotas.length + previousIndex + 1).padStart(3, "0")}`,
        ),
      ),
    ),
    id_prestamo: prestamo.id_prestamo,
    numero_cuota: index + 1,
    fecha_vencimiento: addDays(prestamo.fecha_inicio, index),
    monto: prestamo.cuota_diaria,
    estado: "PENDIENTE" as const,
    id: "",
    fecha_creacion: "",
    fecha_modificacion: "",
  }));

  return { prestamo, cuotas: cuotasGeneradas };
}

export function aplicarEstadosCuotas(cuotas: Cuota[], pagos: Pago[], today = todayIso()) {
  const cuotasPagadas = new Set(
    pagos.map((pago) => pago.id_cuota).filter((idCuota) => idCuota.length > 0),
  );

  return cuotas.map((cuota) => {
    if (cuotasPagadas.has(cuota.id_cuota) || cuota.estado === "PAGADA") {
      return { ...cuota, estado: "PAGADA" as const };
    }

    if (cuota.estado === "PENDIENTE" && cuota.fecha_vencimiento < today) {
      return { ...cuota, estado: "VENCIDA" as const };
    }

    return cuota;
  });
}

export function calcularEstadoPrestamo(prestamo: Prestamo, cuotas: Cuota[]): PrestamoEstado {
  if (prestamo.estado === "CANCELADO") return "CANCELADO";

  const cuotasPrestamo = cuotas.filter((cuota) => cuota.id_prestamo === prestamo.id_prestamo);
  if (cuotasPrestamo.length > 0 && cuotasPrestamo.every((cuota) => cuota.estado === "PAGADA")) {
    return "PAGADO";
  }
  if (cuotasPrestamo.some((cuota) => cuota.estado === "VENCIDA")) {
    return "VENCIDO";
  }

  return "ACTIVO";
}

export function calcularSaldo(prestamo: Prestamo, pagos: Pago[]) {
  const pagado = roundMoney(
    pagos
      .filter((pago) => pago.id_prestamo === prestamo.id_prestamo)
      .reduce((total, pago) => total + pago.monto_pagado, 0),
  );

  return {
    total: prestamo.total_pagar,
    pagado,
    saldo: roundMoney(Math.max(prestamo.total_pagar - pagado, 0)),
  };
}

export function validarPagoInput(
  input: Partial<Pago>,
  prestamos: Prestamo[],
  cuotas: Cuota[],
  pagos: Pago[],
) {
  const pago = normalizarPago(input);
  const prestamo = prestamos.find((item) => item.id_prestamo === pago.id_prestamo);

  if (!prestamo) throw new ApiError(404, "RB13: El prestamo no existe");

  const cuota = cuotas.find((item) => {
    if (pago.id_cuota) return item.id_cuota === pago.id_cuota;
    return item.id_prestamo === pago.id_prestamo && item.numero_cuota === pago.numero_cuota;
  });

  if (!cuota) throw new ApiError(404, "RB14: La cuota no existe");
  
  // C2: Asegurar que la cuota corresponda al préstamo del pago
  if (cuota.id_prestamo !== pago.id_prestamo) {
    throw new ApiError(400, "C2: La cuota no pertenece al prestamo especificado");
  }

  const cuotasConEstado = aplicarEstadosCuotas(cuotas, pagos);
  const cuotaConEstado = cuotasConEstado.find((item) => item.id_cuota === cuota.id_cuota);

  if (cuotaConEstado?.estado === "PAGADA") {
    throw new ApiError(409, "RB15: No se puede pagar una cuota ya pagada");
  }
  if (!Number.isFinite(pago.monto_pagado) || pago.monto_pagado <= 0) {
    throw new ApiError(400, "RB16: El monto pagado debe ser valido");
  }

  // A5: Validar que el pago no exceda el saldo pendiente del préstamo
  const saldoActual = calcularSaldo(prestamo, pagos).saldo;
  if (pago.monto_pagado > saldoActual) {
    throw new ApiError(400, "A5: El monto pagado no puede superar el saldo actual del prestamo");
  }

  // A6: Validar formato de fecha de pago
  const fecha_pago = pago.fecha_pago || todayIso();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_pago)) {
    throw new ApiError(400, "A6: La fecha de pago debe tener formato YYYY-MM-DD");
  }

  return {
    ...pago,
    id_cuota: cuota.id_cuota,
    id_prestamo: cuota.id_prestamo,
    numero_cuota: cuota.numero_cuota,
    fecha_pago,
    monto_pagado: roundMoney(pago.monto_pagado),
  };
}

export function crearPago(
  input: Partial<Pago>,
  prestamos: Prestamo[],
  cuotas: Cuota[],
  pagos: Pago[],
) {
  return {
    ...validarPagoInput(input, prestamos, cuotas, pagos),
    id: "",
    id_pago: generarId("G", pagos.map((item) => item.id_pago)),
  };
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateIso: string, days: number) {
  const [year, month, day] = dateIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(startIso: string, endIso: string) {
  const start = Date.parse(`${startIso}T00:00:00.000Z`);
  const end = Date.parse(`${endIso}T00:00:00.000Z`);
  return Math.floor((end - start) / MILLIS_PER_DAY);
}
