import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    setIsStandalone(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setDeferred(null);
    });
    // iOS não dispara beforeinstallprompt — já trata via manual
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const canInstall = !!deferred && !installed && !isStandalone;
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const showIOSHint = isIOS && !isStandalone;

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setDeferred(null);
    return choice.outcome === "accepted";
  }, [deferred]);

  return { canInstall, installed, isStandalone, isIOS, showIOSHint, install, deferred };
}
