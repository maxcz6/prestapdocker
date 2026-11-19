export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function jsonOk<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json(
      {
        success: false,
        error: error.message,
        details: error.details,
      },
      { status: error.status },
    );
  }

  console.error(error);

  return Response.json(
    {
      success: false,
      error: "Error interno del servidor",
    },
    { status: 500 },
  );
}
