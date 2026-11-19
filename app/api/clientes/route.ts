import { requireSession, requireRole } from "@/lib/auth";
import { actualizarClienteInput, crearCliente } from "@/lib/business";
import { ApiError, jsonError, jsonOk } from "@/lib/errors";
import { actualizarFila, eliminarFila, insertarFila } from "@/lib/db";
import { getClientes, getPrestamos } from "@/lib/repository";
import { TABLES } from "@/lib/tables";

export async function GET() {
  try {
    await requireSession();
    const clientes = await getClientes();
    return jsonOk(clientes);
  } catch (error) {
    return jsonError(error);
  }
}

// ============================================================================
// TEMA 3: Endpoint de Registro (POST /api/clientes)
// ============================================================================
export async function POST(request: Request) {
  try {
    // Autoriza solo a usuarios autenticados con un rol permitido para gestionar clientes.
    await requireRole(["ADMIN", "OPERADOR", "SUPERVISOR"]);
    // Lee el JSON y carga registros actuales para verificar la unicidad del DNI.
    const input = await request.json();
    const clientes = await getClientes();

    // Normaliza y valida los campos, asigna el ID y rechaza DNI duplicados.
    const cliente = crearCliente(input, clientes);

    // Persiste los datos validados y devuelve HTTP 201 con el cliente creado.
    const write = await insertarFila(TABLES.clientes, cliente);

    return jsonOk({ ...cliente, id: write.id ?? cliente.id }, 201);
  } catch (error) {
    // Convierte errores de validación o duplicidad en respuestas JSON con su estado HTTP.
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole(["ADMIN", "OPERADOR", "SUPERVISOR"]);
    const input = await request.json();
    const idCliente = String(input.id_cliente ?? input.id ?? "").trim();

    if (!idCliente) throw new ApiError(400, "Falta id_cliente");

    const clientes = await getClientes();
    const cliente = actualizarClienteInput(idCliente, input, clientes);

    await actualizarFila(TABLES.clientes, idCliente, cliente);

    return jsonOk(cliente);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const idCliente = String(searchParams.get("id_cliente") ?? searchParams.get("id") ?? "").trim();

    if (!idCliente) throw new ApiError(400, "Falta id_cliente");

    const [clientes, prestamos] = await Promise.all([getClientes(), getPrestamos()]);
    const cliente = clientes.find((item) => item.id_cliente === idCliente);

    if (!cliente) throw new ApiError(404, "El cliente no existe");
    if (prestamos.some((prestamo) => prestamo.id_cliente === idCliente)) {
      throw new ApiError(409, "No se puede eliminar un cliente con prestamos registrados");
    }

    await eliminarFila(TABLES.clientes, idCliente);

    return jsonOk({ id_cliente: idCliente, eliminado: true });
  } catch (error) {
    return jsonError(error);
  }
}
