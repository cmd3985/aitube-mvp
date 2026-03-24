"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Globe, User, LogOut, Bookmark, Film, MonitorSmartphone } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { SupportedLanguage } from "@/i18n/dictionaries";
import { createClient } from "@/utils/supabase/client";
import type { User as SupabaseUser } from '@supabase/supabase-js';

export function GNB() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecking(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // PWA Setup
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.error(err));
      });
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstallable(false);
    }

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [supabase.auth]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Browser supports native automated prompt (Chrome, Edge)
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstallable(false);
      setDeferredPrompt(null);
    } else {
      // Browser DOES NOT support automated prompt (Safari, Firefox, or already installed)
      alert("현재 브라우저에서는 자동 설치가 지원되지 않거나 이미 설치되어 있습니다.\n\n[수동 설치 방법]\n- 🖥️ Mac Safari: 메뉴 막대 > 파일 > 'Dock에 추가'\n- 📱 아이폰 Safari: 하단 공유 버튼(네모 안 화살표) > '홈 화면에 추가'\n- ⭐️ 즐겨찾기 보관: Ctrl+D (Mac은 ⌘+D)");
    }
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserMenuOpen(false);
  };

  const navItems = [
    { name: t("home"), path: "/", icon: Home },
  ];
  const languages: SupportedLanguage[] = ["EN", "KO", "JA", "ES", "FR", "PT", "ZH", "HI", "AR", "ID", "RU", "DE"];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href={`/${lang.toLowerCase()}`} className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(0,242,254,0.5)]">
              GenCine
            </span>
          </a>
          <nav className="flex items-center gap-4 sm:gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={`/${lang.toLowerCase()}`}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors relative px-2 py-1 ${
                    isActive ? "text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="gnb-active"
                      className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-gradient-to-r from-neon-blue to-neon-purple neon-shadow"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}

            {/* Language Switcher */}
            <div className="relative z-50">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 hover:border-neon-blue/50 hover:bg-white/5 transition-all text-sm font-medium relative"
              >
                <Globe className="w-4 h-4 text-neon-blue" />
                <span className="hidden sm:inline">{lang}</span>
              </button>
              
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-32 py-2 glass rounded-xl border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)] z-50 flex flex-col"
                  >
                    {languages.map(l => (
                      <button
                         key={l}
                         onClick={() => {
                           setLang(l);
                           setLangOpen(false);
                         }}
                         className={`text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${lang === l ? "text-neon-blue font-bold" : "text-gray-300"}`}
                      >
                        {l}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* PWA Install Button (Always Visible) */}
            <button 
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/50 hover:bg-neon-blue/20 transition-all text-sm font-medium text-neon-blue shadow-[0_0_10px_rgba(0,242,254,0.3)]"
              title="앱 설치하기"
            >
              <MonitorSmartphone className="w-4 h-4" />
              <span className="hidden sm:inline">앱 단축키</span>
            </button>

            {/* Auth Section */}
            <div className="relative flex items-center gap-2">
              <Link 
                href={`/${lang.toLowerCase()}/submit`}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium text-gray-300 hover:text-white"
              >
                <Film className="w-4 h-4 text-neon-purple" />
                {t("submitFilm")}
              </Link>
            
              {!authChecking && !user && (
                <div className="group relative">
                  <button
                    onClick={handleLogin}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/50 hover:from-neon-blue/40 hover:to-neon-purple/40 hover:shadow-[0_0_15px_rgba(0,242,254,0.4)] transition-all text-sm font-medium text-white"
                  >
                    {t("loginGoogle")}
                  </button>
                  {/* Tooltip */}
                  <div className="absolute top-full mt-3 right-0 w-max max-w-[200px] sm:max-w-xs p-2.5 rounded-lg bg-zinc-900 border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 z-50">
                    <p className="text-xs text-center text-gray-200">{t("loginTooltip")}</p>
                    <div className="absolute -top-1.5 right-6 w-3 h-3 bg-zinc-900 border-t border-l border-white/10 transform rotate-45"></div>
                  </div>
                </div>
              )}

              {!authChecking && user && (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="w-8 h-8 rounded-full overflow-hidden border border-white/20 hover:border-cyan-400 transition-colors focus:outline-none"
                  >
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex flex-col items-center justify-center">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-48 py-2 glass rounded-xl border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)] z-50 flex flex-col overflow-hidden"
                      >
                        <Link 
                          href={`/${lang.toLowerCase()}/my-list`}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <Bookmark className="w-4 h-4 text-neon-blue" />
                          {t("myList")}
                        </Link>
                        <div className="h-px bg-white/10 my-1 flex-shrink-0" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          {t("logout")}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
