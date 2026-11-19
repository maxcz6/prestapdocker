import { requireSession } from "@/lib/auth";
import {
  aplicarEstadosCuotas,
  calcularEstadoPrestamo,
  calcularSaldo,
} from "@/lib/business";
import { jsonError, jsonOk } from "@/lib/errors";
import { getCarteraData } from "@/lib/repository";

export async function GET() {
  try {
    await requireSession();
    const { clientes, prestamos, cuotas, pagos } = await getCarteraData();
    const cuotasConEstado = aplicarEstadosCuotas(cuotas, pagos);

    const data = prestamos.map((prestamo) => {
      const cliente = clientes.find((item) => item.id_cliente === prestamo.id_cliente);
      const saldo = calcularSaldo(prestamo, pagos);

      return {
        id_prestamo: prestamo.id_prestamo,
        cliente: cliente?.nombres_apellidos ?? "",
        negocio: cliente?.nombre_negocio ?? "",
        monto: prestamo.monto,
        interes: prestamo.interes,
        monto_interes: prestamo.monto_interes,
        total: saldo.total,
        pagado: saldo.pagado,
        saldo: saldo.saldo,
        estado: calcularEstadoPrestamo(prestamo, cuotasConEstado),
      };
    });

    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
