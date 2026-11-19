import { requireSession, requireRole } from "@/lib/auth";
import {
  aplicarEstadosCuotas,
  calcularEstadoPrestamo,
  calcularSaldo,
  crearPrestamoYCuotas,
  validarEstadoPrestamo,
} from "@/lib/business";
import { ApiError, jsonError, jsonOk } from "@/lib/errors";
import {
  actualizarFila,
  crearPrestamoConCuotasAtomic,
  eliminarFila,
} from "@/lib/db";
import { getCarteraData } from "@/lib/repository";
import { TABLES } from "@/lib/tables";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const idPrestamo = searchParams.get("id_prestamo");

    const { clientes, prestamos, cuotas, pagos } = await getCarteraData();
    const cuotasConEstado = aplicarEstadosCuotas(cuotas, pagos);

    const prestamosFiltrados = idPrestamo
      ? prestamos.filter((p) => p.id_prestamo === idPrestamo)
      : prestamos;

    const data = prestamosFiltrados.map((prestamo) => {
      const cliente = clientes.find((item) => item.id_cliente === prestamo.id_cliente);
      const estado = calcularEstadoPrestamo(prestamo, cuotasConEstado);

      return {
        ...prestamo,
        estado,
        cliente,
        saldo: calcularSaldo(prestamo, pagos),
      };
    });

    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN", "OPERADOR", "SUPERVISOR"]);
    const input = await request.json();
    const { clientes, prestamos, cuotas } = await getCarteraData();
    const result = crearPrestamoYCuotas(input, clientes, prestamos, cuotas);

    const writeResult = await crearPrestamoConCuotasAtomic(
      TABLES.prestamos,
      TABLES.cuotas,
      result.prestamo,
      result.cuotas,
    );

    return jsonOk(
      {
        ...result,
        prestamo: {
          ...result.prestamo,
          id: (writeResult as { id_prestamo?: string; id?: string }).id_prestamo ?? (writeResult as { id?: string }).id ?? result.prestamo.id,
        },
      },
      201,
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole(["ADMIN", "OPERADOR", "SUPERVISOR"]);
    const input = await request.json();
    const idPrestamo = String(input.id_prestamo ?? input.id ?? "").trim();

    if (!idPrestamo) throw new ApiError(400, "Falta id_prestamo");

    const { prestamos } = await getCarteraData();
    const prestamo = prestamos.find((item) => item.id_prestamo === idPrestamo);

    if (!prestamo) throw new ApiError(404, "El prestamo no existe");

    const estado = validarEstadoPrestamo(input.estado);
    const actualizado = { ...prestamo, estado };

    await actualizarFila(TABLES.prestamos, idPrestamo, { estado });

    return jsonOk(actualizado);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const idPrestamo = String(searchParams.get("id_prestamo") ?? searchParams.get("id") ?? "").trim();

    if (!idPrestamo) throw new ApiError(400, "Falta id_prestamo");

    const { prestamos, cuotas, pagos } = await getCarteraData();
    const prestamo = prestamos.find((item) => item.id_prestamo === idPrestamo);

    if (!prestamo) throw new ApiError(404, "El prestamo no existe");
    if (pagos.some((pago) => pago.id_prestamo === idPrestamo)) {
      throw new ApiError(409, "No se puede eliminar un prestamo con pagos registrados");
    }

    const cuotasPrestamo = cuotas.filter((cuota) => cuota.id_prestamo === idPrestamo);

    await Promise.all(cuotasPrestamo.map((cuota) => eliminarFila(TABLES.cuotas, cuota.id_cuota)));

    await eliminarFila(TABLES.prestamos, idPrestamo);

    return jsonOk({
      id_prestamo: idPrestamo,
      cuotas_eliminadas: cuotasPrestamo.length,
      eliminado: true,
    });
  } catch (error) {
    return jsonError(error);
  }
}
