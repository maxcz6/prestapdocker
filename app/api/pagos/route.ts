import { requireSession, requireRole } from "@/lib/auth";
import {
  aplicarEstadosCuotas,
  calcularEstadoPrestamo,
  crearPago,
} from "@/lib/business";
import { ApiError, jsonError, jsonOk } from "@/lib/errors";
import { registrarPagoAtomic } from "@/lib/db";
import { getCarteraData } from "@/lib/repository";
import { TABLES } from "@/lib/tables";

export async function GET() {
  try {
    await requireSession();
    const { clientes, prestamos, cuotas, pagos } = await getCarteraData();

    const data = pagos.map((pago) => {
      const prestamo = prestamos.find((item) => item.id_prestamo === pago.id_prestamo);
      const cuota = cuotas.find((item) => item.id_cuota === pago.id_cuota);
      const cliente = clientes.find((item) => item.id_cliente === prestamo?.id_cliente);

      return {
        ...pago,
        cliente,
        prestamo,
        cuota,
      };
    });

    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN", "OPERADOR", "SUPERVISOR", "COBRADOR"]);
    const input = await request.json();
    const { prestamos, cuotas, pagos } = await getCarteraData();
    const pago = crearPago(input, prestamos, cuotas, pagos);
    const cuota = cuotas.find((item) => item.id_cuota === pago.id_cuota);
    const prestamo = prestamos.find((item) => item.id_prestamo === pago.id_prestamo);

    if (!cuota) throw new ApiError(404, "RB14: La cuota no existe");
    if (!prestamo) throw new ApiError(404, "RB13: El prestamo no existe");

    const pagosActualizados = [...pagos, pago];
    const cuotasActualizadas = aplicarEstadosCuotas(
      cuotas.map((item) =>
        item.id_cuota === cuota.id_cuota ? { ...item, estado: "PAGADA" } : item,
      ),
      pagosActualizados,
    );
    const estadoPrestamo = calcularEstadoPrestamo(prestamo, cuotasActualizadas);

    const writeResult = await registrarPagoAtomic(
      TABLES.pagos,
      TABLES.cuotas,
      TABLES.prestamos,
      pago,
      cuota.id_cuota,
      prestamo.id_prestamo,
      estadoPrestamo,
    );

    return jsonOk(
      {
        pago: {
          ...pago,
          id: (writeResult as { id_pago?: string; id?: string }).id_pago ?? (writeResult as { id?: string }).id ?? pago.id,
        },
        cuota: { ...cuota, estado: "PAGADA" },
        estadoPrestamo,
      },
      201,
    );
  } catch (error) {
    return jsonError(error);
  }
}
