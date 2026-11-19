import { randomBytes } from "crypto";
import { requireRole, hashPassword } from "@/lib/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/errors";
import {
  actualizarFila,
  eliminarFila,
  insertarFila,
} from "@/lib/db";
import { generarId } from "@/lib/ids";
import { getUsuarios } from "@/lib/repository";
import { TABLES } from "@/lib/tables";
import type { Usuario } from "@/types/domain";

const ROLES_VALIDOS = ["ADMIN", "OPERADOR", "SUPERVISOR", "COBRADOR"];
const ESTADOS_VALIDOS = ["ACTIVO", "INACTIVO"];

function sanitizeUser(u: Usuario) {
  return {
    id_usuario: u.id_usuario,
    usuario: u.usuario,
    correo: u.correo,
    rol: u.rol,
    estado: u.estado || "ACTIVO",
    fecha_creacion: u.fecha_creacion,
    fecha_modificacion: u.fecha_modificacion,
  };
}

export async function GET() {
  try {
    await requireRole(["ADMIN"]);
    const usuarios = await getUsuarios();
    return jsonOk(usuarios.map(sanitizeUser));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const input = await request.json();

    const usuario = String(input.usuario ?? "").trim();
    const correo = String(input.correo ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    const rol = String(input.rol ?? "").trim().toUpperCase();
    const estado = String(input.estado ?? "ACTIVO").trim().toUpperCase();

    if (!usuario) throw new ApiError(400, "El nombre de usuario es obligatorio");
    if (!correo) throw new ApiError(400, "El correo electrónico es obligatorio");
    if (!password || password.length < 4) {
      throw new ApiError(400, "La contraseña debe tener al menos 4 caracteres");
    }
    if (!ROLES_VALIDOS.includes(rol)) {
      throw new ApiError(400, `Rol inválido. Debe ser uno de: ${ROLES_VALIDOS.join(", ")}`);
    }
    if (!ESTADOS_VALIDOS.includes(estado)) {
      throw new ApiError(400, `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`);
    }

    const usuarios = await getUsuarios();

    if (usuarios.some((u) => u.usuario.toLowerCase() === usuario.toLowerCase())) {
      throw new ApiError(409, "Ya existe un usuario con ese nombre de usuario");
    }
    if (usuarios.some((u) => u.correo.toLowerCase() === correo.toLowerCase())) {
      throw new ApiError(409, "Ya existe un usuario con ese correo electrónico");
    }

    const salt = randomBytes(16).toString("hex");
    const hash = hashPassword(password, salt);
    const id_usuario = generarId("U", usuarios.map((u) => u.id_usuario));

    const nuevoUsuario = {
      id_usuario,
      usuario,
      correo,
      password_hash: hash,
      password_salt: salt,
      rol,
      estado,
    };

    const write = await insertarFila(TABLES.usuarios, nuevoUsuario);

    return jsonOk(
      {
        id_usuario,
        id: write.id ?? id_usuario,
        usuario,
        correo,
        rol,
        estado,
      },
      201,
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const input = await request.json();
    const idUsuario = String(input.id_usuario ?? input.id ?? "").trim();

    if (!idUsuario) throw new ApiError(400, "Falta id_usuario");

    const usuarios = await getUsuarios();
    const actual = usuarios.find((u) => u.id_usuario === idUsuario);

    if (!actual) throw new ApiError(404, "El usuario no existe");

    const updatePayload: Record<string, unknown> = {};

    if (input.usuario) {
      const usuario = String(input.usuario).trim();
      if (usuarios.some((u) => u.usuario.toLowerCase() === usuario.toLowerCase() && u.id_usuario !== idUsuario)) {
        throw new ApiError(409, "Ya existe otro usuario con ese nombre de usuario");
      }
      updatePayload.usuario = usuario;
    }

    if (input.correo) {
      const correo = String(input.correo).trim().toLowerCase();
      if (usuarios.some((u) => u.correo.toLowerCase() === correo.toLowerCase() && u.id_usuario !== idUsuario)) {
        throw new ApiError(409, "Ya existe otro usuario con ese correo");
      }
      updatePayload.correo = correo;
    }

    if (input.rol) {
      const rol = String(input.rol).trim().toUpperCase();
      if (!ROLES_VALIDOS.includes(rol)) {
        throw new ApiError(400, `Rol inválido. Debe ser uno de: ${ROLES_VALIDOS.join(", ")}`);
      }
      updatePayload.rol = rol;
    }

    if (input.estado) {
      const estado = String(input.estado).trim().toUpperCase();
      if (!ESTADOS_VALIDOS.includes(estado)) {
        throw new ApiError(400, `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`);
      }
      updatePayload.estado = estado;
    }

    if (input.password && String(input.password).length >= 4) {
      const salt = randomBytes(16).toString("hex");
      const hash = hashPassword(String(input.password), salt);
      updatePayload.password_salt = salt;
      updatePayload.password_hash = hash;
    }

    await actualizarFila(TABLES.usuarios, idUsuario, updatePayload);

    return jsonOk({
      id_usuario: idUsuario,
      usuario: updatePayload.usuario ?? actual.usuario,
      correo: updatePayload.correo ?? actual.correo,
      rol: updatePayload.rol ?? actual.rol,
      estado: updatePayload.estado ?? actual.estado,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireRole(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const idUsuario = String(searchParams.get("id_usuario") ?? searchParams.get("id") ?? "").trim();

    if (!idUsuario) throw new ApiError(400, "Falta id_usuario");

    if (session.id_usuario === idUsuario) {
      throw new ApiError(400, "No puedes eliminar tu propio usuario administrador en sesión");
    }

    const usuarios = await getUsuarios();
    const usuario = usuarios.find((u) => u.id_usuario === idUsuario);

    if (!usuario) throw new ApiError(404, "El usuario no existe");

    await eliminarFila(TABLES.usuarios, idUsuario);

    return jsonOk({ id_usuario: idUsuario, eliminado: true });
  } catch (error) {
    return jsonError(error);
  }
}
