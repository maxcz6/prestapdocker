"use client";

import { useState, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Clock } from "lucide-react";
import { api } from "@/lib/api-client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Field } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams?.get("expired") === "true";

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!usuario.trim() || !password.trim()) {
      setError("Por favor, ingrese usuario y contraseña");
      return;
    }

    setLoading(true);
    try {
      await api.auth.login(usuario.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Brand */}
      <div className="mb-8 text-center">
        <img
          src="/icon.png"
          alt="Prestap"
          width={64}
          height={64}
          className="mx-auto mb-4 h-16 w-16 rounded-2xl shadow-xl shadow-primary/25"
        />
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Prestap</h1>
        <p className="text-sm text-text-secondary mt-1 font-medium">Gestión Inteligente de Microcréditos</p>
      </div>

      {/* Liquid Glass Card */}
      <form
        onSubmit={handleSubmit}
        className="liquid-glass rounded-2xl p-7 sm:p-9 shadow-2xl space-y-6"
        noValidate
      >
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Bienvenido</h2>
          <p className="text-xs text-text-muted mt-1">Ingrese sus credenciales para acceder al sistema</p>
        </div>

        {isExpired && !error && (
          <div role="alert" className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3.5 text-xs font-medium text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
            <Clock className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="flex-1">Tu sesión ha expirado por inactividad o tiempo límite. Ingresa nuevamente para continuar.</span>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <Field
            label="Usuario o Correo"
            id="usuario"
            type="text"
            autoComplete="username"
            required
            maxLength={50}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Ej. admin o usuario@prestap.com"
            disabled={loading}
          />

          <Field
            label="Contraseña"
            id="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-lg w-full"
        >
          {loading ? "Validando..." : "Ingresar al Sistema"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 relative z-10">
      <div className="absolute top-6 right-6">
        <div className="liquid-glass rounded-2xl p-1.5 shadow-sm">
          <ThemeToggle />
        </div>
      </div>

      <Suspense fallback={<div className="h-96 w-full max-w-md rounded-2xl glass-skeleton" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

