import { scryptSync, randomBytes } from "crypto";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log("Uso: pnpm exec tsx scripts/hash-password.ts <password>");
  process.exit(1);
}

const password = args[0];
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");

console.log("\n=== Credenciales Generadas ===\n");
console.log(`Password (texto plano): ${password}`);
console.log(`Salt: ${salt}`);
console.log(`Hash: ${hash}`);
console.log("\nInserta lo siguiente en la tabla 'usuarios' de la base de datos:\n");
console.log(`| id_usuario | usuario | correo          | password_hash | password_salt | rol   | estado |`);
console.log(`| U001       | admin   | admin@admin.com | ${hash} | ${salt} | ADMIN | ACTIVO |`);
console.log("\n=============================\n");
