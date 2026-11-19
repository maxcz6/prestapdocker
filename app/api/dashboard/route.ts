import { requireSession } from "@/lib/auth";
import {
  aplicarEstadosCuotas,
  calcularEstadoPrestamo,
  roundMoney,
} from "@/lib/business";
import { jsonError, jsonOk } from "@/lib/errors";
import { getCarteraData } from "@/lib/repository";

export async function GET() {
  try {
    await requireSession();
    const { clientes, prestamos, cuotas, pagos } = await getCarteraData();
    const cuotasConEstado = aplicarEstadosCuotas(cuotas, pagos);
    const prestamosConEstado = prestamos.map((prestamo) => ({
      ...prestamo,
      estado: calcularEstadoPrestamo(prestamo, cuotasConEstado),
    }));

    const prestado = roundMoney(
      prestamos.reduce((total, prestamo) => total + prestamo.monto, 0),
    );
    const totalCartera = roundMoney(
      prestamos.reduce((total, prestamo) => total + prestamo.total_pagar, 0),
    );
    const cobrado = roundMoney(
      pagos.reduce((total, pago) => total + pago.monto_pagado, 0),
    );
    const vencidas = cuotasConEstado.filter((cuota) => cuota.estado === "VENCIDA");
    const prestamosVencidos = prestamosConEstado.filter(
      (prestamo) => prestamo.estado === "VENCIDO",
    );

    return jsonOk({
      clientes: clientes.length,
      prestamos: prestamos.length,
      prestado,
      total_cartera: totalCartera,
      cobrado,
      saldo: roundMoney(Math.max(totalCartera - cobrado, 0)),
      cuotas_vencidas: vencidas.length,
      monto_vencido: roundMoney(
        vencidas.reduce((total, cuota) => total + cuota.monto, 0),
      ),
      morosos: new Set(prestamosVencidos.map((prestamo) => prestamo.id_cliente)).size,
    });
  } catch (error) {
    return jsonError(error);
  }
}
