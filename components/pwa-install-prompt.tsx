"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    let timer: NodeJS.Timeout | null = null;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after a short delay so it doesn't interrupt the user
      timer = setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for app installed
    const installedHandler = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  if (isInstalled || !showBanner || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-[fadeInUp_0.3s_ease-out] sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="liquid-glass rounded-2xl p-4 shadow-2xl border border-primary/20">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <img
            src="/icon.png"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-xl shadow-md shadow-primary/25"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary">
              Instalar Prestap
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              Accede rápido desde tu pantalla de inicio
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-primary/25 hover:bg-primary-hover transition-all active:scale-[0.97]"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Instalar App
              </button>
              <button
                onClick={() => {
                  setShowBanner(false);
                  setDeferredPrompt(null);
                }}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
