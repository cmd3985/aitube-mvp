"use client";

import { useState, useEffect } from "react";
import { MonitorSmartphone, X } from "lucide-react";

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker on mount for PWA capability
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.error('ServiceWorker registration failed: ', err);
        });
      });
    }

    // 2. Listen for the native install prompt event
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Check if we're already running purely as a PWA (standalone app)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    // We can't use the prompt again
    setDeferredPrompt(null);
  };

  if (!isInstallable || isDismissed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        
        <button 
          onClick={handleInstallClick}
          className="flex flex-col md:flex-row items-center gap-3 px-4 py-2 hover:bg-white/5 rounded-xl transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-neon-blue to-neon-purple flex items-center justify-center shrink-0">
            <MonitorSmartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none mb-1">AITube 바탕화면 설치앱</p>
            <p className="text-gray-400 text-xs leading-none">원클릭으로 쉽게 들어오세요!</p>
          </div>
        </button>

        <div className="w-[1px] h-10 bg-white/10" />

        <button 
          onClick={() => setIsDismissed(true)}
          className="p-2 text-gray-500 hover:text-white transition-colors"
          title="닫기"
        >
          <X className="w-5 h-5" />
        </button>

      </div>
    </div>
  );
}
