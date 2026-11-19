import { requireSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/errors";
import { getCarteraData } from "@/lib/repository";

export async function GET() {
  try {
    await requireSession();
    const { clientes, prestamos, cuotas, pagos } = await getCarteraData();

    const data = pagos.map((pago) => {
      const prestamo = prestamos.find((item) => item.id_prestamo === pago.id_prestamo);
      const cuota = cuotas.find((item) => item.id_cuota === pago.id_cuota);
      const cliente = clientes.find((item) => item.id_cliente === prestamo?.id_cliente);

      return {
        fecha: pago.fecha_pago,
        cliente: cliente?.nombres_apellidos ?? "",
        negocio: cliente?.nombre_negocio ?? "",
        prestamo: pago.id_prestamo,
        cuota: cuota?.numero_cuota ?? pago.numero_cuota,
        monto: pago.monto_pagado,
        observacion: pago.observacion,
      };
    });

    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
