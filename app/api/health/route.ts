export async function GET() {
  return Response.json({
    ok: true,
    name: "Prestap Frontend v1",
    mode: "browser-storage",
    database: "none (localStorage)",
    target: "vercel",
    timestamp: new Date().toISOString(),
  });
}
