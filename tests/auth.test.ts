import { describe, it, expect, beforeAll } from "vitest";
import {
  hashPassword,
  validarCredenciales,
  crearSessionCookie,
  verificarSessionCookie,
} from "../lib/auth";
import type { Usuario } from "../types/domain";

describe("Seguridad y Autenticación", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "super-secret-key-16-chars-min-test";
  });

  it("genera hashes seguros con scrypt y salt", () => {
    const password = "miPasswordSeguro123";
    const salt = "random_salt_123";
    const hash1 = hashPassword(password, salt);
    const hash2 = hashPassword(password, salt);
    const hashDifferentSalt = hashPassword(password, "another_salt");

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDifferentSalt);
    expect(hash1.length).toBe(128); // 64 bytes hex = 128 chars
  });

  it("rechaza login si la tabla de usuarios está vacía (C1 - Sin puerta trasera)", () => {
    expect(() =>
      validarCredenciales([], { usuario: "admin", password: "admin123" }),
    ).toThrow("Hoja de usuarios vacía");
  });

  it("valida credenciales de usuario activo con hash scrypt", () => {
    const salt = "salt_seguro_99";
    const hash = hashPassword("secret123", salt);

    const usuarios: Usuario[] = [
      {
        id: "1",
        id_usuario: "U001",
        usuario: "juan",
        correo: "juan@prestap.com",
        password: "",
        password_hash: hash,
        password_salt: salt,
        rol: "OPERADOR",
        estado: "ACTIVO",
        fecha_creacion: "",
        fecha_modificacion: "",
      },
    ];

    const result = validarCredenciales(usuarios, {
      usuario: "juan",
      password: "secret123",
    });

    expect(result.id_usuario).toBe("U001");
    expect(result.rol).toBe("OPERADOR");
  });

  it("crea cookies de sesión con expiración real y las valida (A2)", () => {
    const payload = {
      id_usuario: "U001",
      usuario: "juan",
      rol: "ADMIN",
    };

    const cookie = crearSessionCookie(payload);
    expect(cookie.value).toBeDefined();

    const decoded = verificarSessionCookie(cookie.value);
    expect(decoded).not.toBeNull();
    expect(decoded?.usuario).toBe("juan");
    expect(decoded?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rechaza cookies alteradas o no firmadas", () => {
    const fakeCookie = "invalid_cookie_payload.fake_signature";
    expect(verificarSessionCookie(fakeCookie)).toBeNull();
  });
});
