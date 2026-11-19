import { crearSessionCookie, validarCredenciales } from "@/lib/auth";
import { ApiError, jsonError } from "@/lib/errors";
import { getUsuarios } from "@/lib/repository";
import { NextResponse } from "next/server";

// A3: Limitador de tasa en memoria básico para el MVP
const rateLimitMap = new Map<string, { count: number; lastAttempt: number }>();

function checkRateLimit(ip: string) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (record) {
    if (now - record.lastAttempt > 60000) {
      rateLimitMap.set(ip, { count: 1, lastAttempt: now });
    } else {
      if (record.count >= 5) {
        throw new ApiError(429, "A3: Demasiados intentos. Espera 1 minuto.");
      }
      record.count++;
      record.lastAttempt = now;
    }
  } else {
    rateLimitMap.set(ip, { count: 1, lastAttempt: now });
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    checkRateLimit(ip);

    const input = await request.json();
    const usuarios = await getUsuarios();
    const usuario = validarCredenciales(usuarios, input);
    
    // Reset rate limit on successful login
    rateLimitMap.delete(ip);

    const session = crearSessionCookie({
      id_usuario: usuario.id_usuario,
      usuario: usuario.usuario,
      rol: usuario.rol,
    });

    const response = NextResponse.json({ success: true, data: usuario }, { status: 200 });
    response.cookies.set(session.name, session.value, session.options);

    return response;
  } catch (error) {
    return jsonError(error);
  }
}
