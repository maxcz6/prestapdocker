"use client";

import { useState, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/components/auth-context";
import { ToastProvider } from "@/components/ui/toast";
import { Sidebar } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

function DashboardShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { loading } = useAuth();

  return (
    <div className="w-full min-h-screen bg-bg-main">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header (fixed at top 0) */}
      <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border-glass liquid-glass px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors cursor-pointer"
            aria-label="Abrir menú de navegación"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div className="flex items-center gap-2.5">
            <img
              src="/icon.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-xl shadow-sm shadow-primary/30"
            />
            <span className="font-extrabold text-text-primary text-base tracking-tight">Prestap</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="liquid-glass rounded-xl p-1 border border-border-glass">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="liquid-glass rounded-2xl p-8 flex flex-col items-center gap-4 shadow-xl">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary/30 border-t-primary" />
              <p className="text-sm font-medium text-text-secondary animate-pulse">Iniciando sesión segura...</p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <DashboardShell>{children}</DashboardShell>
      </ToastProvider>
    </AuthProvider>
  );
}
