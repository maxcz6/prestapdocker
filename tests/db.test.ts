import { describe, it, expect } from "vitest";
import {
  leerTabla,
  insertarFila,
  actualizarFila,
  eliminarFila,
  crearPrestamoConCuotasAtomic,
  registrarPagoAtomic,
} from "../lib/db";
import { hashPassword } from "../lib/auth";

describe("Local Database Tests (100% Offline / Docker Local)", () => {
  const testSuffix = Date.now().toString().slice(-4);
  const testUserId = `U_TEST_${testSuffix}`;
  const testClienteId = `C_TEST_${testSuffix}`;
  const testPrestamoId = `P_TEST_${testSuffix}`;
  const testCuotaId = `Q_TEST_${testSuffix}`;
  const testPagoId = `PG_TEST_${testSuffix}`;

  it("1. Debe insertar, consultar, actualizar y eliminar un usuario en la base de datos local", async () => {
    const salt = "salt_test_123";
    const hash = hashPassword("password123", salt);

    // Insertar
    const ins = await insertarFila("usuarios", {
      id_usuario: testUserId,
      usuario: `test_user_${testSuffix}`,
      correo: `test_${testSuffix}@example.com`,
      password_hash: hash,
      password_salt: salt,
      rol: "ADMIN",
      estado: "ACTIVO",
    });
    expect(ins.success).toBe(true);

    // Leer
    const usuarios = await leerTabla<Record<string, unknown>>("usuarios");
    const u = usuarios.find((item) => item.id_usuario === testUserId);
    expect(u).toBeDefined();
    expect(u?.usuario).toBe(`test_user_${testSuffix}`);

    // Actualizar
    const upd = await actualizarFila("usuarios", testUserId, {
      rol: "SUPERVISOR",
    });
    expect(upd.success).toBe(true);

    // Eliminar
    const del = await eliminarFila("usuarios", testUserId);
    expect(del.success).toBe(true);
  });

  it("2. Debe crear un flujo completo: Cliente -> Préstamo con Cuotas -> Registrar Pago -> Limpieza", async () => {
    // 1. Crear Cliente
    const clienteRes = await insertarFila("clientes", {
      id_cliente: testClienteId,
      dni: `9999${testSuffix}`,
      nombres_apellidos: `Cliente Test ${testSuffix}`,
      nombre_negocio: "Puesto Test",
      celular: "999888777",
      direccion_puesto: "Pasaje 1, Puesto 10",
    });
    expect(clienteRes.success).toBe(true);

    // 2. Crear Préstamo Atómico con 1 Cuota
    const cuota = {
      id_cuota: testCuotaId,
      id_prestamo: testPrestamoId,
      numero_cuota: 1,
      fecha_vencimiento: "2026-09-20",
      monto: 100,
      estado: "PENDIENTE",
    };

    const prestamoRes = await crearPrestamoConCuotasAtomic(
      "prestamos",
      "cuotas",
      {
        id_prestamo: testPrestamoId,
        id_cliente: testClienteId,
        monto: 100,
        interes: 10,
        monto_interes: 10,
        total_pagar: 110,
        dias: 1,
        cuota_diaria: 110,
        fecha_inicio: "2026-09-19",
        fecha_fin: "2026-09-20",
        estado: "ACTIVO",
      },
      [cuota],
    );
    expect(prestamoRes.success).toBe(true);

    // 3. Registrar Pago Atómico
    const pagoRes = await registrarPagoAtomic(
      "pagos",
      "cuotas",
      "prestamos",
      {
        id_pago: testPagoId,
        id_prestamo: testPrestamoId,
        id_cuota: testCuotaId,
        numero_cuota: 1,
        fecha_pago: "2026-09-19",
        monto_pagado: 100,
        observacion: "Pago test",
        id_usuario: "U_ADMIN01",
      },
      testCuotaId,
      testPrestamoId,
      "PAGADO",
    );
    expect(pagoRes.success).toBe(true);

    // 4. Limpieza
    await eliminarFila("pagos", testPagoId);
    await eliminarFila("cuotas", testCuotaId);
    await eliminarFila("prestamos", testPrestamoId);
    await eliminarFila("clientes", testClienteId);
  });
});
