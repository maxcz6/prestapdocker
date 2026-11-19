"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Banknote, Wallet, FileText, Shield, LogOut, X, RotateCcw } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { api } from "@/lib/api-client";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[]; // Roles que pueden ver esta opción (undefined = todos)
};

const allNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users, roles: ["ADMIN", "SUPERVISOR", "OPERADOR", "COBRADOR"] },
  { href: "/dashboard/prestamos", label: "Préstamos", icon: Banknote, roles: ["ADMIN", "SUPERVISOR", "OPERADOR"] },
  { href: "/dashboard/pagos", label: "Pagos", icon: Wallet, roles: ["ADMIN", "SUPERVISOR", "OPERADOR", "COBRADOR"] },
  { href: "/dashboard/reportes", label: "Reportes", icon: FileText, roles: ["ADMIN", "SUPERVISOR"] },
  { href: "/dashboard/usuarios", label: "Usuarios", icon: Shield, roles: ["ADMIN"] },
];

const focusableSelectors = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
  };

  const handleResetDemo = () => {
    if (typeof window !== "undefined" && window.confirm("¿Deseas restablecer todos los datos del sistema a los valores de prueba originales?")) {
      api.resetDemoData();
      window.location.reload();
    }
  };

  // Focus trap + initial focus when sidebar opens
  useEffect(() => {
    if (!isOpen) return;

    const sidebar = sidebarRef.current;
    const closeButton = closeButtonRef.current;
    if (!sidebar) return;

    // Move focus to close button when opening
    closeButton?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = Array.from(sidebar.querySelectorAll<HTMLElement>(focusableSelectors));
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-md transition-opacity duration-250 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-50 w-64 liquid-glass border-r border-border-glass transition-transform duration-250 ease-out shadow-2xl ${
          isOpen
            ? "translate-x-0 pointer-events-auto shadow-2xl"
            : "-translate-x-full pointer-events-none invisible"
        }`}
        aria-label="Navegación lateral"
        aria-modal="true"
        role="dialog"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-glass px-6 py-5">
            <div className="flex items-center gap-3.5">
              <img
                src="/icon.png"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-2xl shadow-md shadow-primary/25"
              />
              <div className="min-w-0">
                <p className="font-bold text-text-primary text-base tracking-tight">Prestap</p>
                <p className="text-xs text-text-muted font-medium truncate">Microcréditos & Cobranzas</p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="rounded-xl p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors cursor-pointer"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Menú principal">
            <ul className="space-y-1">
              {allNavItems
                .filter((item) => !item.roles || (user?.rol && item.roles.includes(user.rol.toUpperCase())))
                .map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          active
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" aria-hidden="true" />
                      )}
                      <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-border-glass p-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl liquid-glass-input p-3">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm font-semibold text-text-primary truncate">{user?.usuario ?? "Usuario"}</p>
                <p className="text-xs text-text-muted font-medium truncate uppercase tracking-wider">{user?.rol ?? "Operador"}</p>
              </div>
              <ThemeToggle />
            </div>
            <button
              onClick={handleResetDemo}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-hover/60 hover:bg-bg-hover border border-border-glass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-150 cursor-pointer"
              title="Restablece la base de datos local en el navegador a los datos demo de Huancayo"
            >
              <RotateCcw className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Restablecer Datos Demo
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl py-2.5 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 transition-all duration-150 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
