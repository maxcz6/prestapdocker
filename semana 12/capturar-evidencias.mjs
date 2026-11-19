import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseURL = process.env.PRESTAP_BASE_URL || "https://localhost";
const username = process.env.PRESTAP_QA_USER;
const password = process.env.PRESTAP_QA_PASSWORD;
const outputDir = path.join(__dirname, "evidencias");

if (!username || !password) {
  throw new Error("Define PRESTAP_QA_USER y PRESTAP_QA_PASSWORD en el entorno local.");
}

fs.mkdirSync(outputDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function percentile(values, percentileValue) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(percentileValue * sorted.length) - 1];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1100 },
  });
  const anonymousContext = await browser.newContext({ ignoreHTTPSErrors: true });
  let temporaryUserId;
  const result = {
    fecha: new Date().toISOString(),
    entorno: {
      baseURL,
      navegador: "Chromium (Playwright)",
      ejecucion: "Docker Compose local; HTTPS por Caddy con certificado de CA interna",
    },
    capturas: [],
    pruebas: {},
  };

  try {
    const invalidLoanPayload = {
      id_cliente: "CLIENTE_NO_EXISTENTE",
      monto: -1,
      interes: 10,
      dias: 1,
      fecha_inicio: "2026-11-18",
    };
    const anonymousResponse = await anonymousContext.request.post(`${baseURL}/api/prestamos`, {
      data: invalidLoanPayload,
    });
    result.pruebas.seguridadAnonimo = { esperado: 401, obtenido: anonymousResponse.status() };
    assert(anonymousResponse.status() === 401, "Se esperaba HTTP 401 sin sesión.");

    const page = await adminContext.newPage();
    await page.goto(`${baseURL}/login`, { waitUntil: "networkidle" });
    await page.screenshot({
      path: path.join(outputDir, "01-login.png"),
      fullPage: true,
    });
    result.capturas.push("01-login.png");

    await page.locator("#usuario").fill(username);
    await page.locator("#password").fill(password);
    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/login") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /Ingresar al Sistema/i }).click();
    const loginResponse = await loginResponsePromise;
    assert(loginResponse.status() === 200, `El inicio de sesión respondió HTTP ${loginResponse.status()}.`);
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await page.getByRole("heading", { name: /Hola,/i }).waitFor({ timeout: 15000 });
    await page.screenshot({
      path: path.join(outputDir, "02-dashboard.png"),
      fullPage: true,
    });
    result.capturas.push("02-dashboard.png");

    const temporaryPassword = crypto.randomBytes(24).toString("hex");
    const temporaryUsername = `qa_semana12_${Date.now()}`;
    const createUserResponse = await adminContext.request.post(`${baseURL}/api/usuarios`, {
      data: {
        usuario: temporaryUsername,
        correo: `${temporaryUsername}@example.invalid`,
        password: temporaryPassword,
        rol: "COBRADOR",
        estado: "ACTIVO",
      },
    });
    assert(createUserResponse.status() === 201, "No se pudo crear el usuario temporal de prueba.");
    temporaryUserId = (await createUserResponse.json()).data.id_usuario;
    assert(temporaryUserId, "La API no devolvió el identificador del usuario temporal.");

    const cobradorContext = await browser.newContext({ ignoreHTTPSErrors: true });
    try {
      const cobradorLogin = await cobradorContext.request.post(`${baseURL}/api/auth/login`, {
        data: {
          usuario: temporaryUsername,
          password: temporaryPassword,
        },
      });
      if (cobradorLogin.status() !== 200) {
        throw new Error("El usuario temporal no pudo iniciar sesión.");
      }

      const cobradorLoanResponse = await cobradorContext.request.post(`${baseURL}/api/prestamos`, {
        data: invalidLoanPayload,
      });
      assert(cobradorLoanResponse.status() === 403, "Se esperaba HTTP 403 para COBRADOR en POST /api/prestamos.");
      result.pruebas.seguridadCobrador = {
        esperado: 403,
        obtenido: cobradorLoanResponse.status(),
        rol: "COBRADOR",
      };
    } finally {
      await cobradorContext.close();
    }

    const deleteTemporaryUser = await adminContext.request.delete(
      `${baseURL}/api/usuarios?id_usuario=${encodeURIComponent(temporaryUserId)}`,
    );
    assert(deleteTemporaryUser.status() === 200, "No se pudo limpiar el usuario temporal.");
    temporaryUserId = undefined;
    result.pruebas.limpiezaUsuarioTemporal = "completada; sin datos de prueba persistentes";

    const invalidLoanResponse = await adminContext.request.post(`${baseURL}/api/prestamos`, {
      data: invalidLoanPayload,
    });
    const invalidLoanBody = await invalidLoanResponse.json();
    assert(
      invalidLoanResponse.status() === 400 &&
        invalidLoanBody.success === false &&
        typeof invalidLoanBody.error === "string",
      "La solicitud inválida no recibió un error JSON controlado con HTTP 400.",
    );
    result.pruebas.seguridadAdmin = {
      esperado: 400,
      obtenido: invalidLoanResponse.status(),
      nota: "Pasó autorización ADMIN y llegó a la validación del préstamo",
    };
    result.pruebas.fiabilidadValidacion = {
      esperado: 400,
      obtenido: invalidLoanResponse.status(),
      mensaje: invalidLoanBody.error,
      sinEscritura: true,
    };

    await page.goto(`${baseURL}/dashboard/prestamos`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /Gestión de Préstamos/i }).waitFor({ timeout: 15000 });
    await page.screenshot({
      path: path.join(outputDir, "03-prestamos.png"),
      fullPage: true,
    });
    result.capturas.push("03-prestamos.png");

    const durations = [];
    let requestErrors = 0;
    for (let index = 0; index < 50; index += 1) {
      const started = performance.now();
      try {
        const response = await adminContext.request.get(`${baseURL}/api/prestamos`);
        durations.push(performance.now() - started);
        if (response.status() !== 200) requestErrors += 1;
      } catch {
        durations.push(performance.now() - started);
        requestErrors += 1;
      }
    }

    const healthResponse = await adminContext.request.get(`${baseURL}/api/health`);
    const healthBody = await healthResponse.json();
    const p95Ms = percentile(durations, 0.95);
    result.pruebas.rendimiento = {
      endpoint: "GET /api/prestamos (sesión ADMIN)",
      solicitudes: durations.length,
      errores: requestErrors,
      promedioMs: Number((durations.reduce((sum, duration) => sum + duration, 0) / durations.length).toFixed(2)),
      p50Ms: Number(percentile(durations, 0.5).toFixed(2)),
      p95Ms: Number(p95Ms.toFixed(2)),
      maximoMs: Number(Math.max(...durations).toFixed(2)),
      criterio: "50 solicitudes, HTTP 200, 0 errores, P95 <= 500 ms",
      cumple: requestErrors === 0 && p95Ms <= 500,
    };
    assert(healthResponse.status() === 200 && healthBody.data?.ok === true, "La base de datos no pasó el healthcheck.");
    result.pruebas.salud = {
      esperado: "HTTP 200, ok=true, PostgreSQL local",
      obtenido: `HTTP ${healthResponse.status()}, ok=${healthBody.data.ok}, db=${healthBody.data.db}`,
    };
    assert(result.pruebas.rendimiento.cumple, "La prueba de rendimiento no alcanzó el criterio declarado.");

    const headers = await healthResponse.headers();
    const requiredHeaders = [
      "strict-transport-security",
      "x-content-type-options",
      "x-frame-options",
      "referrer-policy",
      "permissions-policy",
    ];
    result.pruebas.cabecerasSeguridad = Object.fromEntries(
      requiredHeaders.map((name) => [name, Boolean(headers[name])]),
    );
    assert(requiredHeaders.every((name) => headers[name]), "Faltan cabeceras de seguridad en HTTPS.");

    const unitTestLog = fs.readFileSync(path.join(outputDir, "pruebas-unitarias.txt"), "utf8");
    const unitTestSummary = unitTestLog.match(/Tests\s+(\d+)\s+passed/);
    assert(unitTestSummary, "No se encontró el resumen aprobado de pruebas unitarias.");
    result.pruebas.mantenibilidad = {
      archivo: "tests/business.test.ts",
      pruebasAprobadas: Number(unitTestSummary[1]),
    };

    const evidenceRows = [
      {
        name: "Mantenibilidad",
        score: 3,
        detail: `${result.pruebas.mantenibilidad.pruebasAprobadas} pruebas unitarias aprobadas`,
      },
      {
        name: "Fiabilidad",
        score: 2,
        detail: `Entrada inválida: HTTP ${invalidLoanResponse.status()}; caída de PostgreSQL no simulada`,
      },
      {
        name: "Eficiencia de desempeño",
        score: 3,
        detail: `${result.pruebas.rendimiento.solicitudes}/50 HTTP 200 · P95 ${result.pruebas.rendimiento.p95Ms} ms`,
      },
      {
        name: "Seguridad",
        score: 3,
        detail: `Anónimo ${result.pruebas.seguridadAnonimo.obtenido} · COBRADOR ${result.pruebas.seguridadCobrador.obtenido} · ADMIN llega a validación`,
      },
    ];
    await page.setContent(
      `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
        *{box-sizing:border-box}body{margin:0;background:#f1f5fb;color:#14243b;font:16px/1.5 Arial,sans-serif}
        main{max-width:1180px;margin:48px auto;padding:36px;background:#fff;border:1px solid #dce5f1;border-radius:24px}
        h1{margin:0;font-size:34px}p{color:#60718a;margin:8px 0 28px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        article{padding:24px;border:1px solid #dce5f1;border-radius:18px;background:#fbfdff}
        h2{margin:0 0 10px;font-size:20px}.score{color:#176b45;font-weight:700}
        .detail{font-size:17px;color:#243750}
        footer{margin-top:24px;color:#60718a;font-size:14px}
      </style></head><body><main>
        <h1>PRESTAP · Semana 12</h1>
        <p>Evaluación del backend de préstamos · Docker local · Playwright / Chromium · ${escapeHtml(result.fecha)}</p>
        <section class="grid">${evidenceRows
          .map(
            (row) =>
              `<article><h2>${escapeHtml(row.name)} <span class="score">${row.score}/3</span></h2><div class="detail">${escapeHtml(row.detail)}</div></article>`,
          )
          .join("")}</section>
        <footer>Resultados obtenidos en staging local. El usuario temporal de prueba fue eliminado. La puntuación de fiabilidad refleja que no se simuló la caída de PostgreSQL.</footer>
      </main></body></html>`,
      { waitUntil: "load" },
    );
    await page.screenshot({
      path: path.join(outputDir, "04-matriz-calidad.png"),
      fullPage: true,
    });
    result.capturas.push("04-matriz-calidad.png");

    fs.writeFileSync(
      path.join(outputDir, "resultados.json"),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8",
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (temporaryUserId) {
      const cleanup = await adminContext.request.delete(
        `${baseURL}/api/usuarios?id_usuario=${encodeURIComponent(temporaryUserId)}`,
      );
      if (cleanup.status() !== 200) {
        console.error(`No se pudo limpiar el usuario temporal: HTTP ${cleanup.status()}.`);
      }
    }
    await anonymousContext.close();
    await adminContext.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
