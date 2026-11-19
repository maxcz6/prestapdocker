import { test, expect } from "@playwright/test";

test.describe("Frontend: Flujo de Autenticación, Landing y Navegación", () => {
  test("1. Landing page redirige o muestra acceso a login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator("h1")).toContainText("Prestap");
  });

  test("2. Pantalla de login: validación de campos vacíos en cliente", async ({ page }) => {
    await page.goto("/login");

    const submitBtn = page.getByRole("button", { name: /Ingresar al Sistema/i });
    await submitBtn.click();

    // Buscar la alerta de error del formulario (filtrando por texto para no colisionar con route-announcer)
    const alertBox = page.locator("form div[role='alert']");
    await expect(alertBox).toBeVisible();
    await expect(alertBox).toContainText("Por favor, ingrese usuario y contraseña");
  });

  test("3. Pantalla de login: rechazo con credenciales inválidas", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#usuario").fill("usuario_inexistente");
    await page.locator("#password").fill("clave_incorrecta_999");
    await page.getByRole("button", { name: /Ingresar al Sistema/i }).click();

    const alertBox = page.locator("form div[role='alert']");
    await expect(alertBox).toBeVisible();
  });

  test("4. ThemeToggle interactivo en login", async ({ page }) => {
    await page.goto("/login");

    const themeBtn = page.getByRole("button", { name: /cambiar a modo/i });
    await expect(themeBtn).toBeVisible();

    const html = page.locator("html");
    const initialClass = (await html.getAttribute("class")) || "";

    await themeBtn.click();
    const newClass = (await html.getAttribute("class")) || "";
    expect(newClass).not.toBe(initialClass);
  });

  test("5. Redirección protegida: /dashboard sin sesión redirige a /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*\/login/);
  });
});
