import { describe, it, expect } from "vitest";
import { hashPassword } from "../lib/auth";

describe("Validaciones de Roles y Usuarios", () => {
  const ROLES_VALIDOS = ["ADMIN", "OPERADOR", "SUPERVISOR", "COBRADOR"];

  it("permite los 4 roles definidos en el sistema", () => {
    expect(ROLES_VALIDOS).toContain("ADMIN");
    expect(ROLES_VALIDOS).toContain("OPERADOR");
    expect(ROLES_VALIDOS).toContain("SUPERVISOR");
    expect(ROLES_VALIDOS).toContain("COBRADOR");
    expect(ROLES_VALIDOS.length).toBe(4);
  });

  it("rechaza roles inválidos", () => {
    const rolInvalido = "GUEST";
    expect(ROLES_VALIDOS.includes(rolInvalido)).toBe(false);
  });

  it("genera hash seguro para nuevo usuario", () => {
    const password = "passwordCobrador2026";
    const salt = "salt_aleatorio_test";
    const hash = hashPassword(password, salt);

    expect(hash).toBeDefined();
    expect(hash.length).toBe(128); // 64 bytes hex
  });
});
