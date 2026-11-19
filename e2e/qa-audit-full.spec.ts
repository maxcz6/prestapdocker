import { test, expect } from "@playwright/test";

const VALID_ADMIN_COOKIE = "eyJpZF91c3VhcmlvIjoiVV9BRE1JTjAxIiwidXN1YXJpbyI6ImFkbWluMDEiLCJyb2wiOiJBRE1JTiIsImlhdCI6MTc4OTA2NzE4MSwiZXhwIjoxNzkxNjU5MTgxfQ.i8q1vj2FW6AGs9js6rRYs_K7mE3jCWcgazum-1q2QaQ";

test.describe("Auditoría de QA Integral: Prestap Frontend", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: "prestap_session",
        value: VALID_ADMIN_COOKIE,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
      },
    ]);
  });

  test("QA-01: Dashboard - Carga completa de KPIs, flujo operativo y accesibilidad de enlaces", async ({ page }) => {
    await page.route(/\/api\/dashboard/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            clientes: 15,
            prestamos: 8,
            prestado: 25000,
            total_cartera: 30000,
            cobrado: 12000,
            saldo: 18000,
            cuotas_vencidas: 3,
            monto_vencido: 450,
            morosos: 2,
          },
        }),
      });
    });

    await page.goto("/dashboard");

    await expect(page.locator("h1")).toContainText(/Hola,/i);
    await expect(page.locator("text=Total Clientes")).toBeVisible();
    await expect(page.locator("text=15")).toBeVisible();
    await expect(page.locator("text=Capital Prestado")).toBeVisible();
    await expect(page.locator("text=S/ 25,000.00")).toBeVisible();
    await expect(page.locator("text=Total Cartera (c/ Interés)")).toBeVisible();
    await expect(page.locator("text=S/ 30,000.00")).toBeVisible();
    await expect(page.locator("text=Monto Cobrado")).toBeVisible();
    await expect(page.locator("text=S/ 12,000.00")).toBeVisible();
    await expect(page.locator("text=Saldo por Cobrar")).toBeVisible();
    await expect(page.locator("text=S/ 18,000.00")).toBeVisible();

    await expect(page.locator("text=Flujo Operativo de Microcréditos")).toBeVisible();
    await expect(page.getByRole("link", { name: /1.*Registrar Cliente/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /2.*Emitir Préstamo/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /3.*Cobrar Cuotas Diarias/i })).toBeVisible();
  });

  test("QA-02: Clientes - Validación de campos, búsqueda por negocio y robustez ante nulos", async ({ page }) => {
    const mockClientes = [
      {
        id_cliente: "C_001",
        dni: "12345678",
        nombres_apellidos: "Juan Pérez García",
        nombre_negocio: "Abarrotes Don Juan",
        celular: "987654321",
        direccion_puesto: "Puesto 45 Mercado Modelo",
      },
      {
        id_cliente: "C_002",
        dni: "87654321",
        nombres_apellidos: "Rosa Melgar",
        nombre_negocio: "Frutería Rosita",
        celular: "912345678",
        direccion_puesto: null,
      },
    ];

    await page.route(/\/api\/clientes/, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: mockClientes }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/dashboard/clientes");

    await expect(page.locator("table")).toContainText("Juan Pérez García");
    await expect(page.locator("table")).toContainText("Rosa Melgar");

    const searchInput = page.locator("#search-clientes");
    await searchInput.fill("Frutería");
    await expect(page.locator("table")).toContainText("Frutería Rosita");
    await expect(page.locator("table")).not.toContainText("Abarrotes Don Juan");

    await searchInput.fill("");

    await page.getByRole("button", { name: /\+ Nuevo Cliente/i }).click();
    const modal = page.locator("dialog[open]");
    await expect(modal).toBeVisible();

    await modal.getByRole("button", { name: /Guardar Cliente/i }).click();
    await expect(modal.locator("#form-dni-error")).toBeVisible();
    await expect(modal.locator("#form-nombre-error")).toBeVisible();
    await expect(modal.locator("#form-negocio-error")).toBeVisible();
    await expect(modal.locator("#form-celular-error")).toBeVisible();

    await modal.getByRole("button", { name: /Cancelar/i }).click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });

  test("QA-03: Préstamos - Búsqueda por negocio, filtro de estado y cálculo de cuotas en vivo", async ({ page }) => {
    const mockPrestamos = [
      {
        id_prestamo: "P_001",
        id_cliente: "C_001",
        monto: 1000,
        interes: 20,
        total_pagar: 1200,
        dias: 24,
        cuota_diaria: 50,
        estado: "ACTIVO",
        cliente: { nombres_apellidos: "Juan Pérez", dni: "12345678", nombre_negocio: "Abarrotes Don Juan" },
        saldo: { saldo: 600, pagado: 600 },
      },
      {
        id_prestamo: "P_002",
        id_cliente: "C_002",
        monto: 2000,
        interes: 15,
        total_pagar: 2300,
        dias: 30,
        cuota_diaria: 76.67,
        estado: "VENCIDO",
        cliente: { nombres_apellidos: "Rosa Melgar", dni: "87654321", nombre_negocio: "Frutería Rosita" },
        saldo: { saldo: 2300, pagado: 0 },
      },
    ];

    await page.route(/\/api\/prestamos/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: mockPrestamos }),
      });
    });

    await page.route(/\/api\/clientes/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [{ id_cliente: "C_001", nombres_apellidos: "Juan Pérez", dni: "12345678", nombre_negocio: "Abarrotes Don Juan" }],
        }),
      });
    });

    await page.goto("/dashboard/prestamos");
    await expect(page.locator("table")).toContainText("Juan Pérez");

    const searchInput = page.locator("#search-prestamos");
    await searchInput.fill("Frutería");
    await expect(page.locator("table")).toContainText("Rosa Melgar");
    await expect(page.locator("table")).not.toContainText("Juan Pérez");

    await searchInput.fill("");

    const estadoSelect = page.locator("select[aria-label='Filtrar por estado']");
    await estadoSelect.selectOption("VENCIDO");
    await expect(page.locator("table")).toContainText("Rosa Melgar");
    await expect(page.locator("table")).not.toContainText("Juan Pérez");

    await estadoSelect.selectOption("TODOS");

    await page.getByRole("button", { name: /\+ Nuevo Préstamo/i }).click();
    const modal = page.locator("dialog[open]");
    await expect(modal).toBeVisible();

    await modal.locator("#prestamo-monto").fill("3000");
    await modal.locator("#prestamo-interes").fill("10");
    await modal.locator("#prestamo-dias").fill("30");

    await expect(modal).toContainText("S/ 3,300.00");
    await expect(modal).toContainText("S/ 110.00");

    await modal.getByRole("button", { name: /Cancelar/i }).click();
  });

  test("QA-04: Detalle de Préstamo - Consulta de cronograma de cuotas y modal de pago", async ({ page }) => {
    const mockPrestamo = {
      id_prestamo: "P_001",
      id_cliente: "C_001",
      monto: 1000,
      interes: 20,
      monto_interes: 200,
      total_pagar: 1200,
      dias: 2,
      cuota_diaria: 600,
      fecha_inicio: "2026-09-01",
      fecha_fin: "2026-09-02",
      estado: "ACTIVO",
      cliente: { nombres_apellidos: "Juan Pérez", nombre_negocio: "Abarrotes Don Juan", dni: "12345678" },
      saldo: { total: 1200, pagado: 600, saldo: 600 },
    };

    const mockCuotas = [
      {
        id_cuota: "Q_001",
        id_prestamo: "P_001",
        numero_cuota: 1,
        fecha_vencimiento: "2026-09-01",
        monto: 600,
        estado: "PAGADA",
      },
      {
        id_cuota: "Q_002",
        id_prestamo: "P_001",
        numero_cuota: 2,
        fecha_vencimiento: "2026-09-02",
        monto: 600,
        estado: "PENDIENTE",
      },
    ];

    await page.route(/\/api\/prestamos/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [mockPrestamo] }),
      });
    });

    await page.route(/\/api\/cuotas/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: mockCuotas }),
      });
    });

    await page.goto("/dashboard/prestamos/P_001");

    await expect(page.locator("h1")).toContainText("Préstamo P_001");
    await expect(page.locator("text=50% completado")).toBeVisible();
    await expect(page.locator("text=1 de 2 cuotas")).toBeVisible();

    await expect(page.locator("tr:has-text('#1')")).toContainText("Pagada");

    const payBtn = page.getByRole("button", { name: /Registrar cobro de cuota 2/i });
    await expect(payBtn).toBeVisible();
    await payBtn.click();

    const modal = page.locator("dialog[open]");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Cuota #2");
    await expect(modal.locator("#pago-monto")).toHaveValue("600");

    await modal.getByRole("button", { name: /Cancelar/i }).click();
  });

  test("QA-05: Pagos - Modal de cobro, reset de selecciones y prevención de datos huérfanos", async ({ page }) => {
    const mockPrestamosActivos = [
      {
        id_prestamo: "P_001",
        id_cliente: "C_001",
        monto: 1000,
        total_pagar: 1200,
        estado: "ACTIVO",
        cliente: { nombres_apellidos: "Juan Pérez", nombre_negocio: "Abarrotes" },
        saldo: { saldo: 600, pagado: 600 },
      },
    ];

    const mockCuotas = [
      { id_cuota: "Q_002", id_prestamo: "P_001", numero_cuota: 2, monto: 600, estado: "PENDIENTE", fecha_vencimiento: "2026-09-15" },
    ];

    await page.route(/\/api\/pagos/, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] }),
        });
      }
    });

    await page.route(/\/api\/prestamos/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: mockPrestamosActivos }),
      });
    });

    await page.route(/\/api\/cuotas/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: mockCuotas }),
      });
    });

    await page.goto("/dashboard/pagos");

    await page.getByRole("button", { name: /\+ Registrar Cobro/i }).click();
    const modal = page.locator("dialog[open]");
    await expect(modal).toBeVisible();

    await modal.locator("button:has-text('Juan Pérez')").click();
    await expect(modal.locator("#cobro-monto")).toHaveValue("600");

    await modal.getByRole("button", { name: /Cambiar/i }).click();
    await expect(modal.locator("#search-prestamo-modal")).toBeVisible();

    await modal.getByRole("button", { name: /Cancelar/i }).click();
  });

  test("QA-06: Reportes - Pestañas accesibles y navegación", async ({ page }) => {
    await page.route(/\/api\/reportes\/prestamos/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id_prestamo: "P_001",
              cliente: "Juan Pérez",
              negocio: "Abarrotes",
              monto: 1000,
              interes: 20,
              monto_interes: 200,
              total: 1200,
              pagado: 600,
              saldo: 600,
              estado: "ACTIVO",
            },
          ],
        }),
      });
    });

    await page.route(/\/api\/reportes\/pagos/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              fecha: "2026-09-10",
              cliente: "Juan Pérez",
              negocio: "Abarrotes",
              prestamo: "P_001",
              cuota: 1,
              monto: 600,
              observacion: "Efectivo",
            },
          ],
        }),
      });
    });

    await page.route(/\/api\/reportes\/morosos/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto("/dashboard/reportes");

    await expect(page.locator("table")).toContainText("Juan Pérez");

    await page.getByRole("tab", { name: /Cobros Realizados/i }).click();
    await expect(page.locator("#tabpanel-pagos")).toBeVisible();
    await expect(page.locator("#tabpanel-pagos")).toContainText("Cuota #1");

    await page.getByRole("tab", { name: /Gestión de Morosidad/i }).click();
    await expect(page.locator("#tabpanel-morosos")).toBeVisible();
    await expect(page.locator("text=No hay clientes con cuotas vencidas")).toBeVisible();
  });

  test("QA-07: Usuarios - Control de roles, creación y visibilidad de errores en edición", async ({ page }) => {
    const mockUsuarios = [
      {
        id_usuario: "U_ADMIN01",
        usuario: "admin01",
        correo: "admin@prestap.com",
        rol: "ADMIN",
        estado: "ACTIVO",
      },
      {
        id_usuario: "U_COBR01",
        usuario: "cobrador01",
        correo: "cobrador@prestap.com",
        rol: "COBRADOR",
        estado: "ACTIVO",
      },
    ];

    await page.route(/\/api\/usuarios/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: mockUsuarios }),
      });
    });

    await page.goto("/dashboard/usuarios");

    await expect(page.locator("table")).toContainText("@admin01");
    await expect(page.locator("table")).toContainText("@cobrador01");

    const adminDeleteBtn = page.locator("tr:has-text('@admin01') button[title*='No puedes eliminar tu cuenta']");
    await expect(adminDeleteBtn).toBeDisabled();

    const editBtn = page.locator("tr:has-text('@cobrador01') button[title='Editar Usuario']");
    await editBtn.click();

    const editModal = page.locator("dialog[open]");
    await expect(editModal).toBeVisible();
    await expect(editModal).toContainText("Editar Usuario @cobrador01");

    await editModal.locator("#edit-password").fill("123");
    await editModal.getByRole("button", { name: /Actualizar/i }).click();

    await expect(editModal.locator("#edit-password-error")).toBeVisible();

    await editModal.getByRole("button", { name: /Cancelar/i }).click();
  });
});
