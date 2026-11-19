// Generador de identificadores universales (navegador y servidor)
export function generarId(prefix: string, _ids?: string[]): string {
  const timePart = Date.now().toString(36).toUpperCase();
  let randPart = "";

  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(3);
    window.crypto.getRandomValues(bytes);
    randPart = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  } else {
    randPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  return `${prefix}${timePart}${randPart}`;
}
