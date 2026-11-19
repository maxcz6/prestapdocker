import { randomBytes } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generarId(prefix: string, ids?: string[]) {
  // A8: Generar identificadores únicos con componente temporal Base36 y entropía aleatoria criptográfica
  const timePart = Date.now().toString(36).toUpperCase();
  const randPart = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}${timePart}${randPart}`;
}


