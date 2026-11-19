import { createHash, createHmac, scryptSync, timingSafeEqual } from "crypto";
import { ApiError } from "@/lib/errors";
import type { Usuario } from "@/types/domain";
import { cookies } from "next/headers";

type SessionPayload = {
  id_usuario: string;
  usuario: string;
  rol: string;
  iat: number;
  exp: number;
};

const SESSION_COOKIE = "prestap_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 horas

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 16) {
    throw new ApiError(
      500,
      "Falta configurar AUTH_SECRET en .env.local con al menos 16 caracteres",
    );
  }

  return secret;
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function safeEqualString(left: string, right: string) {
  return (
    Buffer.byteLength(left) === Buffer.byteLength(right) &&
    timingSafeEqual(Buffer.from(left), Buffer.from(right))
  );
}

export function hashPassword(password: string, salt: string) {
  // Usando scrypt (A4)
  return scryptSync(password, salt, 64).toString("hex");
}

function legacyHashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

// Pbkdf2Sync legacy helper (para usuarios que ya estaban con el algoritmo anterior)
import { pbkdf2Sync } from "crypto";
function legacyPbkdf2Hash(password: string, salt: string) {
  return pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
}

function verificarPassword(usuario: Usuario, password: string) {
  if (usuario.password_hash && usuario.password_salt) {
    // Intentar scrypt primero
    if (safeEqualString(hashPassword(password, usuario.password_salt), usuario.password_hash)) {
      return true;
    }
    // Intentar pbkdf2 (legacy fallback if they were already created)
    if (safeEqualString(legacyPbkdf2Hash(password, usuario.password_salt), usuario.password_hash)) {
      return true;
    }
  }

  if (usuario.password_hash && !usuario.password_salt) {
    // SHA256 legacy
    return safeEqualString(legacyHashPassword(password), usuario.password_hash);
  }

  // Plaintext (extremadamente inseguro, debería migrarse)
  return safeEqualString(usuario.password, password);
}

export function validarCredenciales(
  usuarios: Usuario[],
  input: { usuario?: unknown; correo?: unknown; password?: unknown },
) {
  const identifier = String(input.usuario ?? input.correo ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");

  if (!identifier) throw new ApiError(400, "El usuario o correo es obligatorio");
  if (!password) throw new ApiError(400, "La contrasena es obligatoria");

  // C1: Fallback eliminado. Ya no se permite login mágico.
  if (usuarios.length === 0) {
    throw new ApiError(
      401,
      "Hoja de usuarios vacía. Contacte al administrador para crear el usuario inicial.",
    );
  }

  const usuario = usuarios.find((item) => {
    const byUser = item.usuario.toLowerCase() === identifier;
    const byEmail = item.correo.toLowerCase() === identifier;
    return byUser || byEmail;
  });

  if (!usuario) throw new ApiError(401, "Credenciales incorrectas");
  if (usuario.estado && usuario.estado.toUpperCase() !== "ACTIVO") {
    throw new ApiError(403, "El usuario no esta activo");
  }
  if (!verificarPassword(usuario, password)) {
    throw new ApiError(401, "Credenciales incorrectas");
  }

  return {
    id_usuario: usuario.id_usuario,
    usuario: usuario.usuario,
    correo: usuario.correo,
    rol: usuario.rol,
  };
}

export function crearSessionCookie(payload: Omit<SessionPayload, "iat" | "exp">) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + SESSION_MAX_AGE;
  
  // A2: Incluyendo iat y exp en el payload
  const fullPayload: SessionPayload = { ...payload, iat, exp };
  
  const body = base64Url(JSON.stringify(fullPayload));
  const signature = sign(body);

  return {
    name: SESSION_COOKIE,
    value: `${body}.${signature}`,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  };
}

export function verificarSessionCookie(value?: string): SessionPayload | null {
  if (!value) return null;

  const [body, signature] = value.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const isValid =
    Buffer.byteLength(signature) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!isValid) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    
    // A2: Validación real de expiración
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Sesión expirada
    }
    
    return payload;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const cookieStore = await cookies();
  const session = verificarSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session) {
    throw new ApiError(401, "No autenticado");
  }

  return session;
}

export async function requireRole(rolesPermitidos: string[]) {
  const session = await requireSession();
  if (!rolesPermitidos.includes(session.rol.toUpperCase())) {
    throw new ApiError(403, "A9: No tienes permisos para realizar esta accion");
  }
  return session;
}

export { SESSION_COOKIE };
