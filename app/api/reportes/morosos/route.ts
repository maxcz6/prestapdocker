import { requireSession } from "@/lib/auth";
import {
  aplicarEstadosCuotas,
  calcularSaldo,
  roundMoney,
} from "@/lib/business";
import { jsonError, jsonOk } from "@/lib/errors";
import { getCarteraData } from "@/lib/repository";

export async function GET() {
  try {
    await requireSession();
    const { clientes, prestamos, cuotas, pagos } = await getCarteraData();
    const cuotasConEstado = aplicarEstadosCuotas(cuotas, pagos);

    const data = prestamos
      .map((prestamo) => {
        const vencidas = cuotasConEstado.filter(
          (cuota) =>
            cuota.id_prestamo === prestamo.id_prestamo && cuota.estado === "VENCIDA",
        );
        const cliente = clientes.find((item) => item.id_cliente === prestamo.id_cliente);

        return {
          cliente: cliente?.nombres_apellidos ?? "",
          telefono: cliente?.celular ?? "",
          negocio: cliente?.nombre_negocio ?? "",
          prestamo: prestamo.id_prestamo,
          cuotas_vencidas: vencidas.length,
          monto_vencido: roundMoney(
            vencidas.reduce((total, cuota) => total + cuota.monto, 0),
          ),
          saldo: calcularSaldo(prestamo, pagos).saldo,
        };
      })
      .filter((item) => item.cuotas_vencidas > 0);

    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
