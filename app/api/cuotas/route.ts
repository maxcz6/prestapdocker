import { requireSession } from "@/lib/auth";
import { aplicarEstadosCuotas } from "@/lib/business";
import { jsonError, jsonOk } from "@/lib/errors";
import { getCuotas, getPagos } from "@/lib/repository";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const idPrestamo = searchParams.get("id_prestamo");
    const [cuotas, pagos] = await Promise.all([getCuotas(), getPagos()]);
    const cuotasConEstado = aplicarEstadosCuotas(cuotas, pagos);

    const data = idPrestamo
      ? cuotasConEstado.filter((cuota) => cuota.id_prestamo === idPrestamo)
      : cuotasConEstado;

    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
