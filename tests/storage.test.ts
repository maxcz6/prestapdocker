import { describe, it, expect, beforeEach } from "vitest";
import { localApi, storage } from "../lib/storage";

describe("Almacenamiento Local en Navegador (v1 - Frontend Only)", () => {
  beforeEach(() => {
    storage.resetToDemo();
  });

  it("1. Inicializa con datos semilla demostrativos", async () => {
    const clientes = await localApi.clientes.list();
    const prestamos = await localApi.prestamos.list();
    const usuarios = await localApi.usuarios.list();

    expect(clientes.length).toBeGreaterThanOrEqual(4);
    expect(prestamos.length).toBeGreaterThanOrEqual(3);
    expect(usuarios.some((u) => u.usuario === "admin")).toBe(true);
  });

  it("2. Realiza CRUD completo de Clientes", async () => {
    // Create
    const nuevo = await localApi.clientes.create({
      dni: "77889900",
      nombres_apellidos: "Cliente Nuevo Test",
      nombre_negocio: "Puesto de Frutas Test",
      celular: "999888777",
      direccion_puesto: "Pasaje Los Álamos 123",
    });
    expect(nuevo.dni).toBe("77889900");

    // Read
    const lista = await localApi.clientes.list();
    expect(lista.some((c) => c.dni === "77889900")).toBe(true);

    // Update
    const actualizado = await localApi.clientes.update({
      id_cliente: nuevo.id_cliente,
      nombre_negocio: "Puesto de Frutas Renovado",
    });
    expect(actualizado.nombre_negocio).toBe("Puesto de Frutas Renovado");

    // Delete
    const del = await localApi.clientes.delete(nuevo.id_cliente);
    expect(del.eliminado).toBe(true);

    const listaFinal = await localApi.clientes.list();
    expect(listaFinal.some((c) => c.id_cliente === nuevo.id_cliente)).toBe(false);
  });

  it("3. Emite un préstamo con simulador y genera cuotas correlativas", async () => {
    const clientes = await localApi.clientes.list();
    const primerCliente = clientes[0];

    const result = await localApi.prestamos.create({
      id_cliente: primerCliente.id_cliente,
      monto: 1000,
      interes: 20,
      dias: 20,
      fecha_inicio: "2026-11-20",
    });

    expect(result.prestamo.monto).toBe(1000);
    expect(result.prestamo.total_pagar).toBe(1200);
    expect(result.prestamo.cuota_diaria).toBe(60);
    expect(result.cuotas.length).toBe(20);

    // Consultar cuotas del préstamo
    const cuotas = await localApi.cuotas.listByPrestamo(result.prestamo.id_prestamo);
    expect(cuotas.length).toBe(20);
    expect(cuotas[0].monto).toBe(60);
  });

  it("4. Registra cobranza de cuota y actualiza saldos", async () => {
    const prestamos = await localApi.prestamos.list();
    const prestamoActivo = prestamos.find((p) => p.estado === "ACTIVO" && (p.saldo?.saldo || 0) > 0);
    expect(prestamoActivo).toBeDefined();

    const cuotas = await localApi.cuotas.listByPrestamo(prestamoActivo!.id_prestamo);
    const cuotaPendiente = cuotas.find((c) => c.estado === "PENDIENTE" || c.estado === "VENCIDA");
    expect(cuotaPendiente).toBeDefined();

    const pagoResult = await localApi.pagos.create({
      id_prestamo: prestamoActivo!.id_prestamo,
      id_cuota: cuotaPendiente!.id_cuota,
      monto_pagado: cuotaPendiente!.monto,
      observacion: "Pago verificado en test",
    });

    expect(pagoResult.pago.monto_pagado).toBe(cuotaPendiente!.monto);
    expect(pagoResult.cuota.estado).toBe("PAGADA");
  });

  it("5. Calcula KPIs correctos en el Dashboard", async () => {
    const kpis = await localApi.dashboard.get();
    expect(kpis.clientes).toBeGreaterThan(0);
    expect(kpis.prestamos).toBeGreaterThan(0);
    expect(kpis.prestado).toBeGreaterThan(0);
    expect(kpis.total_cartera).toBeGreaterThanOrEqual(kpis.prestado);
  });

  it("6. Autenticación y control de sesión en navegador", async () => {
    const login = await localApi.auth.login("admin", "admin");
    expect(login.usuario).toBe("admin");
    expect(login.rol).toBe("ADMIN");

    const session = await localApi.auth.me();
    expect(session.authenticated).toBe(true);
    expect(session.session?.usuario).toBe("admin");

    await localApi.auth.logout();
    const sessionPostLogout = await localApi.auth.me();
    expect(sessionPostLogout.authenticated).toBe(false);
  });
});
