import { describe, it, expect } from "vitest";
import {
  calcularPrestamo,
  crearPrestamoYCuotas,
  aplicarEstadosCuotas,
  calcularEstadoPrestamo,
  calcularSaldo,
  validarPagoInput,
  validarClienteInput,
  crearCliente,
} from "../lib/business";
import type { Cliente, Cuota, Pago, Prestamo } from "../types/domain";

describe("Lógica de Clientes", () => {
  it("valida cliente con datos correctos", () => {
    const input = {
      dni: "12345678",
      nombres_apellidos: "Juan Perez",
      nombre_negocio: "Bodega Juan",
      celular: "987654321",
      direccion_puesto: "Av Principal 123",
    };
    const cliente = validarClienteInput(input);
    expect(cliente.dni).toBe("12345678");
    expect(cliente.nombres_apellidos).toBe("Juan Perez");
  });

  it("rechaza cliente con DNI invalido o incompleto", () => {
    expect(() =>
      validarClienteInput({
        dni: "123", // Muy corto
        nombres_apellidos: "Juan Perez",
        nombre_negocio: "Bodega Juan",
        celular: "987654321",
        direccion_puesto: "Av Principal 123",
      }),
    ).toThrow("El DNI debe tener exactamente 8 dígitos numéricos");
  });

  it("sanitiza espacios externos y repetidos en los textos", () => {
    const cliente = validarClienteInput({
      dni: " 12345678 ",
      nombres_apellidos: "  María   Pérez ",
      nombre_negocio: " Bodega   Central ",
      celular: " 987654321 ",
      direccion_puesto: " Av.   Principal 123 ",
    });

    expect(cliente.dni).toBe("12345678");
    expect(cliente.nombres_apellidos).toBe("María Pérez");
    expect(cliente.nombre_negocio).toBe("Bodega Central");
    expect(cliente.direccion_puesto).toBe("Av. Principal 123");
  });

  it("rechaza texto con números o caracteres no permitidos", () => {
    expect(() =>
      validarClienteInput({
        dni: "12345678",
        nombres_apellidos: "Juan2 Perez",
        nombre_negocio: "Bodega Juan",
        celular: "987654321",
        direccion_puesto: "Av. Principal 123",
      }),
    ).toThrow("Los nombres deben tener entre 2 y 100 caracteres y contener solo letras");

    expect(() =>
      validarClienteInput({
        dni: "12345678",
        nombres_apellidos: "Juan Perez",
        nombre_negocio: "Bodega 24",
        celular: "987654321",
        direccion_puesto: "Av. Principal 123",
      }),
    ).toThrow("El negocio debe tener entre 2 y 100 caracteres y contener solo texto");
  });

  it("rechaza valores fuera de los límites de longitud y formato", () => {
    const datos = {
      dni: "12345678",
      nombres_apellidos: "Juan Perez",
      nombre_negocio: "Bodega Juan",
      celular: "987654321",
      direccion_puesto: "Av. Principal 123",
    };

    expect(validarClienteInput({ ...datos, direccion_puesto: "A".repeat(60) }).direccion_puesto).toHaveLength(60);
    expect(() => validarClienteInput({ ...datos, nombres_apellidos: "J" })).toThrow("entre 2 y 100 caracteres");
    expect(() => validarClienteInput({ ...datos, nombre_negocio: "B".repeat(101) })).toThrow("entre 2 y 100 caracteres");
    expect(() => validarClienteInput({ ...datos, celular: "887654321" })).toThrow("debe tener 9 dígitos numéricos e iniciar con 9");
    expect(() => validarClienteInput({ ...datos, direccion_puesto: "A".repeat(61) })).toThrow("entre 2 y 60 caracteres válidos");
    expect(() => validarClienteInput({ ...datos, direccion_puesto: "" })).toThrow("La dirección del puesto es obligatoria");
  });

  it("rechaza valores que no llegan como texto y datos que no son solo números", () => {
    expect(() =>
      validarClienteInput({
        dni: 12345678 as unknown as string,
        nombres_apellidos: "Juan Perez",
        nombre_negocio: "Bodega Juan",
        celular: "987654321",
        direccion_puesto: "Av. Principal 123",
      }),
    ).toThrow("Todos los campos del cliente deben ser texto");

    expect(() =>
      validarClienteInput({
        dni: "1234ABCD",
        nombres_apellidos: "Juan Perez",
        nombre_negocio: "Bodega Juan",
        celular: "987654321",
        direccion_puesto: "Av. Principal 123",
      }),
    ).toThrow("El DNI debe tener exactamente 8 dígitos numéricos");
  });

  it("evita duplicación de DNI al crear cliente", () => {
    const clientes: Cliente[] = [
      {
        id: "1",
        id_cliente: "C001",
        dni: "12345678",
        nombres_apellidos: "Juan Perez",
        nombre_negocio: "Bodega Juan",
        celular: "987654321",
        direccion_puesto: "",
        fecha_creacion: "",
        fecha_modificacion: "",
      },
    ];

    expect(() =>
      crearCliente(
        {
          dni: "12345678",
          nombres_apellidos: "Maria Lopez",
          nombre_negocio: "Puesto Central",
          celular: "987654322",
          direccion_puesto: "Mercado Central",
        },
        clientes,
      ),
    ).toThrow("Ya existe un cliente con ese DNI");
  });
});

