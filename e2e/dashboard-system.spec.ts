import { test, expect } from "@playwright/test";

// Cookie firmada válida generada con AUTH_SECRET
const VALID_ADMIN_COOKIE = "eyJpZF91c3VhcmlvIjoiVV9BRE1JTjAxIiwidXN1YXJpbyI6ImFkbWluMDEiLCJyb2wiOiJBRE1JTiIsImlhdCI6MTc4OTA2NzE4MSwiZXhwIjoxNzkxNjU5MTgxfQ.i8q1vj2FW6AGs9js6rRYs_K7mE3jCWcgazum-1q2QaQ";

test.describe("Frontend: Verificación Integral del Sistema Prestap", () => {
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

  test("1. Dashboard principal: Carga métricas y accesos rápidos", async ({ page }) => {
    await page.route(/\/api\/dashboard/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            total_clientes: 12,
            prestamos_activos: 5,
            total_colocado: 15000,
            total_cobrado: 4500,
            saldo_pendiente: 10500,
            morosidad_monto: 300,
            cuotas_vencidas: 2,
            clientes_morosos: 1,
            prestamos_vencidos: 1,
          },
        }),
      });
    });

    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText(/Hola,/i);

    // Verificar botones de acceso rápido
    await expect(page.getByRole("link", { name: /\+ Nuevo Cliente/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /\+ Crear Préstamo/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /\+ Usuarios/i })).toBeVisible();

    // Abrir Sidebar
    const menuBtn = page.getByRole("button", { name: /Abrir menú de navegación/i });
    await menuBtn.click();
    const sidebar = page.getByRole("dialog", { name: /Navegación lateral/i });
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Clientes" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Préstamos" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Pagos" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Reportes" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Usuarios" })).toBeVisible();

    // Cerrar sidebar
    await page.getByRole("button", { name: /Cerrar menú/i }).click();
  });

  test("2. Directorio de Clientes: Búsqueda, listado y modal accesible", async ({ page }) => {
    await page.route(/\/api\/clientes/, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id_cliente: "C_001",
                dni: "12345678",
                nombres_apellidos: "María Flores Quispe",
                nombre_negocio: "Bodega María",
                celular: "987654321",
                direccion_puesto: "Puesto 12 Mercado Central",
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/dashboard/clientes");
    await expect(page.locator("h1")).toContainText("Directorio de Clientes");

    // Verificar tabla y buscador
    await expect(page.locator("#search-clientes")).toBeVisible();
    await expect(page.locator("table")).toContainText("María Flores Quispe");
    await expect(page.locator("table")).toContainText("12345678");

    // Abrir Modal de Nuevo Cliente
    await page.getByRole("button", { name: /\+ Nuevo Cliente/i }).click();
    const modal = page.locator("dialog[open]");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Nuevo Cliente");

    // Verificar campos del formulario y validación
    await modal.getByRole("button", { name: /Guardar Cliente/i }).click();
    await expect(modal.locator("#form-dni-error")).toContainText("8 dígitos");

    // Cerrar modal
    await modal.getByRole("button", { name: /Cancelar/i }).click();
  });

  test("3. Gestión de Préstamos: Simulador de cuotas y modal", async ({ page }) => {
    await page.route(/\/api\/prestamos/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id_prestamo: "P_001",
              id_cliente: "C_001",
              monto: 1000,
              interes: 20,
              total_pagar: 1200,
              dias: 24,
              cuota_diaria: 50,
              estado: "ACTIVO",
              cliente: { nombres_apellidos: "María Flores", dni: "12345678" },
              saldo: { saldo: 800, pagado: 400 },
            },
          ],
        }),
      });
    });

    await page.route(/\/api\/clientes/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [{ id_cliente: "C_001", nombres_apellidos: "María Flores", dni: "12345678" }],
        }),
      });
    });

    await page.goto("/dashboard/prestamos");
    await expect(page.locator("h1")).toContainText("Gestión de Préstamos");
    await expect(page.locator("#search-prestamos")).toBeVisible();

    // Abrir Modal Crear Préstamo
    await page.getByRole("button", { name: /\+ Nuevo Préstamo/i }).click();
    const modal = page.locator("dialog[open]");
    await expect(modal).toBeVisible();

    // Comprobar simulador de cuotas en tiempo real
    await modal.locator("#prestamo-monto").fill("2000");
    await modal.locator("#prestamo-interes").fill("15");
    await modal.locator("#prestamo-dias").fill("20");

    // Simulador: 2000 + 15% = 2300, cuota = 115
    await expect(modal).toContainText("S/ 2,300.00");
    await expect(modal).toContainText("S/ 115.00");

    await modal.getByRole("button", { name: /Cancelar/i }).click();
  });

  test("4. Historial de Cobranzas: Buscador, KPI de recaudación y modal de cobro", async ({ page }) => {
    await page.route(/\/api\/pagos/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id_pago: "PG_001",
              id_prestamo: "P_001",
              numero_cuota: 1,
              monto_pagado: 50,
              fecha_pago: "2026-09-10",
              cliente: { nombres_apellidos: "María Flores", nombre_negocio: "Bodega" },
            },
          ],
        }),
      });
    });

    await page.goto("/dashboard/pagos");
    await expect(page.locator("h1")).toContainText("Historial de Cobranzas");
    await expect(page.locator("#search-pagos")).toBeVisible();
    await expect(page.locator("text=Recaudación Filtrada")).toBeVisible();
    await expect(page.locator("table")).toContainText("Cuota #1");
  });

  test("5. Reportes Financieros: Pestañas de Cartera, Cobros y Morosos con Exportación", async ({ page }) => {
    await page.route(/\/api\/reportes\/prestamos/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id_prestamo: "P_001",
              cliente: "María Flores",
              negocio: "Bodega",
              monto: 1000,
              interes: 20,
              monto_interes: 200,
              total: 1200,
              pagado: 200,
              saldo: 1000,
              estado: "ACTIVO",
            },
          ],
        }),
      });
    });

    await page.route(/\/api\/reportes\/morosos/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
        }),
      });
    });

    await page.goto("/dashboard/reportes");
    await expect(page.locator("h1")).toContainText("Reportes Financieros");

    // Verificar pestañas accesibles
    const tabMorosos = page.getByRole("tab", { name: /Gestión de Morosidad/i });
    await expect(tabMorosos).toBeVisible();
    await tabMorosos.click();
    // Verifica que el panel de morosos cargue ya sea la tabla de morosos o el mensaje vacío
    await expect(page.locator("#tabpanel-morosos")).toBeVisible();

    // Botón exportar CSV e Imprimir
    await expect(page.getByRole("button", { name: /Exportar Excel/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Imprimir/i })).toBeVisible();
  });
});
