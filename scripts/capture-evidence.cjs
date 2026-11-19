const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function capture() {
  const outputDir = path.join(__dirname, '..', 'docs', 'evidencias');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('1. Capturing login screen (http://localhost:8080/login)...');
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '01_login_staging_8080.png') });

  console.log('2. Authenticating as admin01...');
  await page.fill('#usuario', 'admin01');
  await page.fill('#password', 'admin01');
  await page.click('button[type="submit"]');

  console.log('3. Waiting for dashboard navigation...');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, '02_dashboard_principal.png') });

  console.log('4. Capturing prestamos screen...');
  await page.goto('http://localhost:8080/dashboard/prestamos', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, '03_modulo_prestamos.png') });

  console.log('5. Capturing clientes screen...');
  await page.goto('http://localhost:8080/dashboard/clientes', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, '04_modulo_clientes.png') });

  console.log('6. Capturing reportes screen...');
  await page.goto('http://localhost:8080/dashboard/reportes', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, '05_modulo_reportes.png') });

  await browser.close();
  console.log('All evidence screenshots captured successfully in docs/evidencias/!');
}

capture().catch((err) => {
  console.error('Error capturing evidence:', err);
  process.exit(1);
});
