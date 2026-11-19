"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="space-y-4">
        <div className={`flex items-start gap-3 p-3 rounded-xl ${
          variant === "danger"
            ? "bg-rose-500/10 border border-rose-500/20"
            : "bg-amber-500/10 border border-amber-500/20"
        }`}>
          <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
            variant === "danger" ? "text-rose-500" : "text-amber-500"
          }`} aria-hidden="true" />
          <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn btn-ghost btn-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`btn btn-sm ${
              variant === "danger" ? "btn-danger" : "btn-warning"
            }`}
          >
            {loading ? (
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
