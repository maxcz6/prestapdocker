"use client";

import { forwardRef, useState, type ReactNode, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

type BaseProps = {
  label: string;
  error?: string;
  hint?: string;
};

type FieldProps = BaseProps & React.InputHTMLAttributes<HTMLInputElement>;
type SelectFieldProps = BaseProps & React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode };
type TextareaFieldProps = BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * Filters keyboard input to allow only digits (and navigation keys).
 */
function handleNumericKeyDown(e: KeyboardEvent<HTMLInputElement>) {
  const allowed = ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
  if (allowed.includes(e.key)) return;
  if (e.ctrlKey || e.metaKey) return; // Allow copy/paste/cut/select-all
  if (!/^\d$/.test(e.key)) e.preventDefault();
}

/**
 * Filters paste events to allow only digits.
 */
function handleNumericPaste(e: ClipboardEvent<HTMLInputElement>) {
  const pasted = e.clipboardData.getData("text");
  if (!/^\d+$/.test(pasted)) {
    e.preventDefault();
  }
}

/**
 * Wraps onChange to strip non-digit characters when inputMode is "numeric".
 */
function sanitizeNumericOnChange(
  onChange: React.InputHTMLAttributes<HTMLInputElement>["onChange"],
) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "");
    if (digits !== raw) {
      e.target.value = digits;
    }
    onChange?.(e);
  };
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, id, className, type, ...props },
  ref
) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const resolvedType = isPassword && showPassword ? "text" : type;
  const isNumeric = props.inputMode === "numeric";

  const describedBy = [
    error ? errorId : null,
    hint ? hintId : null,
  ].filter(Boolean).join(" ") || undefined;

  const numericHandlers = isNumeric ? {
    onKeyDown: handleNumericKeyDown,
    onPaste: handleNumericPaste,
    onChange: sanitizeNumericOnChange(props.onChange),
  } : {};

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="field-label">
        {label}
        {props.required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? "true" : undefined}
          aria-required={props.required ? "true" : undefined}
          className={`field-input${error ? " field-input--error" : ""} ${isPassword ? "pr-10" : ""} ${className ?? ""}`}
          {...numericHandlers}
          {...props}
          type={resolvedType}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="field-error">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="field-hint">{hint}</p>
      )}
    </div>
  );
});

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, id, children, className, ...props },
  ref
) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const describedBy = [
    error ? errorId : null,
    hint ? hintId : null,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="field-label">
        {label}
        {props.required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
      </label>
      <select
        ref={ref}
        id={inputId}
        aria-describedby={describedBy}
        aria-invalid={error ? "true" : undefined}
        className={`field-input${error ? " field-input--error" : ""} ${className ?? ""}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} role="alert" className="field-error">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="field-hint">{hint}</p>
      )}
    </div>
  );
});

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  { label, error, hint, id, className, ...props },
  ref
) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const describedBy = [
    error ? errorId : null,
    hint ? hintId : null,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="field-label">
        {label}
        {props.required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        aria-describedby={describedBy}
        aria-invalid={error ? "true" : undefined}
        aria-required={props.required ? "true" : undefined}
        className={`field-input${error ? " field-input--error" : ""} ${className ?? ""} resize-none`}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="field-error">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="field-hint">{hint}</p>
      )}
    </div>
  );
});