describe("Lógica Financiera de Préstamos", () => {
  it("calcula montos, intereses y cuotas diarias correctamente", () => {
    const input = {
      id_cliente: "C001",
      monto: 1000,
      interes: 20, // 20%
      dias: 24,
      fecha_inicio: "2026-09-01",
    };

    const calc = calcularPrestamo(input);
    expect(calc.monto).toBe(1000);
    expect(calc.monto_interes).toBe(200);
    expect(calc.total_pagar).toBe(1200);
    expect(calc.cuota_diaria).toBe(50); // 1200 / 24 = 50
    expect(calc.fecha_fin).toBe("2026-09-24");
  });

  it("rechaza plazos mayores a 365 días (A7)", () => {
    expect(() =>
      calcularPrestamo({
        id_cliente: "C001",
        monto: 1000,
        interes: 10,
        dias: 400,
        fecha_inicio: "2026-09-01",
      }),
    ).toThrow("El número de días debe estar entre 1 y 365");
  });

  it("genera todas las cuotas correlativas con fecha correcta", () => {
    const clientes: Cliente[] = [
      {
        id: "1",
        id_cliente: "C001",
        dni: "12345678",
        nombres_apellidos: "Juan Perez",
        nombre_negocio: "Bodega Juan",
        celular: "987654321",
        direccion_puesto: "",
        fecha_creacion: "",
        fecha_modificacion: "",
      },
    ];

    const result = crearPrestamoYCuotas(
      {
        id_cliente: "C001",
        monto: 500,
        interes: 10,
        dias: 5,
        fecha_inicio: "2026-09-01",
      },
      clientes,
      [],
      [],
    );

    expect(result.prestamo.id_prestamo).toMatch(/^P[A-Z0-9]+$/);
    expect(result.cuotas.length).toBe(5);
    expect(result.cuotas[0].numero_cuota).toBe(1);
    expect(result.cuotas[0].fecha_vencimiento).toBe("2026-09-01");
    expect(result.cuotas[4].numero_cuota).toBe(5);
    expect(result.cuotas[4].fecha_vencimiento).toBe("2026-09-05");
  });
});

describe("Lógica de Pagos y Consistencia (C2, A5, A6)", () => {
  const prestamo: Prestamo = {
    id: "1",
    id_prestamo: "P001",
    id_cliente: "C001",
    monto: 1000,
    interes: 20,
    monto_interes: 200,
    total_pagar: 1200,
    dias: 24,
    cuota_diaria: 50,
    fecha_inicio: "2026-08-01",
    fecha_fin: "2026-08-24",
    estado: "ACTIVO",
    fecha_creacion: "",
    fecha_modificacion: "",
  };

  const cuotas: Cuota[] = [
    {
      id: "1",
      id_cuota: "Q001",
      id_prestamo: "P001",
      numero_cuota: 1,
      fecha_vencimiento: "2026-08-01",
      monto: 50,
      estado: "PENDIENTE",
      fecha_creacion: "",
      fecha_modificacion: "",
    },
    {
      id: "2",
      id_cuota: "Q002",
      id_prestamo: "P002", // Cuota de OTRO prestamo
      numero_cuota: 1,
      fecha_vencimiento: "2026-08-01",
      monto: 50,
      estado: "PENDIENTE",
      fecha_creacion: "",
      fecha_modificacion: "",
    },
  ];

  it("rechaza pago si la cuota pertenece a otro préstamo (C2)", () => {
    expect(() =>
      validarPagoInput(
        {
          id_prestamo: "P001",
          id_cuota: "Q002", // Cuota de P002
          monto_pagado: 50,
          fecha_pago: "2026-08-02",
        },
        [prestamo],
        cuotas,
        [],
      ),
    ).toThrow("La cuota no pertenece al prestamo especificado");
  });

  it("rechaza pago si excede el saldo pendiente del préstamo (A5)", () => {
    expect(() =>
      validarPagoInput(
        {
          id_prestamo: "P001",
          id_cuota: "Q001",
          monto_pagado: 1500, // Saldo total es 1200
          fecha_pago: "2026-08-02",
        },
        [prestamo],
        cuotas,
        [],
      ),
    ).toThrow("El monto pagado no puede superar el saldo actual del prestamo");
  });

  it("calcula estados de cuotas y estado global del préstamo", () => {
    const pagos: Pago[] = [
      {
        id: "1",
        id_pago: "G001",
        id_prestamo: "P001",
        id_cuota: "Q001",
        numero_cuota: 1,
        fecha_pago: "2026-08-01",
        monto_pagado: 50,
        observacion: "",
        fecha_creacion: "",
        fecha_modificacion: "",
      },
    ];

    const cuotasActualizadas = aplicarEstadosCuotas([cuotas[0]], pagos, "2026-08-10");
    expect(cuotasActualizadas[0].estado).toBe("PAGADA");

    const saldo = calcularSaldo(prestamo, pagos);
    expect(saldo.pagado).toBe(50);
    expect(saldo.saldo).toBe(1150);

    const estadoPrestamo = calcularEstadoPrestamo(prestamo, cuotasActualizadas);
    expect(estadoPrestamo).toBe("PAGADO"); // Ya que todas sus cuotas (Q001) estan pagadas
  });
});
