"use client";

import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="alert">
      <div className="liquid-glass rounded-2xl p-8 sm:p-10 text-center max-w-md w-full">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10">
          <AlertTriangle className="h-7 w-7 text-rose-500" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-text-primary mb-2">Algo salió mal</h2>
        <p className="text-sm text-text-secondary mb-6 leading-relaxed">
          Ocurrió un error inesperado. Por favor, intente nuevamente.
        </p>
        <button
          onClick={reset}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover active:scale-[0.98] transition-all duration-150"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
